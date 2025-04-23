import { Router } from "express";
import proyectoRouter from "./proyectos";

const proyectosRouter: Router = Router()

proyectosRouter.use('/proyecto', proyectoRouter)

export default proyectosRouter
