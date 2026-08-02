import prismaClient from "../../../utils/prismaClient";
import { NivelAcceso } from "../../../../generated/prisma";

const ORDEN_NIVEL: Record<NivelAcceso, number> = {
    SIN_ACCESO: 0,
    OBSERVADOR: 1,
    EDITOR: 2,
};

export const nivelAlcanza = (nivel: NivelAcceso, minimo: NivelAcceso): boolean =>
    ORDEN_NIVEL[nivel] >= ORDEN_NIVEL[minimo];

/**
 * Rol vigente de un usuario: el más reciente, activo y dentro de su vigencia
 * por fechas. Replica en el servidor la validación que hoy solo existe en el
 * cliente (`RequireRole.jsx`) — es exactamente el agujero de seguridad que
 * este módulo cierra: la vigencia del rol ya no depende de un chequeo que
 * cualquiera puede saltarse llamando a la API directo.
 */
const rolVigente = async (idUsuario: number) => {
    const hoy = new Date();
    return prismaClient.roles.findFirst({
        where: {
            id_usuario: idUsuario,
            activo: true,
            id_rol_catalogo: { not: null },
            AND: [
                { OR: [{ fecha_inicio: null }, { fecha_inicio: { lte: hoy } }] },
                { OR: [{ fecha_fin: null }, { fecha_fin: { gte: hoy } }] },
            ],
        },
        orderBy: { id_rol: "desc" },
    });
};

/**
 * Resuelve el nivel de acceso efectivo de un usuario sobre un recurso:
 * override individual (`usuario_permisos`) si existe -> si no, la plantilla
 * de su rol vigente (`rol_permisos`) -> si no, SIN_ACCESO (fail-closed).
 */
export const resolverPermisoEfectivo = async (
    idUsuario: number,
    claveRecurso: string
): Promise<NivelAcceso> => {
    const recurso = await prismaClient.recursos.findUnique({ where: { clave: claveRecurso } });
    if (!recurso || !recurso.activo) return "SIN_ACCESO";

    const override = await prismaClient.usuario_permisos.findUnique({
        where: { id_usuario_id_recurso: { id_usuario: idUsuario, id_recurso: recurso.id_recurso } },
    });
    if (override) return override.nivel;

    const rol = await rolVigente(idUsuario);
    if (!rol?.id_rol_catalogo) return "SIN_ACCESO";

    const permisoRol = await prismaClient.rol_permisos.findUnique({
        where: {
            id_rol_catalogo_id_recurso: { id_rol_catalogo: rol.id_rol_catalogo, id_recurso: recurso.id_recurso },
        },
    });
    return permisoRol?.nivel ?? "SIN_ACCESO";
};

/**
 * Igual que `resolverPermisoEfectivo` pero para todos los recursos activos a
 * la vez (usado por `GET /permisos/mis-permisos` tras el login).
 */
export const resolverMapaPermisos = async (idUsuario: number): Promise<Record<string, NivelAcceso>> => {
    const recursos = await prismaClient.recursos.findMany({ where: { activo: true } });
    const rol = await rolVigente(idUsuario);

    const [overrides, permisosRol] = await Promise.all([
        prismaClient.usuario_permisos.findMany({ where: { id_usuario: idUsuario } }),
        rol?.id_rol_catalogo
            ? prismaClient.rol_permisos.findMany({ where: { id_rol_catalogo: rol.id_rol_catalogo } })
            : Promise.resolve([]),
    ]);

    const overrideMap = new Map(overrides.map((o) => [o.id_recurso, o.nivel]));
    const rolMap = new Map(permisosRol.map((p) => [p.id_recurso, p.nivel]));

    const mapa: Record<string, NivelAcceso> = {};
    for (const recurso of recursos) {
        mapa[recurso.clave] = overrideMap.get(recurso.id_recurso) ?? rolMap.get(recurso.id_recurso) ?? "SIN_ACCESO";
    }
    return mapa;
};
