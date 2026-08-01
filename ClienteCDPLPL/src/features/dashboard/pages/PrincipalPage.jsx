import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    UsersRound, Briefcase, TrendingUp, TrendingDown, BookMarked, HeartHandshake,
    FolderDot, ClipboardList, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus,
    LayoutGrid, Activity, RefreshCw, CalendarDays,
} from 'lucide-react';
import { getResumenDashboard } from '../services/notificaciones';
import { useSession } from '../../../context/SessionProvider';

/**
 * Panel de inicio.
 *
 * Todas las cifras vienen de `GET /api/dashboard/resumen`, que solo devuelve
 * las métricas de los módulos a los que el rol tiene acceso.
 */

const ICONOS = {
    UsersRound, Briefcase, TrendingUp, TrendingDown, BookMarked,
    HeartHandshake, FolderDot, ClipboardList, AlertTriangle,
};

const TONOS = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-emerald-50 text-emerald-600',
};

const PERIODOS = [
    { id: 'mes', nombre: 'Este mes', comparativa: 'vs. mes anterior' },
    { id: 'trimestre', nombre: 'Trimestre', comparativa: 'vs. trimestre anterior' },
    { id: 'anio', nombre: 'Año', comparativa: 'vs. año anterior' },
];

const formatearNumero = (v, moneda) =>
    moneda
        ? `Bs. ${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`
        : new Intl.NumberFormat('es-BO').format(v);

/**
 * Flecha y color de la variación.
 * `menosEsMejor` invierte el criterio: en egresos o morosidad, bajar es bueno.
 */
function Tendencia({ variacion, menosEsMejor, comparativa }) {
    if (variacion === null || variacion === undefined) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Minus size={11} /> Sin base de comparación
            </span>
        );
    }

    const sube = variacion > 0;
    const plano = variacion === 0;
    const bueno = plano ? null : (menosEsMejor ? !sube : sube);
    const color = plano ? 'text-slate-400' : bueno ? 'text-emerald-600' : 'text-rose-600';
    const Icono = plano ? Minus : sube ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={`inline-flex flex-wrap items-center gap-1 text-[11px] font-bold ${color}`}>
            <Icono size={12} />
            {plano ? 'Sin cambios' : `${Math.abs(variacion)}%`}
            <span className="font-medium text-slate-400">{comparativa}</span>
        </span>
    );
}

function TarjetaMetrica({ m, comparativa }) {
    const Icono = ICONOS[m.icono] ?? LayoutGrid;

    const contenido = (
        <>
            <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${TONOS[m.color] ?? TONOS.indigo}`}>
                <Icono size={20} />
            </span>
            <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatearNumero(m.valor, m.moneda)}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-slate-600">{m.etiqueta}</p>
            <div className="mt-3 border-t border-slate-100 pt-2.5">
                {m.sinTendencia ? (
                    <span className="text-[11px] font-medium text-slate-400">{m.pie ?? '—'}</span>
                ) : (
                    <div className="space-y-0.5">
                        <Tendencia variacion={m.variacion} menosEsMejor={m.menosEsMejor} comparativa={comparativa} />
                        {m.pie && <p className="text-[11px] text-slate-400">{m.pie}</p>}
                    </div>
                )}
            </div>
        </>
    );

    const clases = 'flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm';
    return m.enlace
        ? <Link to={m.enlace} className={clases}>{contenido}</Link>
        : <div className={clases}>{contenido}</div>;
}

/**
 * Barras de ingresos vs egresos de los últimos meses.
 *
 * Usa `flex-1` en el área de barras en vez de una altura fija: cuando el grid
 * estira esta tarjeta para igualar la altura de "Actividad reciente" (su
 * hermana en la misma fila), las barras crecen para llenar el espacio en vez
 * de dejarlo vacío debajo.
 */
function GraficoSerie({ serie }) {
    const max = Math.max(1, ...serie.flatMap((s) => [s.ingresos, s.egresos]));
    const nombreMes = (clave) => {
        const [a, m] = clave.split('-');
        return new Date(Number(a), Number(m) - 1, 1)
            .toLocaleDateString('es-ES', { month: 'short' })
            .replace('.', '');
    };

    return (
        <div className="flex h-full flex-col">
            <div className="mb-4 flex shrink-0 items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Egresos
                </span>
            </div>

            <div className="flex min-h-[160px] flex-1 items-end justify-between gap-2 sm:gap-4">
                {serie.map((s) => (
                    <div key={s.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex w-full flex-1 items-end justify-center gap-1">
                            <div
                                className="w-full max-w-[18px] rounded-t bg-emerald-500 transition-all"
                                style={{ height: `${Math.max(2, (s.ingresos / max) * 100)}%` }}
                                title={`Ingresos: Bs. ${s.ingresos.toFixed(2)}`}
                            />
                            <div
                                className="w-full max-w-[18px] rounded-t bg-rose-400 transition-all"
                                style={{ height: `${Math.max(2, (s.egresos / max) * 100)}%` }}
                                title={`Egresos: Bs. ${s.egresos.toFixed(2)}`}
                            />
                        </div>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {nombreMes(s.mes)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const DashboardHome = () => {
    const { nombreCompleto } = useSession();
    const [periodo, setPeriodo] = useState('mes');
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const cargar = async (p) => {
        setCargando(true);
        try {
            setDatos(await getResumenDashboard(p));
            setError(null);
        } catch (e) {
            console.error(e);
            setError('No se pudo cargar el resumen del panel.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(periodo); }, [periodo]);

    const comparativa = useMemo(
        () => PERIODOS.find((p) => p.id === periodo)?.comparativa ?? '',
        [periodo]
    );

    const saludo = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Buenos días';
        if (h < 19) return 'Buenas tardes';
        return 'Buenas noches';
    }, []);

    return (
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            {/* Hero — identidad institucional. Antes del rediseño había un
                banner con el logo y una presentación; se restaura aquí en el
                lenguaje visual nuevo (slate oscuro) en vez del degradado
                azul/morado original. */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 lg:p-8">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
                    aria-hidden="true"
                />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur-sm">
                            <img
                                src="/img/logo.png"
                                alt="Escudo del Colegio Departamental de Psicólogos de La Paz"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
                                Panel administrativo
                            </p>
                            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-white lg:text-3xl">
                                {saludo}, {nombreCompleto?.split(' ')[0] ?? ''}
                            </h1>
                            <p className="mt-1 truncate text-sm text-slate-300">
                                Colegio Departamental de Psicólogos de La Paz
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-slate-200 backdrop-blur-sm">
                            <CalendarDays size={14} className="shrink-0 text-indigo-300" />
                            {new Date().toLocaleDateString('es-ES', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </div>

                        <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                            {PERIODOS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPeriodo(p.id)}
                                    aria-pressed={periodo === p.id}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${periodo === p.id
                                        ? 'bg-white text-slate-900'
                                        : 'text-slate-300 hover:text-white'}`}
                                >
                                    {p.nombre}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => cargar(periodo)}
                            aria-label="Actualizar datos"
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/15 hover:text-white"
                        >
                            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                    {error}
                </div>
            )}

            {/* Métricas */}
            {cargando && !datos ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[172px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
                    ))}
                </div>
            ) : datos?.metricas?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {datos.metricas.map((m) => (
                        <TarjetaMetrica key={m.clave} m={m} comparativa={comparativa} />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                    <LayoutGrid size={28} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500">
                        Tu rol no tiene métricas asignadas en el panel.
                    </p>
                </div>
            )}

            {/* Gráfico + actividad reciente */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:items-stretch">
                {datos?.serie?.length > 0 && (
                    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
                        <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-800">Flujo financiero</h2>
                                <p className="text-xs text-slate-500">Últimos 6 meses</p>
                            </div>
                            <Link
                                to="/dashboard/tesoreria"
                                className="shrink-0 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
                            >
                                Ver tesorería →
                            </Link>
                        </div>
                        <GraficoSerie serie={datos.serie} />
                    </div>
                )}

                <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-6 ${datos?.serie?.length > 0 ? '' : 'xl:col-span-3'}`}>
                    <div className="mb-4 flex shrink-0 items-center gap-2">
                        <Activity size={16} className="text-slate-400" />
                        <h2 className="text-base font-bold text-slate-800">Actividad reciente</h2>
                    </div>

                    {datos?.actividadReciente?.length > 0 ? (
                        <ul className="space-y-3 overflow-y-auto">
                            {datos.actividadReciente.map((a) => (
                                <li key={a.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] leading-snug text-slate-700">{a.descripcion}</p>
                                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                            {a.autor} · {a.modulo} ·{' '}
                                            {new Date(a.fecha).toLocaleDateString('es-ES', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">
                            Sin actividad registrada
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
