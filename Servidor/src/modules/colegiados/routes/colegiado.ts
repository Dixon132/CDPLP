import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createColegiado,  getColegiadoById, getColegiados,  getColegiadosReport,  updateColegiado, updateEstadoColegiadoById } from "../controllers/colegiado";
import { authMiddleware } from "../../../middlewares/auth";

const colegiadoRouter: Router = Router()

colegiadoRouter.get('/', errorHandler(getColegiados))
colegiadoRouter.post('/', errorHandler(createColegiado))
colegiadoRouter.put('/:id', errorHandler(updateEstadoColegiadoById))
colegiadoRouter.put('/update/:id', errorHandler(updateColegiado))
colegiadoRouter.get('/getOne/:id', errorHandler(getColegiadoById))
colegiadoRouter.get('/report', errorHandler(getColegiadosReport))


export default colegiadoRouter