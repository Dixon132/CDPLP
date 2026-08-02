import { Router } from "express";
import multer from "multer";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
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
import { Acciones, Modulos } from "../../../types/auditoria";

const tesoreriaRoutes: Router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// `authMiddleware` ya corre a nivel del router padre (`financiero/routes/index.ts`).
tesoreriaRoutes.use(requirePermiso('tesoreria', 'OBSERVADOR'))

//REPORTES
tesoreriaRoutes.get("/report", errorHandler(getPresupuestosSummaryReport));
tesoreriaRoutes.get("/reportMovimiento", errorHandler(getMovimientosSummaryReport));
tesoreriaRoutes.get("/:id/report", errorHandler(getPresupuestoDetailReport));

// Rutas de PRESUPUESTOS
tesoreriaRoutes.get("/presupuestos", errorHandler(getAllPresupuestos));
tesoreriaRoutes.get("/presupuestos/:id", errorHandler(getPresupuestoById));
tesoreriaRoutes.post("/presupuestos", requirePermiso('tesoreria', 'EDITOR'), errorHandler(createPresupuesto, { modulo: Modulos.FINANCIERO, accion: Acciones.CREO }));
tesoreriaRoutes.patch("/presupuestos/:id", requirePermiso('tesoreria', 'EDITOR'), errorHandler(updatePresupuesto, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }));
tesoreriaRoutes.delete("/presupuestos/:id", requirePermiso('tesoreria', 'EDITOR'), errorHandler(deletePresupuesto, { modulo: Modulos.FINANCIERO, accion: Acciones.ELIMINO }));

// Analytics, Categorias y Movimientos Filtrados
tesoreriaRoutes.get("/presupuestos/:id/analytics", errorHandler(getPresupuestoAnalytics));
tesoreriaRoutes.get("/presupuestos/:id/categorias", errorHandler(getCategoriasByPresupuesto));
tesoreriaRoutes.get("/presupuestos/:id/movimientos-filtrados", errorHandler(getMovimientosFiltrados));

// Rutas de MOVIMIENTOS FINANCIEROS
tesoreriaRoutes.get("/presupuestos/:id/movimientos", errorHandler(getMovimientosByPresupuesto));
tesoreriaRoutes.post("/movimientos", [authMiddleware, requirePermiso('tesoreria', 'EDITOR'), upload.single("comprobante")], errorHandler(createMovimientoFinanciero, { modulo: Modulos.FINANCIERO, accion: Acciones.REGISTRO }));
tesoreriaRoutes.patch("/movimientos/:id", [authMiddleware, requirePermiso('tesoreria', 'EDITOR')], errorHandler(updateMovimientoFinanciero, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }));
tesoreriaRoutes.delete("/movimientos/:id", [authMiddleware, requirePermiso('tesoreria', 'EDITOR')], errorHandler(deleteMovimientoFinanciero, { modulo: Modulos.FINANCIERO, accion: Acciones.MODIFICO }));

export default tesoreriaRoutes