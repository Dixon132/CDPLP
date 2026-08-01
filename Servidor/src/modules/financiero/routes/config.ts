import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { getPresupuestoActivo, setPresupuestoActivo } from "../controllers/config";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const configRouter: Router = Router()

configRouter.get('/presupuesto-activo', errorHandler(getPresupuestoActivo))
configRouter.post('/presupuesto-activo', authMiddleware, errorHandler(setPresupuestoActivo, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }))

export default configRouter
