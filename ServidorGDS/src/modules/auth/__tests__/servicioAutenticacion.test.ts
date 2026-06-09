import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    AccesoDenegadoError,
    ErrorTecnicoValidacion,
    ErrorTokenInvalido,
    RolGDS,
    ServicioAutenticacionGDS,
    aRolGDS,
    resolverRolMayorPrivilegio,
    type AlmacenRoles,
    type PayloadVerificado,
    type VerificadorJwt,
} from "../servicioAutenticacion";
import { AlmacenRolesEnMemoria } from "../almacenRoles";

/**
 * Pruebas unitarias del Servicio_Autenticacion fail-closed y de la autorizacion
 * por rol GDS (Req. 24.1-24.8). Se usan dobles inyectables (verificador de JWT
 * y almacen de roles en memoria) y un `dormir` no-op para reintentos
 * deterministas sin red ni esperas reales.
 */

// --- Dobles de prueba ------------------------------------------------------

/** Verificador que devuelve un payload fijo tras N fallos tecnicos opcionales. */
class VerificadorDoble implements VerificadorJwt {
    llamadas = 0;
    constructor(
        private readonly comportamiento: (
            token: string,
            llamada: number
        ) => PayloadVerificado
    ) { }
    async verificar(token: string): Promise<PayloadVerificado> {
        this.llamadas += 1;
        return this.comportamiento(token, this.llamadas);
    }
}

/** Almacen que cuenta llamadas y puede simular fallos tecnicos. */
class AlmacenDoble implements AlmacenRoles {
    llamadas = 0;
    constructor(
        private readonly comportamiento: (
            idUsuario: string,
            llamada: number
        ) => RolGDS | null
    ) { }
    async obtenerRol(idUsuario: string): Promise<RolGDS | null> {
        this.llamadas += 1;
        return this.comportamiento(idUsuario, this.llamadas);
    }
}

const dormirNoOp = async (): Promise<void> => undefined;

function crearServicio(
    verificador: VerificadorJwt,
    almacen: AlmacenRoles,
    maxReintentos = 3
) {
    return new ServicioAutenticacionGDS(verificador, almacen, {
        maxReintentos,
        backoffBaseMs: 1,
        dormir: dormirNoOp,
    });
}

// --- puede(): matriz de autorizacion por rol -------------------------------

describe("puede(): autorizacion por rol GDS (Req. 24.3, 24.4, 24.6)", () => {
    const servicio = crearServicio(
        new VerificadorDoble(() => ({ userId: 1 })),
        new AlmacenRolesEnMemoria()
    );

    it("OBSERVADOR solo puede leer (no escribe, no admin)", () => {
        expect(servicio.puede(RolGDS.OBSERVADOR, "leer")).toBe(true);
        expect(servicio.puede(RolGDS.OBSERVADOR, "escribir")).toBe(false);
        expect(servicio.puede(RolGDS.OBSERVADOR, "admin")).toBe(false);
    });

    it("ANALISTA puede leer y escribir, pero no admin", () => {
        expect(servicio.puede(RolGDS.ANALISTA, "leer")).toBe(true);
        expect(servicio.puede(RolGDS.ANALISTA, "escribir")).toBe(true);
        expect(servicio.puede(RolGDS.ANALISTA, "admin")).toBe(false);
    });

    it("ADMIN_PLATAFORMA puede realizar operaciones regulares y admin", () => {
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, "leer")).toBe(true);
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, "escribir")).toBe(true);
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, "admin")).toBe(true);
    });
});

// --- Mapeo de roles --------------------------------------------------------

describe("mapeo y resolucion de roles GDS", () => {
    it("aRolGDS reconoce solo roles validos", () => {
        expect(aRolGDS("ADMIN_PLATAFORMA")).toBe(RolGDS.ADMIN_PLATAFORMA);
        expect(aRolGDS("ANALISTA")).toBe(RolGDS.ANALISTA);
        expect(aRolGDS("OBSERVADOR")).toBe(RolGDS.OBSERVADOR);
        expect(aRolGDS("ROL_DEL_COLEGIO")).toBeNull();
        expect(aRolGDS("")).toBeNull();
    });

    it("resolverRolMayorPrivilegio elige el rol de mayor privilegio e ignora desconocidos", () => {
        expect(
            resolverRolMayorPrivilegio(["OBSERVADOR", "ADMIN_PLATAFORMA"])
        ).toBe(RolGDS.ADMIN_PLATAFORMA);
        expect(resolverRolMayorPrivilegio(["OBSERVADOR", "ANALISTA"])).toBe(
            RolGDS.ANALISTA
        );
        expect(resolverRolMayorPrivilegio(["ADMIN_COLEGIO", "OBSERVADOR"])).toBe(
            RolGDS.OBSERVADOR
        );
        expect(resolverRolMayorPrivilegio(["DESCONOCIDO"])).toBeNull();
        expect(resolverRolMayorPrivilegio([])).toBeNull();
    });
});

// --- autorizar(): camino feliz y mapeo de rol ------------------------------

describe("autorizar(): concede acceso solo tras validacion exitosa (Req. 24.8)", () => {
    it("devuelve el ContextoAcceso con el rol resuelto en la BD propia", async () => {
        const almacen = new AlmacenRolesEnMemoria({ "42": RolGDS.ANALISTA });
        const servicio = crearServicio(
            new VerificadorDoble(() => ({ userId: 42 })),
            almacen
        );

        const ctx = await servicio.autorizar("Bearer token-valido");
        expect(ctx).toEqual({ usuarioId: 42, rol: RolGDS.ANALISTA });
    });

    it("acepta el token sin el prefijo 'Bearer '", async () => {
        const almacen = new AlmacenRolesEnMemoria({ "7": RolGDS.ADMIN_PLATAFORMA });
        const servicio = crearServicio(
            new VerificadorDoble(() => ({ userId: 7 })),
            almacen
        );
        const ctx = await servicio.autorizar("token-crudo");
        expect(ctx.rol).toBe(RolGDS.ADMIN_PLATAFORMA);
    });
});

// --- autorizar(): denegacion sin reintento (criptografico/expirado) --------

describe("autorizar(): token invalido o expirado deniega 401 sin reintentar (Req. 24.7)", () => {
    it("token ausente -> 401 sin tocar el verificador", async () => {
        const verificador = new VerificadorDoble(() => ({ userId: 1 }));
        const servicio = crearServicio(verificador, new AlmacenRolesEnMemoria());

        await expect(servicio.autorizar(undefined)).rejects.toMatchObject({
            status: 401,
            motivo: "token_ausente",
        });
        expect(verificador.llamadas).toBe(0);
    });

    it("token vacio -> 401", async () => {
        const servicio = crearServicio(
            new VerificadorDoble(() => ({ userId: 1 })),
            new AlmacenRolesEnMemoria()
        );
        await expect(servicio.autorizar("   ")).rejects.toBeInstanceOf(
            AccesoDenegadoError
        );
    });

    it("token criptografico/expirado -> 401 y NO se reintenta", async () => {
        const verificador = new VerificadorDoble(() => {
            throw new ErrorTokenInvalido("token_expirado");
        });
        const servicio = crearServicio(verificador, new AlmacenRolesEnMemoria());

        await expect(
            servicio.autorizar("Bearer expirado")
        ).rejects.toMatchObject({ status: 401, motivo: "token_expirado" });
        // Una sola llamada: NO hubo reintentos para fallo criptografico.
        expect(verificador.llamadas).toBe(1);
    });
});

// --- autorizar(): fail-closed ante fallo tecnico con reintentos ------------

describe("autorizar(): fail-closed ante fallo tecnico (Req. 24.7)", () => {
    it("reintenta con backoff acotado y deniega (503) si el fallo persiste", async () => {
        const verificador = new VerificadorDoble(() => {
            throw new ErrorTecnicoValidacion("red_caida");
        });
        const servicio = crearServicio(verificador, new AlmacenRolesEnMemoria(), 3);

        await expect(
            servicio.autorizar("Bearer token")
        ).rejects.toMatchObject({ status: 503 });
        // 1 intento inicial + 3 reintentos = 4 llamadas.
        expect(verificador.llamadas).toBe(4);
    });

    it("concede acceso si la validacion se recupera dentro del limite de reintentos", async () => {
        // Falla 2 veces (tecnico) y luego responde correctamente.
        const verificador = new VerificadorDoble((_t, llamada) => {
            if (llamada <= 2) throw new ErrorTecnicoValidacion("inestable");
            return { userId: 99 };
        });
        const almacen = new AlmacenRolesEnMemoria({ "99": RolGDS.OBSERVADOR });
        const servicio = crearServicio(verificador, almacen, 3);

        const ctx = await servicio.autorizar("Bearer token");
        expect(ctx).toEqual({ usuarioId: 99, rol: RolGDS.OBSERVADOR });
        expect(verificador.llamadas).toBe(3);
    });

    it("fallo tecnico al resolver el rol -> deniega (503) tras reintentos, sin acceso degradado", async () => {
        const almacen = new AlmacenDoble(() => {
            throw new ErrorTecnicoValidacion("bd_no_disponible");
        });
        const servicio = crearServicio(
            new VerificadorDoble(() => ({ userId: 5 })),
            almacen,
            2
        );

        await expect(
            servicio.autorizar("Bearer token")
        ).rejects.toMatchObject({ status: 503, motivo: "roles_no_disponibles" });
        // 1 intento + 2 reintentos.
        expect(almacen.llamadas).toBe(3);
    });
});

// --- autorizar(): usuario valido sin rol GDS -------------------------------

describe("autorizar(): usuario sin rol GDS no obtiene acceso (Req. 24.5, 24.8)", () => {
    it("token valido pero sin rol en la BD propia -> 403 (ni lectura)", async () => {
        const servicio = crearServicio(
            new VerificadorDoble(() => ({ userId: 1000 })),
            new AlmacenRolesEnMemoria() // sin roles
        );

        await expect(
            servicio.autorizar("Bearer token")
        ).rejects.toMatchObject({ status: 403, motivo: "sin_rol_gds" });
    });
});
