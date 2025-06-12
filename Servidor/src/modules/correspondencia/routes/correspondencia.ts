import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { changeEstadoCorrespondencia, createCorrespondencia, deleteCorrespondencia, getAllBuzon, getContenido, getCorrespondencia, getCorrespondenciaById, getCorrespondenciaReport, listarUsuariosMinimal, marcarVisto, updateCorrespondencia, verDocFirmado } from "../controllers/correspondencia";
import { upload } from "../../../middlewares/multer";

const correspondenciaRoutes: Router = Router();

correspondenciaRoutes.get('/', errorHandler(getCorrespondencia))
correspondenciaRoutes.post('/', upload.single("contenido"), errorHandler(createCorrespondencia))
correspondenciaRoutes.get('/report', errorHandler(getCorrespondenciaReport))
correspondenciaRoutes.get('/lista-minimal', errorHandler(listarUsuariosMinimal))

correspondenciaRoutes.get('/getAll', errorHandler(getAllBuzon))
correspondenciaRoutes.get('/getContenido/:id', errorHandler(getContenido))
correspondenciaRoutes.put('/marcarVisto/:id', errorHandler(marcarVisto))
correspondenciaRoutes.delete('/eliminar/:id', errorHandler(deleteCorrespondencia))
correspondenciaRoutes.put('/cambiarEstado/:id', errorHandler(changeEstadoCorrespondencia))



correspondenciaRoutes.get('/getOne/:id', errorHandler(getCorrespondenciaById))
correspondenciaRoutes.put('/:id', errorHandler(updateCorrespondencia))
correspondenciaRoutes.get("/ver/:id", errorHandler(verDocFirmado));

export default correspondenciaRoutes;

