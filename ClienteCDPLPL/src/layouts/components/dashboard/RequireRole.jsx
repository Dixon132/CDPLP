import { Navigate } from 'react-router-dom';
import { parseToken } from '../../../utils/parsejwt';  // ← IMPORT RELATIVO CORRECTO

export function RequireRole({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/auth/login" replace />;

  const payload = parseToken(token);
  if (!payload) {
    localStorage.removeItem('token');
    return <Navigate to="/auth/login" replace />;
  }

  const now = Date.now();
  if (payload.exp * 1000 < now) {
    localStorage.removeItem('token');
    alert('Tu sesión ha expirado');
    return <Navigate to="/auth/login" replace />;
  }
  if (payload.rol.rol === 'NO_DEFINIDO') {
    return <Navigate to="/dashboard/roleNotDefined" replace />;
  }
  const fechaInicio = new Date(payload.rol.fecha_inicio).getTime();
  const fechaFin = new Date(payload.rol.fecha_fin).getTime();
  if (now < fechaInicio || now > fechaFin) {
    return <Navigate to="/dashboard/roleExpired" replace />;
  }
  if (!payload.rol.activo) {
    return <Navigate to="/dashboard/roleInactive" replace />;
  }
  if (!allowedRoles.includes(payload.rol.rol)) {
    return <Navigate to="/dashboard/notAuthorized" replace />;
  }
  console.log('Rol válido')

  return <>{children}</>;
}
