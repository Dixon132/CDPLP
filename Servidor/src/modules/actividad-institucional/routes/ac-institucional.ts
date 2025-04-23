import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createActInst, getActInst, getActInstById, updateEstadoActInst } from "../controllers/ac-institucional";

const actividadInstitucionalRouter: Router = Router()

actividadInstitucionalRouter.get('/', errorHandler(getActInst))
actividadInstitucionalRouter.get('/:id', errorHandler(getActInstById))
actividadInstitucionalRouter.post('/:id', errorHandler(updateEstadoActInst))
actividadInstitucionalRouter.post('/create', errorHandler(createActInst))

export default actividadInstitucionalRouter