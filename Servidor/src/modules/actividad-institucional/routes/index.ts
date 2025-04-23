import { Router } from "express";
import actividadInstitucionalRouter from "./ac-institucional";

const actividadesInstitucionalesRouter: Router = Router()

actividadesInstitucionalesRouter.use('/ac-ins', actividadInstitucionalRouter)

export default actividadesInstitucionalesRouter