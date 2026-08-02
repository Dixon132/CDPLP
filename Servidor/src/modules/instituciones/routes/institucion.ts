import { Router } from 'express';
import { getAllInstituciones, createInstitucion, updateInstitucion, deleteInstitucion } from '../controllers/institucion';
import errorHandler from '../../../utils/error-handler';
import requirePermiso from '../../../middlewares/requirePermiso';
import { Acciones, Modulos } from '../../../types/auditoria';

const router = Router();

// El permiso de lectura (OBSERVADOR) ya se aplica en `routes/index.ts`.
router.get('/', errorHandler(getAllInstituciones));
router.post('/', requirePermiso('ajustes.instituciones', 'EDITOR'), errorHandler(createInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.CREO }));
router.put('/:id', requirePermiso('ajustes.instituciones', 'EDITOR'), errorHandler(updateInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.MODIFICO }));
router.delete('/:id', requirePermiso('ajustes.instituciones', 'EDITOR'), errorHandler(deleteInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.ELIMINO }));

export default router;
