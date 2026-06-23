import React, { useState, useMemo } from "react";

export default function BarChart({ data = [] }) {
    const [filtroTipo, setFiltroTipo] = useState("TODOS");
    const [filtroAnio, setFiltroAnio] = useState("TODOS");
    const [hoveredIdx, setHoveredIdx] = useState(null);

    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => d.anio).filter(a => a && a !== 'N/A'));
        return Array.from(years).sort((a,b) => b.localeCompare(a));
    }, [data]);

    const filteredAndAggregatedData = useMemo(() => {
        let result = data;
        if (filtroAnio !== "TODOS") {
            result = result.filter(d => d.anio === filtroAnio);
        }
        if (filtroTipo !== "TODOS") {
            result = result.filter(d => d.tipo === filtroTipo);
        }

        // Agrupar por categoría por si hay años múltiples mezclados
        const map = new Map();
        result.forEach(d => {
            if (!map.has(d.categoria)) {
                map.set(d.categoria, { categoria: d.categoria, tipo: d.tipo, monto: 0, cantidad: 0 });
            }
            const entry = map.get(d.categoria);
            entry.monto += d.monto;
            entry.cantidad += d.cantidad;
            // Si mezcla ingresos y egresos de la misma categoría, podría ser un problema, 
            // pero normalmente una categoría es o ingreso o egreso.
        });

        return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
    }, [data, filtroTipo, filtroAnio]);

    if (!filteredAndAggregatedData.length) return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
            <div className="flex gap-2 mb-2">
                <select 
                    className="p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none"
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                >
                    <option value="TODOS">Todos los años</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                    className="p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                >
                    <option value="TODOS">Todos los tipos</option>
                    <option value="INGRESO">Solo Ingresos</option>
                    <option value="EGRESO">Solo Egresos</option>
                </select>
            </div>
            Sin categorías para mostrar
        </div>
    );

    const top = filteredAndAggregatedData.slice(0, 8); // top 8
    const maxMonto = Math.max(...top.map(d => d.monto), 1);

    const COLORS = {
        INGRESO: { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
        EGRESO:  { bar: "bg-rose-500", bg: "bg-rose-50",    text: "text-rose-700" },
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-2 gap-2">
                <select 
                    className="p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none hover:border-slate-300 transition-colors"
                    value={filtroAnio}
                    onChange={(e) => setFiltroAnio(e.target.value)}
                >
                    <option value="TODOS">Todos los años</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                    className="p-1 text-xs border border-slate-200 rounded text-slate-600 bg-white cursor-pointer outline-none hover:border-slate-300 transition-colors"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                >
                    <option value="TODOS">Todos los tipos</option>
                    <option value="INGRESO">Solo Ingresos</option>
                    <option value="EGRESO">Solo Egresos</option>
                </select>
            </div>
            {top.map((item, i) => {
                const pct = (item.monto / maxMonto) * 100;
                const color = COLORS[item.tipo] ?? COLORS.EGRESO;
                const isHovered = hoveredIdx === i;

                return (
                    <div 
                        key={i} 
                        className="flex items-center gap-3 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <span className={`text-xs w-28 truncate shrink-0 ${isHovered ? 'text-slate-800 font-bold' : 'text-slate-600'}`} title={item.categoria}>
                            {item.categoria}
                        </span>
                        
                        <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${color.bar} ${isHovered ? 'opacity-100' : 'opacity-90'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        
                        <div className="text-right shrink-0 min-w-[90px]">
                            <span className={`text-xs ${isHovered ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                Bs.{item.monto.toLocaleString("es-BO", { minimumFractionDigits: 0 })}
                            </span>
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-sm ${color.bg} ${color.text}`}>
                                {item.cantidad}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
