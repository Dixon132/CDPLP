import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import {
    getNotificaciones,
    marcarNotificacionLeida,
    marcarTodasLeidas,
} from '../../../features/dashboard/services/notificaciones';

/**
 * Campanita de notificaciones.
 *
 * El servidor ya filtra por los módulos del rol y devuelve el estado de lectura
 * de ESTE usuario, así que aquí solo se pinta. Se refresca cada 60s y también
 * al volver a la pestaña, para no consultar mientras nadie mira.
 */

const INTERVALO_MS = 60_000;

const TONOS = {
    exito: 'bg-emerald-50 text-emerald-600',
    aviso: 'bg-amber-50 text-amber-600',
    error: 'bg-rose-50 text-rose-600',
    info: 'bg-blue-50 text-blue-600',
};

const haceCuanto = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `hace ${d} d`;
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [items, setItems] = useState([]);
    const [noLeidas, setNoLeidas] = useState(0);
    const [cargando, setCargando] = useState(false);
    const panelRef = useRef(null);

    const cargar = useCallback(async () => {
        try {
            const { data, noLeidas: n } = await getNotificaciones({ limit: 20 });
            setItems(data);
            setNoLeidas(n);
        } catch {
            /* silencioso: la campanita no debe romper la navegación */
        }
    }, []);

    // Sondeo mientras la pestaña está visible.
    useEffect(() => {
        cargar();
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') cargar();
        }, INTERVALO_MS);
        const alVolver = () => document.visibilityState === 'visible' && cargar();
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', alVolver);
        };
    }, [cargar]);

    // Cerrar al hacer clic fuera o con Escape.
    useEffect(() => {
        if (!abierto) return undefined;
        const alClic = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setAbierto(false);
        };
        const alTeclado = (e) => e.key === 'Escape' && setAbierto(false);
        document.addEventListener('mousedown', alClic);
        document.addEventListener('keydown', alTeclado);
        return () => {
            document.removeEventListener('mousedown', alClic);
            document.removeEventListener('keydown', alTeclado);
        };
    }, [abierto]);

    const abrir = async (n) => {
        setAbierto(false);
        if (!n.leida) {
            // Optimista: se marca ya y se confirma con el servidor.
            setItems((prev) => prev.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x)));
            setNoLeidas((c) => Math.max(0, c - 1));
            marcarNotificacionLeida(n.id_notificacion).catch(cargar);
        }
        if (n.enlace) navigate(n.enlace);
    };

    const leerTodas = async () => {
        setCargando(true);
        try {
            await marcarTodasLeidas();
            await cargar();
        } finally {
            setCargando(false);
        }
    };

    return (
        <div ref={panelRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
                aria-expanded={abierto}
                className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
                <Bell size={18} />
                {noLeidas > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {noLeidas > 9 ? '9+' : noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">
                            Notificaciones
                            {noLeidas > 0 && (
                                <span className="ml-2 text-[11px] font-semibold text-slate-500">
                                    {noLeidas} sin leer
                                </span>
                            )}
                        </p>
                        {noLeidas > 0 && (
                            <button
                                type="button"
                                onClick={leerTodas}
                                disabled={cargando}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50"
                            >
                                {cargando ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                                Marcar todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm text-slate-400">No tienes notificaciones</p>
                            </div>
                        ) : (
                            items.map((n) => (
                                <button
                                    key={n.id_notificacion}
                                    type="button"
                                    onClick={() => abrir(n)}
                                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${n.leida ? '' : 'bg-indigo-50/40'}`}
                                >
                                    <span
                                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONOS[n.tipo] ?? TONOS.info}`}
                                    >
                                        <Bell size={14} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-2">
                                            <span className={`text-[13px] leading-snug ${n.leida ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>
                                                {n.titulo}
                                            </span>
                                            {!n.leida && (
                                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
                                            )}
                                        </span>
                                        {n.descripcion && (
                                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                                                {n.descripcion}
                                            </span>
                                        )}
                                        <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                            {n.modulo}
                                            <span aria-hidden="true">·</span>
                                            {haceCuanto(n.createdAt)}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
