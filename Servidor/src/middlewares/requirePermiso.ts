import { NextFunction, Request, Response } from "express";
import ForbiddenException from "../exceptions/forbidden";
import { ErrorCodes } from "../exceptions/root";
import { NivelAcceso } from "../../generated/prisma";
import { nivelAlcanza, resolverPermisoEfectivo } from "../modules/permisos/services/resolverPermiso";

/**
 * Autorización real por permiso efectivo (rol + override de usuario). Va
 * SIEMPRE después de `authMiddleware` en la cadena de la ruta — nunca lo
 * reemplaza, porque asume que `req.user` ya fue resuelto.
 */
export const requirePermiso = (claveRecurso: string, nivelMinimo: NivelAcceso = "OBSERVADOR") =>
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ForbiddenException("No autorizado", ErrorCodes.FORBIDDEN));
        }
        const nivel = await resolverPermisoEfectivo(req.user.id_usuario, claveRecurso);
        if (!nivelAlcanza(nivel, nivelMinimo)) {
            return next(
                new ForbiddenException(`No tiene permiso suficiente sobre "${claveRecurso}"`, ErrorCodes.FORBIDDEN)
            );
        }
        next();
    };

export default requirePermiso;
