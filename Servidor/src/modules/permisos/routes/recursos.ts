import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { getArbolRecursos } from "../controllers/recursos";

const router: Router = Router();

router.get("/", authMiddleware, requirePermiso("usuarios.permisos", "EDITOR"), errorHandler(getArbolRecursos));

export default router;
