import { ChevronLeft, ChevronRight } from "lucide-react";

const Table = ({
    columns = [],
    data = [],
    actions = [],
    pagination = null,
    emptyMessage = "No se encontraron registros",
}) => {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    {/* ======= THEAD ======= */}
                    <thead className="bg-gradient-to-r from-slate-50 to-emerald-50 border-b border-slate-200/60">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    {col.label}
                                </th>
                            ))}
                            {actions.length > 0 && (
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Acciones
                                </th>
                            )}
                        </tr>
                    </thead>

                    {/* ======= TBODY ======= */}
                    <tbody className="divide-y divide-slate-200/60">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions.length ? 1 : 0)} className="px-6 py-12 text-center">
                                    <p className="text-slate-500 font-medium">{emptyMessage}</p>
                                    <p className="text-slate-400 text-sm">Intenta ajustar los filtros o búsqueda</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/30 transition-colors duration-150">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-6 py-4 text-sm text-slate-700">
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {actions.map((action, aIdx) => (
                                                    <button
                                                        key={aIdx}
                                                        onClick={() => action.onClick(row)}
                                                        className={action.className}
                                                    >
                                                        {action.icon && <action.icon className="w-4 h-4" />}
                                                        {action.label && <span>{action.label}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>

                    {/* ======= TFOOTER (Paginación) ======= */}
                    {pagination && (
                        <tfoot className="bg-white/70 border-t border-slate-200/60">
                            <tr>
                                <td colSpan={columns.length + (actions.length ? 1 : 0)} className="px-6 py-4">
                                    <div className="flex items-center justify-between text-sm text-slate-600">
                                        <span>Total: <b>{pagination.total}</b> registros</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={pagination.page === 1}
                                                onClick={() => pagination.onPageChange(pagination.page - 1)}
                                                className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span>Página {pagination.page} de {pagination.totalPage}</span>
                                            <button
                                                disabled={pagination.page === pagination.totalPage}
                                                onClick={() => pagination.onPageChange(pagination.page + 1)}
                                                className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
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
