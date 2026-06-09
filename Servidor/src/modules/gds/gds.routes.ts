import { Router, Request, Response } from "express";

import contractsRouter from "./contracts/contracts.routes";
import adquisicionRouter from "./adquisicion/adquisicion.routes";
import analisisRouter from "./analisis/analisis.routes";
import pipelineRouter from "./pipeline/pipeline.routes";
import cicloRouter from "./ciclo/ciclo.routes";
import authRouter from "./auth/auth.routes";
import evidenciasRouter from "./evidencias/evidencias.routes";
import mlRouter from "./ml/ml.routes";
import memoriaRouter from "./memoria/memoria.routes";
import escenariosRouter from "./escenarios/escenarios.routes";
import reportesRouter from "./reportes/reportes.routes";
import wsRouter from "./ws/ws.routes";

/**
 * Router raíz de la Plataforma_GDS (Análisis de Tendencias de Riesgo Emocional).
 *
 * Toda la plataforma vive bajo `src/modules/gds/` con submódulos por dominio y se
 * monta en el `rootRouter` del Servidor bajo el prefijo `/api/gds` (Req. 1.2, 25.1, 25.3).
 *
 * Aislamiento: este módulo no modifica el esquema ni las rutas del sistema del colegio;
 * solo agrega su propio subárbol de rutas.
 */
const gdsRouter: Router = Router();

// Endpoint de salud/andamiaje para verificar que `/api/gds` está montado (Req. 1.2).
gdsRouter.get("/", (_req: Request, res: Response) => {
    res.json({ module: "gds", status: "ok" });
});

gdsRouter.use("/contracts", contractsRouter);
gdsRouter.use("/adquisicion", adquisicionRouter);
gdsRouter.use("/analisis", analisisRouter);
gdsRouter.use("/pipeline", pipelineRouter);
gdsRouter.use("/ciclo", cicloRouter);
gdsRouter.use("/auth", authRouter);
gdsRouter.use("/evidencias", evidenciasRouter);
gdsRouter.use("/ml", mlRouter);
gdsRouter.use("/memoria", memoriaRouter);
gdsRouter.use("/escenarios", escenariosRouter);
gdsRouter.use("/reportes", reportesRouter);
gdsRouter.use("/ws", wsRouter);

export default gdsRouter;
