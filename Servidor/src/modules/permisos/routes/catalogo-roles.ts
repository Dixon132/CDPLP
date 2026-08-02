import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";
import {
    createCatalogoRol,
    getCatalogoRoles,
    getCatalogoRolesActivos,
    toggleEstadoCatalogoRol,
    updateCatalogoRol,
} from "../controllers/catalogoRoles";

const router: Router = Router();

router.use(authMiddleware);

// Cualquier sesión de dashboard puede leer los roles activos (formulario de
// "asignar rol"); la gestión del catálogo en sí requiere permiso EDITOR.
router.get("/activos", errorHandler(getCatalogoRolesActivos));

router.use(requirePermiso("usuarios.permisos", "EDITOR"));

router.get("/", errorHandler(getCatalogoRoles));
router.post("/", errorHandler(createCatalogoRol, { modulo: Modulos.PERMISOS, accion: Acciones.CREO }));
router.put("/:id", errorHandler(updateCatalogoRol, { modulo: Modulos.PERMISOS, accion: Acciones.MODIFICO }));
router.patch(
    "/:id/estado",
    errorHandler(toggleEstadoCatalogoRol, { modulo: Modulos.PERMISOS, accion: Acciones.MODIFICO })
);

export default router;
