import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createActInst, createAsistenciaInst, createRegistroInst, deleteAsistenciaInst, getActInst, getActInstById, getActividadesInstSummaryReport, getActividadInstDetailReport, getAsistenciasInstByActividad, getRegistrosInstByActividad, getRegistrosByUser, listarActividadesInstMinimal, updateActInstById, updateEstadoActInst, getCertificadoParticipacion, anularRegistroInst } from "../controllers/ac-institucional";
import { authMiddleware } from "../../../middlewares/auth";
import { authDashboardOCampo } from "../../../middlewares/auth-campo";
import { upload } from "../../../middlewares/multer";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const actividadInstitucionalRouter: Router = Router()

// ─── Lo consume la app de campo (token de PIN) además del dashboard ─────────
actividadInstitucionalRouter.get('/usuario/:id_colegiado', [authDashboardOCampo], errorHandler(getRegistrosByUser))

// ─── A partir de aquí, todo exige sesión del dashboard ──────────────────────
actividadInstitucionalRouter.use(authMiddleware)
actividadInstitucionalRouter.use(requirePermiso('actividades_institucionales', 'OBSERVADOR'))

actividadInstitucionalRouter.get('/', errorHandler(getActInst))
actividadInstitucionalRouter.post('/registrarColegiado', requirePermiso('actividades_institucionales', 'EDITOR'), [upload.single("comprobante")], errorHandler(createRegistroInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.REGISTRO }))
actividadInstitucionalRouter.get('/lista-minimal', errorHandler(listarActividadesInstMinimal))
actividadInstitucionalRouter.get('/:id/report', errorHandler(getActividadInstDetailReport))
actividadInstitucionalRouter.get('/report', errorHandler(getActividadesInstSummaryReport))
actividadInstitucionalRouter.get('/getRegistros/:id', errorHandler(getRegistrosInstByActividad))
actividadInstitucionalRouter.get('/getAsistencias/:id', errorHandler(getAsistenciasInstByActividad))
actividadInstitucionalRouter.get('/registro/:id/certificado', errorHandler(getCertificadoParticipacion))
actividadInstitucionalRouter.post('/createAsistencia', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(createAsistenciaInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.REGISTRO }))
actividadInstitucionalRouter.delete('/deleteAsistencia/:id', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(deleteAsistenciaInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.ELIMINO }))
actividadInstitucionalRouter.get('/:id', errorHandler(getActInstById))
actividadInstitucionalRouter.patch('/:id', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(updateActInstById, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.MODIFICO }))
actividadInstitucionalRouter.patch('/:id/estado', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(updateEstadoActInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.MODIFICO }))
actividadInstitucionalRouter.post('/anularRegistro/:id', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(anularRegistroInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.MODIFICO }))
actividadInstitucionalRouter.post('/', requirePermiso('actividades_institucionales', 'EDITOR'), errorHandler(createActInst, { modulo: Modulos.ACT_INSTITUCIONALES, accion: Acciones.CREO }))

export default actividadInstitucionalRouter