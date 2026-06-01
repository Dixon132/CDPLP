import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth";
import errorHandler from "../../../utils/error-handler";
import { createInvitado, deleteInvitadoById, getInvitadoById, getInvitados, getInvitadosReportDetail, getInvitadosReportSummary, getInvitadosSimple, updateInvitadoById } from "../controllers/invitados";

const invitadosRouter: Router = Router()

invitadosRouter.get('/', errorHandler(getInvitados))
invitadosRouter.post('/', errorHandler(createInvitado))
invitadosRouter.get('/:id', errorHandler(getInvitadoById))
invitadosRouter.put('/:id', errorHandler(updateInvitadoById))
invitadosRouter.delete('/:id', errorHandler(deleteInvitadoById))
invitadosRouter.get('/simple/:id', [authMiddleware], errorHandler(getInvitadosSimple))
invitadosRouter.get('/reportSummary', [authMiddleware], errorHandler(getInvitadosReportSummary))
invitadosRouter.get('/report/:id', [authMiddleware], errorHandler(getInvitadosReportDetail))


export default invitadosRouter