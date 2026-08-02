import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { getVencimientos, getResumenVencimientos } from "../controllers";

const vencimientosRouter: Router = Router();

// Reutiliza el recurso `colegiados`: el alcance de este motor hoy es solo
// colegiados y sus documentos, así que no hace falta un recurso nuevo en el
// catálogo de permisos.
vencimientosRouter.use(authMiddleware);
vencimientosRouter.use(requirePermiso("colegiados", "OBSERVADOR"));

vencimientosRouter.get("/", errorHandler(getVencimientos));
vencimientosRouter.get("/resumen", errorHandler(getResumenVencimientos));

export default vencimientosRouter;
