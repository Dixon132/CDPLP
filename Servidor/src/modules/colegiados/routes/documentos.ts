import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createDoc, getAllDocsById } from "../controllers/documentos";

const documentosRouter:Router = Router()

documentosRouter.get('/:id', errorHandler(getAllDocsById))
documentosRouter.post('/:id', errorHandler(createDoc))

export default documentosRouter