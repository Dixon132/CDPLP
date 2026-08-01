import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getActivos, getAdmin, create, update, toggleEstado } from "../controllers/documentos-requeridos";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const documentosRequeridosRouter: Router = Router();

// Público: documentos activos ordenados por `orden` (usados en PostularPage step 3)
documentosRequeridosRouter.get("/", errorHandler(getActivos));

// Admin: todos los documentos (activos e inactivos)
documentosRequeridosRouter.get("/admin", [authMiddleware], errorHandler(getAdmin));

// Protegidas: requieren sesión de admin
documentosRequeridosRouter.post("/", [authMiddleware], errorHandler(create, { modulo: Modulos.CONFIGURACION, accion: Acciones.CREO }));
documentosRequeridosRouter.put("/:id", [authMiddleware], errorHandler(update, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));
documentosRequeridosRouter.patch("/:id/estado", [authMiddleware], errorHandler(toggleEstado, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));

export default documentosRequeridosRouter;
