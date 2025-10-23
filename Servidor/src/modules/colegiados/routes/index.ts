import { Router } from "express";
import colegiadoRouter from "./colegiado";
import documentosRouter from "./documentos";
import pagosRouter from "./pagos";
import invitadosRouter from "./invitados";
import pasantesRouter from "./pasantes";

const colegiadosRouter: Router = Router()

colegiadosRouter.use('/colegiado', colegiadoRouter)
colegiadosRouter.use('/documentos', documentosRouter)
colegiadosRouter.use('/pagos', pagosRouter)
colegiadosRouter.use('/invitados', invitadosRouter)
colegiadosRouter.use('/pasantes', pasantesRouter)

export default colegiadosRouter