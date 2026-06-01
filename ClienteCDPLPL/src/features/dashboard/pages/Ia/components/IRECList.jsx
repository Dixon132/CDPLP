import React, { useState } from "react";
import { 
    Clock, Settings, Loader2, CheckCircle, AlertCircle, 
    PauseCircle, Search, Trash2 
} from "lucide-react";
import ConfirmDialog from "../../../components/ConfirmDialog";

const STATUS_CONFIG = {
    created: { label: "Creado", icon: Clock, color: "#879196", bg: "#f2f3f5" },
    configured: { label: "Configurado", icon: Settings, color: "#0073bb", bg: "#f1f6fc" },
    running: { label: "Ejecutando", icon: Loader2, color: "#ff9900", bg: "#fff8f0", animate: true },
    completed: { label: "Completado", icon: CheckCircle, color: "#1e8900", bg: "#f2f8f0" },
    error: { label: "Error", icon: AlertCircle, color: "#d13212", bg: "#fdf3f1" },
    stopped: { label: "Detenido", icon: PauseCircle, color: "#b38a00", bg: "#fffbe6" },
};

const IRECList = ({ analyses, selectedId, onSelect, onDelete }) => {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [deleteId, setDeleteId] = useState(null);

    const filtered = analyses.filter(a => {
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || a.status === filter;
        return matchSearch && matchFilter;
    });

    const handleDelete = () => {
        onDelete(deleteId);
        setDeleteId(null);
    };

    return (
        <div className="h-full bg-white border border-[#d5dbdb] rounded-lg flex flex-col">
            <ConfirmDialog
                isOpen={!!deleteId}
                message="¿Eliminar este análisis? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onClose={() => setDeleteId(null)}
                confirmText="Eliminar"
            />

            <div className="p-4 border-b border-[#d5dbdb]">
                <h2 className="text-sm font-semibold text-[#16191f] mb-3">
                    Análisis ({analyses.length})
                </h2>
                
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#879196]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar análisis..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-[#d5dbdb] rounded focus:border-[#ff9900] outline-none"
                    />
                </div>

                <div className="flex gap-1">
                    {["all", "running", "completed", "created"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1 text-xs rounded ${
                                filter === f 
                                    ? "bg-[#ff9900] text-white" 
                                    : "bg-[#f2f3f5] text-[#545b64] hover:bg-[#eaeded]"
                            }`}
                        >
                            {f === "all" ? "Todos" : STATUS_CONFIG[f]?.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-[#879196] text-sm">
                        No hay análisis
                    </div>
                ) : (
                    filtered.map(analysis => {
                        const config = STATUS_CONFIG[analysis.status];
                        const Icon = config.icon;
                        const isSelected = analysis.id === selectedId;
                        const hasIrec = analysis.irec_value > 0;

                        return (
                            <div
                                key={analysis.id}
                                onClick={() => onSelect(analysis.id)}
                                className={`p-4 border-b border-[#eaeded] cursor-pointer transition ${
                                    isSelected 
                                        ? "bg-[#fff8f0] border-l-4 border-l-[#ff9900]" 
                                        : "hover:bg-[#f2f3f5]"
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-[#16191f] line-clamp-1 flex-1">
                                        {analysis.name}
                                    </h3>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteId(analysis.id);
                                        }}
                                        className="p-1 hover:bg-[#fdf3f1] rounded text-[#879196] hover:text-[#d13212]"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                                        style={{ backgroundColor: config.bg, color: config.color }}
                                    >
                                        <Icon className={`w-3 h-3 ${config.animate ? "animate-spin" : ""}`} />
                                        {config.label}
                                    </span>
                                    {hasIrec && (
                                        <span className="text-xs font-mono font-bold text-[#ff9900]">
                                            IREC: {analysis.irec_value.toFixed(0)}
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-[#879196]">
                                    {new Date(analysis.created_at).toLocaleDateString("es-ES")}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default IRECList;
