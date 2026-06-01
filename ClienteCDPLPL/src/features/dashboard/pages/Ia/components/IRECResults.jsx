import React from "react";
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

const IREC_COLORS = {
    sin_tendencia: "#1e8900",
    leve: "#b38a00",
    moderada: "#ff9900",
    elevada: "#d13212",
    critica: "#8b0000",
};

const IRECGauge = ({ value = 0, level = "sin_tendencia" }) => {
    const color = IREC_COLORS[level] || IREC_COLORS.sin_tendencia;
    const angle = Math.max(0, Math.min(180, (value / 100) * 180));
    const rad = (angle * Math.PI) / 180;
    const r = 60, cx = 80, cy = 80;
    const x = cx + r * Math.cos(Math.PI - rad);
    const y = cy - r * Math.sin(Math.PI - rad);
    const large = angle > 90 ? 1 : 0;

    return (
        <div className="flex flex-col items-center">
            <svg width="180" height="110" viewBox="0 0 160 110">
                <path
                    d={`M 20 80 A 60 60 0 ${large} 1 ${x} ${y}`}
                    fill="none"
                    stroke="#eaeded"
                    strokeWidth="12"
                    strokeLinecap="square"
                />
                <path
                    d={`M 20 80 A 60 60 0 ${large} 1 ${x} ${y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="square"
                    style={{ transition: "all 0.8s" }}
                />
                <text x="80" y="90" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold" fontFamily="monospace">
                    {value.toFixed(0)}
                </text>
                <text x="80" y="105" textAnchor="middle" fill="#879196" fontSize="10" fontWeight="600">
                    IREC/100
                </text>
            </svg>
        </div>
    );
};

const IRECResults = ({ analysis }) => {
    const irec = analysis.result_data?.irec?.[0];
    if (!irec) return <div className="text-center text-[#879196]">Sin resultados</div>;

    const breakdown = irec.breakdown || {};
    const emotionData = Object.entries(breakdown).map(([key, value]) => ({
        name: key.replace(/_/g, " "),
        value: Math.abs(value),
    }));

    const COLORS = ["#ff9900", "#8e44ad", "#0073bb", "#1e8900", "#d13212", "#b38a00"];

    return (
        <div className="space-y-6">
            <div className="bg-[#f2f3f5] border border-[#eaeded] p-6 rounded flex flex-col items-center">
                <h3 className="text-sm font-semibold text-[#16191f] mb-4">
                    Índice de Riesgo Emocional Comunitario
                </h3>
                <IRECGauge value={irec.irec_value} level={irec.irec_level} />
                <p className="text-sm text-[#545b64] mt-4 text-center max-w-md">
                    {irec.explanation}
                </p>
            </div>

            {emotionData.length > 0 && (
                <div className="bg-[#f2f3f5] border border-[#eaeded] p-6 rounded">
                    <h3 className="text-sm font-semibold text-[#16191f] mb-4">
                        Factores de riesgo
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={emotionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {emotionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total recibidos", value: analysis.pipeline_metrics?.total_received || 0 },
                    { label: "Filtrados", value: analysis.pipeline_metrics?.matched_by_filters || 0 },
                    { label: "Limpios", value: analysis.pipeline_metrics?.clean_records || 0 },
                    { label: "Alta asociación", value: analysis.pipeline_metrics?.high_association || 0 },
                ].map((metric, i) => (
                    <div key={i} className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded text-center">
                        <p className="text-xs text-[#879196] uppercase mb-1">{metric.label}</p>
                        <p className="text-2xl font-bold text-[#16191f]">{metric.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IRECResults;
