import { Router } from "express";
import { getAuditorias, getAuditoriasReport } from "../controllers/auditorias";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";

const AuditoriasRoutes: Router = Router()

AuditoriasRoutes.get('/', [authMiddleware], errorHandler(getAuditorias))//get all auditorias
AuditoriasRoutes.get('/report', [authMiddleware], errorHandler(getAuditoriasReport))//report

export default AuditoriasRoutes