import { Router } from "express";
import tesoreriaRoutes from "./root";

const financieroRouter: Router = Router()

financieroRouter.use('/tesoreria', tesoreriaRoutes)

export default financieroRouter