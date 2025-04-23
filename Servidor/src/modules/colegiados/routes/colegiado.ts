import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado, getColegiados, updateEstadoColegiadoById } from "../controllers/colegiado";
import { authMiddleware } from "../../../middlewares/auth";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', [authMiddleware],errorHandler(getColegiados))
colegiadoRouter.post('/', [authMiddleware],errorHandler(createColegiado))
colegiadoRouter.put('/:id', [authMiddleware],errorHandler(updateEstadoColegiadoById))


export default colegiadoRouter