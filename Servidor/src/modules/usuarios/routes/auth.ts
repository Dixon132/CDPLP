import { Router } from "express";
import { login, me, singUp } from "../controllers/auth";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const authRouter:Router = Router()

// No hay registro público: los usuarios los da de alta un administrador desde
// el dashboard, así que /signup exige sesión.
authRouter.post('/signup', [authMiddleware], errorHandler(singUp, { modulo: Modulos.USUARIOS, accion: Acciones.CREO }))
authRouter.post('/login', errorHandler(login))
authRouter.post('/me', [authMiddleware], errorHandler(me))

export default authRouter