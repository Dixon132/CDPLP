import React, { useState } from "react";

export default function DonutChart({ ingresos = 0, egresos = 0 }) {
    const total = ingresos + egresos;
    if (total === 0) return (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Sin movimientos registrados
        </div>
    );

    const [hovered, setHovered] = useState(null); // 'ingresos' | 'egresos' | null

    const R = 70;
    const cx = 100;
    const cy = 100;
    const circumference = 2 * Math.PI * R;
    const pctIngresos = ingresos / total;
    const pctEgresos = egresos / total;

    const ingresosLen = pctIngresos * circumference;
    const egresosLen  = pctEgresos  * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48">
                {/* Fondo plano */}
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth="22" />
                
                {/* Egresos */}
                <circle
                    cx={cx} cy={cy} r={R}
                    fill="none" 
                    stroke="#e11d48" 
                    strokeWidth={hovered === 'egresos' ? "26" : "22"}
                    strokeDasharray={`${egresosLen} ${circumference - egresosLen}`}
                    strokeDashoffset={circumference * 0.25}
                    className="transition-all duration-200 cursor-pointer origin-center"
                    onMouseEnter={() => setHovered('egresos')}
                    onMouseLeave={() => setHovered(null)}
                />
                
                {/* Ingresos */}
                <circle
                    cx={cx} cy={cy} r={R}
                    fill="none" 
                    stroke="#059669" 
                    strokeWidth={hovered === 'ingresos' ? "26" : "22"}
                    strokeDasharray={`${ingresosLen} ${circumference - ingresosLen}`}
                    strokeDashoffset={circumference * 0.25 - egresosLen}
                    className="transition-all duration-200 cursor-pointer origin-center"
                    onMouseEnter={() => setHovered('ingresos')}
                    onMouseLeave={() => setHovered(null)}
                />

                {/* Texto Central simple */}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#64748b" className="uppercase">
                    {hovered === 'ingresos' ? 'Ingresos' : hovered === 'egresos' ? 'Egresos' : 'Balance'}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize={hovered ? 14 : 14} fill={hovered === 'ingresos' ? "#059669" : hovered === 'egresos' ? "#e11d48" : "#334155"} fontWeight="bold">
                    {hovered === 'ingresos' ? `Bs.${ingresos.toLocaleString('es-BO')}` : 
                     hovered === 'egresos' ? `Bs.${egresos.toLocaleString('es-BO')}` : 
                     `${((ingresos - egresos) >= 0 ? "+" : "")}Bs.${Math.abs(ingresos - egresos).toLocaleString("es-BO", { maximumFractionDigits: 0 })}`}
                </text>
            </svg>

            {/* Leyenda plana */}
            <div className="flex gap-8 mt-2">
                <div 
                    className={`flex items-center gap-2 cursor-pointer transition-opacity ${hovered === 'egresos' ? 'opacity-50' : 'opacity-100'}`}
                    onMouseEnter={() => setHovered('ingresos')}
                    onMouseLeave={() => setHovered(null)}
                >
                    <div className="w-3 h-3 bg-emerald-500" />
                    <div>
                        <p className="text-[10px] text-slate-500">Ingresos</p>
                        <p className="text-xs font-bold text-slate-700">{(pctIngresos * 100).toFixed(1)}%</p>
                    </div>
                </div>
                <div 
                    className={`flex items-center gap-2 cursor-pointer transition-opacity ${hovered === 'ingresos' ? 'opacity-50' : 'opacity-100'}`}
                    onMouseEnter={() => setHovered('egresos')}
                    onMouseLeave={() => setHovered(null)}
                >
                    <div className="w-3 h-3 bg-rose-500" />
                    <div>
                        <p className="text-[10px] text-slate-500">Egresos</p>
                        <p className="text-xs font-bold text-slate-700">{(pctEgresos * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
