import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago } from "../controllers/pagos";
import { authMiddleware } from "../../../middlewares/auth";

const pagosRouter: Router = Router()

pagosRouter.get('/:id', [authMiddleware], errorHandler(getPagos))
pagosRouter.post('/:id', [authMiddleware], errorHandler(createPago))
pagosRouter.get('/getOne/:id', [authMiddleware], errorHandler(getPagoById))
pagosRouter.put('/update/:id', [authMiddleware], errorHandler(updatePago))

export default pagosRouter