import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";
import { actualizarMatrizPorRol, getMatrizPorRol } from "../controllers/rolPermisos";

const router: Router = Router();

router.use(authMiddleware, requirePermiso("usuarios.permisos", "EDITOR"));

router.get("/:idRolCatalogo", errorHandler(getMatrizPorRol));
router.put(
    "/:idRolCatalogo",
    errorHandler(actualizarMatrizPorRol, { modulo: Modulos.PERMISOS, accion: Acciones.MODIFICO })
);

export default router;
