# Plan: Rediseño Completo de Interfaz IREC

## Resumen
Reestructurar completamente la interfaz IREC para tener una página completa con split view, wizard de creación de 5 pasos, vista de detalle con tabs, y pipeline avanzado con logs en vivo vía SSE.

**Decisiones tomadas:**
- Streaming: Server-Sent Events (SSE)
- Ejecución: Asíncrona (background)
- Orden: Frontend primero con datos mock, luego backend

---

## FASE 1: Frontend - Estructura

### 1.1 Archivo principal: `IREC.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/IREC.jsx`

**Estructura:**
- Header con botón "Volver al Dashboard" + título + botón "Nuevo Análisis"
- Split view: Lista (380px izquierda) + Detalle (resto)
- Estado: analyses[], selectedId, showCreate, alert
- Datos mock incluidos para desarrollo

**Datos mock de ejemplo:**
```javascript
const MOCK_ANALYSES = [
    {
        id: "1",
        name: "Análisis Semestre 2026-I",
        description: "Análisis completo del primer semestre",
        status: "completed", // created, configured, running, completed, error, stopped
        institution_ids: ["inst_1", "inst_2"],
        institutions: [
            { id: "inst_1", name: "Universidad Nacional", acronym: "UN" },
            { id: "inst_2", name: "UTEC", acronym: "UTEC" }
        ],
        radius_km: 10,
        date_range_start: "2026-01-01T00:00:00",
        date_range_end: "2026-06-30T23:59:59",
        mode: "simulation", // simulation, real
        analysis_type: "complete", // quick, complete
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
        result_data: { /* IREC results */ },
        created_at: "2026-05-15T10:30:00",
        started_at: "2026-05-15T10:35:00",
        completed_at: "2026-05-15T10:42:00",
    },
    // ... más análisis mock
];
```

---

### 1.2 Componente: `IRECList.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECList.jsx`

**Funcionalidad:**
- Lista de análisis con estados visuales
- Búsqueda por nombre
- Filtro por estado (todos, completados, en ejecución, pendientes)
- Cada item muestra: nombre, estado, IREC (si tiene), fecha
- Click selecciona el análisis
- Botón eliminar con confirmación

**Estados visuales:**
- `created`: gris, icono Clock
- `configured`: azul, icono Settings
- `running`: naranja animado, icono Loader2
- `completed`: verde, icono CheckCircle
- `error`: rojo, icono AlertCircle
- `stopped`: amarillo, icono PauseCircle

**Código base:**
```jsx
import React, { useState } from "react";
import { 
    Clock, Settings, Loader2, CheckCircle, AlertCircle, 
    PauseCircle, Search, Trash2, Eye 
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

            {/* Header */}
            <div className="p-4 border-b border-[#d5dbdb]">
                <h2 className="text-sm font-semibold text-[#16191f] mb-3">
                    Análisis ({analyses.length})
                </h2>
                
                {/* Search */}
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

                {/* Filter */}
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

            {/* List */}
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
                                        <span className="text-xs font-mono font-bold" style={{ color: "#ff9900" }}>
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
```

---

### 1.3 Componente: `IRECCreateWizard.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECCreateWizard.jsx`

**5 Pasos:**
1. **Información básica:** Nombre + Descripción
2. **Instituciones:** Selector múltiple + Radio + Mapa preview
3. **Rango temporal:** Date pickers + presets
4. **Modo y tipo:** Simulación/Real + Rápido/Completo
5. **Plataformas:** Checkboxes con iconos + Resumen

**Código base:**
```jsx
import React, { useState } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Info, MapPin,
    Database, Zap, Brain, Eye, Users
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
            {/* Header */}
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

            {/* Content */}
            <div className="max-w-[800px] mx-auto p-6">
                <div className="bg-white border border-[#d5dbdb] rounded-lg p-8">
                    {/* Step 1: Basic Info */}
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

                    {/* Step 2: Institutions */}
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

                    {/* Step 3: Date Range */}
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

                    {/* Step 4: Mode & Type */}
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

                    {/* Step 5: Platforms */}
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

                            {/* Summary */}
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

                    {/* Navigation */}
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
```

---

### 1.4 Componente: `IRECDetail.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECDetail.jsx`

**Tabs:**
1. Resumen
2. Configuración
3. Pipeline
4. Resultados
5. Historial

**Código base:**
```jsx
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

            {/* Header */}
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
                                onClick={() => onUpdate(analysis.id, { status: "running" })}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded"
                                style={{ backgroundColor: "#ff9900" }}
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

                {/* IREC Summary Card */}
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

                {/* Tabs */}
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

            {/* Tab Content */}
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
```

---

### 1.5 Componente: `IRECConfig.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECConfig.jsx`

Muestra configuración en modo read-only (o editable si status="created").

---

### 1.6 Componente: `IRECPipeline.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECPipeline.jsx`

**Funcionalidad:**
- 7 pasos del pipeline con estado visual
- Logs en vivo (mock por ahora, luego SSE)
- Métricas por paso
- Indicador de conexión a Ollama
- Preview de datos procesados

**Código base:**
```jsx
import React, { useState, useEffect } from "react";
import { 
    Database, Layers, Filter, Brain, ScanEye, Users, Gauge,
    Check, Loader2, Clock, AlertCircle, Wifi, WifiOff
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
    const [ollamaConnected, setOllamaConnected] = useState(true);

    useEffect(() => {
        if (analysis.status === "running") {
            // Simular progreso del pipeline
            const interval = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= PIPELINE_STEPS.length - 1) {
                        clearInterval(interval);
                        onUpdate(analysis.id, { status: "completed" });
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
            {/* Ollama Status */}
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

            {/* Pipeline Steps */}
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

            {/* Metrics */}
            {analysis.pipeline_metrics && (
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
```

---

### 1.7 Componente: `IRECResults.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECResults.jsx`

**Funcionalidad:**
- IREC gauge grande
- Pie chart de emociones
- Bar chart de factores de riesgo
- Tabla de registros procesados

**Código base:**
```jsx
import React from "react";
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const IREC_COLORS = {
    sin_tendencia: "#1e8900",
    leve: "#b38a00",
    moderada: "#ff9900",
    elevada: "#d13212",
    critica: "#8b0000",
};

const IRECGauge = ({ value = 0, level = "sin_tendencia" }) => {
    const color = IREC_COLORS[level] || IREC_COLORS.sin_tendencia;
    const angle = Math.max(0, Math.min(180, (value / 100) * 180));
    const rad = (angle * Math.PI) / 180;
    const r = 60, cx = 80, cy = 80;
    const x = cx + r * Math.cos(Math.PI - rad);
    const y = cy - r * Math.sin(Math.PI - rad);
    const large = angle > 90 ? 1 : 0;

    return (
        <div className="flex flex-col items-center">
            <svg width="180" height="110" viewBox="0 0 160 110">
                <path
                    d={`M 20 80 A 60 60 0 ${large} 1 ${x} ${y}`}
                    fill="none"
                    stroke="#eaeded"
                    strokeWidth="12"
                    strokeLinecap="square"
                />
                <path
                    d={`M 20 80 A 60 60 0 ${large} 1 ${x} ${y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="square"
                    style={{ transition: "all 0.8s" }}
                />
                <text x="80" y="90" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold" fontFamily="monospace">
                    {value.toFixed(0)}
                </text>
                <text x="80" y="105" textAnchor="middle" fill="#879196" fontSize="10" fontWeight="600">
                    IREC/100
                </text>
            </svg>
        </div>
    );
};

const IRECResults = ({ analysis }) => {
    const irec = analysis.result_data?.irec?.[0];
    if (!irec) return <div className="text-center text-[#879196]">Sin resultados</div>;

    const breakdown = irec.breakdown || {};
    const emotionData = Object.entries(breakdown).map(([key, value]) => ({
        name: key.replace(/_/g, " "),
        value: Math.abs(value),
    }));

    const COLORS = ["#ff9900", "#8e44ad", "#0073bb", "#1e8900", "#d13212", "#b38a00"];

    return (
        <div className="space-y-6">
            {/* IREC Gauge */}
            <div className="bg-[#f2f3f5] border border-[#eaeded] p-6 rounded flex flex-col items-center">
                <h3 className="text-sm font-semibold text-[#16191f] mb-4">
                    Índice de Riesgo Emocional Comunitario
                </h3>
                <IRECGauge value={irec.irec_value} level={irec.irec_level} />
                <p className="text-sm text-[#545b64] mt-4 text-center max-w-md">
                    {irec.explanation}
                </p>
            </div>

            {/* Emotions Pie Chart */}
            {emotionData.length > 0 && (
                <div className="bg-[#f2f3f5] border border-[#eaeded] p-6 rounded">
                    <h3 className="text-sm font-semibold text-[#16191f] mb-4">
                        Factores de riesgo
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={emotionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {emotionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total recibidos", value: analysis.pipeline_metrics?.total_received || 0 },
                    { label: "Filtrados", value: analysis.pipeline_metrics?.matched_by_filters || 0 },
                    { label: "Limpios", value: analysis.pipeline_metrics?.clean_records || 0 },
                    { label: "Alta asociación", value: analysis.pipeline_metrics?.high_association || 0 },
                ].map((metric, i) => (
                    <div key={i} className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded text-center">
                        <p className="text-xs text-[#879196] uppercase mb-1">{metric.label}</p>
                        <p className="text-2xl font-bold text-[#16191f]">{metric.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IRECResults;
```

---

## FASE 2: Backend - Modelo de datos y endpoints

### 2.1 Modelo `Analysis` en PostgreSQL
**Ubicación:** `ModeloIa/src/irec/storage/models.py`

```python
class Analysis(Base):
    """Analysis configuration and results."""
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="created")  # created, configured, running, completed, error, stopped
    
    # Configuration
    institution_ids = Column(JSON, default=list)
    radius_km = Column(Float, default=5.0)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)
    mode = Column(String(20), default="simulation")  # simulation, real
    analysis_type = Column(String(20), default="complete")  # quick, complete
    platforms = Column(JSON, default=list)
    
    # Results
    irec_value = Column(Float, default=0.0)
    irec_level = Column(String(20), default="sin_tendencia")
    pipeline_metrics = Column(JSON, default=dict)
    result_data = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
```

### 2.2 Schema Pydantic
**Ubicación:** `ModeloIa/src/irec/schemas/analysis.py` (nuevo archivo)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AnalysisCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    institution_ids: list[str] = []
    radius_km: float = 5.0
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    mode: str = "simulation"
    analysis_type: str = "complete"
    platforms: list[str] = []

class AnalysisUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    institution_ids: Optional[list[str]] = None
    radius_km: Optional[float] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    mode: Optional[str] = None
    analysis_type: Optional[str] = None
    platforms: Optional[list[str]] = None

class AnalysisResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    institution_ids: list[str]
    radius_km: float
    date_range_start: Optional[datetime]
    date_range_end: Optional[datetime]
    mode: str
    analysis_type: str
    platforms: list[str]
    irec_value: float
    irec_level: str
    pipeline_metrics: dict
    result_data: dict
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
```

### 2.3 Endpoints actualizados
**Ubicación:** `ModeloIa/src/irec/api/routes/analyses_routes.py`

**Nuevos endpoints:**
- `POST /api/analyses` - Crear análisis (guarda en DB)
- `PUT /api/analyses/{id}` - Actualizar configuración (solo si status="created")
- `POST /api/analyses/{id}/start` - Iniciar ejecución asíncrona
- `POST /api/analyses/{id}/stop` - Detener ejecución
- `GET /api/analyses/{id}/logs` - SSE para logs en tiempo real

**Ejecución asíncrona:**
```python
from fastapi import BackgroundTasks

@router.post("/{analysis_id}/start")
async def start_analysis(analysis_id: str, background_tasks: BackgroundTasks):
    # Validar que el análisis existe y está en estado "created" o "configured"
    analysis = get_analysis_from_db(analysis_id)
    if analysis.status not in ["created", "configured"]:
        raise HTTPException(400, "Analysis cannot be started")
    
    # Actualizar estado a "running"
    update_analysis_status(analysis_id, "running")
    
    # Ejecutar pipeline en background
    background_tasks.add_task(run_pipeline, analysis_id)
    
    return {"status": "started", "analysis_id": analysis_id}

async def run_pipeline(analysis_id: str):
    try:
        # Ejecutar pipeline completo
        # Guardar logs en tiempo real para SSE
        # Actualizar métricas y resultados
        # Marcar como "completed" al finalizar
    except Exception as e:
        update_analysis_status(analysis_id, "error", error_message=str(e))
```

**SSE para logs:**
```python
from fastapi.responses import StreamingResponse
import asyncio
import json

@router.get("/{analysis_id}/logs")
async def stream_logs(analysis_id: str):
    async def event_generator():
        while True:
            # Leer logs del análisis desde DB o archivo temporal
            logs = get_analysis_logs(analysis_id)
            for log in logs:
                yield f"data: {json.dumps(log)}\n\n"
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

---

## FASE 3: Actualizar rutas del frontend

### 3.1 Actualizar `routes.jsx`
**Ubicación:** `ClienteCDPLPL/src/features/dashboard/routes.jsx`

```javascript
import IRECDashboard from "./pages/Ia/IREC";

// En el array de rutas:
{
    path: 'modelo',
    element: <IRECDashboard />
}
```

---

## FASE 4: Integración y testing

### 4.1 Conectar frontend con backend
- Reemplazar datos mock con llamadas a API reales
- Implementar SSE para logs en tiempo real
- Manejar estados de carga y error

### 4.2 Testing
- Probar flujo completo: crear → configurar → ejecutar → ver resultados
- Verificar persistencia en DB
- Probar eliminación segura
- Probar detención de pipeline

---

## Resumen de archivos a crear/modificar

**Frontend (nuevos):**
1. `ClienteCDPLPL/src/features/dashboard/pages/Ia/IREC.jsx`
2. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECList.jsx`
3. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECCreateWizard.jsx`
4. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECDetail.jsx`
5. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECPipeline.jsx`
6. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECResults.jsx`
7. `ClienteCDPLPL/src/features/dashboard/pages/Ia/components/IRECConfig.jsx`

**Frontend (modificar):**
1. `ClienteCDPLPL/src/features/dashboard/routes.jsx`

**Backend (nuevos):**
1. `ModeloIa/src/irec/schemas/analysis.py`

**Backend (modificar):**
1. `ModeloIa/src/irec/storage/models.py` - agregar modelo Analysis
2. `ModeloIa/src/irec/api/routes/analyses_routes.py` - reescribir completo

---

## Próximos pasos

1. **Implementar frontend** con datos mock (archivos 1-7)
2. **Probar interfaz** visualmente
3. **Implementar backend** (modelo DB + endpoints)
4. **Conectar frontend con backend**
5. **Testing completo**

---

**Plan creado:** 2026-05-31  
**Estado:** Listo para implementación