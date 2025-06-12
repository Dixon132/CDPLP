import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado, getColegiadoById, getColegiadoReportDetail, getColegiados, getColegiadosReportSummary, getColegiadosSimple, getInvitadosSimple, updateColegiado, updateEstadoColegiadoById } from "../controllers/colegiado";
import { authMiddleware } from "../../../middlewares/auth";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', errorHandler(createColegiado))
colegiadoRouter.get('/report/summary', errorHandler(getColegiadosReportSummary))//REPORTES
colegiadoRouter.get('/:id/report', errorHandler(getColegiadoReportDetail))//REPORTES
colegiadoRouter.get('/getSimple', errorHandler(getColegiadosSimple))
colegiadoRouter.get('/getInvitados', errorHandler(getInvitadosSimple))
colegiadoRouter.get('/getOne/:id', errorHandler(getColegiadoById))
colegiadoRouter.put('/update/:id', errorHandler(updateColegiado))
colegiadoRouter.put('/:id', errorHandler(updateEstadoColegiadoById))


export default colegiadoRouter