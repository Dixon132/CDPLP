import { Navigate } from 'react-router-dom';
import { parseToken } from '../../../utils/parsejwt';
import { useSession } from '../../../context/SessionProvider';

const NIVEL_ORDEN = { SIN_ACCESO: 0, OBSERVADOR: 1, EDITOR: 2 };

/**
 * Reemplaza a `RequireRole`: conserva la misma validación de vigencia del JWT
 * (rol no definido / vencido / inactivo), pero la decisión de acceso ya no
 * compara contra un array de roles hardcodeado — usa el permiso efectivo que
 * resuelve el backend (rol + override individual del usuario).
 *
 * `nivel` es el mínimo para ENTRAR a la ruta (por defecto OBSERVADOR, para que
 * un observador pueda ver la página); el gate de EDITOR para botones de acción
 * va dentro de cada página con `<Can>`, no acá.
 */
export function RequirePermiso({ recurso, nivel = 'OBSERVADOR', children }) {
    // Se llama siempre, antes de cualquier return, para no violar las reglas de hooks.
    const { permisos, cargando } = useSession();

    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/auth/login" replace />;

    const payload = parseToken(token);
    if (!payload) {
        localStorage.removeItem('token');
        return <Navigate to="/auth/login" replace />;
    }
    estilizacion
    const now = Date.now();
    if (payload.exp * 1000 < now) {
        localStorage.removeItem('token');
        return <Navigate to="/auth/login" replace />;
    }
    if (payload.rol?.rol === 'NO_DEFINIDO') {
        return <Navigate to="/dashboard/roleNotDefined" replace />;
    }
    // `fecha_inicio`/`fecha_fin` nulas significan "sin límite" (mismo criterio
    // que el backend en `resolverPermisoEfectivo`) — `new Date(null)` da época 0,
    // así que sin este chequeo un rol sin fecha de fin quedaba marcado como vencido.
    const fechaInicio = payload.rol?.fecha_inicio ? new Date(payload.rol.fecha_inicio).getTime() : null;
    const fechaFin = payload.rol?.fecha_fin ? new Date(payload.rol.fecha_fin).getTime() : null;
    if ((fechaInicio !== null && now < fechaInicio) || (fechaFin !== null && now > fechaFin)) {
        return <Navigate to="/dashboard/roleExpired" replace />;
    }
    if (!payload.rol?.activo) {
        return <Navigate to="/dashboard/roleInactive" replace />;
    }

    // Los permisos viajan por red tras el login; sin esto, un usuario con
    // acceso real vería "no autorizado" por una fracción de segundo.
    if (cargando) return null;

    const nivelEfectivo = permisos?.[recurso] ?? 'SIN_ACCESO';
    if (NIVEL_ORDEN[nivelEfectivo] < NIVEL_ORDEN[nivel]) {
        return <Navigate to="/dashboard/notAuthorized" replace />;
    }

    return <>{children}</>;
}
