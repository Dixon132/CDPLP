import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { createDoc, getAllDocsById, getDocumentoById, getEspecificDocumentoById, obtenerUrlFirmada, updateDocumento } from "../controllers/documentos";
import { upload } from "../../../middlewares/multer";

const documentosRouter:Router = Router()

documentosRouter.get('/:id',errorHandler(getAllDocsById))
documentosRouter.post('/:id',upload.single("archivo") , errorHandler(createDoc))
documentosRouter.get("/ver/:id", errorHandler(obtenerUrlFirmada));
documentosRouter.get("/getOne/:id", errorHandler(getDocumentoById));
documentosRouter.get("/especifico/:id", errorHandler(getEspecificDocumentoById));
documentosRouter.put("/update/:id", errorHandler(updateDocumento));

export default documentosRouter