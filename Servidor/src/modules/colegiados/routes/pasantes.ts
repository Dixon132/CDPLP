import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth";
import errorHandler from "../../../utils/error-handler";
import { createPasante, deletePasanteById, getPasanteById, getPasantes, getPasantesReportDetail, getPasantesReportSummary, getPasantesSimple, updateEstadoById, updateEstadoPasanteById, updatePasanteById } from "../controllers/pasantes";


const pasantesRouter: Router = Router()

pasantesRouter.get('/', [authMiddleware], errorHandler(getPasantes))
pasantesRouter.post('/', [authMiddleware], errorHandler(createPasante))
pasantesRouter.get('/:id', [authMiddleware], errorHandler(getPasanteById))
pasantesRouter.put('/estado/:id', [authMiddleware], errorHandler(updateEstadoById))
pasantesRouter.put('/:id', [authMiddleware], errorHandler(updatePasanteById))
pasantesRouter.delete('/:id', [authMiddleware], errorHandler(deletePasanteById))
pasantesRouter.get('/simple/:id', [authMiddleware], errorHandler(getPasantesSimple))
pasantesRouter.get('/', [authMiddleware], errorHandler(getPasantesReportSummary))
pasantesRouter.get('/', [authMiddleware], errorHandler(getPasantesReportDetail))
pasantesRouter.put('/', [authMiddleware], errorHandler(updateEstadoPasanteById))

export default pasantesRouter