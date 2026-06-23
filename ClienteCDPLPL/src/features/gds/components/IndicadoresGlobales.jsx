// Indicadores globales de la Plataforma_GDS con Recharts (Req. 21.1, 21.5).
//
// Muestra las dimensiones del `Indice_Riesgo` agregadas (barras) y su evolución
// histórica (línea), con EXPLICACIONES e INTERPRETACIÓN para que cualquier
// usuario (no solo el equipo técnico) entienda qué significan los datos.
import {
    BarChart,
    Bar,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';

/** Color según el nivel de riesgo (0-100). */
function colorRiesgo(valor) {
    if (valor >= 66) return '#ef4444';
    if (valor >= 33) return '#f59e0b';
    return '#22c55e';
}

/** Etiqueta del nivel de riesgo. */
function nivelRiesgo(valor) {
    if (valor >= 66) return 'alto';
    if (valor >= 33) return 'moderado';
    return 'bajo';
}

function PanelVacio({ titulo, mensaje }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <h3 className="text-sm font-medium text-slate-700">{titulo}</h3>
            <p className="mt-2 text-sm text-slate-400">{mensaje}</p>
        </div>
    );
}

/** Caja de ayuda contextual reutilizable. */
function Ayuda({ children }) {
    return (
        <div className="mb-3 flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <span aria-hidden="true">ℹ️</span>
            <p>{children}</p>
        </div>
    );
}

/** Leyenda de niveles de riesgo (verde/ámbar/rojo). */
function LeyendaNiveles() {
    const items = [
        { c: '#22c55e', t: 'Bajo (0–33)' },
        { c: '#f59e0b', t: 'Moderado (33–66)' },
        { c: '#ef4444', t: 'Alto (66–100)' },
    ];
    return (
        <div className="mt-2 flex flex-wrap gap-3">
            {items.map((i) => (
                <span key={i.t} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.c }} />
                    {i.t}
                </span>
            ))}
        </div>
    );
}

/**
 * @param {object} props
 * @param {Array<{nombre:string, valor:number}>} [props.indicadores]
 * @param {Array<{periodo:string, valor:number}>} [props.historicos]
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

    // Interpretación automática de los indicadores.
    const promedioGlobal = hayIndicadores
        ? Math.round(
            (indicadores.reduce((s, i) => s + (Number(i.valor) || 0), 0) / indicadores.length) * 10,
        ) / 10
        : 0;
    const mayor = hayIndicadores
        ? indicadores.reduce((a, b) => ((Number(b.valor) || 0) > (Number(a.valor) || 0) ? b : a))
        : null;

    // Tendencia de la serie histórica (primer vs último punto).
    let tendencia = null;
    if (hayHistoricos && historicos.length >= 2) {
        const ini = Number(historicos[0].valor) || 0;
        const fin = Number(historicos[historicos.length - 1].valor) || 0;
        const dif = Math.round((fin - ini) * 10) / 10;
        tendencia = {
            dif,
            texto:
                dif > 2
                    ? `El riesgo colectivo aumentó ${dif} puntos desde la primera semana.`
                    : dif < -2
                        ? `El riesgo colectivo disminuyó ${Math.abs(dif)} puntos desde la primera semana.`
                        : 'El riesgo colectivo se mantuvo estable a lo largo del periodo.',
        };
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Indicadores globales */}
            <section
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                aria-label="Indicadores globales"
            >
                <h3 className="text-sm font-semibold text-slate-700">
                    Indicadores globales de riesgo emocional
                </h3>
                <Ayuda>
                    Cada barra es el <strong>promedio</strong> de una dimensión del riesgo emocional
                    (0 = sin riesgo, 100 = riesgo máximo), calculado sobre <strong>todas</strong> las
                    semanas y comunidades analizadas. Sirve para identificar de un vistazo qué
                    aspectos preocupan más a nivel colectivo.
                </Ayuda>
                {hayIndicadores ? (
                    <>
                        <div className="mb-3 grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-slate-50 px-3 py-2">
                                <p className="text-xs text-slate-400">Riesgo promedio general</p>
                                <p
                                    className="text-lg font-semibold"
                                    style={{ color: colorRiesgo(promedioGlobal) }}
                                >
                                    {promedioGlobal} <span className="text-xs">/ 100 ({nivelRiesgo(promedioGlobal)})</span>
                                </p>
                            </div>
                            {mayor && (
                                <div className="rounded-md bg-slate-50 px-3 py-2">
                                    <p className="text-xs text-slate-400">Dimensión más alta</p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {mayor.nombre}{' '}
                                        <span style={{ color: colorRiesgo(Number(mayor.valor)) }}>
                                            ({Number(mayor.valor).toFixed(1)})
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={indicadores} margin={{ top: 8, right: 8, left: -16, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="nombre"
                                    tick={{ fontSize: 10 }}
                                    interval={0}
                                    angle={-20}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip formatter={(v) => [`${v} / 100`, 'Riesgo']} />
                                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                    {indicadores.map((d, i) => (
                                        <Cell key={i} fill={colorRiesgo(Number(d.valor) || 0)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <LeyendaNiveles />
                    </>
                ) : (
                    <PanelVacio
                        titulo="Sin indicadores"
                        mensaje="Aún no hay análisis con semanas procesadas. Crea un análisis y avanza semanas para ver indicadores."
                    />
                )}
            </section>

            {/* Evolución histórica */}
            <section
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                aria-label="Evolución histórica"
            >
                <h3 className="text-sm font-semibold text-slate-700">
                    Evolución histórica del riesgo
                </h3>
                <Ayuda>
                    Muestra cómo cambia el <strong>riesgo colectivo promedio</strong> semana a semana,
                    combinando todos los análisis. Una línea que sube indica un deterioro emocional
                    de las comunidades; una que baja, una mejora.
                </Ayuda>
                {hayHistoricos ? (
                    <>
                        {tendencia && (
                            <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                <span
                                    className="font-semibold"
                                    style={{
                                        color:
                                            tendencia.dif > 2
                                                ? '#ef4444'
                                                : tendencia.dif < -2
                                                    ? '#22c55e'
                                                    : '#64748b',
                                    }}
                                >
                                    {tendencia.dif > 2 ? '▲' : tendencia.dif < -2 ? '▼' : '▬'}{' '}
                                </span>
                                {tendencia.texto}
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={historicos} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                                <defs>
                                    <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip formatter={(v) => [`${v} / 100`, 'Riesgo promedio']} />
                                <ReferenceLine y={33} stroke="#22c55e" strokeDasharray="4 4" />
                                <ReferenceLine y={66} stroke="#ef4444" strokeDasharray="4 4" />
                                <Line
                                    type="monotone"
                                    dataKey="valor"
                                    stroke="#a855f7"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="mt-2 text-xs text-slate-400">
                            Las líneas punteadas marcan los umbrales de riesgo moderado (33) y alto (66).
                        </p>
                    </>
                ) : (
                    <PanelVacio
                        titulo="Sin históricos"
                        mensaje="Aún no hay semanas procesadas. La evolución aparecerá a medida que avancen los análisis."
                    />
                )}
            </section>
        </div>
    );
}
