import React, { useState } from "react";

export default function GroupedBarChart({ data = [] }) {
    if (!data.length || data.every(d => d.ingresos === 0 && d.egresos === 0)) return (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Sin datos para los últimos 6 meses
        </div>
    );

    const [hoveredBar, setHoveredBar] = useState(null); // { idx, tipo: 'ingreso' | 'egreso' }

    const width = 560;
    const height = 220;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;

    const maxVal = Math.max(...data.map(d => Math.max(d.ingresos, d.egresos)), 1);
    const groupW = cw / data.length;
    const barW = Math.min(groupW * 0.35, 24);

    const formatMes = (mes) => {
        const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        const [, m] = mes.split("-");
        return meses[parseInt(m, 10) - 1];
    };

    const getH = (v) => (v / maxVal) * ch;
    const gridSteps = [0, 0.5, 1];

    return (
        <div className="relative w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                {/* Grid */}
                {gridSteps.map((pct, i) => {
                    const y = pad.top + ch * (1 - pct);
                    return (
                        <g key={i}>
                            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
                                stroke="#e2e8f0" strokeDasharray="4,4" strokeWidth="1" />
                            <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#64748b">
                                Bs.{Math.round(maxVal * pct).toLocaleString("es-BO")}
                            </text>
                        </g>
                    );
                })}

                {/* Bars - Sin gradientes, sin sombra, sin bordes curvos extremos */}
                {data.map((d, i) => {
                    const cx = pad.left + i * groupW + groupW / 2;
                    const hI = getH(d.ingresos);
                    const hE = getH(d.egresos);
                    
                    const hoverI = hoveredBar?.idx === i && hoveredBar?.tipo === 'ingreso';
                    const hoverE = hoveredBar?.idx === i && hoveredBar?.tipo === 'egreso';

                    return (
                        <g key={i}>
                            {/* Area de hover para Ingreso */}
                            <rect
                                x={cx - barW - 2} y={pad.top}
                                width={barW + 4} height={ch}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredBar({ idx: i, tipo: 'ingreso' })}
                                onMouseLeave={() => setHoveredBar(null)}
                            />
                            
                            {/* Area de hover para Egreso */}
                            <rect
                                x={cx} y={pad.top}
                                width={barW + 4} height={ch}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredBar({ idx: i, tipo: 'egreso' })}
                                onMouseLeave={() => setHoveredBar(null)}
                            />

                            {/* Ingreso bar plano */}
                            <rect
                                x={cx - barW - 1} y={pad.top + ch - hI}
                                width={barW} height={Math.max(hI, 2)}
                                fill={hoverI ? "#10b981" : "#059669"} rx={2}
                                className="transition-colors duration-200 pointer-events-none"
                            />
                            
                            {/* Egreso bar plano */}
                            <rect
                                x={cx + 1} y={pad.top + ch - hE}
                                width={barW} height={Math.max(hE, 2)}
                                fill={hoverE ? "#f43f5e" : "#e11d48"} rx={2}
                                className="transition-colors duration-200 pointer-events-none"
                            />
                            
                            {/* X Label */}
                            <text x={cx} y={height - 12} textAnchor="middle" 
                                fontSize={11} fill={(hoverI || hoverE) ? "#334155" : "#64748b"}>
                                {formatMes(d.mes)}
                            </text>
                        </g>
                    );
                })}

                {/* Leyenda superior plana */}
                <g transform={`translate(${width - pad.right - 110}, 10)`}>
                    <rect x="0" y="0" width="10" height="10" fill="#059669" rx="1" />
                    <text x="16" y="9" fontSize="10" fill="#64748b">Ingresos</text>
                    <rect x="60" y="0" width="10" height="10" fill="#e11d48" rx="1" />
                    <text x="76" y="9" fontSize="10" fill="#64748b">Egresos</text>
                </g>
            </svg>

            {/* Tooltip HTML plano */}
            {hoveredBar && (
                <div 
                    className="absolute bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-100 z-10 flex flex-col items-center gap-1"
                    style={{
                        left: `${((pad.left + hoveredBar.idx * groupW + groupW / 2 + (hoveredBar.tipo === 'ingreso' ? -barW/2 - 1 : barW/2 + 1)) / width) * 100}%`,
                        top: `${(pad.top + ch - getH(data[hoveredBar.idx][hoveredBar.tipo === 'ingreso' ? 'ingresos' : 'egresos'])) - 10}px`
                    }}
                >
                    <span className="text-[10px] text-slate-500 uppercase">
                        {hoveredBar.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                    <span className="text-sm font-bold">
                        Bs. {data[hoveredBar.idx][hoveredBar.tipo === 'ingreso' ? 'ingresos' : 'egresos'].toLocaleString("es-BO")}
                    </span>
                </div>
            )}
        </div>
    );
}
