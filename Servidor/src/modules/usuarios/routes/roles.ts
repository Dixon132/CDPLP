import { Router } from "express";
import { createRole, getRolById, getRoles, updateRol, updateRoleById } from "../controllers/roles";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const rolesRouter: Router = Router()

// La gestión de roles es exclusivamente administrativa.
rolesRouter.use(authMiddleware)

rolesRouter.get('/', errorHandler(getRoles))
rolesRouter.get('/:id', errorHandler(getRolById))
rolesRouter.post('/', errorHandler(createRole, { modulo: Modulos.USUARIOS, accion: Acciones.CREO }))
rolesRouter.put('/:id', errorHandler(updateRoleById, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
rolesRouter.put('/update/:id', errorHandler(updateRol, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
export default rolesRouter