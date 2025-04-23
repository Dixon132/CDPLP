import { Router } from "express";
import colegiadoRouter from "./colegiado";

const colegiadosRouter: Router = Router()

colegiadosRouter.use('/colegiado', colegiadoRouter)

export default colegiadosRouter