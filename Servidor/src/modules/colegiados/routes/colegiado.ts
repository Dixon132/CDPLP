import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado, getColegiados, updateEstadoColegiadoById } from "../controllers/colegiado";
import { authMiddleware } from "../../../middlewares/auth";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', errorHandler(createColegiado))
colegiadoRouter.put('/:id', errorHandler(updateEstadoColegiadoById))


export default colegiadoRouter