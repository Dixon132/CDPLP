import { Router } from "express";
import multer from "multer";
import errorHandler from "../../../utils/error-handler";
import { getMemorias, createMemoria, updateMemoria, deleteMemoria } from "../controllers/memorias";
import { authMiddleware } from "../../../middlewares/auth";

const memoriasRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

memoriasRouter.get("/", errorHandler(getMemorias));
memoriasRouter.post("/", upload.single("archivo"), errorHandler(createMemoria));
memoriasRouter.put("/:id", upload.single("archivo"), errorHandler(updateMemoria));
memoriasRouter.delete("/:id", errorHandler(deleteMemoria));

export default memoriasRouter;
