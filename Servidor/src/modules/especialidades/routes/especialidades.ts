import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getActivas, getAdmin, create, update, toggleEstado } from "../controllers/especialidades";
import { authMiddleware } from "../../../middlewares/auth";

const especialidadesRouter: Router = Router();

// Público: lista de especialidades activas (usada en selects de postulación/colegiados)
especialidadesRouter.get("/", errorHandler(getActivas));

// Admin: todas las especialidades (activas e inactivas)
especialidadesRouter.get("/admin", [authMiddleware], errorHandler(getAdmin));

// Protegidas: requieren sesión de admin
especialidadesRouter.post("/", [authMiddleware], errorHandler(create));
especialidadesRouter.put("/:id", [authMiddleware], errorHandler(update));
especialidadesRouter.patch("/:id/estado", [authMiddleware], errorHandler(toggleEstado));

export default especialidadesRouter;
