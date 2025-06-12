import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createActInst, createAsistenciaInst, createRegistroInst, deleteAsistenciaInst, getActInst, getActInstById, getActividadesInstSummaryReport, getActividadInstDetailReport, getAsistenciasInstByActividad, getRegistrosInstByActividad, listarActividadesInstMinimal, updateActInstById, updateEstadoActInst } from "../controllers/ac-institucional";

const actividadInstitucionalRouter: Router = Router()

actividadInstitucionalRouter.get('/', errorHandler(getActInst))
actividadInstitucionalRouter.post('/registrarColegiado', errorHandler(createRegistroInst))
actividadInstitucionalRouter.post('/lista-minimal', errorHandler(listarActividadesInstMinimal))
actividadInstitucionalRouter.post('/:id/report', errorHandler(getActividadInstDetailReport))
actividadInstitucionalRouter.post('/report', errorHandler(getActividadesInstSummaryReport))
actividadInstitucionalRouter.get('/getRegistros/:id', errorHandler(getRegistrosInstByActividad))
actividadInstitucionalRouter.get('/getAsistencias/:id', errorHandler(getAsistenciasInstByActividad))
actividadInstitucionalRouter.post('/createAsistencia', errorHandler(createAsistenciaInst))
actividadInstitucionalRouter.delete('/deleteAsistencia/:id', errorHandler(deleteAsistenciaInst))
actividadInstitucionalRouter.get('/:id', errorHandler(getActInstById))
actividadInstitucionalRouter.patch('/:id', errorHandler(updateActInstById))
actividadInstitucionalRouter.patch('/:id/estado', errorHandler(updateEstadoActInst))
actividadInstitucionalRouter.post('/', errorHandler(createActInst))

export default actividadInstitucionalRouter