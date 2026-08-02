import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import requirePermiso from "../../../middlewares/requirePermiso";
import { createInvitado, deleteInvitadoById, getInvitadoById, getInvitados, getInvitadosReportDetail, getInvitadosReportSummary, getInvitadosSimple, updateInvitadoById, updateEstadoInvitado } from "../controllers/invitados";
import { Acciones, Modulos } from "../../../types/auditoria";

const invitadosRouter: Router = Router()

invitadosRouter.use(requirePermiso('colegiados.invitados', 'OBSERVADOR'))

invitadosRouter.get('/', errorHandler(getInvitados))
invitadosRouter.post('/', requirePermiso('colegiados.invitados', 'EDITOR'), errorHandler(createInvitado, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
invitadosRouter.get('/:id', errorHandler(getInvitadoById))
invitadosRouter.put('/:id', requirePermiso('colegiados.invitados', 'EDITOR'), errorHandler(updateInvitadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
invitadosRouter.patch('/:id/estado', requirePermiso('colegiados.invitados', 'EDITOR'), errorHandler(updateEstadoInvitado, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
invitadosRouter.delete('/:id', requirePermiso('colegiados.invitados', 'EDITOR'), errorHandler(deleteInvitadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.ELIMINO }))
invitadosRouter.get('/simple/:id', errorHandler(getInvitadosSimple))
invitadosRouter.get('/reportSummary', errorHandler(getInvitadosReportSummary))
invitadosRouter.get('/report/:id', errorHandler(getInvitadosReportDetail))


export default invitadosRouter