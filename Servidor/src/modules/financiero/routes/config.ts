import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getPresupuestoActivo, setPresupuestoActivo } from "../controllers/config";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const configRouter: Router = Router()

// `authMiddleware` ya corre a nivel del router padre (`financiero/routes/index.ts`).
configRouter.get('/presupuesto-activo', requirePermiso('ajustes.financiero', 'OBSERVADOR'), errorHandler(getPresupuestoActivo))
configRouter.post('/presupuesto-activo', [authMiddleware, requirePermiso('ajustes.financiero', 'EDITOR')], errorHandler(setPresupuestoActivo, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }))

export default configRouter
