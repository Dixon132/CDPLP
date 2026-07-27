import { Router } from 'express';
import { getAllInstituciones, createInstitucion, updateInstitucion, deleteInstitucion } from '../controllers/institucion';

const router = Router();

router.get('/', getAllInstituciones);
router.post('/', createInstitucion);
router.put('/:id', updateInstitucion);
router.delete('/:id', deleteInstitucion);

export default router;
