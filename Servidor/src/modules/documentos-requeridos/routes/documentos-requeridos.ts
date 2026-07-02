import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getActivos, getAdmin, create, update, toggleEstado } from "../controllers/documentos-requeridos";
import { authMiddleware } from "../../../middlewares/auth";

const documentosRequeridosRouter: Router = Router();

// Público: documentos activos ordenados por `orden` (usados en PostularPage step 3)
documentosRequeridosRouter.get("/", errorHandler(getActivos));

// Admin: todos los documentos (activos e inactivos)
documentosRequeridosRouter.get("/admin", [authMiddleware], errorHandler(getAdmin));

// Protegidas: requieren sesión de admin
documentosRequeridosRouter.post("/", [authMiddleware], errorHandler(create));
documentosRequeridosRouter.put("/:id", [authMiddleware], errorHandler(update));
documentosRequeridosRouter.patch("/:id/estado", [authMiddleware], errorHandler(toggleEstado));

export default documentosRequeridosRouter;
