// Layout propio de la Plataforma_GDS (Gemelo Digital Social).
//
// Estética enterprise (tipo AWS/Azure): topbar oscura, sidebar de navegación
// densa y área de contenido con scroll propio. Es INTENCIONALMENTE distinto del
// `DashboardLayout` del colegio y NO comparte componentes con él ni con el
// módulo IREC anterior (Req. 1.1, 1.4). Todas las rutas hijas se renderizan en
// el <Outlet />.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, type NavigateFunction } from 'react-router-dom';

/**
 * Ítem de navegación de la sección. Los marcados como `disabled` corresponden
 * a vistas que se implementan en tareas posteriores; se muestran sin enlace
 * para no producir navegación rota. Ninguno referencia el módulo IREC (Req. 1.4).
 */
interface NavItem {
  to?: string;
  label: string;
  end?: boolean;
  disabled?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/gds', label: 'Panel', end: true },
  { to: '/gds/instituciones', label: 'Instituciones' },
  { to: '/gds/analisis/nuevo', label: 'Análisis' },
  { to: '/gds/trazabilidad', label: 'Trazabilidad' },
  { label: 'Escenarios', disabled: true },
  { to: '/gds/reportes', label: 'Reportes' },
];

/** Cierra la sesión limpiando el token y redirige al flujo de autenticación. */
function cerrarSesion(navigate: NavigateFunction): void {
  localStorage.removeItem('token');
  navigate('/auth/login', { replace: true });
}

export function GdsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* Sidebar enterprise */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 bg-slate-900 text-slate-100 transition-all duration-200 flex flex-col`}
        aria-label="Navegación de la Plataforma GDS"
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-700/60">
          <span className="inline-block h-6 w-6 rounded bg-cyan-500" aria-hidden="true" />
          {sidebarOpen && (
            <span className="font-semibold tracking-tight whitespace-nowrap">
              Plataforma GDS
            </span>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) =>
              item.disabled || !item.to ? (
                <li key={item.label}>
                  <span
                    className="block rounded px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none"
                    title="Disponible próximamente"
                  >
                    {sidebarOpen ? item.label : item.label.charAt(0)}
                  </span>
                </li>
              ) : (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded px-3 py-2 text-sm transition-colors ${isActive
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-200 hover:bg-slate-800'
                      }`
                    }
                  >
                    {sidebarOpen ? item.label : item.label.charAt(0)}
                  </NavLink>
                </li>
              )
            )}
          </ul>
        </nav>
        <div className="px-3 py-3 border-t border-slate-700/60 text-xs text-slate-400">
          {sidebarOpen ? 'Gemelo Digital Social' : 'GDS'}
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 bg-slate-800 text-slate-100 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded p-2 hover:bg-slate-700"
              aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            >
              <span className="block h-0.5 w-5 bg-current mb-1" />
              <span className="block h-0.5 w-5 bg-current mb-1" />
              <span className="block h-0.5 w-5 bg-current" />
            </button>
            <h1 className="text-sm font-medium tracking-tight">
              Análisis de Tendencias de Riesgo Emocional
            </h1>
          </div>
          <button
            type="button"
            onClick={() => cerrarSesion(navigate)}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            Cerrar sesión
          </button>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        <footer className="px-6 py-3 bg-white border-t border-slate-200">
          <p className="text-xs text-slate-500">
            © 2025 Plataforma GDS · Sección independiente del dashboard del colegio
          </p>
        </footer>
      </div>
    </div>
  );
}

export default GdsLayout;
