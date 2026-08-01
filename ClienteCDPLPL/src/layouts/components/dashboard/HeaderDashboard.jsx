import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';
import { formatTitle } from '../../navigation';
import { useSession } from '../../../context/SessionProvider';
import { useAppearance } from '../../../context/AppearanceProvider';

/**
 * Barra superior del dashboard, en tres zonas: ubicación (izquierda),
 * buscador (centro) y sesión (derecha).
 *
 * Antes mostraba un usuario escrito a mano y sus botones no hacían nada.
 * Ahora todo sale de `useSession` y el logout borra el token de verdad.
 */
export const HeaderDashboard = ({ collapsed, onToggleSidebar, onOpenSearch }) => {
  const { nombreCompleto, correo, iniciales, rol, vigencia, minutosRestantes, porExpirar, logout } =
    useSession();
  const { tema, temas, setTema, alternarTema } = useAppearance();
  const esOscuro = tema === 'oscuro';
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  // Cierra el menú al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alClic = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    };
    const alTeclado = (e) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTeclado);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTeclado);
    };
  }, [menuAbierto]);

  const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

  const vigenciaTexto = () => {
    if (!vigencia?.hasta) return null;
    const fin = new Date(vigencia.hasta);
    if (Number.isNaN(fin.getTime())) return null;
    return fin.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <>
      {/* Aviso de sesión por expirar */}
      {porExpirar && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-[11px] font-semibold text-amber-800">
          <Clock size={12} />
          Tu sesión expira en {minutosRestantes} min. Guarda los cambios pendientes.
        </div>
      )}

      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl sm:px-5">
        {/* ── Izquierda: colapso + ubicación ── */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          className="hidden lg:flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Marca, solo en móvil (en escritorio ya está en el sidebar) */}
        <Link to="/dashboard" className="lg:hidden shrink-0 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
            C
          </span>
        </Link>

        <div className="hidden lg:block h-6 w-px bg-slate-200" />

        <div className="min-w-0 flex-1 lg:flex-none lg:w-auto">
          <Breadcrumbs />
        </div>

        {/* ── Centro: buscador ── */}
        <div className="ml-auto flex flex-1 justify-end lg:justify-center">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Abrir buscador global"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 transition-colors hover:border-slate-300 hover:bg-white lg:w-72 xl:w-96"
          >
            <Search size={15} className="shrink-0" />
            <span className="hidden lg:block flex-1 text-left text-[13px]">
              Buscar módulos o personas…
            </span>
            <kbd className="hidden lg:flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-slate-400">
              {esMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        {/* ── Derecha: switch de tema + notificaciones + sesión ── */}
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          {/*
            Switch claro ↔ oscuro. `alternarTema` conserva el tema alternativo
            (durazno) si se activa desde Ajustes, así que el switch solo
            alterna cuando estás en uno de los dos preajustados.
          */}
          <button
            type="button"
            onClick={alternarTema}
            role="switch"
            aria-checked={esOscuro}
            aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
            className="relative flex h-8 w-14 shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 px-1 transition-colors hover:border-slate-300"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${esOscuro ? 'translate-x-6' : 'translate-x-0'}`}
            >
              {esOscuro
                ? <Moon size={12} className="text-slate-600" />
                : <Sun size={12} className="text-amber-500" />}
            </span>
            {/* Iconos al fondo para dar contexto */}
            <Sun
              size={11}
              className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity ${esOscuro ? 'opacity-40 text-slate-400' : 'opacity-0'}`}
              aria-hidden="true"
            />
            <Moon
              size={11}
              className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity ${esOscuro ? 'opacity-0' : 'opacity-40 text-slate-400'}`}
              aria-hidden="true"
            />
          </button>

          <NotificationBell />

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              {iniciales}
            </span>
            <span className="hidden text-left xl:block">
              <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-slate-800">
                {nombreCompleto}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {formatTitle(rol || '—')}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`hidden shrink-0 text-slate-400 transition-transform xl:block ${menuAbierto ? 'rotate-180' : ''}`}
            />
          </button>

          {menuAbierto && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    {iniciales}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{nombreCompleto}</p>
                    {correo && <p className="truncate text-xs text-slate-500">{correo}</p>}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {formatTitle(rol || '—')}
                  </span>
                </div>
                {vigenciaTexto() && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Cargo vigente hasta el {vigenciaTexto()}
                  </p>
                )}
              </div>

              {/* Cambio rápido de tema. El resto de la apariencia
                  (tipografía incluida) vive en Ajustes. */}
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Tema
                </p>
                <div className="flex gap-1.5" role="group" aria-label="Tema de la interfaz">
                  {temas.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTema(t.id)}
                      aria-pressed={t.id === tema}
                      title={t.nombre}
                      className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-2 transition-colors ${t.id === tema
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <span className="flex gap-0.5" aria-hidden="true">
                        {t.muestras.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600">{t.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  to="/dashboard/ajustes"
                  onClick={() => setMenuAbierto(false)}
                  role="menuitem"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Settings size={15} className="text-slate-400" />
                  Ajustes y apariencia
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </header>
    </>
  );
};

export default HeaderDashboard;
