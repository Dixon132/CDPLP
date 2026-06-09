/**
 * Rutas Express del `Gestor_Instituciones` bajo `/api/gds/instituciones`.
 *
 * Quedan protegidas por el middleware de autenticacion del servicio
 * (`requireAuth`, montado en `app.ts` sobre `/api/gds/*`), que valida el JWT
 * del colegio y resuelve el rol GDS contra la BD dedicada (Req. 24). El
 * `req.contextoAcceso` resuelto se usa como actor de auditoria (Req. 7.5).
 *
 * Endpoints:
 *  - GET    /                  lista de instituciones
 *  - GET    /:id               detalle de una institucion
 *  - GET    /:id/restricciones restricciones de eliminacion (proactivo, Req. 7.8)
 *  - POST   /                  alta (Req. 7.1)
 *  - PUT    /:id               edicion (Req. 7.5)
 *  - DELETE /:id               baja con rechazo atomico si referenciada (Req. 7.6)
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */
import { Router, type Request, type Response } from "express";
import type { RequestConAcceso } from "../../middlewares/auth";
import { GestorInstituciones } from "./gestorInstituciones";
import {
    InstitucionConDependenciasError,
    InstitucionNoEncontradaError,
    ValidacionInstitucionError,
} from "./instituciones.errores";

/** Traduce un error de dominio a la respuesta HTTP adecuada. */
function responderError(res: Response, error: unknown): void {
    if (error instanceof ValidacionInstitucionError) {
        res.status(400).json({ error: "datos_invalidos", detalles: error.detalles });
        return;
    }
    if (error instanceof InstitucionNoEncontradaError) {
        res.status(404).json({ error: "no_encontrada", institucionId: error.institucionId });
        return;
    }
    if (error instanceof InstitucionConDependenciasError) {
        res.status(409).json({
            error: "institucion_con_dependencias",
            institucionId: error.institucionId,
            dependencias: error.dependencias,
            mensaje: error.message,
        });
        return;
    }
    const mensaje = error instanceof Error ? error.message : "Error interno";
    res.status(500).json({ error: mensaje });
}

/** Extrae el id del actor (usuario del JWT) del contexto de acceso, si existe. */
function actorDe(req: Request): number | string | undefined {
    return (req as RequestConAcceso).contextoAcceso?.usuarioId;
}

/**
 * Crea el router de instituciones. Permite inyectar un `Gestor_Instituciones`
 * para pruebas; por defecto usa el gestor respaldado por Prisma.
 */
export function crearRouterInstituciones(
    gestor: GestorInstituciones = new GestorInstituciones(),
): Router {
    const router = Router();

    router.get("/", async (_req: Request, res: Response) => {
        try {
            res.status(200).json(await gestor.listar());
        } catch (error) {
            responderError(res, error);
        }
    });

    router.get("/:id/restricciones", async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id);
            res.status(200).json(await gestor.restriccionesEliminacion(id));
        } catch (error) {
            responderError(res, error);
        }
    });

    router.get("/:id", async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id);
            res.status(200).json(await gestor.obtener(id));
        } catch (error) {
            responderError(res, error);
        }
    });

    router.post("/", async (req: Request, res: Response) => {
        try {
            const institucion = await gestor.crear(req.body, actorDe(req));
            res.status(201).json(institucion);
        } catch (error) {
            responderError(res, error);
        }
    });

    router.put("/:id", async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id);
            const institucion = await gestor.actualizar(id, req.body, actorDe(req));
            res.status(200).json(institucion);
        } catch (error) {
            responderError(res, error);
        }
    });

    router.delete("/:id", async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id);
            await gestor.eliminar(id, actorDe(req));
            res.status(204).send();
        } catch (error) {
            responderError(res, error);
        }
    });

    return router;
}

/** Router por defecto del modulo, respaldado por Prisma. */
const institucionesRouter = crearRouterInstituciones();
export default institucionesRouter;
