import { Router } from "express";
import multer from "multer";
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
    getPresupuestoAnalytics,
    getMovimientosFiltrados,
    getCategoriasByPresupuesto,
} from "../controllers/tesoreria";

const tesoreriaRoutes: Router = Router()
const upload = multer({ storage: multer.memoryStorage() })

//REPORTES
tesoreriaRoutes.get("/report", errorHandler(getPresupuestosSummaryReport));
tesoreriaRoutes.get("/reportMovimiento", errorHandler(getMovimientosSummaryReport));
tesoreriaRoutes.get("/:id/report", errorHandler(getPresupuestoDetailReport));

// Rutas de PRESUPUESTOS
tesoreriaRoutes.get("/presupuestos", errorHandler(getAllPresupuestos));
tesoreriaRoutes.get("/presupuestos/:id", errorHandler(getPresupuestoById));
tesoreriaRoutes.post("/presupuestos", errorHandler(createPresupuesto));
tesoreriaRoutes.patch("/presupuestos/:id", errorHandler(updatePresupuesto));
tesoreriaRoutes.delete("/presupuestos/:id", errorHandler(deletePresupuesto));

// Analytics, Categorias y Movimientos Filtrados
tesoreriaRoutes.get("/presupuestos/:id/analytics", errorHandler(getPresupuestoAnalytics));
tesoreriaRoutes.get("/presupuestos/:id/categorias", errorHandler(getCategoriasByPresupuesto));
tesoreriaRoutes.get("/presupuestos/:id/movimientos-filtrados", errorHandler(getMovimientosFiltrados));

// Rutas de MOVIMIENTOS FINANCIEROS
tesoreriaRoutes.get("/presupuestos/:id/movimientos", errorHandler(getMovimientosByPresupuesto));
tesoreriaRoutes.post("/movimientos", upload.single("comprobante"), errorHandler(createMovimientoFinanciero));
tesoreriaRoutes.patch("/movimientos/:id", errorHandler(updateMovimientoFinanciero));
tesoreriaRoutes.delete("/movimientos/:id", errorHandler(deleteMovimientoFinanciero));

export default tesoreriaRoutes