import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { asignarColegiado, createActividadSocial, getActividadesSociales, getActividadesSocialesSummaryReport, getActividadSocialById, getActividadSocialDetailReport, getActividadSocialesById, listarActividadesSocialesMinimal, updateActividadSocial, updateEstadoById } from "../controllers/ac-social";

const actividadSocialRouter: Router = Router()

actividadSocialRouter.get('/', errorHandler(getActividadesSociales))
actividadSocialRouter.get('/lista-minimal', errorHandler(listarActividadesSocialesMinimal))
actividadSocialRouter.get('/report', errorHandler(getActividadesSocialesSummaryReport))
actividadSocialRouter.get('/:id/report', errorHandler(getActividadSocialDetailReport))
actividadSocialRouter.post('/asignarColegiado', errorHandler(asignarColegiado))
actividadSocialRouter.put('/update/:id', errorHandler(updateActividadSocial))
actividadSocialRouter.get('/:id', errorHandler(getActividadSocialById))
actividadSocialRouter.post('/:id/updateEstado', errorHandler(updateEstadoById))
actividadSocialRouter.post('/create', errorHandler(createActividadSocial))
actividadSocialRouter.get('/detalles/:id', errorHandler(getActividadSocialesById))

export default actividadSocialRouter

