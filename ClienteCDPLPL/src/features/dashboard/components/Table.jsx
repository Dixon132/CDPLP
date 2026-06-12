import { ChevronLeft, ChevronRight } from "lucide-react";

const Table = ({
    columns = [],
    data = [],
    actions = [],
    pagination = null,
    emptyMessage = "No se encontraron registros",
}) => {
    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative">
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
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions.length ? 1 : 0)} className="px-6 py-12 text-center bg-white">
                                    <p className="text-slate-700 font-bold uppercase tracking-widest text-xs">{emptyMessage}</p>
                                    <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-2">Ajusta los filtros de búsqueda</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-150 bg-white">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {col.render ? col.render(row, idx) : row[col.key]}
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {actions.map((action, aIdx) => {
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
                                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all shadow-sm hover:shadow ${colorClass}`}
                                                            title={typeof action.label === 'string' ? action.label : ''}
                                                        >
                                                            {action.icon && (() => {
                                                                const IconCmp = typeof action.icon === 'function' && !action.icon.$$typeof ? action.icon(row) : action.icon;
                                                                return <IconCmp className="w-4 h-4" />;
                                                            })()}
                                                            <span className="hidden sm:inline">{typeof action.label === 'function' ? action.label(row) : action.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>

                    {pagination && (
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                                <td colSpan={columns.length + (actions.length ? 1 : 0)} className="px-6 py-4">
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-600">
                                        <span>Total: {pagination.total}</span>
                                        <div className="flex items-center gap-4">
                                            <button
                                                disabled={pagination.page === 1}
                                                onClick={() => pagination.onPageChange(pagination.page - 1)}
                                                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-40 disabled:hover:bg-white shadow-sm"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span>Pag {pagination.page} / {pagination.totalPage}</span>
                                            <button
                                                disabled={pagination.page === pagination.totalPage}
                                                onClick={() => pagination.onPageChange(pagination.page + 1)}
                                                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-40 disabled:hover:bg-white shadow-sm"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default Table;
