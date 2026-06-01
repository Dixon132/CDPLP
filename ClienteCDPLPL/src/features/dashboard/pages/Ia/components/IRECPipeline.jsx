import React, { useState, useEffect } from "react";
import { 
    Database, Layers, Filter, Brain, ScanEye, Users, Gauge,
    Check, Loader2, Clock, Wifi, WifiOff
} from "lucide-react";

const PIPELINE_STEPS = [
    { k: "generate", label: "Generando datos", icon: Database, description: "Obteniendo datos de plataformas" },
    { k: "ingest", label: "Ingesta y normalización", icon: Layers, description: "Normalizando registros" },
    { k: "clean", label: "Limpieza y anonimización", icon: Filter, description: "Limpiando y anonimizando datos" },
    { k: "nlp", label: "Análisis NLP", icon: Brain, description: "Analizando sentimiento y emociones" },
    { k: "vision", label: "Visión computacional", icon: ScanEye, description: "Procesando imágenes" },
    { k: "community", label: "Asociación comunitaria", icon: Users, description: "Asociando a instituciones" },
    { k: "irec", label: "Cálculo IREC", icon: Gauge, description: "Calculando índice de riesgo" },
];

const IRECPipeline = ({ analysis, onUpdate }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [logs, setLogs] = useState([]);
    const [ollamaConnected] = useState(true);

    useEffect(() => {
        if (analysis.status === "running") {
            const interval = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= PIPELINE_STEPS.length - 1) {
                        clearInterval(interval);
                        onUpdate(analysis.id, { 
                            status: "completed",
                            completed_at: new Date().toISOString(),
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
                            }
                        });
                        return prev;
                    }
                    return prev + 1;
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [analysis.status]);

    return (
        <div className="space-y-6">
            <div className={`flex items-center gap-2 p-3 rounded ${
                ollamaConnected ? "bg-[#f2f8f0] border border-[#1e8900]" : "bg-[#fdf3f1] border border-[#d13212]"
            }`}>
                {ollamaConnected ? (
                    <Wifi className="w-4 h-4 text-[#1e8900]" />
                ) : (
                    <WifiOff className="w-4 h-4 text-[#d13212]" />
                )}
                <span className="text-sm font-medium">
                    {ollamaConnected ? "Ollama conectado (Mistral 7B)" : "Ollama desconectado"}
                </span>
            </div>

            <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isDone = i < currentStep;
                    const isActive = i === currentStep && analysis.status === "running";
                    const isPending = i > currentStep;

                    return (
                        <div
                            key={step.k}
                            className={`flex items-start gap-3 p-4 border rounded transition ${
                                isActive
                                    ? "bg-[#fff8f0] border-[#ff9900]"
                                    : isDone
                                    ? "bg-[#f2f8f0] border-[#1e8900]"
                                    : "bg-[#f2f3f5] border-[#d5dbdb]"
                            }`}
                        >
                            <div className="flex-shrink-0">
                                {isDone ? (
                                    <Check className="w-5 h-5 text-[#1e8900]" />
                                ) : isActive ? (
                                    <Loader2 className="w-5 h-5 text-[#ff9900] animate-spin" />
                                ) : (
                                    <Clock className="w-5 h-5 text-[#879196]" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm font-semibold text-[#16191f]">
                                        {step.label}
                                    </span>
                                </div>
                                <p className="text-xs text-[#879196]">{step.description}</p>
                                {isActive && (
                                    <div className="mt-2 text-xs text-[#545b64]">
                                        Procesando...
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {analysis.pipeline_metrics && Object.keys(analysis.pipeline_metrics).length > 0 && (
                <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                    <h3 className="text-sm font-semibold text-[#16191f] mb-3">
                        Métricas del pipeline
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-[#879196]">Total recibidos:</span>
                            <span className="ml-2 font-bold">{analysis.pipeline_metrics.total_received}</span>
                        </div>
                        <div>
                            <span className="text-[#879196]">Filtrados:</span>
                            <span className="ml-2 font-bold">{analysis.pipeline_metrics.matched_by_filters}</span>
                        </div>
                        <div>
                            <span className="text-[#879196]">Limpios:</span>
                            <span className="ml-2 font-bold">{analysis.pipeline_metrics.clean_records}</span>
                        </div>
                        <div>
                            <span className="text-[#879196]">Alta asociación:</span>
                            <span className="ml-2 font-bold">{analysis.pipeline_metrics.high_association}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IRECPipeline;
