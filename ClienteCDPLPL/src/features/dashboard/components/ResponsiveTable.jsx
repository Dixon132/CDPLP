import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";

const ResponsiveTable = ({
    columns = [],
    data = [],
    actions = [],
    pagination = null,
    emptyMessage = "No se encontraron registros",
    storageKey = null,
}) => {
    // Detectar tamaño de pantalla inicial
    const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    // Inicializar estado leyendo de localStorage si existe
    const [viewMode, setViewMode] = useState(() => {
        if (isMobileInitial) return 'grid';
        if (storageKey && typeof window !== 'undefined') {
            const savedMode = localStorage.getItem(`table_view_${storageKey}`);
            if (savedMode === 'grid' || savedMode === 'table') {
                return savedMode;
            }
        }
        return 'table'; // Default para desktop
    });
    
    const [isMobile, setIsMobile] = useState(isMobileInitial);

    // Función para cambiar modo y guardarlo en localStorage
    const handleSetViewMode = (mode) => {
        setViewMode(mode);
        if (storageKey && typeof window !== 'undefined') {
            localStorage.setItem(`table_view_${storageKey}`, mode);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setViewMode('grid'); // Forzar grid en móvil
            } else {
                // Al volver a desktop, recuperar preferencia o usar tabla por defecto
                if (storageKey && typeof window !== 'undefined') {
                    const savedMode = localStorage.getItem(`table_view_${storageKey}`);
                    setViewMode(savedMode === 'grid' ? 'grid' : 'table');
                } else {
                    setViewMode('table');
                }
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [storageKey]);

    // Render de botones de acción
    const renderActions = (row) => {
        if (!actions || actions.length === 0) return null;
        
        return actions.map((action, aIdx) => {
            if (action.hide && action.hide(row)) return null;
            if (typeof action.show === 'function' && !action.show(row)) return null;

            const labelStr = (typeof action.label === 'string' ? action.label.toLowerCase() : '');
            let colorClass = "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200";
            if (labelStr.includes('edit') || labelStr.includes('modificar')) colorClass = "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100";
            else if (labelStr.includes('elimin') || labelStr.includes('desactiv') || labelStr.includes('baja') || labelStr.includes('rechaz')) colorClass = "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100";
            else if (labelStr.includes('activ') || labelStr.includes('alta') || labelStr.includes('aprob') || labelStr.includes('acept')) colorClass = "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100";
            else if (labelStr.includes('ver') || labelStr.includes('detall') || labelStr.includes('revis') || labelStr.includes('movimient')) colorClass = "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100";
            
            if (action.className) {
                colorClass = typeof action.className === 'function' ? action.className(row) : action.className;
            }

            return (
                <button
                    key={aIdx}
                    onClick={() => action.onClick(row)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all shadow-sm hover:shadow ${colorClass}`}
                    title={typeof action.label === 'string' ? action.label : ''}
                >
                    {action.icon && (() => {
                        const IconCmp = typeof action.icon === 'function' && !action.icon.$$typeof ? action.icon(row) : action.icon;
                        return <IconCmp className="w-4 h-4 shrink-0" />;
                    })()}
                    <span className={viewMode === 'grid' ? "" : "hidden sm:inline"}>
                        {typeof action.label === 'function' ? action.label(row) : action.label}
                    </span>
                </button>
            );
        });
    };

    return (
        <div className="space-y-4">
            {/* View Toggle (Only visible on Desktop) */}
            {!isMobile && (
                <div className="flex justify-end">
                    <div className="inline-flex bg-slate-100/80 backdrop-blur-md border border-slate-200 p-1 rounded-xl shadow-sm">
                        <button
                            onClick={() => handleSetViewMode('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                                viewMode === 'table' 
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <List className="w-4 h-4" /> Tabla
                        </button>
                        <button
                            onClick={() => handleSetViewMode('grid')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                                viewMode === 'grid' 
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Tarjetas
                        </button>
                    </div>
                </div>
            )}

            {/* EMPTY STATE */}
            {data.length === 0 ? (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <List className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-bold uppercase tracking-widest text-sm">{emptyMessage}</p>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-2">Ajusta los filtros de búsqueda</p>
                </div>
            ) : (
                <>
                    {/* TABLE VIEW */}
                    {viewMode === 'table' && (
                        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative transition-all duration-300">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {columns.map((col, idx) => (
                                                <th key={idx} className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {col.label}
                                                </th>
                                            ))}
                                            {actions.length > 0 && (
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                                    Acciones
                                                </th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {data.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-150 bg-white group">
                                                {columns.map((col, cIdx) => (
                                                    <td key={cIdx} className="px-6 py-4 text-sm font-medium text-slate-700">
                                                        {col.render ? col.render(row, idx) : row[col.key]}
                                                    </td>
                                                ))}
                                                {actions.length > 0 && (
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2 flex-wrap opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {renderActions(row)}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* GRID / CARD VIEW */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 transition-all duration-300">
                            {data.map((row, idx) => (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
                                    
                                    {/* Card Body */}
                                    <div className="p-5 flex-1 flex flex-col gap-4">
                                        {columns.map((col, cIdx) => (
                                            <div key={cIdx} className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {col.label}
                                                </span>
                                                <div className="text-sm font-medium text-slate-700 break-words">
                                                    {col.render ? col.render(row, idx) : row[col.key]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Card Footer Actions */}
                                    {actions.length > 0 && (
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 mt-auto opacity-90 group-hover:opacity-100 transition-opacity">
                                            {renderActions(row)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* PAGINATION */}
            {pagination && data.length > 0 && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 text-center sm:text-left">
                        Total Registros: {pagination.total}
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-600">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-40 shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Pág {pagination.page} de {pagination.totalPage}</span>
                        <button
                            disabled={pagination.page === pagination.totalPage || pagination.totalPage === 0}
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-40 shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResponsiveTable;
