import { Router } from "express";
import { createProyecto, getProyectos, updateEstadoProyectoById } from "../controllers/proyectos";
import errorHandler from "../../../utils/error-handler";

const proyectoRouter: Router = Router()

proyectoRouter.get('/getAll', errorHandler(getProyectos))
proyectoRouter.post('/create', errorHandler(createProyecto))
proyectoRouter.post('/updateEstado', errorHandler(updateEstadoProyectoById))

export default proyectoRouter
