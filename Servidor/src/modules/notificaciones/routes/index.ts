import { Router } from "express";
import errorHandler from "../../../utils/error-handler";
import { authMiddleware } from "../../../middlewares/auth";
import requirePermiso from "../../../middlewares/requirePermiso";
import {
    listarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
} from "../controllers/notificaciones";
import { getResumenDashboard } from "../controllers/dashboard";

const notificacionesRouter: Router = Router();

// Todo requiere sesión: las notificaciones y el resumen dependen del usuario.
notificacionesRouter.use(authMiddleware);

notificacionesRouter.get('/', errorHandler(listarNotificaciones));
// `leer-todas` va antes que `:id/leer` para que no lo capture como id.
notificacionesRouter.post('/leer-todas', errorHandler(marcarTodasLeidas));
notificacionesRouter.post('/:id/leer', errorHandler(marcarLeida));

export default notificacionesRouter;

/** Router aparte para el resumen del panel de inicio. */
export const dashboardRouter: Router = Router();
dashboardRouter.use(authMiddleware);
dashboardRouter.get('/resumen', requirePermiso('dashboard', 'OBSERVADOR'), errorHandler(getResumenDashboard));
