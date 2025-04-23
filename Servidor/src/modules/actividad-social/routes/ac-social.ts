import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createActividadSocial, getActividadesSociales, getActividadSocialById, updateEstadoById } from "../controllers/ac-social";

const actividadSocialRouter: Router = Router()

actividadSocialRouter.get('/', errorHandler(getActividadesSociales))
actividadSocialRouter.get('/:id', errorHandler(getActividadSocialById))
actividadSocialRouter.post('/:id/updateEstado', errorHandler(updateEstadoById))
actividadSocialRouter.post('/create', errorHandler(createActividadSocial))

export default actividadSocialRouter

