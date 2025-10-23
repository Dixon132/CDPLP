import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth";
import errorHandler from "../../../utils/error-handler";
import { createInvitado, deleteInvitadoById, getInvitadoById, getInvitados, getInvitadosReportDetail, getInvitadosReportSummary, getInvitadosSimple, updateInvitadoById } from "../controllers/invitados";

const invitadosRouter: Router = Router()

invitadosRouter.get('/', [authMiddleware], errorHandler(getInvitados))
invitadosRouter.post('/', [authMiddleware], errorHandler(createInvitado))
invitadosRouter.get('/:id', [authMiddleware], errorHandler(getInvitadoById))
invitadosRouter.put('/:id', [authMiddleware], errorHandler(updateInvitadoById))
invitadosRouter.delete('/:id', [authMiddleware], errorHandler(deleteInvitadoById))
invitadosRouter.get('/simple/:id', [authMiddleware], errorHandler(getInvitadosSimple))
invitadosRouter.get('/reportSummary', [authMiddleware], errorHandler(getInvitadosReportSummary))
invitadosRouter.get('/report/:id', [authMiddleware], errorHandler(getInvitadosReportDetail))


export default invitadosRouter