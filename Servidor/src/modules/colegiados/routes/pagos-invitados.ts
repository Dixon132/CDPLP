import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import requirePermiso from "../../../middlewares/requirePermiso";
import { createPago, getPagoById, getPagos, updatePago, obtenerUrlComprobante } from "../controllers/pagos-invitados";
import { Acciones, Modulos } from "../../../types/auditoria";

import multer from "multer";

const pagosInvitadosRouter: Router = Router()
const upload = multer({ storage: multer.memoryStorage() });

pagosInvitadosRouter.use(requirePermiso('colegiados.invitados', 'OBSERVADOR'))

pagosInvitadosRouter.get('/:id', errorHandler(getPagos))
pagosInvitadosRouter.post('/:id', requirePermiso('colegiados.invitados', 'EDITOR'), [upload.single('comprobante')], errorHandler(createPago, { modulo: Modulos.FINANCIERO, accion: Acciones.REGISTRO }))
pagosInvitadosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosInvitadosRouter.get('/ver/:id', errorHandler(obtenerUrlComprobante))
pagosInvitadosRouter.put('/update/:id', requirePermiso('colegiados.invitados', 'EDITOR'), errorHandler(updatePago, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }))

export default pagosInvitadosRouter