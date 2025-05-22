import { Router } from "express";
import {  createRole, getRoles, updateRol, updateRoleById } from "../controllers/roles";
import errorHandler from "../../../utils/error-handler";

const rolesRouter: Router = Router()

rolesRouter.get('/', errorHandler(getRoles))
rolesRouter.post('/', errorHandler(createRole))
rolesRouter.put('/:id', errorHandler(updateRoleById))
rolesRouter.put('/update/:id', errorHandler(updateRol))
export default rolesRouter