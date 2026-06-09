// Gráfico de evolución temporal de las dimensiones del `Indice_Riesgo` por
// `Comunidad_Digital` con Recharts (Req. 22.2).
//
// Combina todas las dimensiones en filas por semana para un único `LineChart`.
// Si no hay datos, muestra un aviso informativo (degradación elegante).
import { useMemo } from 'react';
import {
    LineChart,
    Line,
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

export function TrazabilidadEvolucionChart({ series }: TrazabilidadEvolucionChartProps) {
    // Combina todas las dimensiones en filas por semana para un único LineChart.
    const filas = useMemo(() => {
        const porSemana = new Map<number, Record<string, number>>();
        for (const s of series) {
            for (const d of s.datos) {
                if (!porSemana.has(d.semana)) porSemana.set(d.semana, { semana: d.semana });
                porSemana.get(d.semana)![s.dimension] = d.valor;
            }
        }
        return Array.from(porSemana.values()).sort((a, b) => a.semana - b.semana);
    }, [series]);

    if (series.length === 0 || filas.length === 0) {
        return (
            <div
                role="status"
                className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
                Aún no hay evolución por dimensión para esta comunidad. Se mostrará a medida que se
                procesen las semanas del análisis.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filas} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} tickFormatter={(s) => `S${s}`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(s) => `Semana ${s}`} />
                <Legend />
                {series.map((s) => (
                    <Line
                        key={s.dimension}
                        type="monotone"
                        dataKey={s.dimension}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}

export default TrazabilidadEvolucionChart;
