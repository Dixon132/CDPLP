/**
 * PBT denegacion segura ante fallo tecnico de validacion del token (fail-closed)
 * (tarea 19.3).
 *
 * Feature: analisis-tendencias-riesgo-emocional, Property 23: Denegación segura
 * ante fallo técnico de validación del token (fail-closed).
 *
 * "Para todo fallo técnico de validación del JWT (red, indisponibilidad del
 * servicio), el `Servicio_Autenticacion` deniega el acceso (sin conceder
 * permisos degradados de solo lectura) y reintenta la validación con backoff
 * acotado; el acceso se concede únicamente tras una validación de identidad
 * exitosa, y en ningún caso como resultado de un fallo técnico."
 *
 * Se ejercita SIN mocks la pieza real fail-closed del modulo `authentication`
 * (tarea 19.1): `ServicioAutenticacionService.autorizar(token)`, que delega en
 * el dominio `ServicioAutenticacionGDS`. Se inyectan dobles deterministas del
 * verificador de JWT y del almacen de roles que fallan tecnicamente N veces y
 * luego (opcionalmente) se recuperan, y un `dormir` no-op que REGISTRA los
 * retardos del backoff para afirmar que es acotado y exponencial. No hay red ni
 * esperas reales: todo es sincrono y determinista.
 *
 * Validates: Requirements 24.7, 24.8
 */
import fc from 'fast-check';

import {
    AccesoDenegadoError,
    ErrorTecnicoValidacion,
    RolGDS,
    type AlmacenRoles,
    type ContextoAcceso,
    type PayloadVerificado,
    type VerificadorJwt,
} from '../../auth/servicioAutenticacion';
import { ServicioAutenticacionService } from '../servicio-autenticacion.service';

const USER_ID = 1234;
const ROL_USUARIO = RolGDS.ANALISTA;

/**
 * Verificador doble: lanza `ErrorTecnicoValidacion` (fallo tecnico/red) en sus
 * primeras `fallosTecnicos` invocaciones y luego, si `recupera` es true,
 * devuelve un payload valido. Cuenta sus invocaciones.
 */
class VerificadorTecnicoDoble implements VerificadorJwt {
    llamadas = 0;
    constructor(
        private readonly fallosTecnicos: number,
        private readonly recupera: boolean,
    ) { }
    async verificar(): Promise<PayloadVerificado> {
        this.llamadas += 1;
        if (this.llamadas <= this.fallosTecnicos || !this.recupera) {
            throw new ErrorTecnicoValidacion('red_indisponible');
        }
        return { userId: USER_ID };
    }
}

/** Almacen doble que falla tecnicamente N veces y luego resuelve el rol. */
class AlmacenTecnicoDoble implements AlmacenRoles {
    llamadas = 0;
    constructor(
        private readonly fallosTecnicos: number,
        private readonly recupera: boolean,
    ) { }
    async obtenerRol(): Promise<RolGDS | null> {
        this.llamadas += 1;
        if (this.llamadas <= this.fallosTecnicos || !this.recupera) {
            throw new ErrorTecnicoValidacion('bd_no_disponible');
        }
        return ROL_USUARIO;
    }
}

/** Almacen sano (nunca falla): aisla el caso del verificador. */
const almacenSano: AlmacenRoles = {
    obtenerRol: async () => ROL_USUARIO,
};

/** Verificador sano (nunca falla): aisla el caso del almacen de roles. */
const verificadorSano: VerificadorJwt = {
    verificar: async () => ({ userId: USER_ID }),
};

/**
 * Crea el servicio real con un `dormir` no-op que registra los retardos del
 * backoff para poder afirmar que es acotado y estrictamente creciente.
 */
function crearServicioConRegistroDeBackoff(
    verificador: VerificadorJwt,
    almacen: AlmacenRoles,
    maxReintentos: number,
    backoffBaseMs: number,
): { servicio: ServicioAutenticacionService; retardos: number[] } {
    const retardos: number[] = [];
    const servicio = new ServicioAutenticacionService(verificador, almacen, {
        maxReintentos,
        backoffBaseMs,
        dormir: async (ms: number) => {
            retardos.push(ms);
        },
    });
    return { servicio, retardos };
}

/** Resultado de un intento de autorizacion, capturado sin lanzar. */
type Resultado =
    | { concedido: true; contexto: ContextoAcceso }
    | { concedido: false; error: AccesoDenegadoError };

async function ejecutar(
    servicio: ServicioAutenticacionService,
): Promise<Resultado> {
    try {
        const contexto = await servicio.autorizar('Bearer token');
        return { concedido: true, contexto };
    } catch (error) {
        if (error instanceof AccesoDenegadoError) {
            return { concedido: false, error };
        }
        throw error;
    }
}

describe('Property 23: Denegación segura ante fallo técnico de validación del token (fail-closed)', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 23: Denegación segura ante fallo técnico de validación del token (fail-closed)
    it('fallo técnico de validación del JWT: deniega sin acceso degradado y reintenta con backoff acotado; concede solo tras validación exitosa (Req. 24.7, 24.8)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.nat({ max: 8 }), // fallos tecnicos antes de (eventual) exito
                fc.boolean(), // recupera dentro de la secuencia
                fc.integer({ min: 0, max: 5 }), // reintentos adicionales acotados
                fc.integer({ min: 1, max: 64 }), // base del backoff (ms)
                async (fallosTecnicos, recupera, maxReintentos, backoffBaseMs) => {
                    const verificador = new VerificadorTecnicoDoble(
                        fallosTecnicos,
                        recupera,
                    );
                    const { servicio, retardos } =
                        crearServicioConRegistroDeBackoff(
                            verificador,
                            almacenSano,
                            maxReintentos,
                            backoffBaseMs,
                        );

                    const resultado = await ejecutar(servicio);

                    // El exito requiere que la validacion se recupere dentro del
                    // limite de reintentos: el intento exitoso (indice base 0
                    // = fallosTecnicos) debe ser <= maxReintentos.
                    const exitoEsperado =
                        recupera && fallosTecnicos <= maxReintentos;

                    if (exitoEsperado) {
                        // Acceso concedido UNICAMENTE tras validacion exitosa
                        // (Req. 24.8): el contexto corresponde al usuario real.
                        expect(resultado.concedido).toBe(true);
                        if (resultado.concedido) {
                            expect(resultado.contexto).toEqual({
                                usuarioId: USER_ID,
                                rol: ROL_USUARIO,
                            });
                        }
                        // Se invoco hasta el primer exito: fallos + 1 llamada.
                        expect(verificador.llamadas).toBe(fallosTecnicos + 1);
                        // Hubo exactamente un `dormir` por cada reintento previo.
                        expect(retardos.length).toBe(fallosTecnicos);
                    } else {
                        // Fail-closed: ante fallo tecnico persistente se DENIEGA
                        // el acceso, sin conceder permiso alguno (Req. 24.7).
                        expect(resultado.concedido).toBe(false);
                        if (!resultado.concedido) {
                            // Indisponibilidad tecnica -> 503, jamas un contexto.
                            expect(resultado.error.status).toBe(503);
                            expect(resultado.error.motivo).toBe(
                                'validacion_no_disponible',
                            );
                        }
                        // Reintentos ACOTADOS: 1 intento inicial + maxReintentos.
                        expect(verificador.llamadas).toBe(maxReintentos + 1);
                        expect(retardos.length).toBe(maxReintentos);
                    }

                    // Backoff ACOTADO y exponencial: cada retardo es finito,
                    // positivo y estrictamente creciente (base * 2^i).
                    retardos.forEach((ms, i) => {
                        expect(Number.isFinite(ms)).toBe(true);
                        expect(ms).toBe(backoffBaseMs * 2 ** i);
                    });
                },
            ),
            { numRuns: 100 },
        );
    });

    // Feature: analisis-tendencias-riesgo-emocional, Property 23: Denegación segura ante fallo técnico de validación del token (fail-closed)
    it('fallo técnico al resolver el rol en la BD propia: deniega (sin lectura degradada) y reintenta acotadamente; concede solo si se recupera (Req. 24.7, 24.8)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.nat({ max: 8 }),
                fc.boolean(),
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 1, max: 64 }),
                async (fallosTecnicos, recupera, maxReintentos, backoffBaseMs) => {
                    const almacen = new AlmacenTecnicoDoble(
                        fallosTecnicos,
                        recupera,
                    );
                    const { servicio, retardos } =
                        crearServicioConRegistroDeBackoff(
                            verificadorSano,
                            almacen,
                            maxReintentos,
                            backoffBaseMs,
                        );

                    const resultado = await ejecutar(servicio);
                    const exitoEsperado =
                        recupera && fallosTecnicos <= maxReintentos;

                    if (exitoEsperado) {
                        expect(resultado.concedido).toBe(true);
                        if (resultado.concedido) {
                            expect(resultado.contexto.rol).toBe(ROL_USUARIO);
                        }
                        expect(almacen.llamadas).toBe(fallosTecnicos + 1);
                        expect(retardos.length).toBe(fallosTecnicos);
                    } else {
                        // Fail-closed: la indisponibilidad de la BD de roles NO
                        // concede acceso de solo lectura (Req. 24.7).
                        expect(resultado.concedido).toBe(false);
                        if (!resultado.concedido) {
                            expect(resultado.error.status).toBe(503);
                            expect(resultado.error.motivo).toBe(
                                'roles_no_disponibles',
                            );
                        }
                        expect(almacen.llamadas).toBe(maxReintentos + 1);
                        expect(retardos.length).toBe(maxReintentos);
                    }

                    retardos.forEach((ms, i) => {
                        expect(ms).toBe(backoffBaseMs * 2 ** i);
                    });
                },
            ),
            { numRuns: 100 },
        );
    });
});
