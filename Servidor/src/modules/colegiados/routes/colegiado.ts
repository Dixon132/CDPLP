import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import requirePermiso from "../../../middlewares/requirePermiso";
import { createColegiado, getColegiadoById, getColegiadoReportDetail, getColegiados, getColegiadosReportSummary, getColegiadosSimple, getInvitadosSimple, updateColegiado, updateEstadoColegiadoById } from "../controllers/colegiado";
import { Acciones, Modulos } from "../../../types/auditoria";

const colegiadoRouter: Router = Router()

colegiadoRouter.use(requirePermiso('colegiados', 'OBSERVADOR'))

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', requirePermiso('colegiados', 'EDITOR'), errorHandler(createColegiado, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
colegiadoRouter.get('/report/summary', errorHandler(getColegiadosReportSummary))//REPORTES
colegiadoRouter.get('/:id/report', errorHandler(getColegiadoReportDetail))//REPORTES
colegiadoRouter.get('/getSimple', errorHandler(getColegiadosSimple))
colegiadoRouter.get('/getInvitados', errorHandler(getInvitadosSimple))
colegiadoRouter.get('/getOne/:id', errorHandler(getColegiadoById))
colegiadoRouter.put('/update/:id', requirePermiso('colegiados', 'EDITOR'), errorHandler(updateColegiado, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
colegiadoRouter.put('/:id', requirePermiso('colegiados', 'EDITOR'), errorHandler(updateEstadoColegiadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))


export default colegiadoRouter