import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getActivas, getAdmin, create, update, toggleEstado } from "../controllers/especialidades";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const especialidadesRouter: Router = Router();

// Público: lista de especialidades activas (usada en selects de postulación/colegiados)
especialidadesRouter.get("/", errorHandler(getActivas));

// Admin: todas las especialidades (activas e inactivas)
especialidadesRouter.get("/admin", [authMiddleware, requirePermiso('ajustes.especialidades', 'OBSERVADOR')], errorHandler(getAdmin));

// Protegidas: requieren sesión de admin
especialidadesRouter.post("/", [authMiddleware, requirePermiso('ajustes.especialidades', 'EDITOR')], errorHandler(create, { modulo: Modulos.CONFIGURACION, accion: Acciones.CREO }));
especialidadesRouter.put("/:id", [authMiddleware, requirePermiso('ajustes.especialidades', 'EDITOR')], errorHandler(update, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));
especialidadesRouter.patch("/:id/estado", [authMiddleware, requirePermiso('ajustes.especialidades', 'EDITOR')], errorHandler(toggleEstado, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));

export default especialidadesRouter;
