import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { loginCampo } from "../controllers/auth-campo";

const authCampoRouter: Router = Router();

authCampoRouter.post("/login", errorHandler(loginCampo));

export default authCampoRouter;
