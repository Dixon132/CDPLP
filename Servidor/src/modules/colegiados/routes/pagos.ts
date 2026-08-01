import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago, obtenerUrlComprobante } from "../controllers/pagos";
import { Acciones, Modulos } from "../../../types/auditoria";

import multer from "multer";

const pagosRouter: Router = Router()
const upload = multer({ storage: multer.memoryStorage() });

pagosRouter.get('/:id', errorHandler(getPagos))
pagosRouter.post('/:id', [upload.single('comprobante')], errorHandler(createPago, { modulo: Modulos.FINANCIERO, accion: Acciones.REGISTRO }))
pagosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosRouter.get('/ver/:id', errorHandler(obtenerUrlComprobante))
pagosRouter.put('/update/:id', errorHandler(updatePago, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }))

export default pagosRouter