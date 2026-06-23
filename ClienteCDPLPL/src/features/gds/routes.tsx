// Rutas de la Plataforma_GDS, montadas bajo el prefijo dedicado `/gds`,
// independientes de las rutas del dashboard del colegio (Req. 1.2).
//
// El guard `RequireGdsAuth` envuelve al layout propio `GdsLayout`: cualquier
// acceso sin sesión válida se redirige al flujo de autenticación (Req. 1.5).
// Ninguna ruta aquí depende del módulo IREC (Req. 1.3, 1.4).
import type { RouteObject } from 'react-router-dom';
import { GdsLayout } from './layouts/GdsLayout';
import { RequireGdsAuth } from './guards/RequireGdsAuth';
import GdsHome from './pages/GdsHome';
// Gestión de instituciones (TS + Shadcn/UI + Leaflet + radio), tarea 26.4.
import GdsInstituciones from './pages/GdsInstitucionesAdmin';
import GdsAnalisisNuevo from './pages/GdsAnalisisNuevo';
import GdsTrazabilidad from './pages/GdsTrazabilidad';
import GdsEscenarios from './pages/GdsEscenarios';
import GdsReportes from './pages/GdsReportes';
import GdsNoAutorizado from './pages/GdsNoAutorizado';

export const gdsRoutes: RouteObject = {
  path: '/gds',
  element: (
    <RequireGdsAuth>
      <GdsLayout />
    </RequireGdsAuth>
  ),
  children: [
    {
      index: true,
      element: <GdsHome />,
    },
    {
      path: 'instituciones',
      element: <GdsInstituciones />,
    },
    {
      path: 'analisis/nuevo',
      element: <GdsAnalisisNuevo />,
    },
    {
      path: 'trazabilidad',
      element: <GdsTrazabilidad />,
    },
    {
      path: 'escenarios',
      element: <GdsEscenarios />,
    },
    {
      path: 'reportes',
      element: <GdsReportes />,
    },
    {
      path: 'no-autorizado',
      element: <GdsNoAutorizado />,
    },
  ],
};

export default gdsRoutes;
