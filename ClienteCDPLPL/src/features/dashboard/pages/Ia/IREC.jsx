import React, { useState } from "react";
import { ArrowLeft, Activity, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import IRECList from "./components/IRECList";
import IRECCreateWizard from "./components/IRECCreateWizard";
import IRECDetail from "./components/IRECDetail";
import Alerts from "../../components/Alerts";

const MOCK_ANALYSES = [
    {
        id: "1",
        name: "Análisis Semestre 2026-I",
        description: "Análisis completo del primer semestre académico",
        status: "completed",
        institution_ids: ["inst_1", "inst_2"],
        institutions: [
            { id: "inst_1", name: "Universidad Nacional", acronym: "UN" },
            { id: "inst_2", name: "UTEC", acronym: "UTEC" }
        ],
        radius_km: 10,
        date_range_start: "2026-01-01",
        date_range_end: "2026-06-30",
        mode: "simulation",
        analysis_type: "complete",
        platforms: ["reddit", "youtube", "instagram"],
        irec_value: 62.5,
        irec_level: "moderada",
        pipeline_metrics: {
            total_received: 1250,
            matched_by_filters: 890,
            clean_records: 845,
            with_edu_context: 623,
            high_association: 412,
        },
        result_data: {
            irec: [{
                irec_value: 62.5,
                irec_level: "moderada",
                breakdown: {
                    stress_score: 18.5,
                    burnout_score: 15.2,
                    anxiety_score: 12.8,
                    hopelessness_score: 8.5,
                    isolation_score: 7.5,
                },
                explanation: "Nivel moderado de riesgo emocional detectado. Estrés académico es el factor predominante."
            }],
        },
        created_at: "2026-05-15T10:30:00",
        started_at: "2026-05-15T10:35:00",
        completed_at: "2026-05-15T10:42:00",
    },
    {
        id: "2",
        name: "Monitoreo Exámenes Finales",
        description: "Seguimiento durante período de exámenes",
        status: "running",
        institution_ids: ["inst_1"],
        institutions: [{ id: "inst_1", name: "Universidad Nacional", acronym: "UN" }],
        radius_km: 5,
        date_range_start: "2026-05-20",
        date_range_end: "2026-05-31",
        mode: "simulation",
        analysis_type: "quick",
        platforms: ["reddit", "tiktok"],
        irec_value: 0,
        irec_level: "sin_tendencia",
        pipeline_metrics: {},
        result_data: {},
        created_at: "2026-05-28T14:20:00",
        started_at: "2026-05-28T14:25:00",
        completed_at: null,
    },
    {
        id: "3",
        name: "Análisis Post-Vacaciones",
        description: "Evaluación del regreso a clases",
        status: "created",
        institution_ids: [],
        institutions: [],
        radius_km: 5,
        date_range_start: null,
        date_range_end: null,
        mode: "simulation",
        analysis_type: "complete",
        platforms: ["reddit", "youtube", "instagram", "tiktok", "facebook"],
        irec_value: 0,
        irec_level: "sin_tendencia",
        pipeline_metrics: {},
        result_data: {},
        created_at: "2026-05-30T09:15:00",
        started_at: null,
        completed_at: null,
    },
];

const IRECDashboard = () => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState(MOCK_ANALYSES);
    const [selectedId, setSelectedId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [alert, setAlert] = useState(null);

    const selectedAnalysis = analyses.find(a => a.id === selectedId);

    const handleCreate = (newAnalysis) => {
        const analysis = {
            id: String(Date.now()),
            ...newAnalysis,
            status: "created",
            irec_value: 0,
            irec_level: "sin_tendencia",
            pipeline_metrics: {},
            result_data: {},
            created_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
        };
        setAnalyses([analysis, ...analyses]);
        setShowCreate(false);
        setSelectedId(analysis.id);
        setAlert({ type: "success", message: `Análisis "${analysis.name}" creado exitosamente` });
        setTimeout(() => setAlert(null), 3000);
    };

    const handleDelete = (id) => {
        setAnalyses(analyses.filter(a => a.id !== id));
        if (selectedId === id) setSelectedId(null);
        setAlert({ type: "success", message: "Análisis eliminado" });
        setTimeout(() => setAlert(null), 3000);
    };

    const handleUpdate = (id, updates) => {
        setAnalyses(analyses.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    if (showCreate) {
        return (
            <div className="min-h-screen bg-[#f2f3f5]">
                <Alerts type={alert?.type} message={alert?.message} show={!!alert} onClose={() => setAlert(null)} />
                <IRECCreateWizard
                    onComplete={handleCreate}
                    onCancel={() => setShowCreate(false)}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f2f3f5]">
            <Alerts type={alert?.type} message={alert?.message} show={!!alert} onClose={() => setAlert(null)} />

            <div className="bg-white border-b border-[#d5dbdb] px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="p-2 hover:bg-[#f2f3f5] rounded-lg transition"
                            title="Volver al Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#545b64]" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 text-[#16191f]">
                                <div className="w-8 h-8 flex items-center justify-center rounded bg-[#fff8f0]">
                                    <Activity className="w-4 h-4 text-[#ff9900]" />
                                </div>
                                IREC · Índice de Riesgo Emocional Comunitario
                            </h1>
                            <p className="text-sm text-[#879196] mt-0.5">Sistema de detección de tendencias en comunidades educativas</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md transition bg-[#ff9900] hover:bg-[#ec7211]"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Análisis
                    </button>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-6">
                <div className="flex gap-6 h-[calc(100vh-140px)]">
                    <div className="w-[380px] flex-shrink-0">
                        <IRECList
                            analyses={analyses}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onDelete={handleDelete}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        {selectedAnalysis ? (
                            <IRECDetail
                                analysis={selectedAnalysis}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <div className="h-full bg-white border border-[#d5dbdb] rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <Activity className="w-16 h-16 text-[#d5dbdb] mx-auto mb-4" />
                                    <p className="text-[#545b64] font-semibold text-lg">Selecciona un análisis</p>
                                    <p className="text-[#879196] text-sm mt-1">O crea uno nuevo para comenzar</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IRECDashboard;
