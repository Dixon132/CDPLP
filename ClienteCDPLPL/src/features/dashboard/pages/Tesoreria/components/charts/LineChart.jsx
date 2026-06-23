import React, { useState, useMemo } from "react";

export default function LineChart({ data = [] }) {
    const [selectedYear, setSelectedYear] = useState("TODOS");
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => d.mes.split("-")[0]));
        return Array.from(years).sort((a,b) => b.localeCompare(a));
    }, [data]);

    const filteredData = useMemo(() => {
        if (selectedYear === "TODOS") return data;
        return data.filter(d => d.mes.startsWith(selectedYear));
    }, [data, selectedYear]);

    if (!filteredData.length) return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
            <select 
                className="mb-2 p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
            >
                <option value="TODOS">Todos los años</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            Sin datos suficientes para el gráfico
        </div>
    );

    const width = 700;
    const height = 260;
    const pad = { top: 30, right: 30, bottom: 40, left: 70 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;

    const points = filteredData.map((d) => ({
        label: d.mes,
        ingresos: d.ingresos,
        egresos: d.egresos
    }));

    const maxVal = Math.max(...points.map(p => Math.max(p.ingresos, p.egresos)), 1);
    const getX = (i) => pad.left + (i / Math.max(points.length - 1, 1)) * cw;
    const getY = (v) => pad.top + ch - (v / maxVal) * ch;

    const pathI = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.ingresos)}`).join(" ");
    const pathE = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.egresos)}`).join(" ");

    const gridSteps = [0, 0.25, 0.5, 0.75, 1];

    const formatMes = (mes) => {
        const [y, m] = mes.split("-");
        const mesesNombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        return `${mesesNombres[parseInt(m, 10)-1]} ${y.slice(2)}`;
    };

    return (
        <div className="relative w-full">
            <div className="flex justify-end mb-2 absolute top-0 right-0 z-10">
                <select 
                    className="p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none hover:border-slate-300 transition-colors"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                    <option value="TODOS">Todos los años</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible mt-6">
                {/* Grid horizontal */}
                {gridSteps.map((pct, i) => {
                    const y = pad.top + ch * (1 - pct);
                    const label = `Bs.${Math.round(maxVal * pct).toLocaleString("es-BO")}`;
                    return (
                        <g key={i}>
                            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
                                stroke="#e2e8f0" strokeDasharray="4,4" strokeWidth="1" />
                            <text x={pad.left - 12} y={y + 4} textAnchor="end"
                                fontSize={10} fill="#64748b">{label}</text>
                        </g>
                    );
                })}

                {/* Líneas principales planas */}
                <path d={pathI} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <path d={pathE} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                {/* Puntos interactivos y tooltips */}
                {points.map((p, i) => {
                    const x = getX(i);
                    const yI = getY(p.ingresos);
                    const yE = getY(p.egresos);
                    const isHovered = hoveredPoint === i;

                    return (
                        <g key={i}>
                            {/* Eje X Etiquetas */}
                            {(points.length <= 8 || i % 2 === 0 || isHovered) && (
                                <text x={x} y={height - 10} textAnchor="middle"
                                    fontSize={10} fill={isHovered ? "#334155" : "#64748b"} fontWeight={isHovered ? "bold" : "normal"}>
                                    {formatMes(p.label)}
                                </text>
                            )}

                            {/* Círculos invisibles más grandes para facilitar el hover */}
                            <circle cx={x} cy={yI} r="15" fill="transparent" 
                                onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} 
                                className="cursor-pointer" />
                            <circle cx={x} cy={yE} r="15" fill="transparent" 
                                onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} 
                                className="cursor-pointer" />

                            {/* Círculos visibles Ingresos */}
                            <circle cx={x} cy={yI} r={isHovered ? "5" : "3"} 
                                fill="#ffffff" stroke="#10b981" strokeWidth="2"
                                className="pointer-events-none transition-all duration-200" />
                            
                            {/* Círculos visibles Egresos */}
                            <circle cx={x} cy={yE} r={isHovered ? "5" : "3"} 
                                fill="#ffffff" stroke="#f43f5e" strokeWidth="2"
                                className="pointer-events-none transition-all duration-200" />
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip HTML plano renderizado sobre el SVG */}
            {hoveredPoint !== null && (
                <div 
                    className="absolute bg-white border border-slate-200 text-slate-800 p-3 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-100 z-10"
                    style={{
                        left: `${(getX(hoveredPoint) / width) * 100}%`,
                        top: `${Math.min(getY(points[hoveredPoint].ingresos), getY(points[hoveredPoint].egresos)) - 10}px`
                    }}
                >
                    <p className="text-xs font-bold text-slate-600 mb-2 border-b border-slate-100 pb-1">
                        {formatMes(points[hoveredPoint].label)}
                    </p>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm">Bs. {points[hoveredPoint].ingresos.toLocaleString("es-BO")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-sm">Bs. {points[hoveredPoint].egresos.toLocaleString("es-BO")}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
