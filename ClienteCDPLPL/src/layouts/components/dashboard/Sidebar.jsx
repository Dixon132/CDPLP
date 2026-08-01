import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, LogOut, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getNavForRole, getIcon, formatTitle } from '../../navigation';
import { useSession } from '../../../context/SessionProvider';

/**
 * Navegación lateral del dashboard.
 *
 * Los módulos y sus permisos viven en `src/layouts/navigation.js`; aquí solo se
 * presentan. Sigue leyendo el rol de `localStorage` para poder renderizarse de
 * forma aislada (así lo hace `Sidebar.test.jsx`), pero prefiere el rol del
 * contexto de sesión cuando existe.
 */
const Sidebar = ({ collapsed = false }) => {
  const { rol, nombreCompleto, iniciales, vigencia, logout } = useSession();
  const [mostrarSubmenus, setMostrarSubmenus] = useState({});
  const location = useLocation();

  const grupos = useMemo(() => getNavForRole(rol), [rol]);

  // Abre automáticamente el submenú del módulo en el que estás.
  useEffect(() => {
    const activo = grupos
      .flatMap((g) => g.items)
      .find((i) => i.subtitles && location.pathname.startsWith(i.path));
    if (activo) setMostrarSubmenus((prev) => ({ ...prev, [activo.title]: true }));
  }, [grupos, location.pathname]);

  const isActiveRoute = (item) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  const toggleSubmenu = (title, e) => {
    e.preventDefault();
    e.stopPropagation();
    setMostrarSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const vigenciaTexto = () => {
    if (!vigencia?.hasta) return null;
    const fin = new Date(vigencia.hasta);
    if (Number.isNaN(fin.getTime())) return null;
    return `Cargo hasta ${fin.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-64'} shrink-0 h-full bg-white border-r border-slate-200 flex flex-col transition-[width] duration-300 ease-in-out`}
    >
      {/* Marca */}
      <div className="h-16 shrink-0 flex items-center border-b border-slate-200 px-4">
        <Link
          to="/dashboard"
          className={`flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${collapsed ? 'justify-center w-full' : ''}`}
        >
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-900 flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-tight">C</span>
          </div>
          {!collapsed && (
            <div className="ml-3 leading-tight">
              <div className="text-sm font-black uppercase tracking-tight text-slate-900">CDPLP</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Panel administrativo
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navegación con scroll propio */}
      <nav
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6"
      >
        {grupos.map((grupo) => (
          <div key={grupo.id}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {grupo.label}
              </h3>
            )}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-slate-200" />}

            <ul className="space-y-1">
              {grupo.items.map((item) => {
                const Icono = getIcon(item.icon);
                const activo = isActiveRoute(item);
                const tieneSub = Array.isArray(item.subtitles) && item.subtitles.length > 0;
                const abierto = mostrarSubmenus[item.title];
                const etiqueta = formatTitle(item.title);

                return (
                  <li key={item.path} className="relative">
                    <Link
                      to={item.path}
                      title={collapsed ? etiqueta : undefined}
                      aria-current={activo ? 'page' : undefined}
                      className={`group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors
                        ${collapsed ? 'justify-center px-0' : 'px-3'}
                        ${activo
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                    >
                      {/* Marca de sección activa */}
                      {activo && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-400" />
                      )}
                      <Icono size={18} className="shrink-0" />
                      {!collapsed && <span className="ml-3 truncate">{etiqueta}</span>}
                    </Link>

                    {tieneSub && !collapsed && (
                      <button
                        type="button"
                        onClick={(e) => toggleSubmenu(item.title, e)}
                        aria-expanded={!!abierto}
                        aria-label={`${abierto ? 'Contraer' : 'Expandir'} ${etiqueta}`}
                        className={`absolute right-1.5 top-[9px] p-1 rounded-md transition-colors
                          ${activo ? 'text-white/70 hover:bg-white/15' : 'text-slate-400 hover:bg-slate-200'}`}
                      >
                        <ChevronRight
                          size={14}
                          className={`transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}
                        />
                      </button>
                    )}

                    {tieneSub && !collapsed && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ${abierto ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <ul className="mt-1 ml-5 border-l border-slate-200 space-y-0.5">
                          {item.subtitles.map((sub) => {
                            const ruta = `/dashboard/${sub.toLowerCase()}`;
                            const subActivo = location.pathname.startsWith(ruta);
                            return (
                              <li key={sub}>
                                <Link
                                  to={ruta}
                                  className={`block py-1.5 pl-4 text-[13px] transition-colors border-l-2 -ml-px
                                    ${subActivo
                                      ? 'border-slate-900 text-slate-900 font-semibold'
                                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
                                >
                                  {sub}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pie: usuario real y salida */}
      <div className="shrink-0 border-t border-slate-200 p-3">
        {!collapsed ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {iniciales}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{nombreCompleto}</p>
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <ShieldCheck size={10} />
                  <span className="truncate">{formatTitle(rol || '—')}</span>
                </p>
              </div>
            </div>
            {vigenciaTexto() && (
              <p className="mt-2 text-[10px] text-slate-400">{vigenciaTexto()}</p>
            )}
            <button
              type="button"
              onClick={logout}
              className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="w-full flex items-center justify-center rounded-xl py-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
