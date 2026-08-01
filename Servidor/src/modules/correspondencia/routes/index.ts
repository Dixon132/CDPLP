import { Router } from "express";
import correspondenciaRoutes from "./correspondencia";
import { authMiddleware } from "../../../middlewares/auth";

const correspondenciaRouter: Router = Router()

// Todo el módulo requiere sesión del dashboard.
correspondenciaRouter.use(authMiddleware)

correspondenciaRouter.use('/crsp', correspondenciaRoutes)

export default correspondenciaRouter