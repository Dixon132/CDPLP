// Guard de autenticación de la Plataforma_GDS.
//
// Protege todas las rutas bajo el prefijo `/gds`. Aplica un principio de
// denegación por defecto (fail-closed): si no existe una sesión válida (JWT),
// redirige al flujo de autenticación del colegio (`/auth/login`, Req. 1.5).
//
// El JWT lo emite el backend del colegio y lo valida el servicio autónomo
// `ServidorGDS/` mediante el secreto compartido. La autorización fina por rol
// GDS (`ADMIN_PLATAFORMA` / `ANALISTA` / `OBSERVADOR`) la resuelve el backend;
// en el frontend este guard verifica que exista una sesión válida y vigente, y
// permite restringir el acceso a un conjunto de roles cuando se especifique.
//
// Este módulo NO depende del módulo IREC anterior de ninguna forma.
import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { parseToken } from '../../../utils/parsejwt';
import { isSesionValida, rolDesdePayload, type JwtPayload } from './session';

/** Ruta del flujo de autenticación del colegio al que se redirige (Req. 1.5). */
const RUTA_LOGIN = '/auth/login';
/** Ruta de bloqueo para sesiones válidas pero sin rol autorizado. */
const RUTA_NO_AUTORIZADO = '/gds/no-autorizado';

export interface RequireGdsAuthProps {
  /**
   * Contenido protegido. Si se omite, se renderiza un `<Outlet />` (útil al
   * usarlo como `element` de una ruta padre).
   */
  children?: ReactNode;
  /** Roles GDS autorizados. Si se omite, basta con una sesión válida. */
  allowedRoles?: string[];
}

/**
 * Guard de ruta para la Plataforma_GDS (fail-closed).
 */
export function RequireGdsAuth({ children, allowedRoles }: RequireGdsAuthProps) {
  const token = localStorage.getItem('token');

  // 1. Sin token → no autenticado → al flujo de autenticación (Req. 1.5).
  if (!token) {
    return <Navigate to={RUTA_LOGIN} replace />;
  }

  const payload = parseToken(token) as JwtPayload | null;

  // 2. Token ilegible o sesión expirada → limpiar y redirigir (fail-closed).
  if (!isSesionValida(payload, Date.now())) {
    localStorage.removeItem('token');
    return <Navigate to={RUTA_LOGIN} replace />;
  }

  // 3. Autorización por rol GDS (bloquear a no autorizados) cuando se exija.
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const rol = rolDesdePayload(payload);
    if (!rol || !allowedRoles.includes(rol)) {
      return <Navigate to={RUTA_NO_AUTORIZADO} replace />;
    }
  }

  // 4. Sesión válida (y autorizada) → renderizar la sección protegida.
  return children ? <>{children}</> : <Outlet />;
}

export default RequireGdsAuth;
