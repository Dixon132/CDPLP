import { Router } from "express";
import colegiadoRouter from "./colegiado";
import documentosRouter from "./documentos";
import pagosRouter from "./pagos";

const colegiadosRouter: Router = Router()

colegiadosRouter.use('/colegiado', colegiadoRouter)
colegiadosRouter.use('/documentos',documentosRouter)
colegiadosRouter.use('/pagos',pagosRouter)

export default colegiadosRouter