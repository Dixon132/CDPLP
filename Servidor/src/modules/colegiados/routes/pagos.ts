import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createPago, getPagos } from "../controllers/pagos";

const pagosRouter: Router= Router()

pagosRouter.get('/:id', errorHandler(getPagos))
pagosRouter.post('/:id', errorHandler(createPago))

export default pagosRouter