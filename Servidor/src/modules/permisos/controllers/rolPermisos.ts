import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { describir } from "../../../utils/auditoria";
import { matrizRolSchema } from "../schemas/permisos";
import { NivelAcceso } from "../../../../generated/prisma";

/** GET /permisos/rol-permisos/:idRolCatalogo — matriz resuelta (recursos sin fila -> SIN_ACCESO). */
export const getMatrizPorRol = async (req: Request, res: Response) => {
    const idRolCatalogo = Number(req.params.idRolCatalogo);
    const [recursos, permisos] = await Promise.all([
        prismaClient.recursos.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
        prismaClient.rol_permisos.findMany({ where: { id_rol_catalogo: idRolCatalogo } }),
    ]);
    const mapaNivel = new Map(permisos.map((p) => [p.id_recurso, p.nivel]));

    const matriz = recursos.map((r) => ({
        id_recurso: r.id_recurso,
        clave: r.clave,
        nombre: r.nombre,
        id_padre: r.id_padre,
        nivel: mapaNivel.get(r.id_recurso) ?? ("SIN_ACCESO" as NivelAcceso),
    }));

    res.status(200).json(matriz);
};

/** PUT /permisos/rol-permisos/:idRolCatalogo — upsert masivo de la matriz de un rol (plantilla por defecto). */
export const actualizarMatrizPorRol = async (req: Request, res: Response) => {
    const idRolCatalogo = Number(req.params.idRolCatalogo);
    const { permisos } = matrizRolSchema.parse(req.body);

    const rol = await prismaClient.catalogo_roles.findUniqueOrThrow({ where: { id_rol_catalogo: idRolCatalogo } });

    await prismaClient.$transaction(
        permisos.map((p) =>
            prismaClient.rol_permisos.upsert({
                where: { id_rol_catalogo_id_recurso: { id_rol_catalogo: idRolCatalogo, id_recurso: p.id_recurso } },
                update: { nivel: p.nivel },
                create: { id_rol_catalogo: idRolCatalogo, id_recurso: p.id_recurso, nivel: p.nivel },
            })
        )
    );

    describir(res, `Actualizó la matriz de permisos del rol "${rol.nombre}"`);
    res.status(200).json({ message: "Matriz de permisos actualizada" });
};
