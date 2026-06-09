/**
 * Servicio_Autenticacion de la Plataforma_GDS (NestJS, servicio autonomo).
 *
 * Es el envoltorio inyectable del dominio fail-closed `ServicioAutenticacionGDS`
 * (modulo `auth`): valida el JWT emitido por el colegio con el `JWT_SECRET`
 * COMPARTIDO (variable de entorno, via Passport JWT) y resuelve el rol GDS del
 * usuario contra la PROPIA base de datos del servicio (`gds_usuario_plataforma`
 * / `gds_rol_plataforma`), NUNCA contra la BD del colegio (Req. 24.1, 24.2,
 * 25.3).
 *
 * Politica fail-closed (Req. 24.7, 24.8):
 *  - Ante fallo TECNICO de validacion (red / indisponibilidad), DENIEGA el
 *    acceso sin conceder ningun permiso (ni de solo lectura) y REINTENTA con
 *    backoff acotado; solo una validacion exitosa concede acceso.
 *  - Ante token CRIPTOGRAFICAMENTE invalido o EXPIRADO, DENIEGA sin reintentar.
 *
 * Autorizacion por rol (Req. 24.3, 24.4, 24.6):
 *  - OBSERVADOR: solo lectura.
 *  - ANALISTA: lectura + escritura (operaciones regulares).
 *  - ADMIN_PLATAFORMA: operaciones regulares + administrativas.
 */
import { Injectable } from '@nestjs/common';

import {
    ServicioAutenticacionGDS,
    type AccionGDS,
    type AlmacenRoles,
    type ContextoAcceso,
    type OpcionesServicioAutenticacion,
    type RolGDS,
    type VerificadorJwt,
} from '../auth/servicioAutenticacion';

/**
 * Espera con backoff exponencial acotado (Req. 24.7). Inyectable para pruebas
 * deterministas (no-op) y reutilizado al resolver el rol desde un payload ya
 * verificado por Passport.
 */
const dormirPorDefecto = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ServicioAutenticacionService {
    /** Dominio fail-closed reutilizado (verificador + almacen de roles + backoff). */
    private readonly dominio: ServicioAutenticacionGDS;
    private readonly almacenRoles: AlmacenRoles;
    private readonly maxReintentos: number;
    private readonly backoffBaseMs: number;
    private readonly dormir: (ms: number) => Promise<void>;

    constructor(
        verificador: VerificadorJwt,
        almacenRoles: AlmacenRoles,
        opciones: OpcionesServicioAutenticacion = {},
    ) {
        this.dominio = new ServicioAutenticacionGDS(
            verificador,
            almacenRoles,
            opciones,
        );
        this.almacenRoles = almacenRoles;
        this.maxReintentos = opciones.maxReintentos ?? 3;
        this.backoffBaseMs = opciones.backoffBaseMs ?? 50;
        this.dormir = opciones.dormir ?? dormirPorDefecto;
    }

    /**
     * Valida el JWT (cabecera `Authorization`) y resuelve el contexto de acceso.
     * Entrada canonica fail-closed para contextos sin Passport (p. ej. el
     * handshake WebSocket, Req. 24, tarea 24): concede acceso UNICAMENTE tras
     * validacion exitosa; ante fallo tecnico deniega y reintenta con backoff.
     */
    autorizar(token: string | undefined): Promise<ContextoAcceso> {
        return this.dominio.autorizar(token);
    }

    /**
     * Resuelve el contexto de acceso a partir de un `idUsuario` ya extraido de
     * un JWT VERIFICADO por la estrategia Passport. Aplica la politica
     * fail-closed con reintentos/backoff acotados al resolver el rol contra la
     * BD propia; un usuario sin rol GDS NO obtiene acceso (Req. 24.7, 24.8).
     *
     * Lanza el error tecnico subyacente si la resolucion del rol no esta
     * disponible tras agotar los reintentos, o `null`-rol si el usuario carece
     * de rol GDS (el llamador decide la respuesta HTTP fail-closed).
     */
    async resolverContexto(
        idUsuario: number | string,
    ): Promise<ContextoAcceso | null> {
        const rol = await this.intentarConBackoff(() =>
            this.almacenRoles.obtenerRol(String(idUsuario)),
        );
        if (rol === null) {
            return null;
        }
        return { usuarioId: Number(idUsuario), rol };
    }

    /** OBSERVADOR no escribe; operaciones admin solo ADMIN_PLATAFORMA (Req. 24.3, 24.4, 24.6). */
    puede(rol: RolGDS, accion: AccionGDS): boolean {
        return this.dominio.puede(rol, accion);
    }

    /**
     * Ejecuta `op` reintentando con backoff exponencial acotado ante fallos
     * tecnicos; tras agotar los reintentos, propaga el ultimo error (fail-closed).
     */
    private async intentarConBackoff<T>(op: () => Promise<T>): Promise<T> {
        let ultimoError: unknown;
        for (let intento = 0; intento <= this.maxReintentos; intento++) {
            try {
                return await op();
            } catch (error) {
                ultimoError = error;
                if (intento < this.maxReintentos) {
                    await this.dormir(this.backoffBaseMs * 2 ** intento);
                }
            }
        }
        throw ultimoError;
    }
}
