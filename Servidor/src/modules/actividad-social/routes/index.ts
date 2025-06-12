import { Router } from "express";
import actividadSocialRouter from "./ac-social";
import conveniosRoutes from "./convenios";

const actividadesSocialesRouter: Router = Router()

actividadesSocialesRouter.use('/ac-social', actividadSocialRouter)
actividadesSocialesRouter.use('/convenios', conveniosRoutes)

export default actividadesSocialesRouter