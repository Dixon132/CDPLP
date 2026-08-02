import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import { getMisPermisos } from "../controllers/misPermisos";

const router: Router = Router();

// Todo usuario con sesión necesita conocer sus propios permisos; no lleva requirePermiso.
router.get("/", authMiddleware, errorHandler(getMisPermisos));

export default router;
