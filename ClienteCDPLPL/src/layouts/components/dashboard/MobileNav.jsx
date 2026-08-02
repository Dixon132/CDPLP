import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, X, LogOut, ShieldCheck } from 'lucide-react';
import { getMobileNavForRole, getIcon, formatTitle } from '../../navigation';
import { useSession } from '../../../context/SessionProvider';

/**
 * Navegación para pantallas pequeñas: barra inferior fija con los cuatro
 * módulos más relevantes del rol, más una hoja deslizante con el resto.
 *
 * Sustituye al sidebar en móvil, que antes seguía ocupando 256px de ancho
 * porque el layout no tenía ni un breakpoint.
 */
export default function MobileNav() {
    const { rol, permisos, nombreCompleto, iniciales, logout } = useSession();
    const { pathname } = useLocation();
    const [hojaAbierta, setHojaAbierta] = useState(false);

    const { principales, resto } = useMemo(() => getMobileNavForRole(rol, permisos, 4), [rol, permisos]);

    // Cierra la hoja al navegar.
    useEffect(() => setHojaAbierta(false), [pathname]);

    // Bloquea el scroll del fondo y permite cerrar con Escape.
    useEffect(() => {
        if (!hojaAbierta) return undefined;
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const alTeclado = (e) => e.key === 'Escape' && setHojaAbierta(false);
        document.addEventListener('keydown', alTeclado);
        return () => {
            document.body.style.overflow = previo;
            document.removeEventListener('keydown', alTeclado);
        };
    }, [hojaAbierta]);

    const esActivo = (item) =>
        item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/');

    if (principales.length === 0) return null;

    return (
        <>
            {/* Barra inferior */}
            {/* Nombre distinto al del sidebar: dos landmarks de navegación con
                la misma etiqueta confunden a los lectores de pantalla. */}
            <nav
                aria-label="Navegación rápida"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <ul className="grid grid-cols-5">
                    {principales.map((item) => {
                        const Icono = getIcon(item.icon);
                        const activo = esActivo(item);
                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    aria-current={activo ? 'page' : undefined}
                                    className={`relative flex flex-col items-center gap-1 py-2.5 transition-colors ${activo ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    {activo && (
                                        <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-slate-900" />
                                    )}
                                    <Icono size={19} />
                                    <span className="max-w-full truncate px-1 text-[9px] font-bold uppercase tracking-wide">
                                        {formatTitle(item.title).split(' ')[0]}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}

                    <li>
                        <button
                            type="button"
                            onClick={() => setHojaAbierta(true)}
                            aria-expanded={hojaAbierta}
                            aria-label="Ver más opciones"
                            className={`flex w-full flex-col items-center gap-1 py-2.5 transition-colors ${hojaAbierta ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                            <MoreHorizontal size={19} />
                            <span className="text-[9px] font-bold uppercase tracking-wide">Más</span>
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Hoja deslizante */}
            <AnimatePresence>
                {hojaAbierta && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setHojaAbierta(false)}
                            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Más opciones"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.4 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 90) setHojaAbierta(false);
                            }}
                            className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white lg:hidden"
                            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
                        >
                            {/* Asa */}
                            <div className="sticky top-0 z-10 bg-white pt-2.5">
                                <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
                                <div className="flex items-center justify-between px-5 py-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                                            {iniciales}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {nombreCompleto}
                                            </p>
                                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <ShieldCheck size={10} /> {formatTitle(rol || '—')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHojaAbierta(false)}
                                        aria-label="Cerrar"
                                        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="h-px bg-slate-200" />
                            </div>

                            <div className="space-y-5 px-5 py-4">
                                {resto.map((grupo) => (
                                    <div key={grupo.id}>
                                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {grupo.label}
                                        </h3>
                                        <ul className="grid grid-cols-2 gap-2">
                                            {grupo.items.map((item) => {
                                                const Icono = getIcon(item.icon);
                                                const activo = esActivo(item);
                                                return (
                                                    <li key={item.path}>
                                                        <Link
                                                            to={item.path}
                                                            className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${activo
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'}`}
                                                        >
                                                            <Icono size={17} className="shrink-0" />
                                                            <span className="truncate text-[13px] font-medium">
                                                                {formatTitle(item.title)}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={logout}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600"
                                >
                                    <LogOut size={16} /> Cerrar sesión
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
