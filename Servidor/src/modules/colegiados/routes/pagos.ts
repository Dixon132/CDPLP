import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago } from "../controllers/pagos";
import { authMiddleware } from "../../../middlewares/auth";

import multer from "multer";

const pagosRouter: Router = Router()
const upload = multer({ storage: multer.memoryStorage() });

pagosRouter.get('/:id', errorHandler(getPagos))
pagosRouter.post('/:id', upload.single('comprobante'), errorHandler(createPago))
pagosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosRouter.put('/update/:id', errorHandler(updatePago))

export default pagosRouter