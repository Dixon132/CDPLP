import { Router } from "express";
import { createRole, getRolById, getRoles, updateRol, updateRoleById } from "../controllers/roles";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const rolesRouter: Router = Router()

// La gestión de roles es exclusivamente administrativa.
rolesRouter.use(authMiddleware)

rolesRouter.get('/', requirePermiso('usuarios.roles', 'OBSERVADOR'), errorHandler(getRoles))
rolesRouter.get('/:id', requirePermiso('usuarios.roles', 'OBSERVADOR'), errorHandler(getRolById))
rolesRouter.post('/', requirePermiso('usuarios.roles', 'EDITOR'), errorHandler(createRole, { modulo: Modulos.USUARIOS, accion: Acciones.CREO }))
rolesRouter.put('/:id', requirePermiso('usuarios.roles', 'EDITOR'), errorHandler(updateRoleById, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
rolesRouter.put('/update/:id', requirePermiso('usuarios.roles', 'EDITOR'), errorHandler(updateRol, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
export default rolesRouter