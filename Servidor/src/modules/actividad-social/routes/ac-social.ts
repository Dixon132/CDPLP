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
import requirePermiso from "../../../middlewares/requirePermiso";
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
actividadSocialRouter.use(requirePermiso('actividades_sociales', 'OBSERVADOR'))

actividadSocialRouter.get('/', errorHandler(getActividadesSociales))
actividadSocialRouter.get('/lista-minimal', errorHandler(listarActividadesSocialesMinimal))
actividadSocialRouter.get('/report', errorHandler(getActividadesSocialesSummaryReport))
actividadSocialRouter.get('/:id/report', errorHandler(getActividadSocialDetailReport))
actividadSocialRouter.post('/asignarColegiado', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(asignarColegiado, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))
actividadSocialRouter.post('/asignarPasante', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(asignarPasante, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.REGISTRO }))
actividadSocialRouter.put('/update/:id', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(updateActividadSocial, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.delete('/:id', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(deleteActividadSocialById, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.ELIMINO }))
actividadSocialRouter.get('/detalles/:id', errorHandler(getActividadSocialesById))
actividadSocialRouter.post('/:id/updateEstado', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(updateEstadoById, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.post('/create', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(createActividadSocial, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.CREO }))

// ─── Asignación (solo administración) ───────────────────────────────────────
actividadSocialRouter.patch('/asignacion/:id/meta', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(updateMetaAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.patch('/asignacion/:id/estado', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(updateEstadoAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
actividadSocialRouter.patch('/asignacion/:id/reset-horas', requirePermiso('actividades_sociales', 'EDITOR'), errorHandler(resetHorasAsignacion, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))

// ─── Perfil (debe ir al final para no capturar /asignacion/:id) ─────────────
actividadSocialRouter.get('/:id', errorHandler(getActividadSocialById))

export default actividadSocialRouter

