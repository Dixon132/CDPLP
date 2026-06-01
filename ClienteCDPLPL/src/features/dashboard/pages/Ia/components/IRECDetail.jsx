import React, { useState } from "react";
import { 
    FileText, Settings, Activity, BarChart3, Clock,
    Play, Trash2, AlertTriangle
} from "lucide-react";
import IRECConfig from "./IRECConfig";
import IRECPipeline from "./IRECPipeline";
import IRECResults from "./IRECResults";
import ConfirmDialog from "../../../components/ConfirmDialog";

const TABS = [
    { id: "summary", label: "Resumen", icon: FileText },
    { id: "config", label: "Configuración", icon: Settings },
    { id: "pipeline", label: "Pipeline", icon: Activity },
    { id: "results", label: "Resultados", icon: BarChart3 },
    { id: "history", label: "Historial", icon: Clock },
];

const IREC_COLORS = {
    sin_tendencia: { c: "#1e8900", bg: "#f2f8f0" },
    leve: { c: "#b38a00", bg: "#fffbe6" },
    moderada: { c: "#ff9900", bg: "#fff8f0" },
    elevada: { c: "#d13212", bg: "#fdf3f1" },
    critica: { c: "#8b0000", bg: "#fef0f0" },
};

const IREC_LABELS = {
    sin_tendencia: "Sin tendencia",
    leve: "Leve",
    moderada: "Moderada",
    elevada: "Elevada",
    critica: "Crítica",
};

const IRECDetail = ({ analysis, onUpdate, onDelete }) => {
    const [activeTab, setActiveTab] = useState("summary");
    const [showDelete, setShowDelete] = useState(false);
    const [showStop, setShowStop] = useState(false);

    const handleDelete = () => {
        onDelete(analysis.id);
        setShowDelete(false);
    };

    const handleStop = () => {
        onUpdate(analysis.id, { status: "stopped" });
        setShowStop(false);
    };

    const cfg = IREC_COLORS[analysis.irec_level] || IREC_COLORS.sin_tendencia;
    const hasResults = analysis.status === "completed";
    const isRunning = analysis.status === "running";

    return (
        <div className="h-full bg-white border border-[#d5dbdb] rounded-lg flex flex-col">
            <ConfirmDialog
                isOpen={showDelete}
                message={`¿Eliminar "${analysis.name}"? Esta acción no se puede deshacer.`}
                onConfirm={handleDelete}
                onClose={() => setShowDelete(false)}
                confirmText="Eliminar"
            />

            <ConfirmDialog
                isOpen={showStop}
                message="¿Detener el análisis? Los datos procesados hasta ahora se mantendrán, pero el análisis quedará incompleto."
                onConfirm={handleStop}
                onClose={() => setShowStop(false)}
                confirmText="Detener"
            />

            <div className="p-6 border-b border-[#d5dbdb]">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-[#16191f] mb-1">
                            {analysis.name}
                        </h2>
                        {analysis.description && (
                            <p className="text-sm text-[#879196]">{analysis.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {isRunning && (
                            <button
                                onClick={() => setShowStop(true)}
                                className="px-4 py-2 text-sm border border-[#d13212] text-[#d13212] rounded hover:bg-[#fdf3f1]"
                            >
                                Detener
                            </button>
                        )}
                        {analysis.status === "created" && (
                            <button
                                onClick={() => onUpdate(analysis.id, { 
                                    status: "running",
                                    started_at: new Date().toISOString()
                                })}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded bg-[#ff9900] hover:bg-[#ec7211]"
                            >
                                <Play className="w-4 h-4" />
                                Ejecutar
                            </button>
                        )}
                        <button
                            onClick={() => setShowDelete(true)}
                            className="p-2 border border-[#d5dbdb] rounded hover:bg-[#fdf3f1] text-[#879196] hover:text-[#d13212]"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {hasResults && (
                    <div
                        className="p-4 border rounded flex items-center gap-4"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.c + "40" }}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold uppercase" style={{ color: cfg.c }}>
                                    IREC: {analysis.irec_value.toFixed(0)}/100
                                </span>
                                <span
                                    className="px-2 py-0.5 text-xs font-semibold rounded"
                                    style={{ backgroundColor: "white", color: cfg.c }}
                                >
                                    {IREC_LABELS[analysis.irec_level]}
                                </span>
                            </div>
                            {analysis.result_data?.irec?.[0]?.explanation && (
                                <p className="text-sm text-[#545b64]">
                                    {analysis.result_data.irec[0].explanation}
                                </p>
                            )}
                        </div>
                        {["elevada", "critica"].includes(analysis.irec_level) && (
                            <AlertTriangle className="w-8 h-8 flex-shrink-0" style={{ color: cfg.c }} />
                        )}
                    </div>
                )}

                <div className="flex gap-1 mt-4 border-b border-[#d5dbdb]">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isDisabled = 
                            (tab.id === "results" && !hasResults) ||
                            (tab.id === "pipeline" && analysis.status === "created");

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isDisabled && setActiveTab(tab.id)}
                                disabled={isDisabled}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
                                    isActive
                                        ? "border-[#ff9900] text-[#ff9900]"
                                        : isDisabled
                                        ? "border-transparent text-[#d5dbdb] cursor-not-allowed"
                                        : "border-transparent text-[#545b64] hover:text-[#16191f]"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "summary" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                                <p className="text-xs text-[#879196] uppercase mb-1">Registros procesados</p>
                                <p className="text-2xl font-bold text-[#16191f]">
                                    {analysis.pipeline_metrics?.clean_records || 0}
                                </p>
                            </div>
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                                <p className="text-xs text-[#879196] uppercase mb-1">Alta asociación</p>
                                <p className="text-2xl font-bold text-[#16191f]">
                                    {analysis.pipeline_metrics?.high_association || 0}
                                </p>
                            </div>
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                                <p className="text-xs text-[#879196] uppercase mb-1">Duración</p>
                                <p className="text-2xl font-bold text-[#16191f]">
                                    {analysis.completed_at && analysis.started_at
                                        ? `${Math.round((new Date(analysis.completed_at) - new Date(analysis.started_at)) / 60000)}m`
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                            <h3 className="text-sm font-semibold text-[#16191f] mb-3">
                                Información del análisis
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#879196]">Creado:</span>
                                    <span className="text-[#16191f]">
                                        {new Date(analysis.created_at).toLocaleString("es-ES")}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#879196]">Iniciado:</span>
                                    <span className="text-[#16191f]">
                                        {analysis.started_at
                                            ? new Date(analysis.started_at).toLocaleString("es-ES")
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#879196]">Completado:</span>
                                    <span className="text-[#16191f]">
                                        {analysis.completed_at
                                            ? new Date(analysis.completed_at).toLocaleString("es-ES")
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#879196]">Modo:</span>
                                    <span className="text-[#16191f]">
                                        {analysis.mode === "simulation" ? "Simulación" : "Real"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#879196]">Tipo:</span>
                                    <span className="text-[#16191f]">
                                        {analysis.analysis_type === "quick" ? "Rápido" : "Completo"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "config" && (
                    <IRECConfig analysis={analysis} onUpdate={onUpdate} />
                )}

                {activeTab === "pipeline" && (
                    <IRECPipeline analysis={analysis} onUpdate={onUpdate} />
                )}

                {activeTab === "results" && hasResults && (
                    <IRECResults analysis={analysis} />
                )}

                {activeTab === "history" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#16191f]">
                            Historial de eventos
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: "Análisis creado", date: analysis.created_at },
                                { label: "Configuración completada", date: analysis.started_at },
                                { label: "Ejecución iniciada", date: analysis.started_at },
                                { label: "Análisis completado", date: analysis.completed_at },
                            ]
                                .filter(e => e.date)
                                .map((event, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 bg-[#f2f3f5] border border-[#eaeded] rounded"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-[#ff9900] mt-2 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-[#16191f]">
                                                {event.label}
                                            </p>
                                            <p className="text-xs text-[#879196]">
                                                {new Date(event.date).toLocaleString("es-ES")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IRECDetail;
