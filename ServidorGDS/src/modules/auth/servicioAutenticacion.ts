/**
 * Servicio_Autenticacion de la Plataforma_GDS (servicio autonomo ServidorGDS).
 *
 * Valida el JWT emitido por el sistema del colegio usando el `JWT_SECRET`
 * COMPARTIDO (variable de entorno) y resuelve el rol GDS del usuario contra la
 * PROPIA base de datos dedicada del servicio (`gds_usuario_plataforma` /
 * `gds_rol_plataforma`). NUNCA consulta la base de datos del colegio
 * (aislamiento total - Req. 24.1, 24.2, 25.3).
 *
 * Politica de seguridad fail-closed (Req. 24.7, 24.8):
 *  - Ante un fallo TECNICO de validacion (red / indisponibilidad), DENIEGA el
 *    acceso sin conceder ningun permiso (ni siquiera de solo lectura) y
 *    REINTENTA la validacion con backoff acotado; solo una validacion exitosa
 *    concede acceso.
 *  - Ante un token CRIPTOGRAFICAMENTE invalido o EXPIRADO, DENIEGA (401) sin
 *    reintentar.
 *
 * Autorizacion por rol (Req. 24.3, 24.4, 24.6):
 *  - OBSERVADOR: solo lectura.
 *  - ANALISTA: lectura y escritura (no admin).
 *  - ADMIN_PLATAFORMA: operaciones regulares + administrativas.
 */

/** Roles propios de la plataforma GDS, separados de los roles del colegio (Req. 24.2, 24.5). */
export enum RolGDS {
    ADMIN_PLATAFORMA = "ADMIN_PLATAFORMA",
    ANALISTA = "ANALISTA",
    OBSERVADOR = "OBSERVADOR",
}

/** Contexto de acceso resuelto tras una validacion de identidad exitosa. */
export interface ContextoAcceso {
    usuarioId: number;
    rol: RolGDS;
}

/** Acciones autorizables sobre la plataforma. */
export type AccionGDS = "leer" | "escribir" | "admin";

// ---------------------------------------------------------------------------
// Errores tipados que distinguen el fallo CRIPTOGRAFICO/EXPIRADO (no reintenta)
// del fallo TECNICO temporal (reintenta con backoff). Esta distincion es la que
// implementa la politica fail-closed del Req. 24.7/24.8.
// ---------------------------------------------------------------------------

/** Token ausente, malformado, criptograficamente invalido o expirado: NO se reintenta. */
export class ErrorTokenInvalido extends Error {
    constructor(message = "token_invalido") {
        super(message);
        this.name = "ErrorTokenInvalido";
    }
}

/** Fallo tecnico temporal (red / indisponibilidad): se reintenta con backoff. */
export class ErrorTecnicoValidacion extends Error {
    constructor(message = "error_tecnico_validacion") {
        super(message);
        this.name = "ErrorTecnicoValidacion";
    }
}

/** Acceso denegado final. `status` mapea a la respuesta HTTP del middleware. */
export class AccesoDenegadoError extends Error {
    readonly status: number;
    readonly motivo: string;
    constructor(status: number, motivo: string) {
        super(motivo);
        this.name = "AccesoDenegadoError";
        this.status = status;
        this.motivo = motivo;
    }
}

// ---------------------------------------------------------------------------
// Dependencias inyectables (verificador de JWT + almacen de roles + reloj).
// Permiten pruebas deterministas sin red ni esperas reales.
// ---------------------------------------------------------------------------

/** Payload minimo que el verificador debe devolver tras validar el JWT. */
export interface PayloadVerificado {
    /** Id del usuario del colegio (claim `userId` del JWT existente). */
    userId: number | string;
    [clave: string]: unknown;
}

/**
 * Verificador del JWT. Debe lanzar `ErrorTokenInvalido` ante un token
 * criptograficamente invalido o expirado, y `ErrorTecnicoValidacion` ante un
 * fallo tecnico temporal (Req. 24.7, 24.8).
 */
export interface VerificadorJwt {
    verificar(token: string): Promise<PayloadVerificado>;
}

/**
 * Almacen de roles GDS, resuelto contra la PROPIA base de datos del servicio.
 * Debe lanzar `ErrorTecnicoValidacion` ante un fallo tecnico (BD no disponible)
 * para activar la politica fail-closed con reintentos.
 */
export interface AlmacenRoles {
    /** Devuelve el rol de mayor privilegio del usuario, o `null` si no tiene rol GDS. */
    obtenerRol(idUsuario: string): Promise<RolGDS | null>;
}

/** Interfaz publica del Servicio_Autenticacion (segun design.md). */
export interface ServicioAutenticacion {
    /**
     * Valida el JWT existente y resuelve el rol GDS. Concede acceso UNICAMENTE
     * tras una validacion exitosa (fail-closed); ante fallo tecnico deniega y
     * reintenta con backoff, sin conceder ningun permiso, ni siquiera de solo
     * lectura (Req. 24.1, 24.2, 24.5, 24.7, 24.8).
     */
    autorizar(token: string | undefined): Promise<ContextoAcceso>;
    /** OBSERVADOR no escribe; operaciones admin solo ADMIN_PLATAFORMA (Req. 24.3, 24.4, 24.6). */
    puede(rol: RolGDS, accion: AccionGDS): boolean;
}

/** Opciones del servicio: reintentos/backoff acotados y reloj inyectable. */
export interface OpcionesServicioAutenticacion {
    /** Numero maximo de REINTENTOS adicionales ante fallo tecnico (default 3). */
    maxReintentos?: number;
    /** Base del backoff exponencial en ms (default 50ms). */
    backoffBaseMs?: number;
    /** Funcion de espera inyectable (default `setTimeout`). En pruebas: no-op. */
    dormir?: (ms: number) => Promise<void>;
}

const dormirPorDefecto = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Orden de privilegio (mayor a menor). Se usa para resolver el rol efectivo
 * cuando un usuario tiene varios roles asignados.
 */
const PRIVILEGIO: RolGDS[] = [
    RolGDS.ADMIN_PLATAFORMA,
    RolGDS.ANALISTA,
    RolGDS.OBSERVADOR,
];

/** Convierte una cadena en `RolGDS`, o `null` si no es un rol GDS valido. */
export function aRolGDS(valor: string): RolGDS | null {
    return (Object.values(RolGDS) as string[]).includes(valor)
        ? (valor as RolGDS)
        : null;
}

/** Devuelve el rol de mayor privilegio de una lista, ignorando los desconocidos. */
export function resolverRolMayorPrivilegio(roles: string[]): RolGDS | null {
    const validos = roles
        .map(aRolGDS)
        .filter((r): r is RolGDS => r !== null);
    for (const rol of PRIVILEGIO) {
        if (validos.includes(rol)) return rol;
    }
    return null;
}

/** Implementacion del Servicio_Autenticacion con dependencias inyectables. */
export class ServicioAutenticacionGDS implements ServicioAutenticacion {
    private readonly verificador: VerificadorJwt;
    private readonly almacenRoles: AlmacenRoles;
    private readonly maxReintentos: number;
    private readonly backoffBaseMs: number;
    private readonly dormir: (ms: number) => Promise<void>;

    constructor(
        verificador: VerificadorJwt,
        almacenRoles: AlmacenRoles,
        opciones: OpcionesServicioAutenticacion = {}
    ) {
        this.verificador = verificador;
        this.almacenRoles = almacenRoles;
        this.maxReintentos = opciones.maxReintentos ?? 3;
        this.backoffBaseMs = opciones.backoffBaseMs ?? 50;
        this.dormir = opciones.dormir ?? dormirPorDefecto;
    }

    async autorizar(token: string | undefined): Promise<ContextoAcceso> {
        // Token ausente o vacio: denegacion inmediata sin reintentar (fail-closed).
        if (token === undefined || token.trim() === "") {
            throw new AccesoDenegadoError(401, "token_ausente");
        }
        const limpio = token.startsWith("Bearer ")
            ? token.slice("Bearer ".length).trim()
            : token.trim();
        if (limpio === "") {
            throw new AccesoDenegadoError(401, "token_ausente");
        }

        // 1) Validar la identidad (JWT). Solo reintenta ante fallo TECNICO.
        let payload: PayloadVerificado;
        try {
            payload = await this.intentarConBackoff(() =>
                this.verificador.verificar(limpio)
            );
        } catch (error) {
            if (error instanceof ErrorTokenInvalido) {
                // Criptografico / expirado -> 401 sin acceso (no se reintento).
                throw new AccesoDenegadoError(401, error.message);
            }
            // Tecnico agotado tras backoff -> denegar (fail-closed, Req. 24.7).
            throw new AccesoDenegadoError(503, "validacion_no_disponible");
        }

        // 2) Resolver el rol GDS en la PROPIA base de datos del servicio.
        let rol: RolGDS | null;
        try {
            rol = await this.intentarConBackoff(() =>
                this.almacenRoles.obtenerRol(String(payload.userId))
            );
        } catch {
            // Fallo tecnico al resolver el rol -> denegar (fail-closed, Req. 24.7).
            throw new AccesoDenegadoError(503, "roles_no_disponibles");
        }

        // Usuario valido pero sin rol GDS: sin acceso (ni de solo lectura).
        if (rol === null) {
            throw new AccesoDenegadoError(403, "sin_rol_gds");
        }

        // 3) Acceso concedido SOLO tras validacion exitosa (Req. 24.8).
        return { usuarioId: Number(payload.userId), rol };
    }

    puede(rol: RolGDS, accion: AccionGDS): boolean {
        switch (accion) {
            case "leer":
                // Todos los roles GDS pueden leer.
                return (
                    rol === RolGDS.ADMIN_PLATAFORMA ||
                    rol === RolGDS.ANALISTA ||
                    rol === RolGDS.OBSERVADOR
                );
            case "escribir":
                // OBSERVADOR NO escribe (Req. 24.3).
                return (
                    rol === RolGDS.ADMIN_PLATAFORMA || rol === RolGDS.ANALISTA
                );
            case "admin":
                // Operaciones administrativas solo ADMIN_PLATAFORMA (Req. 24.4, 24.6).
                return rol === RolGDS.ADMIN_PLATAFORMA;
            default:
                // Accion desconocida: fail-closed.
                return false;
        }
    }

    /**
     * Ejecuta `op` reintentando con backoff exponencial acotado SOLO ante
     * fallos tecnicos. Un `ErrorTokenInvalido` se propaga de inmediato sin
     * reintentar (token criptografico/expirado, Req. 24.7).
     */
    private async intentarConBackoff<T>(op: () => Promise<T>): Promise<T> {
        let ultimoError: unknown;
        for (let intento = 0; intento <= this.maxReintentos; intento++) {
            try {
                return await op();
            } catch (error) {
                if (error instanceof ErrorTokenInvalido) {
                    throw error; // criptografico / expirado -> sin reintento
                }
                ultimoError = error;
                if (intento < this.maxReintentos) {
                    await this.dormir(this.backoffBaseMs * 2 ** intento);
                }
            }
        }
        throw ultimoError;
    }
}
