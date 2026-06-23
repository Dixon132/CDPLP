// Cronología histórica de contenido por semana de una institución (Req. 22).
// Muestra, por semana: cuántas publicaciones se generaron, cuántas se tomaron
// en cuenta (filtro de relevancia), el origen de los aportes (texto/comentarios/
// imagen) y los hashtags más concurrentes. Se usa tanto en la vista de
// trazabilidad como en el detalle de reportes.
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { MetricaSemanaContenido } from '../api/reportesApi';

export interface CronologiaTimelineProps {
    cronologia: MetricaSemanaContenido[];
}

export function CronologiaTimeline({ cronologia }: CronologiaTimelineProps) {
    if (!cronologia || cronologia.length === 0) {
        return <p className="text-sm text-slate-400">Sin datos de contenido por semana en este periodo.</p>;
    }
    const datos = [...cronologia].sort((a, b) => a.numeroSemana - b.numeroSemana);
    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-400">
                Por cada semana: cuántas publicaciones se generaron, cuántas se tomaron en cuenta (filtro de
                relevancia) y el origen de los aportes (texto, comentarios, imagen) con sus hashtags.
            </p>
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={datos} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="numeroSemana" tick={{ fontSize: 10 }} tickFormatter={(v) => `S${v}`} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                        formatter={(v, n) => [v, n === 'contributivos' ? 'Tomadas' : 'Total generadas']}
                        labelFormatter={(l) => `Semana ${l}`}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={(n) => (n === 'contributivos' ? 'Tomadas' : 'Total')}
                    />
                    <Bar dataKey="totalItems" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="contributivos" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {datos.map((m) => (
                    <div key={m.numeroSemana} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">Semana {m.numeroSemana}</span>
                            <span className="text-xs text-slate-400">
                                {m.contributivos}/{m.totalItems} tomadas
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                            <div
                                className="h-1.5 rounded-full bg-sky-500"
                                style={{
                                    width: `${Math.round((m.totalItems ? m.contributivos / m.totalItems : 0) * 100)}%`,
                                }}
                            />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                            <span
                                className={`rounded px-1.5 py-0.5 ${
                                    m.aportePost > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                                Texto {m.aportePost > 0 ? '✓' : '—'}
                            </span>
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                                {m.aporteComentarios} comentarios
                            </span>
                            <span
                                className={`rounded px-1.5 py-0.5 ${
                                    m.aporteImagen > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                                Imagen {m.aporteImagen > 0 ? '✓' : '—'}
                            </span>
                        </div>
                        {m.hashtags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {m.hashtags.slice(0, 5).map((h) => (
                                    <span
                                        key={h.tag}
                                        className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-700"
                                    >
                                        #{h.tag}
                                        {h.conteo > 1 ? ` ×${h.conteo}` : ''}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CronologiaTimeline;
