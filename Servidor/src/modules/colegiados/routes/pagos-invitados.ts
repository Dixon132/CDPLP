import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago, obtenerUrlComprobante } from "../controllers/pagos-invitados";
import { authMiddleware } from "../../../middlewares/auth";

import multer from "multer";

const pagosInvitadosRouter: Router = Router()
const upload = multer({ storage: multer.memoryStorage() });

pagosInvitadosRouter.get('/:id', errorHandler(getPagos))
pagosInvitadosRouter.post('/:id', [authMiddleware, upload.single('comprobante')], errorHandler(createPago))
pagosInvitadosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosInvitadosRouter.get('/ver/:id', errorHandler(obtenerUrlComprobante))
pagosInvitadosRouter.put('/update/:id', [authMiddleware], errorHandler(updatePago))

export default pagosInvitadosRouter