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
import { authMiddleware } from "../../../middlewares/auth";
import { authDashboardOCampo } from "../../../middlewares/auth-campo";
import { Acciones, Modulos } from "../../../types/auditoria";

const actividadSocialRouter: Router = Router()

// ─── Marcaje: lo consumen la app de campo (token de PIN) y el dashboard ──────
// El wrapper de auditoría solo dispara si hay `req.user` (sesión de dashboard);
// el marcaje hecho desde la app de campo con token de PIN (`req.campo`) queda
// fuera a propósito, igual que las postulaciones públicas.
actividadSocialRouter.get('/usuario/:rol/:id', [authDashboardOCampo], errorHandler(getAsignacionesByUser))
actividadSocialRouter.get('/asignacion/:id', [authDashboardOCampo], errorHandler(getAsignacionById))
actividadSocialRouter.patch('/asignacion/:id/entrada', [authDashboardOCampo], errorHandler(marcarEntrada, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))
actividadSocialRouter.patch('/asignacion/:id/salida', [authDashboardOCampo], errorHandler(marcarSalida, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))

// ─── A partir de aquí, todo exige sesión del dashboard ──────────────────────
actividadSocialRouter.use(authMiddleware)

actividadSocialRouter.get('/', errorHandler(getActividadesSociales))
actividadSocialRouter.get('/lista-minimal', errorHandler(listarActividadesSocialesMinimal))
actividadSocialRouter.get('/report', errorHandler(getActividadesSocialesSummaryReport))
actividadSocialRouter.get('/:id/report', errorHandler(getActividadSocialDetailReport))
actividadSocialRouter.post('/asignarColegiado', errorHandler(asignarColegiado, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))
actividadSocialRouter.post('/asignarPasante', errorHandler(asignarPasante, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))
actividadSocialRouter.put('/update/:id', errorHandler(updateActividadSocial, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.delete('/:id', errorHandler(deleteActividadSocialById, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.ELIMINO }))
actividadSocialRouter.get('/detalles/:id', errorHandler(getActividadSocialesById))
actividadSocialRouter.post('/:id/updateEstado', errorHandler(updateEstadoById, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.post('/create', errorHandler(createActividadSocial, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.CREO }))

// ─── Asignación (solo administración) ───────────────────────────────────────
actividadSocialRouter.patch('/asignacion/:id/meta', errorHandler(updateMetaAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.patch('/asignacion/:id/estado', errorHandler(updateEstadoAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.patch('/asignacion/:id/reset-horas', errorHandler(resetHorasAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))

// ─── Perfil (debe ir al final para no capturar /asignacion/:id) ─────────────
actividadSocialRouter.get('/:id', errorHandler(getActividadSocialById))

export default actividadSocialRouter

