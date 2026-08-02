import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import requirePermiso from "../../../middlewares/requirePermiso";
import { createDoc, getAllDocsById, getDocumentoById, getEspecificDocumentoById, obtenerUrlFirmada, updateDocumento, deleteDocumento } from "../controllers/documentos";
import { upload } from "../../../middlewares/multer";
import { Acciones, Modulos } from "../../../types/auditoria";

const documentosRouter:Router = Router()

documentosRouter.use(requirePermiso('colegiados', 'OBSERVADOR'))

documentosRouter.get('/:id',errorHandler(getAllDocsById))
documentosRouter.post('/:id', requirePermiso('colegiados', 'EDITOR'), upload.single("archivo"), errorHandler(createDoc, { modulo: Modulos.COLEGIADOS, accion: Acciones.CREO }))
documentosRouter.get("/ver/:id", errorHandler(obtenerUrlFirmada));
documentosRouter.get("/getOne/:id", errorHandler(getDocumentoById));
documentosRouter.get("/especifico/:id", errorHandler(getEspecificDocumentoById));
documentosRouter.put("/update/:id", requirePermiso('colegiados', 'EDITOR'), errorHandler(updateDocumento, { modulo: Modulos.COLEGIADOS, accion: Acciones.MODIFICO }));
documentosRouter.delete("/delete/:id", requirePermiso('colegiados', 'EDITOR'), errorHandler(deleteDocumento, { modulo: Modulos.COLEGIADOS, accion: Acciones.ELIMINO }));

export default documentosRouter