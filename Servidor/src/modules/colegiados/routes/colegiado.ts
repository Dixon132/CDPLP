import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado, getColegiadoById, getColegiadoReportDetail, getColegiados, getColegiadosReportSummary, getColegiadosSimple, getInvitadosSimple, updateColegiado, updateEstadoColegiadoById } from "../controllers/colegiado";
import { Acciones, Modulos } from "../../../types/auditoria";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', errorHandler(createColegiado, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
colegiadoRouter.get('/report/summary', errorHandler(getColegiadosReportSummary))//REPORTES
colegiadoRouter.get('/:id/report', errorHandler(getColegiadoReportDetail))//REPORTES
colegiadoRouter.get('/getSimple', errorHandler(getColegiadosSimple))
colegiadoRouter.get('/getInvitados', errorHandler(getInvitadosSimple))
colegiadoRouter.get('/getOne/:id', errorHandler(getColegiadoById))
colegiadoRouter.put('/update/:id', errorHandler(updateColegiado, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
colegiadoRouter.put('/:id', errorHandler(updateEstadoColegiadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))


export default colegiadoRouter