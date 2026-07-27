import { Router } from 'express';
import institucionRoutes from './institucion';

const router = Router();

router.use('/', institucionRoutes);

export default router;
