import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createActInst, createAsistenciaInst, createRegistroInst, deleteAsistenciaInst, getActInst, getActInstById, getActividadesInstSummaryReport, getActividadInstDetailReport, getAsistenciasInstByActividad, getRegistrosInstByActividad, getRegistrosByUser, listarActividadesInstMinimal, updateActInstById, updateEstadoActInst, getCertificadoParticipacion } from "../controllers/ac-institucional";
import { authMiddleware } from "../../../middlewares/auth";

const actividadInstitucionalRouter: Router = Router()

actividadInstitucionalRouter.get('/', errorHandler(getActInst))
actividadInstitucionalRouter.post('/registrarColegiado', [authMiddleware], errorHandler(createRegistroInst))
actividadInstitucionalRouter.get('/lista-minimal', [authMiddleware], errorHandler(listarActividadesInstMinimal))
actividadInstitucionalRouter.get('/:id/report', [authMiddleware], errorHandler(getActividadInstDetailReport))
actividadInstitucionalRouter.get('/report', [authMiddleware], errorHandler(getActividadesInstSummaryReport))
actividadInstitucionalRouter.get('/getRegistros/:id', errorHandler(getRegistrosInstByActividad))
actividadInstitucionalRouter.get('/usuario/:id_colegiado', errorHandler(getRegistrosByUser))
actividadInstitucionalRouter.get('/getAsistencias/:id', errorHandler(getAsistenciasInstByActividad))
actividadInstitucionalRouter.get('/registro/:id/certificado', [authMiddleware], errorHandler(getCertificadoParticipacion))
actividadInstitucionalRouter.post('/createAsistencia', [authMiddleware], errorHandler(createAsistenciaInst))
actividadInstitucionalRouter.delete('/deleteAsistencia/:id', [authMiddleware], errorHandler(deleteAsistenciaInst))
actividadInstitucionalRouter.get('/:id', [authMiddleware], errorHandler(getActInstById))
actividadInstitucionalRouter.patch('/:id', [authMiddleware], errorHandler(updateActInstById))
actividadInstitucionalRouter.patch('/:id/estado', [authMiddleware], errorHandler(updateEstadoActInst))
actividadInstitucionalRouter.post('/', errorHandler(createActInst))

export default actividadInstitucionalRouter