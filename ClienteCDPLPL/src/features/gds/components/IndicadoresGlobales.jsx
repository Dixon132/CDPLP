// Indicadores globales de la Plataforma_GDS con Recharts (Req. 21.1, 21.5).
//
// Muestra las dimensiones del `Indice_Riesgo` agregadas (barras) y su evolución
// histórica (línea). Si no hay datos disponibles (backend aún sin endpoint),
// renderiza un estado informativo en lugar de romperse.
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

function PanelVacio({ titulo, mensaje }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <h3 className="text-sm font-medium text-slate-700">{titulo}</h3>
            <p className="mt-2 text-sm text-slate-400">{mensaje}</p>
        </div>
    );
}

/**
 * @param {object} props
 * @param {Array<{nombre:string, valor:number}>} props.indicadores
 * @param {Array<{periodo:string, valor:number}>} props.historicos
 * @param {boolean} [props.disponibleIndicadores]
 * @param {boolean} [props.disponibleHistoricos]
 */
export default function IndicadoresGlobales({
    indicadores = [],
    historicos = [],
    disponibleIndicadores = true,
    disponibleHistoricos = true,
}) {
    const hayIndicadores = disponibleIndicadores && indicadores.length > 0;
    const hayHistoricos = disponibleHistoricos && historicos.length > 0;

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                aria-label="Indicadores globales"
            >
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Indicadores globales
                </h3>
                {hayIndicadores ? (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={indicadores} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={8} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="valor" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <PanelVacio
                        titulo="Sin indicadores"
                        mensaje="Aún no hay indicadores globales disponibles."
                    />
                )}
            </section>

            <section
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                aria-label="Evolución histórica"
            >
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Evolución histórica
                </h3>
                {hayHistoricos ? (
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={historicos} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="valor"
                                stroke="#a855f7"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <PanelVacio
                        titulo="Sin históricos"
                        mensaje="Aún no hay datos históricos para mostrar."
                    />
                )}
            </section>
        </div>
    );
}
