import { Router } from 'express';
import institucionRoutes from './institucion';
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";

const router = Router();

// Todo el módulo requiere sesión del dashboard.
router.use(authMiddleware)
router.use(requirePermiso('ajustes.instituciones', 'OBSERVADOR'))

router.use('/', institucionRoutes);

export default router;
