import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import {
    getAllPresupuestos,
    getPresupuestoById,
    createPresupuesto,
    updatePresupuesto,
    deletePresupuesto,
    getMovimientosByPresupuesto,
    createMovimientoFinanciero,
    updateMovimientoFinanciero,
    deleteMovimientoFinanciero,
    getPresupuestosSummaryReport,
    getPresupuestoDetailReport,
    getMovimientosSummaryReport,
} from "../controllers/tesoreria";

const tesoreriaRoutes: Router = Router()

//REPORTES
tesoreriaRoutes.delete("/report", errorHandler(getPresupuestosSummaryReport));
tesoreriaRoutes.delete("/reportMovimiento", errorHandler(getMovimientosSummaryReport));
tesoreriaRoutes.delete("/:id/report", errorHandler(getPresupuestoDetailReport));
// Rutas de PRESUPUESTOS
tesoreriaRoutes.get("/presupuestos", errorHandler(getAllPresupuestos));
tesoreriaRoutes.get("/presupuestos/:id", errorHandler(getPresupuestoById));
tesoreriaRoutes.post("/presupuestos", errorHandler(createPresupuesto));
tesoreriaRoutes.patch("/presupuestos/:id", errorHandler(updatePresupuesto));
tesoreriaRoutes.delete("/presupuestos/:id", errorHandler(deletePresupuesto));

// Rutas de MOVIMIENTOS FINANCIEROS
tesoreriaRoutes.get("/presupuestos/:id/movimientos", errorHandler(getMovimientosByPresupuesto));
tesoreriaRoutes.post("/movimientos", errorHandler(createMovimientoFinanciero));
tesoreriaRoutes.patch("/movimientos/:id", errorHandler(updateMovimientoFinanciero));
tesoreriaRoutes.delete("/movimientos/:id", errorHandler(deleteMovimientoFinanciero));


export default tesoreriaRoutes