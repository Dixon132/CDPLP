import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import {
    asignarColegiado, asignarPasante, createActividadSocial, deleteActividadSocialById,
    getActividadesSociales, getActividadesSocialesSummaryReport, getActividadSocialById,
    getActividadSocialDetailReport, getActividadSocialesById, listarActividadesSocialesMinimal,
    updateActividadSocial, updateEstadoById,
    getAsignacionById, marcarEntrada, marcarSalida, updateMetaAsignacion,
    getAsignacionesByUser, updateEstadoAsignacion, resetHorasAsignacion
} from "../controllers/ac-social";

const actividadSocialRouter: Router = Router()

actividadSocialRouter.get('/', errorHandler(getActividadesSociales))
actividadSocialRouter.get('/lista-minimal', errorHandler(listarActividadesSocialesMinimal))
actividadSocialRouter.get('/report', errorHandler(getActividadesSocialesSummaryReport))
actividadSocialRouter.get('/:id/report', errorHandler(getActividadSocialDetailReport))
actividadSocialRouter.post('/asignarColegiado', errorHandler(asignarColegiado))
actividadSocialRouter.post('/asignarPasante', errorHandler(asignarPasante))
actividadSocialRouter.put('/update/:id', errorHandler(updateActividadSocial))
actividadSocialRouter.delete('/:id', errorHandler(deleteActividadSocialById))
actividadSocialRouter.get('/detalles/:id', errorHandler(getActividadSocialesById))
actividadSocialRouter.post('/:id/updateEstado', errorHandler(updateEstadoById))
actividadSocialRouter.post('/create', errorHandler(createActividadSocial))

// ─── Asignación / Marcaje ───────────────────────────────────────────────────
actividadSocialRouter.get('/usuario/:rol/:id', errorHandler(getAsignacionesByUser))
actividadSocialRouter.get('/asignacion/:id', errorHandler(getAsignacionById))
actividadSocialRouter.patch('/asignacion/:id/entrada', errorHandler(marcarEntrada))
actividadSocialRouter.patch('/asignacion/:id/salida', errorHandler(marcarSalida))
actividadSocialRouter.patch('/asignacion/:id/meta', errorHandler(updateMetaAsignacion))
actividadSocialRouter.patch('/asignacion/:id/estado', errorHandler(updateEstadoAsignacion))
actividadSocialRouter.patch('/asignacion/:id/reset-horas', errorHandler(resetHorasAsignacion))

// ─── Perfil (debe ir al final para no capturar /asignacion/:id) ─────────────
actividadSocialRouter.get('/:id', errorHandler(getActividadSocialById))

export default actividadSocialRouter

