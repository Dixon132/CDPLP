import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { parseToken } from '../utils/parsejwt';  // ← IMPORT RELATIVO CORRECTO

export function RequireRole({ allowedRoles, children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/auth/login" replace />;

  const payload = parseToken(token);
  console.log(payload)
  if (!payload) {
    localStorage.removeItem('token');
    return <Navigate to="/auth/login" replace />;
  }

  const now = Date.now()/1000;
  if (payload.exp < now) {
    localStorage.removeItem('token');
    alert('Tu sesión ha expirado');
    return <Navigate to="/auth/login" replace />;
  }

  if (!allowedRoles.includes(payload.rol.rol)) {
    return <Navigate to="/dashboard/notAuthorized" replace />;
  }
  return <>{children}</>;
}
