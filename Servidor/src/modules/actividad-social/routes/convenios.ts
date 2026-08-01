import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { cambiarEstadoConvenio, createConvenio, getAllConvenios, getConvenioById, getSimpleConvenios, updateConvenio } from "../controllers/convenios";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const conveniosRoutes: Router = Router();

// La gestión de convenios es administrativa.
conveniosRoutes.use(authMiddleware)

conveniosRoutes.get('/', errorHandler(getAllConvenios))
conveniosRoutes.post('/', errorHandler(createConvenio, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.CREO }))
conveniosRoutes.get('/getSimple', errorHandler(getSimpleConvenios))
conveniosRoutes.put('/cambiarEstado/:id', errorHandler(cambiarEstadoConvenio, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
conveniosRoutes.put('/:id', errorHandler(updateConvenio, { modulo: Modulos.ACT_SOCIALES, accion: Acciones.MODIFICO }))
conveniosRoutes.get('/:id', errorHandler(getConvenioById))

export default conveniosRoutes;