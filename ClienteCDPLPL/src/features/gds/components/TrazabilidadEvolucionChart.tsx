// Gráfico de evolución temporal de las dimensiones del `Indice_Riesgo` por
// `Comunidad_Digital` (Req. 22.2), con varios tipos de visualización y filtros.
//
// Ofrece 4 tipos de gráfico (líneas, áreas apiladas, barras y radar), permite
// mostrar/ocultar cada dimensión y resalta los niveles de riesgo con color.
import { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

import type { SerieDimension } from '../api/trazabilidadApi';

export interface TrazabilidadEvolucionChartProps {
    series: ReadonlyArray<SerieDimension>;
}

type TipoGrafico = 'lineas' | 'areas' | 'barras' | 'radar';

const TIPOS: ReadonlyArray<{ id: TipoGrafico; label: string; icono: string }> = [
    { id: 'lineas', label: 'Líneas', icono: '📈' },
    { id: 'areas', label: 'Área apilada', icono: '🏔' },
    { id: 'barras', label: 'Barras', icono: '📊' },
    { id: 'radar', label: 'Radar', icono: '🎯' },
];

export function TrazabilidadEvolucionChart({ series }: TrazabilidadEvolucionChartProps) {
    const [tipo, setTipo] = useState<TipoGrafico>('lineas');
    const [ocultas, setOcultas] = useState<Set<string>>(new Set());

    // Filas por semana: { semana, [dimension]: valor }
    const filas = useMemo(() => {
        const porSemana = new Map<number, Record<string, number>>();
        for (const s of series) {
            for (const d of s.datos) {
                if (!porSemana.has(d.semana)) porSemana.set(d.semana, { semana: d.semana });
                porSemana.get(d.semana)![s.label] = d.valor;
            }
        }
        return Array.from(porSemana.values()).sort((a, b) => a.semana - b.semana);
    }, [series]);

    // Datos para radar: promedio por dimensión.
    const datosRadar = useMemo(
        () =>
            series.map((s) => {
                const valores = s.datos.map((d) => d.valor);
                const prom = valores.length
                    ? valores.reduce((a, b) => a + b, 0) / valores.length
                    : 0;
                return { dimension: s.label, valor: Math.round(prom * 10) / 10, color: s.color };
            }),
        [series],
    );

    const visibles = series.filter((s) => !ocultas.has(s.label));

    function toggle(label: string) {
        setOcultas((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    }

    if (series.length === 0 || filas.length === 0) {
        return (
            <div
                role="status"
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
            >
                <p className="text-2xl">📉</p>
                <p className="mt-2">Aún no hay evolución por dimensión para esta comunidad.</p>
                <p className="text-xs text-slate-400">
                    Avanza semanas del análisis para ver cómo evolucionan los indicadores.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Selector de tipo de gráfico */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Visualización:</span>
                {TIPOS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTipo(t.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            tipo === t.id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {t.icono} {t.label}
                    </button>
                ))}
            </div>

            {/* Filtros de dimensiones (toggle) */}
            {tipo !== 'radar' && (
                <div className="flex flex-wrap gap-1.5">
                    {series.map((s) => {
                        const activa = !ocultas.has(s.label);
                        return (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => toggle(s.label)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity ${
                                    activa ? 'opacity-100' : 'opacity-40'
                                }`}
                                style={{ borderColor: s.color, color: activa ? s.color : '#94a3b8' }}
                            >
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Gráfico según el tipo */}
            <ResponsiveContainer width="100%" height={340}>
                {tipo === 'lineas' ? (
                    <LineChart data={filas} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} tickFormatter={(s) => `S${s}`} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip labelFormatter={(s) => `Semana ${s}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {visibles.map((s) => (
                            <Line
                                key={s.label}
                                type="monotone"
                                dataKey={s.label}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                ) : tipo === 'areas' ? (
                    <AreaChart data={filas} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                        <defs>
                            {visibles.map((s) => (
                                <linearGradient key={s.label} id={`grad-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={s.color} stopOpacity={0.85} />
                                    <stop offset="95%" stopColor={s.color} stopOpacity={0.35} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} tickFormatter={(s) => `S${s}`} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(s) => `Semana ${s}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {visibles.map((s) => (
                            <Area
                                key={s.label}
                                type="monotone"
                                dataKey={s.label}
                                stackId="riesgo"
                                stroke={s.color}
                                strokeWidth={1}
                                fill={`url(#grad-${s.label})`}
                            />
                        ))}
                    </AreaChart>
                ) : tipo === 'barras' ? (
                    <BarChart data={filas} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} tickFormatter={(s) => `S${s}`} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip labelFormatter={(s) => `Semana ${s}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {visibles.map((s) => (
                            <Bar key={s.label} dataKey={s.label} fill={s.color} radius={[2, 2, 0, 0]} />
                        ))}
                    </BarChart>
                ) : (
                    <RadarChart data={datosRadar} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar
                            name="Promedio del periodo"
                            dataKey="valor"
                            stroke="#0ea5e9"
                            fill="#0ea5e9"
                            fillOpacity={0.4}
                        />
                        <Tooltip />
                    </RadarChart>
                )}
            </ResponsiveContainer>

            {tipo === 'radar' && (
                <p className="text-center text-xs text-slate-400">
                    El radar muestra el promedio de cada dimensión en el periodo analizado.
                </p>
            )}
        </div>
    );
}

export default TrazabilidadEvolucionChart;
