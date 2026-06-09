import { NextFunction, Request, Response } from "express";
import {
    AccesoDenegadoError,
    crearServicioAutenticacionPorDefecto,
    type AccionGDS,
    type ContextoAcceso,
    type ServicioAutenticacion,
} from "../modules/auth";

/**
 * Middleware de autenticacion del servicio ServidorGDS.
 *
 * Protege todas las rutas `/api/gds/*` validando el JWT del colegio (con el
 * `JWT_SECRET` compartido) y resolviendo el rol GDS contra la PROPIA base de
 * datos del servicio, bajo la politica fail-closed (Req. 24, 25.3).
 *
 * Exenta rutas publicas (por defecto el health-check `/health`) para permitir
 * el smoke de disponibilidad sin autenticacion.
 */

/** Extiende `Request` con el contexto de acceso resuelto. */
export interface RequestConAcceso extends Request {
    contextoAcceso?: ContextoAcceso;
}

export interface OpcionesMiddlewareAuth {
    /**
     * Rutas publicas (relativas al prefijo de montaje `/api/gds`) exentas de
     * autenticacion. Por defecto solo el health-check.
     */
    rutasPublicas?: string[];
}

/**
 * Crea el middleware de autenticacion a partir de un Servicio_Autenticacion.
 * Permite inyectar un servicio para pruebas; por defecto usa el servicio real.
 */
export function crearMiddlewareAuth(
    servicio: ServicioAutenticacion = crearServicioAutenticacionPorDefecto(),
    opciones: OpcionesMiddlewareAuth = {}
) {
    const rutasPublicas = new Set(opciones.rutasPublicas ?? ["/health"]);

    return async function autenticar(
        req: RequestConAcceso,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        // `req.path` es relativo al prefijo de montaje (`/api/gds`).
        if (rutasPublicas.has(req.path)) {
            next();
            return;
        }

        try {
            const contexto = await servicio.autorizar(req.headers.authorization);
            req.contextoAcceso = contexto;
            next();
        } catch (error) {
            if (error instanceof AccesoDenegadoError) {
                res.status(error.status).json({
                    error: "No autorizado",
                    motivo: error.motivo,
                });
                return;
            }
            // Cualquier otro error -> fail-closed (denegar).
            res.status(401).json({ error: "No autorizado" });
        }
    };
}

/**
 * Middleware factory para exigir un permiso concreto sobre el rol resuelto
 * (Req. 24.3, 24.4, 24.6). Debe usarse DESPUES de `crearMiddlewareAuth`.
 */
export function requierePermiso(
    servicio: ServicioAutenticacion,
    accion: AccionGDS
) {
    return function autorizarAccion(
        req: RequestConAcceso,
        res: Response,
        next: NextFunction
    ): void {
        const contexto = req.contextoAcceso;
        if (!contexto) {
            res.status(401).json({ error: "No autorizado" });
            return;
        }
        if (!servicio.puede(contexto.rol, accion)) {
            res.status(403).json({
                error: "Prohibido",
                motivo: "permiso_insuficiente",
            });
            return;
        }
        next();
    };
}

/**
 * Middleware de autenticacion por defecto del servicio. Mantiene el nombre
 * `requireAuth` como punto de extension estable usado por la app.
 */
export const requireAuth = crearMiddlewareAuth();
