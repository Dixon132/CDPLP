import { Router } from "express";
import memoriasRouter from "./memorias";

const rootRouter: Router = Router();

// El guard se aplica por ruta: el listado es público (página "Memorias y
// Balances" del sitio), las mutaciones son administrativas.
rootRouter.use("/", memoriasRouter);

export default rootRouter;
