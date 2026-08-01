import { Router } from "express";
import tesoreriaRoutes from "./root";
import configRouter from "./config";
import { authMiddleware } from "../../../middlewares/auth";

const financieroRouter: Router = Router()

// Todo el módulo requiere sesión del dashboard.
financieroRouter.use(authMiddleware)

financieroRouter.use('/tesoreria', tesoreriaRoutes)
financieroRouter.use('/config', configRouter)

export default financieroRouter