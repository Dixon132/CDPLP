import { Router } from "express";
import multer from "multer";
import errorHandler from "../../../utils/error-handler";
import { getMemorias, createMemoria, updateMemoria, deleteMemoria } from "../controllers/memorias";
import { authMiddleware } from "../../../middlewares/auth";
import { Acciones, Modulos } from "../../../types/auditoria";

const memoriasRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Público: lo consume la página "Memorias y Balances" del sitio.
memoriasRouter.get("/", errorHandler(getMemorias));

// Administrativas.
memoriasRouter.post("/", [authMiddleware], upload.single("archivo"), errorHandler(createMemoria, { modulo: Modulos.MEMORIAS, accion: Acciones.CREO }));
memoriasRouter.put("/:id", [authMiddleware], upload.single("archivo"), errorHandler(updateMemoria, { modulo: Modulos.MEMORIAS, accion: Acciones.MODIFICO }));
memoriasRouter.delete("/:id", [authMiddleware], errorHandler(deleteMemoria, { modulo: Modulos.MEMORIAS, accion: Acciones.ELIMINO }));

export default memoriasRouter;
