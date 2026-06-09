/**
 * Almacenes de roles GDS.
 *
 * El rol GDS de cada usuario se resuelve SIEMPRE contra la PROPIA base de datos
 * dedicada del servicio (`gds_usuario_plataforma` / `gds_rol_plataforma`),
 * NUNCA contra la base de datos del colegio (aislamiento total - Req. 25.3).
 */
import type { PrismaClient } from "@prisma/client";
import prisma from "../../utils/prismaClient";
import {
    ErrorTecnicoValidacion,
    resolverRolMayorPrivilegio,
    type AlmacenRoles,
    type RolGDS,
} from "./servicioAutenticacion";

/**
 * Almacen de roles respaldado por Prisma (BD dedicada del servicio).
 *
 * Ante un fallo tecnico de la BD lanza `ErrorTecnicoValidacion`, de modo que el
 * Servicio_Autenticacion aplique la politica fail-closed con reintentos y
 * backoff acotado (Req. 24.7).
 */
export class AlmacenRolesPrisma implements AlmacenRoles {
    private readonly cliente: PrismaClient;

    constructor(cliente: PrismaClient = prisma) {
        this.cliente = cliente;
    }

    async obtenerRol(idUsuario: string): Promise<RolGDS | null> {
        try {
            const usuario = await this.cliente.usuarioPlataforma.findUnique({
                where: { idUsuario },
                include: { roles: true },
            });
            if (!usuario || usuario.roles.length === 0) {
                return null;
            }
            return resolverRolMayorPrivilegio(usuario.roles.map((r) => r.rol));
        } catch (error) {
            // Indisponibilidad / fallo de red de la BD -> tecnico (reintentable).
            throw new ErrorTecnicoValidacion(
                error instanceof Error ? error.message : "bd_no_disponible"
            );
        }
    }
}

/**
 * Almacen de roles en memoria, util para pruebas deterministas y para sembrar
 * roles sin tocar la BD. La clave es el `idUsuario` (claim del JWT del colegio).
 */
export class AlmacenRolesEnMemoria implements AlmacenRoles {
    private readonly roles: Map<string, RolGDS>;

    constructor(inicial?: Record<string, RolGDS> | Map<string, RolGDS>) {
        this.roles =
            inicial instanceof Map
                ? new Map(inicial)
                : new Map(Object.entries(inicial ?? {}));
    }

    asignar(idUsuario: string, rol: RolGDS): void {
        this.roles.set(idUsuario, rol);
    }

    async obtenerRol(idUsuario: string): Promise<RolGDS | null> {
        return this.roles.get(idUsuario) ?? null;
    }
}
