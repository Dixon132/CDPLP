import { Router } from "express";
import { login, me, singUp } from "../controllers/auth";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";

const authRouter:Router = Router()

authRouter.post('/signup',errorHandler(singUp))
authRouter.post('/login', errorHandler(login))
authRouter.post('/me',[authMiddleware] ,errorHandler(me))

export default authRouter