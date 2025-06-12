import { Router } from "express";
import correspondenciaRoutes from "./correspondencia";

const correspondenciaRouter: Router = Router()

correspondenciaRouter.use('/crsp', correspondenciaRoutes)

export default correspondenciaRouter