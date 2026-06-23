// Detalle de un `Reporte` por horizonte (Req. 19, 20), legible y desglosado por
// institución. Presenta un resumen ejecutivo claro, la metodología del cálculo
// del riesgo, una narrativa de variación por dimensión, tarjetas "enterprise"
// por dimensión/hito/conclusión con micro-gráficos, y una comparación gráfica
// entre instituciones. No vuelca el texto crudo del backend.
import { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type {
    Reporte,
    SeccionInstitucion,
    IndicadorReporte,
    CambioReporte,
    HitoReporte,
    MetricaSemanaContenido,
    Afirmacion,
} from '../api/reportesApi';
import { CronologiaTimeline as CronologiaTimelineBase } from './CronologiaTimeline';

const PALETA = ['#0ea5e9', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#14b8a6', '#db2777', '#6366f1'];

function colorRiesgo(v: number): string {
    if (v >= 66) return '#ef4444';
    if (v >= 33) return '#f59e0b';
    return '#22c55e';
}
function nivel(v: number): string {
    if (v >= 66) return 'alto';
    if (v >= 33) return 'moderado';
    return 'bajo';
}
function flecha(direccion: string) {
    if (direccion === 'sube') return { icono: '▲', color: '#ef4444' };
    if (direccion === 'baja') return { icono: '▼', color: '#22c55e' };
    return { icono: '▬', color: '#94a3b8' };
}
function promedio(indicadores: IndicadorReporte[]): number {
    if (indicadores.length === 0) return 0;
    return Math.round((indicadores.reduce((s, i) => s + i.promedio, 0) / indicadores.length) * 10) / 10;
}
function dimensionTop(indicadores: IndicadorReporte[]): IndicadorReporte | null {
    if (indicadores.length === 0) return null;
    return indicadores.reduce((a, b) => (b.promedio > a.promedio ? b : a));
}

/** Narrativa legible de cómo varió cada dimensión (texto ejecutivo). */
function narrativaVariacion(cambios: CambioReporte[]): string {
    const rel = [...cambios]
        .filter((c) => c.direccion !== 'estable')
        .sort((a, b) => Math.abs(b.variacionAbsoluta) - Math.abs(a.variacionAbsoluta));
    if (rel.length === 0) {
        return 'El riesgo promedio por dimensión se mantuvo estable durante el periodo, sin variaciones significativas entre la primera y la última semana con datos.';
    }
    const frases = rel.slice(0, 6).map((c) => {
        const magnitud =
            c.variacionPct != null
                ? `${Math.abs(c.variacionPct)}%`
                : `${Math.abs(c.variacionAbsoluta)} pts`;
        return `${c.dimension} ${c.direccion === 'sube' ? 'subió' : 'bajó'} ${magnitud}`;
    });
    return `El riesgo promedio por dimensión varió así: ${frases.join('; ')}.`;
}

/** Barra horizontal simple (micro-gráfico) 0-100. */
function MiniBarra({ valor, color }: { valor: number; color: string }) {
    return (
        <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, valor))}%`, background: color }}
            />
        </div>
    );
}

/** Explicación plegable de cómo se calcula el riesgo promedio. */
function MetodologiaRiesgo() {
    return (
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-600">
                ¿Cómo se calcula el riesgo promedio?
            </summary>
            <div className="mt-2 space-y-1.5 text-slate-500">
                <p>
                    Cada dimensión del índice (estrés académico, aislamiento, etc.) se mide en una escala de{' '}
                    <strong>0 a 100</strong>, donde un valor más alto indica mayor presencia del riesgo a nivel{' '}
                    <strong>colectivo</strong> (nunca un diagnóstico individual).
                </p>
                <p>
                    El <strong>riesgo promedio</strong> es la media aritmética de los promedios de todas las
                    dimensiones del periodo: se suman los promedios de cada dimensión y se divide entre el número
                    de dimensiones.
                </p>
                <p>
                    Niveles de referencia:{' '}
                    <span className="font-medium text-emerald-600">bajo (0–33)</span>,{' '}
                    <span className="font-medium text-amber-600">moderado (33–66)</span> y{' '}
                    <span className="font-medium text-red-600">alto (66–100)</span>.
                </p>
            </div>
        </details>
    );
}

/** Tarjeta enterprise por dimensión con micro-gráfico inicio→final. */
function TarjetaDimension({ ind, cambio }: { ind: IndicadorReporte; cambio?: CambioReporte }) {
    const f = flecha(cambio?.direccion ?? 'estable');
    const col = colorRiesgo(ind.valorFinal);
    const tieneTendencia = cambio != null && cambio.direccion !== 'estable';
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{ind.dimension}</span>
                <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: `${col}1a`, color: col }}
                >
                    Nivel {nivel(ind.valorFinal)}
                </span>
            </div>
            <div className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-bold leading-none" style={{ color: col }}>
                    {ind.valorFinal.toFixed(1)}
                    <span className="ml-1 text-xs font-normal text-slate-400">/100</span>
                </span>
                <span className="text-right">
                    {tieneTendencia ? (
                        <span className="block text-xs font-semibold" style={{ color: f.color }}>
                            {f.icono} {cambio!.variacionPct != null
                                ? `${cambio!.variacionPct > 0 ? '+' : ''}${cambio!.variacionPct}%`
                                : `${cambio!.variacionAbsoluta > 0 ? '+' : ''}${cambio!.variacionAbsoluta} pts`}
                        </span>
                    ) : (
                        <span className="block text-xs font-semibold text-slate-400">▬ estable</span>
                    )}
                    <span className="block text-[9px] text-slate-400">vs. semana inicial</span>
                </span>
            </div>
            <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="w-9">Inicio</span>
                    <MiniBarra valor={ind.valorInicial} color="#cbd5e1" />
                    <span className="w-7 text-right tabular-nums">{ind.valorInicial.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="w-9">Final</span>
                    <MiniBarra valor={ind.valorFinal} color={col} />
                    <span className="w-7 text-right tabular-nums">{ind.valorFinal.toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
}

/** Tarjeta de hito (movimiento notable entre semanas consecutivas). */
function TarjetaHito({ h }: { h: HitoReporte }) {
    const sube = h.direccion === 'sube';
    const color = sube ? '#ef4444' : '#22c55e';
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{h.dimension}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    sem. {h.desdeSemana} → {h.hastaSemana}
                </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-400 tabular-nums">{h.valorDesde.toFixed(0)}</span>
                <span style={{ color }}>{sube ? '▲' : '▼'}</span>
                <span className="text-lg font-bold tabular-nums" style={{ color }}>
                    {h.valorHasta.toFixed(0)}
                </span>
                <span className="ml-auto text-xs font-semibold" style={{ color }}>
                    {h.variacionAbsoluta > 0 ? '+' : ''}
                    {h.variacionAbsoluta} pts
                </span>
            </div>
        </div>
    );
}

/** Tarjeta enterprise para una conclusión/recomendación. */
function TarjetaAfirmacion({
    texto,
    color,
    indice,
}: {
    texto: string;
    color: string;
    indice: number;
}) {
    return (
        <div
            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
            style={{ borderLeft: `3px solid ${color}` }}
        >
            <div
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold"
                style={{ background: `${color}1a`, color }}
            >
                {indice}
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{texto}</p>
        </div>
    );
}

/** Sección de tarjetas de afirmaciones con título. */
function SeccionAfirmaciones({
    titulo,
    items,
    color,
}: {
    titulo: string;
    items: Afirmacion[];
    color: string;
}) {
    if (items.length === 0) return null;
    return (
        <div>
            <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-3 w-1 rounded-full" style={{ background: color }} />
                <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {titulo} <span className="text-slate-300">({items.length})</span>
                </h5>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
                {items.map((a, i) => (
                    <TarjetaAfirmacion key={i} texto={a.texto} color={color} indice={i + 1} />
                ))}
            </div>
        </div>
    );
}

/** Cronología histórica de contenido por semana (timeline visual). */
function CronologiaTimeline({ cronologia }: { cronologia: MetricaSemanaContenido[] }) {
    return <CronologiaTimelineBase cronologia={cronologia} />;
}

/** Bloque de contenido completo de un periodo o institución. */
function BloqueContenido({
    indicadores,
    cambios,
    hitos,
    cronologia,
    conclusiones,
    recomendaciones,
    conGrafico,
}: {
    indicadores: IndicadorReporte[];
    cambios: CambioReporte[];
    hitos: HitoReporte[];
    cronologia?: MetricaSemanaContenido[];
    conclusiones: Afirmacion[];
    recomendaciones: Afirmacion[];
    conGrafico: boolean;
}) {
    const prom = promedio(indicadores);
    const top = dimensionTop(indicadores);
    const datosGrafico = indicadores.map((i) => ({ nombre: i.dimension, valor: i.valorFinal }));

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="flex flex-wrap gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-xs text-slate-400">Riesgo promedio</p>
                    <p className="text-lg font-semibold" style={{ color: colorRiesgo(prom) }}>
                        {prom} <span className="text-xs">/ 100 ({nivel(prom)})</span>
                    </p>
                </div>
                {top && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-slate-400">Dimensión más crítica</p>
                        <p className="text-sm font-semibold text-slate-700">
                            {top.dimension}{' '}
                            <span style={{ color: colorRiesgo(top.promedio) }}>({top.promedio.toFixed(1)})</span>
                        </p>
                    </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-xs text-slate-400">Dimensiones evaluadas</p>
                    <p className="text-lg font-semibold text-slate-700">{indicadores.length}</p>
                </div>
            </div>

            <MetodologiaRiesgo />

            {/* Narrativa de variación */}
            {indicadores.length > 0 && (
                <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 p-3">
                    <p className="text-sm leading-relaxed text-slate-700">{narrativaVariacion(cambios)}</p>
                </div>
            )}

            {/* Gráfico general (horizontes amplios) */}
            {conGrafico && datosGrafico.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Riesgo por dimensión (valor final)
                    </h5>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={datosGrafico} margin={{ top: 4, right: 8, left: -16, bottom: 28 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="nombre" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                            <Tooltip formatter={(v) => [`${v} / 100`, 'Riesgo']} />
                            <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                                {datosGrafico.map((d, i) => (
                                    <Cell key={i} fill={colorRiesgo(d.valor)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tarjetas por dimensión */}
            {indicadores.length > 0 ? (
                <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Indicadores por dimensión
                    </h5>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {indicadores.map((ind) => (
                            <TarjetaDimension
                                key={ind.dimension}
                                ind={ind}
                                cambio={cambios.find((c) => c.dimension === ind.dimension)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-400">Sin indicadores en este periodo.</p>
            )}

            {/* Hitos entre semanas */}
            {hitos.length > 0 && (
                <div>
                    <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Movimientos relevantes entre semanas
                    </h5>
                    <p className="mb-2 text-xs text-slate-400">
                        Alzas o bajas considerables detectadas en tramos intermedios del periodo (no solo entre la
                        primera y la última semana).
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {hitos.map((h, i) => (
                            <TarjetaHito key={i} h={h} />
                        ))}
                    </div>
                </div>
            )}

            <SeccionAfirmaciones titulo="Conclusiones" items={conclusiones} color="#0891b2" />
            <SeccionAfirmaciones titulo="Recomendaciones" items={recomendaciones} color="#059669" />

            {cronologia && cronologia.length > 0 && (
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-block h-3 w-1 rounded-full bg-sky-500" />
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cronología de contenido
                        </h5>
                    </div>
                    <CronologiaTimeline cronologia={cronologia} />
                </div>
            )}
        </div>
    );
}

/** Gráfico comparativo: cada dimensión, una barra por institución. */
function ComparacionInstituciones({ secciones }: { secciones: SeccionInstitucion[] }) {
    const { datos, claves } = useMemo(() => {
        const dims = new Set<string>();
        secciones.forEach((s) => s.indicadores.forEach((i) => dims.add(i.dimension)));
        const filas = [...dims].map((dim) => {
            const fila: Record<string, number | string> = { dimension: dim };
            secciones.forEach((s) => {
                const ind = s.indicadores.find((i) => i.dimension === dim);
                fila[s.institucionNombre] = ind ? Math.round(ind.promedio * 10) / 10 : 0;
            });
            return fila;
        });
        return { datos: filas, claves: secciones.map((s) => s.institucionNombre) };
    }, [secciones]);

    if (datos.length === 0) return <p className="text-sm text-slate-400">Sin datos para comparar.</p>;

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-600">
                Comparación del riesgo promedio por dimensión entre las {secciones.length} instituciones del
                análisis. Cada barra representa una institución; a mayor altura, mayor riesgo colectivo en esa
                dimensión.
            </p>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datos} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dimension" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {claves.map((k, i) => (
                        <Bar key={k} dataKey={k} fill={PALETA[i % PALETA.length]} radius={[2, 2, 0, 0]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            {/* Resumen comparativo por institución */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {secciones.map((s) => {
                    const prom = promedio(s.indicadores);
                    const top = dimensionTop(s.indicadores);
                    return (
                        <div key={s.institucionId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                {s.logoUrl && (
                                    <img
                                        src={s.logoUrl}
                                        alt=""
                                        className="h-5 w-5 rounded-sm object-contain"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                                <p className="text-sm font-semibold text-slate-700">{s.institucionNombre}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                Riesgo promedio:{' '}
                                <span className="font-semibold" style={{ color: colorRiesgo(prom) }}>
                                    {prom}/100 ({nivel(prom)})
                                </span>
                            </p>
                            {top && (
                                <p className="text-xs text-slate-400">
                                    Más crítica: <span className="text-slate-600">{top.dimension}</span> (
                                    {top.promedio.toFixed(1)})
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export interface DetalleReporteProps {
    reporte: Reporte;
}

export default function DetalleReporte({ reporte }: DetalleReporteProps) {
    const c = reporte.contenido;
    const [tab, setTab] = useState<string>('general');

    if (!c) {
        return <p className="px-4 py-3 text-sm text-slate-400">Este reporte no tiene contenido estructurado.</p>;
    }

    const horizonteAmplio = ['trimestral', 'semestral', 'final'].includes(reporte.horizonte);
    const secciones = c.secciones ?? [];
    const tieneSecciones = secciones.length > 0;

    const promGeneral = promedio(c.indicadores);
    const topGeneral = dimensionTop(c.indicadores);
    const semanas = c.semanasCubiertas.length;

    return (
        <div className="space-y-5 bg-slate-50/60 px-4 py-4">
            {/* Resumen ejecutivo legible */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resumen ejecutivo
                </h5>
                <p className="text-sm leading-relaxed text-slate-700">
                    Durante este periodo se procesaron <strong>{semanas} semana(s)</strong>
                    {tieneSecciones ? <> en <strong>{secciones.length} institución(es)</strong></> : null}. El
                    riesgo colectivo promedio fue de{' '}
                    <strong style={{ color: colorRiesgo(promGeneral) }}>
                        {promGeneral}/100 (nivel {nivel(promGeneral)})
                    </strong>
                    {topGeneral && (
                        <>
                            , siendo <strong>{topGeneral.dimension}</strong> la dimensión más crítica
                            ({topGeneral.promedio.toFixed(1)}/100)
                        </>
                    )}
                    .
                </p>
            </div>

            {/* Pestañas: Comparación + una por institución */}
            {tieneSecciones && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setTab('general')}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                            tab === 'general' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Comparación entre instituciones
                    </button>
                    {secciones.map((s) => (
                        <button
                            key={s.institucionId}
                            type="button"
                            onClick={() => setTab(s.institucionId)}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                                tab === s.institucionId ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {s.logoUrl && (
                                <img
                                    src={s.logoUrl}
                                    alt=""
                                    className="h-4 w-4 rounded-sm object-contain"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            {s.institucionNombre}
                        </button>
                    ))}
                </div>
            )}

            {/* Contenido de la pestaña activa */}
            {tieneSecciones ? (
                tab === 'general' ? (
                    <ComparacionInstituciones secciones={secciones} />
                ) : (
                    (() => {
                        const s = secciones.find((x) => x.institucionId === tab);
                        if (!s) return null;
                        return (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                    {s.logoUrl ? (
                                        <img
                                            src={s.logoUrl}
                                            alt={s.institucionNombre}
                                            className="h-10 w-10 rounded-md object-contain"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-sm font-bold text-cyan-700">
                                            {s.institucionNombre.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{s.institucionNombre}</p>
                                        <p className="text-xs text-slate-400">Detalle de la institución</p>
                                    </div>
                                </div>
                                <BloqueContenido
                                    indicadores={s.indicadores}
                                    cambios={s.cambios}
                                    hitos={s.hitos ?? []}
                                    cronologia={s.cronologia ?? []}
                                    conclusiones={s.conclusiones}
                                    recomendaciones={s.recomendaciones}
                                    conGrafico={horizonteAmplio}
                                />
                            </div>
                        );
                    })()
                )
            ) : (
                <BloqueContenido
                    indicadores={c.indicadores}
                    cambios={c.cambios}
                    hitos={c.hitos ?? []}
                    conclusiones={c.conclusiones}
                    recomendaciones={c.recomendaciones}
                    conGrafico={horizonteAmplio}
                />
            )}

            {/* Detonantes (horizontes amplios) */}
            {horizonteAmplio && c.detonantes.length > 0 && (
                <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Eventos detonantes del periodo
                    </h5>
                    <div className="flex flex-wrap gap-2">
                        {c.detonantes.map((d, i) => (
                            <span key={i} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                                {d.evento} (sem. {d.semanas.join(', ')})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
