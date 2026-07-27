import { Router } from "express";
import tesoreriaRoutes from "./root";
import configRouter from "./config";

const financieroRouter: Router = Router()

financieroRouter.use('/tesoreria', tesoreriaRoutes)
financieroRouter.use('/config', configRouter)

export default financieroRouter