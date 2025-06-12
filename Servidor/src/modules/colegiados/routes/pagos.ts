import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagoById, getPagos, updatePago } from "../controllers/pagos";

const pagosRouter: Router= Router()

pagosRouter.get('/:id', errorHandler(getPagos))
pagosRouter.post('/:id', errorHandler(createPago))
pagosRouter.get('/getOne/:id', errorHandler(getPagoById))
pagosRouter.put('/update/:id', errorHandler(updatePago))

export default pagosRouter