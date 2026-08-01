import { Router } from "express";
import multer from "multer";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware as auth } from "../../../middlewares/auth";
import {
    verificarCI,
    getConfigPago,
    crearPostulacion,
    getPostulaciones,
    getPostulacionById,
    aceptarPostulacion,
    rechazarPostulacion,
    eliminarPostulacion,
    getConfigPagoAdmin,
    upsertConfigPago,
    uploadQr,
} from "../controllers/postulaciones";
import { Acciones, Modulos } from "../../../types/auditoria";

const router: Router = Router();

// Multer en memoria para Supabase
const upload = multer({ storage: multer.memoryStorage() });

// ─── RUTAS PÚBLICAS (sin auth) ────────────────────────────────
router.get("/verificar/:ci", errorHandler(verificarCI));
router.get("/config-pago", errorHandler(getConfigPago));
router.post(
    "/",
    upload.fields([
        { name: "documentos", maxCount: 10 },
        { name: "comprobante", maxCount: 1 },
    ]),
    errorHandler(crearPostulacion)
);

// ─── RUTAS ADMIN (con auth) ───────────────────────────────────
router.get("/admin", auth, errorHandler(getPostulaciones));
router.get("/admin/config-pago", auth, errorHandler(getConfigPagoAdmin));
router.put("/admin/config-pago", auth, errorHandler(upsertConfigPago, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));
router.post("/admin/upload-qr", auth, upload.single('qr'), errorHandler(uploadQr, { modulo: Modulos.CONFIGURACION, accion: Acciones.MODIFICO }));
router.get("/admin/:id", auth, errorHandler(getPostulacionById));
router.patch("/admin/:id/aceptar", auth, errorHandler(aceptarPostulacion, { modulo: Modulos.POSTULACIONES, accion: Acciones.ACTIVO }));
router.patch("/admin/:id/rechazar", auth, errorHandler(rechazarPostulacion, { modulo: Modulos.POSTULACIONES, accion: Acciones.RECHAZO }));
router.delete("/admin/:id", auth, errorHandler(eliminarPostulacion, { modulo: Modulos.POSTULACIONES, accion: Acciones.ELIMINO }));

export default router;
