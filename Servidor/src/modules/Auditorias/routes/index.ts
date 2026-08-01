import { Router } from "express";
import { getAuditorias, getAuditoriasReport } from "../controllers/auditorias";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";

const AuditoriasRoutes: Router = Router()

AuditoriasRoutes.get('/report', [authMiddleware], errorHandler(getAuditoriasReport))
AuditoriasRoutes.get('/', [authMiddleware], errorHandler(getAuditorias))

export default AuditoriasRoutes