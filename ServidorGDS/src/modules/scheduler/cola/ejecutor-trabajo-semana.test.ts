/**
 * Pruebas del `EjecutorTrabajoSemana` - logica del procesador de la
 * `Cola_Trabajos` (tarea 16.2).
 *
 * Verifican, de forma SINCRONA y DETERMINISTA (sin Redis ni BD), que el ejecutor:
 *  - transiciona el estado consultable PENDIENTE -> EN_PROCESO -> COMPLETADO
 *    (Req. 27.5, 38.5);
 *  - es IDEMPOTENTE: si la semana ya tiene resultado, no reprocesa (Req. 27.2, 38.3);
 *  - aplica BLOQUEO DE CONCURRENCIA sobre `(A,I,N)`: si el cerrojo esta tomado,
 *    se abstiene sin duplicar (Req. 27.3, 38.2);
 *  - respeta REINTENTOS ACOTADOS: relanza el error mientras quedan intentos y solo
 *    marca FALLIDO en el ultimo (Req. 38.4);
 *  - AISLA fallos por institucion: el fallo de una `Institucion` no afecta a otra
 *    (Req. 9.5, 38.4);
 *  - usa reloj e IDs INYECTABLES para el registro de estado (Req. 18.4).
 *
 * _Requirements: 9.1, 9.5, 27.2, 27.3, 27.5, 38.2, 38.3, 38.4, 38.5, 10.6_
 */
import type { ResultadoProcesarSemana } from '../procesarSemana';
import { EtapaPipeline } from '../../pipeline/pipeline';
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from './adaptadores-memoria';
import {
    EjecutorTrabajoSemana,
    type ContextoIntento,
    type DependenciasEjecutor,
} from './ejecutor-trabajo-semana';
import { EstadoTrabajo } from './estados-trabajo';
import type {
    ConsultaResultadoSemana,
    ProcesadorSemanaPort,
} from './puertos-cola';
import { claveTrabajo, type DatosTrabajoSemana } from './trabajo-semana';

// --- Fixtures / dobles -----------------------------------------------------

const datos = (over: Partial<DatosTrabajoSemana> = {}): DatosTrabajoSemana => ({
    analisisId: 'a1',
    institucionId: 'i1',
    numeroSemana: 1,
    ...over,
});

function resultadoOk(d: DatosTrabajoSemana): ResultadoProcesarSemana {
    return {
        analisisId: d.analisisId,
        institucionId: d.institucionId,
        comunidadId: `c-${d.institucionId}`,
        numeroSemana: d.numeroSemana,
        resultadoId: `res-${d.analisisId}-${d.institucionId}-${d.numeroSemana}`,
        etapasCompletadas: [EtapaPipeline.LIMPIEZA, EtapaPipeline.EMBEDDINGS],
    };
}

/** `procesarSemana` doble: registra llamadas y puede completar o fallar. */
class ProcesadorDoble implements ProcesadorSemanaPort {
    llamadas: DatosTrabajoSemana[] = [];
    constructor(
        private readonly comportamiento: (
            d: DatosTrabajoSemana,
        ) => Promise<ResultadoProcesarSemana> = async (d) => resultadoOk(d),
    ) { }
    async procesarSemana(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoProcesarSemana> {
        const d = { analisisId, institucionId, numeroSemana };
        this.llamadas.push(d);
        return this.comportamiento(d);
    }
}

/** `ConsultaResultadoSemana` doble controlable por clave. */
class ConsultaDoble implements ConsultaResultadoSemana {
    private readonly procesadas = new Set<string>();
    marcarComoProcesada(d: DatosTrabajoSemana): void {
        this.procesadas.add(claveTrabajo(d));
    }
    async yaProcesada(d: DatosTrabajoSemana): Promise<boolean> {
        return this.procesadas.has(claveTrabajo(d));
    }
}

interface Banco {
    procesador: ProcesadorDoble;
    cerrojo: CerrojoConcurrenciaEnMemoria;
    consulta: ConsultaDoble;
    registro: RegistroEstadoTrabajosEnMemoria;
    reloj: RelojFijo;
    ejecutor: EjecutorTrabajoSemana;
}

function crearBanco(over: Partial<DependenciasEjecutor> = {}): Banco {
    const reloj = new RelojFijo(new Date('2024-03-01T00:00:00.000Z'));
    const procesador = new ProcesadorDoble();
    const cerrojo = new CerrojoConcurrenciaEnMemoria();
    const consulta = new ConsultaDoble();
    const registro = new RegistroEstadoTrabajosEnMemoria(
        reloj,
        new GeneradorIdSecuencial('reg'),
    );
    const deps: DependenciasEjecutor = {
        procesador,
        cerrojo,
        consultaResultado: consulta,
        registro,
        ...over,
    };
    return {
        procesador,
        cerrojo,
        consulta,
        registro,
        reloj,
        ejecutor: new EjecutorTrabajoSemana(deps),
    };
}

const primerIntento: ContextoIntento = { intento: 1, maxIntentos: 3 };

// --- Tests -----------------------------------------------------------------

describe('EjecutorTrabajoSemana (procesador de la Cola_Trabajos)', () => {
    it('completa el trabajo y deja estado consultable COMPLETADO (Req. 27.5, 38.5)', async () => {
        const b = crearBanco();
        const d = datos();

        const r = await b.ejecutor.ejecutar(d, primerIntento);

        expect(r.omitido).toBe(false);
        expect(r.estado).toBe(EstadoTrabajo.COMPLETADO);
        expect(r.resultado?.resultadoId).toBe('res-a1-i1-1');
        expect(b.procesador.llamadas).toEqual([
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 1 },
        ]);

        const estado = await b.registro.consultar(d);
        expect(estado?.estado).toBe(EstadoTrabajo.COMPLETADO);
        expect(estado?.jobId).toBe('procesar-semana:a1:i1:1');
        expect(estado?.intentos).toBe(1);
        expect(estado?.error).toBeUndefined();
    });

    it('libera el cerrojo de concurrencia tras completar', async () => {
        const b = crearBanco();
        const d = datos();
        await b.ejecutor.ejecutar(d, primerIntento);
        expect(b.cerrojo.estaTomada(claveTrabajo(d))).toBe(false);
    });

    it('es IDEMPOTENTE: si la semana ya tiene resultado, NO reprocesa (Req. 27.2, 38.3)', async () => {
        const b = crearBanco();
        const d = datos();
        b.consulta.marcarComoProcesada(d);

        const r = await b.ejecutor.ejecutar(d, primerIntento);

        expect(r.omitido).toBe(true);
        expect(r.motivoOmision).toBe('idempotencia');
        expect(r.estado).toBe(EstadoTrabajo.COMPLETADO);
        // `procesarSemana` NO se invoca: no se duplican resultados.
        expect(b.procesador.llamadas).toHaveLength(0);
        const estado = await b.registro.consultar(d);
        expect(estado?.estado).toBe(EstadoTrabajo.COMPLETADO);
    });

    it('BLOQUEA la concurrencia: si el cerrojo esta tomado, se abstiene (Req. 27.3, 38.2)', async () => {
        const b = crearBanco();
        const d = datos();
        // Otro worker ya posee el cerrojo de `(A,I,N)`.
        const liberarOtro = await b.cerrojo.adquirir(claveTrabajo(d));
        expect(liberarOtro).not.toBeNull();

        const r = await b.ejecutor.ejecutar(d, primerIntento);

        expect(r.omitido).toBe(true);
        expect(r.motivoOmision).toBe('concurrencia');
        expect(r.estado).toBe(EstadoTrabajo.EN_PROCESO);
        // No reproceso mientras otro worker lo tiene.
        expect(b.procesador.llamadas).toHaveLength(0);
    });

    it('con intentos restantes: marca PENDIENTE y RELANZA para que la cola reintente (Req. 38.4)', async () => {
        const procesador = new ProcesadorDoble(async () => {
            throw new Error('fallo transitorio del pipeline');
        });
        const b = crearBanco({ procesador });
        const d = datos();

        await expect(
            b.ejecutor.ejecutar(d, { intento: 1, maxIntentos: 3 }),
        ).rejects.toThrow(/fallo transitorio/);

        const estado = await b.registro.consultar(d);
        expect(estado?.estado).toBe(EstadoTrabajo.PENDIENTE);
        expect(estado?.error).toMatch(/fallo transitorio/);
        // El cerrojo se libera para permitir el reintento.
        expect(b.cerrojo.estaTomada(claveTrabajo(d))).toBe(false);
    });

    it('en el ULTIMO intento: marca FALLIDO (estado terminal) y relanza (Req. 38.4)', async () => {
        const procesador = new ProcesadorDoble(async () => {
            throw new Error('fallo persistente');
        });
        const b = crearBanco({ procesador });
        const d = datos();

        await expect(
            b.ejecutor.ejecutar(d, { intento: 3, maxIntentos: 3 }),
        ).rejects.toThrow(/fallo persistente/);

        const estado = await b.registro.consultar(d);
        expect(estado?.estado).toBe(EstadoTrabajo.FALLIDO);
        expect(estado?.intentos).toBe(3);
        expect(estado?.error).toMatch(/fallo persistente/);
        expect(b.cerrojo.estaTomada(claveTrabajo(d))).toBe(false);
    });

    it('reintento idempotente: tras persistir el resultado, un reintento NO reprocesa', async () => {
        const b = crearBanco();
        const d = datos();

        // Primer intento exitoso.
        await b.ejecutor.ejecutar(d, { intento: 1, maxIntentos: 3 });
        // La capa de persistencia ahora reporta la semana como procesada.
        b.consulta.marcarComoProcesada(d);

        // Un reintento de la cola sobre la misma semana no debe duplicar.
        const r2 = await b.ejecutor.ejecutar(d, { intento: 2, maxIntentos: 3 });
        expect(r2.omitido).toBe(true);
        expect(r2.motivoOmision).toBe('idempotencia');
        expect(b.procesador.llamadas).toHaveLength(1); // solo el primer intento
    });

    it('AISLA fallos por institucion: el fallo de I1 no afecta a I2 (Req. 9.5, 38.4)', async () => {
        // Procesador que falla solo para i1.
        const procesador = new ProcesadorDoble(async (d) => {
            if (d.institucionId === 'i1') {
                throw new Error('fallo de la institucion i1');
            }
            return resultadoOk(d);
        });
        const b = crearBanco({ procesador });
        const dI1 = datos({ institucionId: 'i1' });
        const dI2 = datos({ institucionId: 'i2' });

        // i1 agota su ultimo intento -> FALLIDO.
        await expect(
            b.ejecutor.ejecutar(dI1, { intento: 3, maxIntentos: 3 }),
        ).rejects.toThrow(/institucion i1/);

        // i2 se procesa con normalidad -> COMPLETADO (no afectada por i1).
        const rI2 = await b.ejecutor.ejecutar(dI2, { intento: 1, maxIntentos: 3 });
        expect(rI2.estado).toBe(EstadoTrabajo.COMPLETADO);

        const estadoI1 = await b.registro.consultar(dI1);
        const estadoI2 = await b.registro.consultar(dI2);
        expect(estadoI1?.estado).toBe(EstadoTrabajo.FALLIDO);
        expect(estadoI2?.estado).toBe(EstadoTrabajo.COMPLETADO);
    });

    it('usa reloj e IDs INYECTABLES para los sellos del registro (Req. 18.4)', async () => {
        const b = crearBanco();
        const d = datos();

        await b.ejecutor.ejecutar(d, primerIntento);

        const estado = await b.registro.consultar(d);
        // Reloj fijo inyectado.
        expect(estado?.creadoEn.toISOString()).toBe('2024-03-01T00:00:00.000Z');
        expect(estado?.actualizadoEn.toISOString()).toBe('2024-03-01T00:00:00.000Z');
        // ID secuencial inyectado.
        expect(estado?.registroId).toBe('reg-1');
    });
});
