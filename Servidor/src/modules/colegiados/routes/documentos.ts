import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createDoc, getAllDocsById, obtenerUrlFirmada } from "../controllers/documentos";
import { upload } from "../../../middlewares/multer";

const documentosRouter:Router = Router()

documentosRouter.get('/:id',errorHandler(getAllDocsById))
documentosRouter.post('/:id',upload.single("archivo") , errorHandler(createDoc))
documentosRouter.get("/ver/:id", errorHandler(obtenerUrlFirmada));

export default documentosRouter