import React, { useState } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Info,
    Zap, Brain
} from "lucide-react";

const STEPS = [
    { id: 1, label: "Información" },
    { id: 2, label: "Instituciones" },
    { id: 3, label: "Fechas" },
    { id: 4, label: "Modo" },
    { id: 5, label: "Plataformas" },
];

const PLATFORMS = [
    { id: "reddit", label: "Reddit", icon: "🔴" },
    { id: "youtube", label: "YouTube", icon: "📺" },
    { id: "instagram", label: "Instagram", icon: "📷" },
    { id: "tiktok", label: "TikTok", icon: "🎵" },
    { id: "facebook", label: "Facebook", icon: "📘" },
];

const MOCK_INSTITUTIONS = [
    { id: "inst_1", name: "Universidad Nacional", acronym: "UN", lat: -12.0464, lng: -77.0428 },
    { id: "inst_2", name: "UTEC", acronym: "UTEC", lat: -12.1116, lng: -77.0453 },
    { id: "inst_3", name: "PUCP", acronym: "PUCP", lat: -12.0697, lng: -77.0808 },
    { id: "inst_4", name: "UNI", acronym: "UNI", lat: -12.0219, lng: -77.0508 },
];

const IRECCreateWizard = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        name: "",
        description: "",
        institution_ids: [],
        radius_km: 5,
        date_range_start: "",
        date_range_end: "",
        mode: "simulation",
        analysis_type: "complete",
        platforms: ["reddit", "youtube", "instagram"],
    });

    const updateData = (updates) => {
        setData({ ...data, ...updates });
    };

    const canNext = () => {
        switch (step) {
            case 1: return data.name.trim().length > 0;
            case 2: return data.institution_ids.length > 0;
            case 3: return data.date_range_start && data.date_range_end;
            case 4: return true;
            case 5: return data.platforms.length > 0;
            default: return false;
        }
    };

    const handleComplete = () => {
        const institutions = MOCK_INSTITUTIONS.filter(i => 
            data.institution_ids.includes(i.id)
        );
        onComplete({
            ...data,
            institutions,
        });
    };

    return (
        <div className="min-h-screen bg-[#f2f3f5]">
            <div className="bg-white border-b border-[#d5dbdb] px-6 py-4">
                <div className="max-w-[1200px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-[#f2f3f5] rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#545b64]" />
                        </button>
                        <h1 className="text-xl font-bold text-[#16191f]">
                            Nuevo Análisis IREC
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                        step >= s.id
                                            ? "bg-[#ff9900] text-white"
                                            : "bg-[#d5dbdb] text-[#879196]"
                                    }`}
                                >
                                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className={`w-12 h-0.5 ${
                                            step > s.id ? "bg-[#ff9900]" : "bg-[#d5dbdb]"
                                        }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-[800px] mx-auto p-6">
                <div className="bg-white border border-[#d5dbdb] rounded-lg p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#16191f] mb-2">
                                    Información Básica
                                </h2>
                                <p className="text-sm text-[#879196]">
                                    Define el nombre y propósito del análisis
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-2">
                                    Nombre del análisis <span className="text-[#d13212]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={e => updateData({ name: e.target.value })}
                                    placeholder="Ej: Análisis Semestre 2026-I"
                                    className="w-full px-4 py-3 border border-[#d5dbdb] rounded focus:border-[#ff9900] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-2">
                                    Descripción / Notas
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={e => updateData({ description: e.target.value })}
                                    placeholder="Describe el propósito de este análisis..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-[#d5dbdb] rounded focus:border-[#ff9900] outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#16191f] mb-2">
                                    Instituciones y Geografía
                                </h2>
                                <p className="text-sm text-[#879196]">
                                    Selecciona las instituciones a analizar y el radio de búsqueda
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-3">
                                    Instituciones <span className="text-[#d13212]">*</span>
                                </label>
                                <div className="space-y-2">
                                    {MOCK_INSTITUTIONS.map(inst => (
                                        <label
                                            key={inst.id}
                                            className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition ${
                                                data.institution_ids.includes(inst.id)
                                                    ? "border-[#ff9900] bg-[#fff8f0]"
                                                    : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.institution_ids.includes(inst.id)}
                                                onChange={e => {
                                                    const ids = e.target.checked
                                                        ? [...data.institution_ids, inst.id]
                                                        : data.institution_ids.filter(id => id !== inst.id);
                                                    updateData({ institution_ids: ids });
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-[#16191f]">
                                                    {inst.name}
                                                </p>
                                                <p className="text-xs text-[#879196]">
                                                    {inst.acronym}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-2">
                                    Radio de búsqueda: {data.radius_km} km
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={data.radius_km}
                                    onChange={e => updateData({ radius_km: Number(e.target.value) })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-[#879196] mt-1">
                                    <span>1 km</span>
                                    <span>50 km</span>
                                </div>
                            </div>

                            <div className="bg-[#f1f6fc] border border-[#d5dbdb] p-4 rounded flex gap-3">
                                <Info className="w-5 h-5 text-[#0073bb] flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-[#545b64]">
                                    El radio define el área geográfica alrededor de cada institución donde se buscarán publicaciones relevantes.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#16191f] mb-2">
                                    Rango Temporal
                                </h2>
                                <p className="text-sm text-[#879196]">
                                    Define el período de tiempo a analizar
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#16191f] mb-2">
                                        Fecha inicio <span className="text-[#d13212]">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={data.date_range_start}
                                        onChange={e => updateData({ date_range_start: e.target.value })}
                                        className="w-full px-4 py-3 border border-[#d5dbdb] rounded focus:border-[#ff9900] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#16191f] mb-2">
                                        Fecha fin <span className="text-[#d13212]">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={data.date_range_end}
                                        onChange={e => updateData({ date_range_end: e.target.value })}
                                        className="w-full px-4 py-3 border border-[#d5dbdb] rounded focus:border-[#ff9900] outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-3">
                                    Presets rápidos
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: "Última semana", days: 7 },
                                        { label: "Último mes", days: 30 },
                                        { label: "Último semestre", days: 180 },
                                        { label: "Último año", days: 365 },
                                    ].map(preset => (
                                        <button
                                            key={preset.days}
                                            onClick={() => {
                                                const end = new Date();
                                                const start = new Date();
                                                start.setDate(end.getDate() - preset.days);
                                                updateData({
                                                    date_range_start: start.toISOString().split("T")[0],
                                                    date_range_end: end.toISOString().split("T")[0],
                                                });
                                            }}
                                            className="px-4 py-2 text-sm border border-[#d5dbdb] rounded hover:bg-[#f2f3f5]"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#16191f] mb-2">
                                    Modo y Tipo de Análisis
                                </h2>
                                <p className="text-sm text-[#879196]">
                                    Configura cómo se ejecutará el análisis
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-3">
                                    Modo de datos
                                </label>
                                <div className="space-y-2">
                                    <label
                                        className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition ${
                                            data.mode === "simulation"
                                                ? "border-[#ff9900] bg-[#fff8f0]"
                                                : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="simulation"
                                            checked={data.mode === "simulation"}
                                            onChange={e => updateData({ mode: e.target.value })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[#16191f]">
                                                Simulación (datos sintéticos)
                                            </p>
                                            <p className="text-xs text-[#879196] mt-1">
                                                Genera datos realistas para pruebas. No consume APIs reales.
                                            </p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition ${
                                            data.mode === "real"
                                                ? "border-[#ff9900] bg-[#fff8f0]"
                                                : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="real"
                                            checked={data.mode === "real"}
                                            onChange={e => updateData({ mode: e.target.value })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[#16191f]">
                                                Real (APIs externas)
                                            </p>
                                            <p className="text-xs text-[#879196] mt-1">
                                                Usa datos reales de Reddit, YouTube, etc. Requiere API keys configuradas.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-3">
                                    Tipo de análisis
                                </label>
                                <div className="space-y-2">
                                    <label
                                        className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition ${
                                            data.analysis_type === "quick"
                                                ? "border-[#ff9900] bg-[#fff8f0]"
                                                : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value="quick"
                                            checked={data.analysis_type === "quick"}
                                            onChange={e => updateData({ analysis_type: e.target.value })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[#16191f] flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                Rápido (solo NLP)
                                            </p>
                                            <p className="text-xs text-[#879196] mt-1">
                                                Análisis de sentimiento y emociones. Más rápido, menos detallado.
                                            </p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex items-start gap-3 p-4 border rounded cursor-pointer transition ${
                                            data.analysis_type === "complete"
                                                ? "border-[#ff9900] bg-[#fff8f0]"
                                                : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value="complete"
                                            checked={data.analysis_type === "complete"}
                                            onChange={e => updateData({ analysis_type: e.target.value })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-[#16191f] flex items-center gap-2">
                                                <Brain className="w-4 h-4" />
                                                Completo (NLP + Visión + Comunidad)
                                            </p>
                                            <p className="text-xs text-[#879196] mt-1">
                                                Incluye análisis de imágenes y asociación comunitaria. Más lento, más preciso.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#16191f] mb-2">
                                    Plataformas y Resumen
                                </h2>
                                <p className="text-sm text-[#879196]">
                                    Selecciona las plataformas a analizar y revisa la configuración
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#16191f] mb-3">
                                    Plataformas <span className="text-[#d13212]">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PLATFORMS.map(platform => (
                                        <label
                                            key={platform.id}
                                            className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition ${
                                                data.platforms.includes(platform.id)
                                                    ? "border-[#ff9900] bg-[#fff8f0]"
                                                    : "border-[#d5dbdb] hover:bg-[#f2f3f5]"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.platforms.includes(platform.id)}
                                                onChange={e => {
                                                    const platforms = e.target.checked
                                                        ? [...data.platforms, platform.id]
                                                        : data.platforms.filter(p => p !== platform.id);
                                                    updateData({ platforms });
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-lg">{platform.icon}</span>
                                            <span className="text-sm font-medium text-[#16191f]">
                                                {platform.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => updateData({ platforms: PLATFORMS.map(p => p.id) })}
                                        className="text-xs text-[#0073bb] hover:underline"
                                    >
                                        Seleccionar todas
                                    </button>
                                    <span className="text-xs text-[#d5dbdb]">|</span>
                                    <button
                                        onClick={() => updateData({ platforms: [] })}
                                        className="text-xs text-[#0073bb] hover:underline"
                                    >
                                        Ninguna
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#f2f3f5] border border-[#d5dbdb] rounded p-4 space-y-3">
                                <h3 className="text-sm font-bold text-[#16191f]">
                                    Resumen de configuración
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Nombre:</span>
                                        <span className="font-medium text-[#16191f]">{data.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Instituciones:</span>
                                        <span className="font-medium text-[#16191f]">
                                            {data.institution_ids.length} seleccionadas
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Radio:</span>
                                        <span className="font-medium text-[#16191f]">{data.radius_km} km</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Período:</span>
                                        <span className="font-medium text-[#16191f]">
                                            {data.date_range_start} → {data.date_range_end}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Modo:</span>
                                        <span className="font-medium text-[#16191f]">
                                            {data.mode === "simulation" ? "Simulación" : "Real"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Tipo:</span>
                                        <span className="font-medium text-[#16191f]">
                                            {data.analysis_type === "quick" ? "Rápido" : "Completo"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#879196]">Plataformas:</span>
                                        <span className="font-medium text-[#16191f]">
                                            {data.platforms.length} seleccionadas
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between mt-8 pt-6 border-t border-[#d5dbdb]">
                        <button
                            onClick={step === 1 ? onCancel : () => setStep(step - 1)}
                            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#d5dbdb] rounded hover:bg-[#f2f3f5]"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {step === 1 ? "Cancelar" : "Atrás"}
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext()}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded disabled:opacity-50"
                                style={{ backgroundColor: canNext() ? "#ff9900" : "#d5dbdb" }}
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={!canNext()}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded disabled:opacity-50"
                                style={{ backgroundColor: canNext() ? "#ff9900" : "#d5dbdb" }}
                            >
                                <Check className="w-4 h-4" />
                                Crear Análisis
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IRECCreateWizard;
