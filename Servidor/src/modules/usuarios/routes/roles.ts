import { Router } from "express";
import { getRoles, createRole, updateRoleById } from "../controllers/roles";
import errorHandler from "../../../utils/error-handler";

const rolesRouter: Router = Router()

rolesRouter.get('/', errorHandler(getRoles))
rolesRouter.post('/', errorHandler(createRole))
rolesRouter.put('/:id', errorHandler(updateRoleById))
export default rolesRouter