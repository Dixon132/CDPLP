import { Request, Response } from "express";
import { resolverMapaPermisos } from "../services/resolverPermiso";

/** GET /permisos/mis-permisos — mapa {clave_recurso: nivel} del usuario logueado. */
export const getMisPermisos = async (req: Request, res: Response) => {
    const permisos = await resolverMapaPermisos(req.user!.id_usuario);
    res.status(200).json(permisos);
};
