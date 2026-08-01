import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createInvitado, deleteInvitadoById, getInvitadoById, getInvitados, getInvitadosReportDetail, getInvitadosReportSummary, getInvitadosSimple, updateInvitadoById, updateEstadoInvitado } from "../controllers/invitados";
import { Acciones, Modulos } from "../../../types/auditoria";

const invitadosRouter: Router = Router()

invitadosRouter.get('/', errorHandler(getInvitados))
invitadosRouter.post('/', errorHandler(createInvitado, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
invitadosRouter.get('/:id', errorHandler(getInvitadoById))
invitadosRouter.put('/:id', errorHandler(updateInvitadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
invitadosRouter.patch('/:id/estado', errorHandler(updateEstadoInvitado, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
invitadosRouter.delete('/:id', errorHandler(deleteInvitadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.ELIMINO }))
invitadosRouter.get('/simple/:id', errorHandler(getInvitadosSimple))
invitadosRouter.get('/reportSummary', errorHandler(getInvitadosReportSummary))
invitadosRouter.get('/report/:id', errorHandler(getInvitadosReportDetail))


export default invitadosRouter