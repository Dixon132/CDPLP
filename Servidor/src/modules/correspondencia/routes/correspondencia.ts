import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { changeEstadoCorrespondencia, createCorrespondencia, deleteCorrespondencia, getAllBuzon, getContenido, getCorrespondencia, getCorrespondenciaById, getCorrespondenciaReport, listarUsuariosMinimal, marcarVisto, updateCorrespondencia, verDocFirmado } from "../controllers/correspondencia";
import { upload } from "../../../middlewares/multer";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const correspondenciaRoutes: Router = Router();

// `authMiddleware` ya corre a nivel del router padre (`correspondencia/routes/index.ts`).
// Este archivo mezcla dos recursos distintos: correspondencia propiamente
// dicha y el buzón (getAllBuzon/getContenido/marcarVisto), así que el permiso
// se aplica por ruta, no con un `.use()` global.
correspondenciaRoutes.get('/', requirePermiso('correspondencia', 'OBSERVADOR'), errorHandler(getCorrespondencia))
correspondenciaRoutes.post('/', requirePermiso('correspondencia', 'EDITOR'), upload.single("contenido"), errorHandler(createCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.REGISTRO }))
correspondenciaRoutes.get('/report', requirePermiso('correspondencia', 'OBSERVADOR'), errorHandler(getCorrespondenciaReport))
correspondenciaRoutes.get('/lista-minimal', requirePermiso('correspondencia', 'OBSERVADOR'), errorHandler(listarUsuariosMinimal))

correspondenciaRoutes.get('/getAll', requirePermiso('correspondencia.buzon', 'OBSERVADOR'), errorHandler(getAllBuzon))
correspondenciaRoutes.get('/getContenido/:id', requirePermiso('correspondencia.buzon', 'OBSERVADOR'), errorHandler(getContenido))
correspondenciaRoutes.put('/marcarVisto/:id', requirePermiso('correspondencia.buzon', 'EDITOR'), errorHandler(marcarVisto, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))
correspondenciaRoutes.delete('/eliminar/:id', requirePermiso('correspondencia', 'EDITOR'), errorHandler(deleteCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.ELIMINO }))
correspondenciaRoutes.put('/cambiarEstado/:id', requirePermiso('correspondencia', 'EDITOR'), errorHandler(changeEstadoCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))



correspondenciaRoutes.get('/getOne/:id', requirePermiso('correspondencia', 'OBSERVADOR'), errorHandler(getCorrespondenciaById))
correspondenciaRoutes.put('/:id', requirePermiso('correspondencia', 'EDITOR'), errorHandler(updateCorrespondencia, { modulo: Modulos.CORRESPONDENCIA, accion: Acciones.MODIFICO }))
correspondenciaRoutes.get("/ver/:id", requirePermiso('correspondencia', 'OBSERVADOR'), errorHandler(verDocFirmado));

export default correspondenciaRoutes;

