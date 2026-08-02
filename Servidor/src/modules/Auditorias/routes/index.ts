import { Router } from "express";
import { getAuditorias, getAuditoriasReport } from "../controllers/auditorias";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";

const AuditoriasRoutes: Router = Router()

AuditoriasRoutes.get('/report', [authMiddleware, requirePermiso('auditorias', 'OBSERVADOR')], errorHandler(getAuditoriasReport))
AuditoriasRoutes.get('/', [authMiddleware, requirePermiso('auditorias', 'OBSERVADOR')], errorHandler(getAuditorias))

export default AuditoriasRoutes