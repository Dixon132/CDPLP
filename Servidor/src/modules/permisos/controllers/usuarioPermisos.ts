import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { describir } from "../../../utils/auditoria";
import { overrideUsuarioSchema } from "../schemas/permisos";
import { NivelAcceso } from "../../../../generated/prisma";

/**
 * GET /permisos/usuarios/:idUsuario — permisos de un usuario, por cada recurso:
 * el nivel heredado de su rol vigente, el override si existe, el nivel
 * efectivo, y si está personalizado (para que la UI marque "Heredado" vs
 * "Personalizado" y ofrezca "Restablecer al rol").
 */
export const getPermisosDeUsuario = async (req: Request, res: Response) => {
    const idUsuario = Number(req.params.idUsuario);
    const hoy = new Date();

    const [recursos, overrides, rolVigente] = await Promise.all([
        prismaClient.recursos.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
        prismaClient.usuario_permisos.findMany({ where: { id_usuario: idUsuario } }),
        prismaClient.roles.findFirst({
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
            include: { catalogo_roles: true },
        }),
    ]);

    const permisosRol = rolVigente?.id_rol_catalogo
        ? await prismaClient.rol_permisos.findMany({ where: { id_rol_catalogo: rolVigente.id_rol_catalogo } })
        : [];

    const overrideMap = new Map(overrides.map((o) => [o.id_recurso, o.nivel]));
    const rolMap = new Map(permisosRol.map((p) => [p.id_recurso, p.nivel]));

    const permisos = recursos.map((r) => {
        const heredado = rolMap.get(r.id_recurso) ?? ("SIN_ACCESO" as NivelAcceso);
        const override = overrideMap.get(r.id_recurso);
        return {
            id_recurso: r.id_recurso,
            clave: r.clave,
            nombre: r.nombre,
            id_padre: r.id_padre,
            nivel_heredado: heredado,
            nivel_override: override ?? null,
            nivel_efectivo: override ?? heredado,
            personalizado: override !== undefined,
        };
    });

    res.status(200).json({
        rol: rolVigente?.catalogo_roles ?? null,
        permisos,
    });
};

/** PUT /permisos/usuarios/:idUsuario — crea o actualiza un override puntual sobre un recurso. */
export const upsertOverride = async (req: Request, res: Response) => {
    const idUsuario = Number(req.params.idUsuario);
    const { id_recurso, nivel } = overrideUsuarioSchema.parse(req.body);

    const recurso = await prismaClient.recursos.findUniqueOrThrow({ where: { id_recurso } });
    const usuario = await prismaClient.usuarios.findUniqueOrThrow({ where: { id_usuario: idUsuario } });

    const override = await prismaClient.usuario_permisos.upsert({
        where: { id_usuario_id_recurso: { id_usuario: idUsuario, id_recurso } },
        update: { nivel },
        create: { id_usuario: idUsuario, id_recurso, nivel },
    });

    describir(
        res,
        `Personalizó el permiso de ${usuario.nombre} ${usuario.apellido} sobre "${recurso.nombre}" a ${nivel}`
    );
    res.status(200).json(override);
};

/** DELETE /permisos/usuarios/:idUsuario/:idRecurso — borra el override y restablece el nivel del rol. */
export const restablecerOverride = async (req: Request, res: Response) => {
    const idUsuario = Number(req.params.idUsuario);
    const idRecurso = Number(req.params.idRecurso);

    const recurso = await prismaClient.recursos.findUniqueOrThrow({ where: { id_recurso: idRecurso } });
    const usuario = await prismaClient.usuarios.findUniqueOrThrow({ where: { id_usuario: idUsuario } });

    await prismaClient.usuario_permisos.deleteMany({
        where: { id_usuario: idUsuario, id_recurso: idRecurso },
    });

    describir(
        res,
        `Restableció el permiso de ${usuario.nombre} ${usuario.apellido} sobre "${recurso.nombre}" al de su rol`
    );
    res.status(200).json({ message: "Permiso restablecido al del rol" });
};
