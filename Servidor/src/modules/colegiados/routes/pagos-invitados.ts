import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago, obtenerUrlComprobante } from "../controllers/pagos-invitados";
import { Acciones, Modulos } from "../../../types/auditoria";

import multer from "multer";

const pagosInvitadosRouter: Router = Router()
const upload = multer({ storage: multer.memoryStorage() });

pagosInvitadosRouter.get('/:id', errorHandler(getPagos))
pagosInvitadosRouter.post('/:id', [upload.single('comprobante')], errorHandler(createPago, { modulo: Modulos.FINANCIERO, accion: Acciones.REGISTRO }))
pagosInvitadosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosInvitadosRouter.get('/ver/:id', errorHandler(obtenerUrlComprobante))
pagosInvitadosRouter.put('/update/:id', errorHandler(updatePago, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }))

export default pagosInvitadosRouter