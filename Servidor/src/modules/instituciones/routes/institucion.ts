import { Router } from 'express';
import { getAllInstituciones, createInstitucion, updateInstitucion, deleteInstitucion } from '../controllers/institucion';
import errorHandler from '../../../utils/error-handler';
import { Acciones, Modulos } from '../../../types/auditoria';

const router = Router();

router.get('/', errorHandler(getAllInstituciones));
router.post('/', errorHandler(createInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.CREO }));
router.put('/:id', errorHandler(updateInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.MODIFICO }));
router.delete('/:id', errorHandler(deleteInstitucion, { modulo: Modulos.INSTITUCIONES, accion: Acciones.ELIMINO }));

export default router;
