import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado, getColegiadoById, getColegiadoReportDetail, getColegiados, getColegiadosReportSummary, getColegiadosSimple, getInvitadosSimple, updateColegiado, updateEstadoColegiadoById } from "../controllers/colegiado";
import { authMiddleware } from "../../../middlewares/auth";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', errorHandler(createColegiado))
colegiadoRouter.get('/report/summary', [authMiddleware], errorHandler(getColegiadosReportSummary))//REPORTES
colegiadoRouter.get('/:id/report', [authMiddleware], errorHandler(getColegiadoReportDetail))//REPORTES
colegiadoRouter.get('/getSimple', [authMiddleware], errorHandler(getColegiadosSimple))
colegiadoRouter.get('/getInvitados', [authMiddleware], errorHandler(getInvitadosSimple))
colegiadoRouter.get('/getOne/:id', errorHandler(getColegiadoById))
colegiadoRouter.put('/update/:id', [authMiddleware], errorHandler(updateColegiado))
colegiadoRouter.put('/:id', [authMiddleware], errorHandler(updateEstadoColegiadoById))


export default colegiadoRouter