import { Router } from "express";
import memoriasRouter from "./memorias";

const rootRouter: Router = Router();

rootRouter.use("/", memoriasRouter);

export default rootRouter;
