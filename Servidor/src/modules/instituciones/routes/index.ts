import { Router } from 'express';
import institucionRoutes from './institucion';
import { authMiddleware } from "../../../middlewares/auth";

const router = Router();

// Todo el módulo requiere sesión del dashboard.
router.use(authMiddleware)

router.use('/', institucionRoutes);

export default router;
