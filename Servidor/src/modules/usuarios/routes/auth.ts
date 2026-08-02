import { Router } from "express";
import { login, me, singUp } from "../controllers/auth";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import { Acciones, Modulos } from "../../../types/auditoria";

const authRouter:Router = Router()

// No hay registro público: los usuarios los da de alta un administrador desde
// el dashboard, así que /signup exige sesión y permiso EDITOR sobre "usuarios".
authRouter.post('/signup', [authMiddleware, requirePermiso('usuarios', 'EDITOR')], errorHandler(singUp, { modulo: Modulos.USUARIOS, accion: Acciones.CREO }))
authRouter.post('/login', errorHandler(login))
authRouter.post('/me', [authMiddleware], errorHandler(me))

export default authRouter