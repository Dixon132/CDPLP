import React, { useEffect, useState } from 'react';
import {
  Home,
  BarChart2,
  Users,
  Settings,
  Calendar,
  MessageSquare,
  HelpCircle,
  LogOut,
  DollarSign,
  HeartHandshake,
  BookMarked,
  UsersRound,
  FolderDot,
  UserCog,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { parseToken } from '../../../utils/parsejwt';

const Sidebar = ({ collapsed }) => {
  const [rol, setRol] = useState('');
  const [mostrarSubmenus, setMostrarSubmenus] = useState({});
  const location = useLocation();

  const getRol = () => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/auth/login" replace />;
    const { rol } = parseToken(token);
    return rol.rol;
  };

  useEffect(() => {
    setRol(getRol());
  }, []);

  let mainNavItems = [];
  if (rol === "NO_DEFINIDO") {
    mainNavItems = [
      { title: 'Cerrar Sesion', icon: <LogOut size={20} /> }
    ];
  } else if (rol === "PRESIDENTE") {
    mainNavItems = [
      { title: 'Dashboard', icon: <Home size={20} />, path: '/dashboard' },
      { title: 'Auditorias', icon: <Home size={20} />, path: '/dashboard/auditorias' },
      { title: 'Usuarios', icon: <UserCog size={20} />, subtitles: ['Roles'], path: '/dashboard/usuarios' },
      { title: 'Colegiados', icon: <UsersRound size={20} />, path: '/dashboard/colegiados' },
      { title: 'Correspondencia', icon: <FolderDot size={20} />, subtitles: ['Buzon'], path: '/dashboard/correspondencia' },
      { title: 'Actividades_Sociales', icon: <HeartHandshake size={20} />, subtitles: ['convenios'], path: '/dashboard/actividades_sociales' },
      { title: 'Actividades_Institucionales', icon: <BookMarked size={20} />, path: '/dashboard/actividades_institucionales' },
      { title: 'Tesoreria', icon: <DollarSign size={20} />, path: '/dashboard/tesoreria' },
    ];
  } else if (rol === "SECRETARIO") {
    mainNavItems = [
      { title: 'Correspondencia', icon: <FolderDot size={20} />, subtitles: ['Buzon'], path: '/dashboard/correspondencia' },
      { title: 'Colegiados', icon: <UsersRound size={20} />, path: '/dashboard/colegiados' },
      { title: 'Actividades_Institucionales', icon: <BookMarked size={20} />, path: '/dashboard/actividades_institucionales' }
    ];
  } else if (rol === "TESORERO") {
    mainNavItems = [
      { title: 'Tesoreria', icon: <DollarSign size={20} />, path: '/dashboard/tesoreria' },
      { title: 'Buzon', icon: <FolderDot size={20} />, path: '/dashboard/Buzon' },
    ];
  }
  else if (rol === "VICEPRESIDENTE") {
    mainNavItems = [
      { title: 'Usuarios', icon: <UserCog size={20} />, subtitles: ['Roles'], path: '/dashboard/usuarios' },
      { title: 'Colegiados', icon: <UsersRound size={20} />, path: '/dashboard/colegiados' },
      { title: 'Correspondencia', icon: <FolderDot size={20} />, subtitles: ['Buzon'], path: '/dashboard/correspondencia' },
      { title: 'Actividades_Sociales', icon: <HeartHandshake size={20} />, subtitles: ['convenios'], path: '/dashboard/actividades_sociales' },
      { title: 'Actividades_Institucionales', icon: <BookMarked size={20} />, path: '/dashboard/actividades_institucionales' },
      { title: 'Tesoreria', icon: <DollarSign size={20} />, path: '/dashboard/tesoreria' },
    ];
  }
  else if (rol === "VOCAL") {
    mainNavItems = [
      { title: 'Buzon', icon: <FolderDot size={20} />, path: '/dashboard/Buzon' },
      { title: 'Actividades_Sociales', icon: <HeartHandshake size={20} />, subtitles: ['convenios'], path: '/dashboard/actividades_sociales' },
      { title: 'Actividades_Institucionales', icon: <BookMarked size={20} />, path: '/dashboard/actividades_institucionales' },
      { title: 'Tesoreria', icon: <DollarSign size={20} />, path: '/dashboard/tesoreria' }
    ];
  }
  else if (rol === "SECRETARIO_GENERAL") {
    mainNavItems = [
      { title: 'Dashboard', icon: <Home size={20} />, path: '/dashboard' },
      { title: 'Correspondencia', icon: <FolderDot size={20} />, subtitles: ['Buzon'], path: '/dashboard/correspondencia' },
      { title: 'Actividades_Sociales', icon: <HeartHandshake size={20} />, subtitles: ['convenios'], path: '/dashboard/actividades_sociales' },
      { title: 'Actividades_Institucionales', icon: <BookMarked size={20} />, path: '/dashboard/actividades_institucionales' }
    ];
  }

  const secondaryNavItems = [
    { title: 'Ajustes', icon: <Settings size={20} />, path: '/dashboard/ajustes' },
    { title: 'Cerrar Sesion', icon: <LogOut size={20} />, path: '/auth/login' },
  ];

  const isActiveRoute = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const formatTitle = (title) => {
    return title.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleSubmenu = (title, e) => {
    e.preventDefault();
    e.stopPropagation();
    setMostrarSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white/95 backdrop-blur-xl border-r border-slate-200/60 transition-all duration-300 ease-in-out flex-shrink-0 h-screen shadow-xl relative`}>
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 -z-10" />

      {/* Logo Section */}
      <div className="h-16 flex items-center justify-center border-b border-slate-200/60 backdrop-blur-sm bg-white/80">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'}`}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart2 size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                CDPLP
              </span>
              <div className="text-xs text-slate-500 font-medium">Dashboard</div>
            </div>
          )}
        </div>
      </div>

      <div className="py-6 px-3">
        {/* Main Navigation */}
        <nav>
          <div className={`${collapsed ? 'hidden' : 'block'} mb-6`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">
              Navegación Principal
            </h3>
          </div>

          <ul className="space-y-1">
            {mainNavItems.map((item, index) => {
              const isActive = isActiveRoute(item.path);
              const hasSubmenus = Array.isArray(item.subtitles) && item.subtitles.length > 0;
              const isSubmenuOpen = mostrarSubmenus[item.title];

              return (
                <li key={index}>
                  {hasSubmenus ? (
                    <div className="relative">
                      <Link
                        to={item.path}
                        className={`
                          group relative flex items-center py-3 px-3 rounded-xl transition-all duration-200 w-full
                          ${isActive
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                            : 'text-slate-700 hover:bg-white/70 hover:shadow-md hover:text-slate-900'
                          }
                          ${collapsed ? 'justify-center' : 'justify-between'}
                        `}
                      >
                        <div className="flex items-center">
                          <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <span className="ml-3 font-medium text-sm">
                              {formatTitle(item.title)}
                            </span>
                          )}
                        </div>

                        {/* Indicador activo */}
                        {isActive && (
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-sm" />
                        )}
                      </Link>

                      {/* Botón de flecha separado */}
                      {!collapsed && (
                        <button
                          onClick={(e) => toggleSubmenu(item.title, e)}
                          className={`
                            absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200
                            ${isActive
                              ? 'text-white hover:bg-white/20'
                              : 'text-slate-600 hover:bg-slate-200'
                            }
                          `}
                        >
                          <span className={`transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`}>
                            <ChevronRight size={16} />
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`
                        group relative flex items-center py-3 px-3 rounded-xl transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-700 hover:bg-white/70 hover:shadow-md hover:text-slate-900'
                        }
                        ${collapsed ? 'justify-center' : 'justify-between'}
                      `}
                    >
                      <div className="flex items-center">
                        <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="ml-3 font-medium text-sm">
                            {formatTitle(item.title)}
                          </span>
                        )}
                      </div>

                      {/* Indicador activo */}
                      {isActive && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-sm" />
                      )}
                    </Link>
                  )}

                  {/* Submenús */}
                  {hasSubmenus && !collapsed && (
                    <div className={`overflow-hidden transition-all duration-300 ${isSubmenuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <ul className="mt-2 ml-6 space-y-1">
                        {item.subtitles.map((subtitle, i) => (
                          <li key={i}>
                            <Link
                              to={`/dashboard/${subtitle.toLowerCase()}`}
                              className="flex items-center py-2 px-3 rounded-lg text-sm text-slate-600 hover:bg-white/50 hover:text-slate-900 transition-colors duration-200"
                            >
                              <div className="w-2 h-2 rounded-full bg-slate-300 mr-3" />
                              {subtitle}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Secondary Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-200/60">
          {!collapsed && (
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-4">
              Configuración
            </h3>
          )}

          <nav>
            <ul className="space-y-1">
              {secondaryNavItems.map((item, index) => {
                const isActive = isActiveRoute(item.path);

                return (
                  <li key={index}>
                    <Link
                      to={item.path}
                      className={`
                        group flex items-center py-3 px-3 rounded-xl transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                          : 'text-slate-600 hover:bg-white/70 hover:shadow-md hover:text-slate-900'
                        }
                        ${collapsed ? 'justify-center' : ''}
                        ${item.title === 'Cerrar Sesion' ? 'hover:bg-red-50 hover:text-red-600' : ''}
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <span className="ml-3 font-medium text-sm">
                          {item.title}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Footer info cuando está expandido */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-200/30">
            <div className="text-xs text-slate-600 font-medium">
              Rol: <span className="text-blue-600">{rol}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;