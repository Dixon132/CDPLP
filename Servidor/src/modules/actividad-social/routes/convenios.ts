import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createConvenio, getAllConvenios, getConvenioById, getSimpleConvenios, updateConvenio } from "../controllers/convenios";

const conveniosRoutes: Router = Router();

conveniosRoutes.get('/', errorHandler(getAllConvenios))
conveniosRoutes.post('/', errorHandler(createConvenio))
conveniosRoutes.get('/getSimple', errorHandler(getSimpleConvenios))
conveniosRoutes.put('/:id', errorHandler(updateConvenio))
conveniosRoutes.get('/:id', errorHandler(getConvenioById))

export default conveniosRoutes;