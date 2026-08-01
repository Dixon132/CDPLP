import { Router } from "express";
import { validateBody } from "../../../middlewares/validate";
import errorHandler from "../../../utils/error-handler";
import { createPasante, deletePasanteById, getPasanteById, getPasantes, getPasantesSimple, updateEstadoById, updatePasanteById } from "../controllers/pasantes";
import { pasanteSchema } from "../schemas/pasantes";
import { Acciones, Modulos } from "../../../types/auditoria";


const pasantesRouter: Router = Router()

pasantesRouter.get('/', errorHandler(getPasantes))
pasantesRouter.post('/', [validateBody(pasanteSchema)], errorHandler(createPasante, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
pasantesRouter.get('/simple/:id', errorHandler(getPasantesSimple))
pasantesRouter.put('/estado/:id', errorHandler(updateEstadoById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
pasantesRouter.get('/:id', errorHandler(getPasanteById))
pasantesRouter.put('/:id', errorHandler(updatePasanteById, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }))
pasantesRouter.delete('/:id', errorHandler(deletePasanteById, { modulo: Modulos.COLEGIADOS, accion: Acciones.ELIMINO }))

export default pasantesRouter