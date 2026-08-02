import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";
import { getPermisosDeUsuario, restablecerOverride, upsertOverride } from "../controllers/usuarioPermisos";

const router: Router = Router();

router.use(authMiddleware, requirePermiso("usuarios.permisos", "EDITOR"));

router.get("/:idUsuario", errorHandler(getPermisosDeUsuario));
router.put("/:idUsuario", errorHandler(upsertOverride, { modulo: Modulos.PERMISOS, accion: Acciones.MODIFICO }));
router.delete(
    "/:idUsuario/:idRecurso",
    errorHandler(restablecerOverride, { modulo: Modulos.PERMISOS, accion: Acciones.MODIFICO })
);

export default router;
