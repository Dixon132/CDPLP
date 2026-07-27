import { Router } from "express";
import colegiadoRouter from "./colegiado";
import documentosRouter from "./documentos";
import pagosRouter from "./pagos";
import pagosInvitadosRouter from "./pagos-invitados";
import invitadosRouter from "./invitados";
import pasantesRouter from "./pasantes";

const colegiadosRouter: Router = Router()

colegiadosRouter.use('/colegiado', colegiadoRouter)
colegiadosRouter.use('/documentos', documentosRouter)
colegiadosRouter.use('/pagos', pagosRouter)
colegiadosRouter.use('/pagos-invitados', pagosInvitadosRouter)
colegiadosRouter.use('/invitados', invitadosRouter)
colegiadosRouter.use('/pasantes', pasantesRouter)

export default colegiadosRouter