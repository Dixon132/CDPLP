import { Router } from "express";
import actividadSocialRouter from "./ac-social";

const actividadesSocialesRouter: Router = Router()

actividadesSocialesRouter.use('/ac-social', actividadSocialRouter)

export default actividadesSocialesRouter