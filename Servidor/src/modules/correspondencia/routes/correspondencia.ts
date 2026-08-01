import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { changeEstadoCorrespondencia, createCorrespondencia, deleteCorrespondencia, getAllBuzon, getContenido, getCorrespondencia, getCorrespondenciaById, getCorrespondenciaReport, listarUsuariosMinimal, marcarVisto, updateCorrespondencia, verDocFirmado } from "../controllers/correspondencia";
import { upload } from "../../../middlewares/multer";
import { Acciones, Modulos } from "../../../types/auditoria";

const correspondenciaRoutes: Router = Router();

correspondenciaRoutes.get('/', errorHandler(getCorrespondencia))
correspondenciaRoutes.post('/', upload.single("contenido"), errorHandler(createCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.REGISTRO }))
correspondenciaRoutes.get('/report', errorHandler(getCorrespondenciaReport))
correspondenciaRoutes.get('/lista-minimal', errorHandler(listarUsuariosMinimal))

correspondenciaRoutes.get('/getAll', errorHandler(getAllBuzon))
correspondenciaRoutes.get('/getContenido/:id', errorHandler(getContenido))
correspondenciaRoutes.put('/marcarVisto/:id', errorHandler(marcarVisto, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))
correspondenciaRoutes.delete('/eliminar/:id', errorHandler(deleteCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.ELIMINO }))
correspondenciaRoutes.put('/cambiarEstado/:id', errorHandler(changeEstadoCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))



correspondenciaRoutes.get('/getOne/:id', errorHandler(getCorrespondenciaById))
correspondenciaRoutes.put('/:id', errorHandler(updateCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))
correspondenciaRoutes.get("/ver/:id", errorHandler(verDocFirmado));

export default correspondenciaRoutes;

