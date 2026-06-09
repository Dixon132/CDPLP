// Gráfico de comparación de una dimensión del `Indice_Riesgo` entre varias
// `Institucion` de un mismo `Analisis` con Recharts (Req. 22.4, 33.5).
//
// Cada institución es una línea; el eje X son las semanas. Si no hay datos
// suficientes, muestra un aviso (degradación elegante).
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

import type { ComparacionInstituciones } from '../api/trazabilidadApi';

export interface TrazabilidadComparacionChartProps {
    comparacion: ComparacionInstituciones;
}

export function TrazabilidadComparacionChart({ comparacion }: TrazabilidadComparacionChartProps) {
    const { filas, series } = comparacion;
    if (series.length === 0 || filas.length === 0) {
        return (
            <div
                role="status"
                className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
                Selecciona al menos una institución con datos para comparar.
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
                        key={s.clave}
                        type="monotone"
                        dataKey={s.clave}
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

export default TrazabilidadComparacionChart;
