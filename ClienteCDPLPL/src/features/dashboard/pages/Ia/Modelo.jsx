import React, { useState, useEffect, useCallback } from "react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
    Activity, AlertTriangle, Building2, MapPin,
    Plus, Trash2, Play,
    Layers, Loader2, Clock, Eye, RefreshCw,
    BarChart3, Shield, Lock, Unlock, Database, Brain, ScanEye,
    Users, Gauge, Filter, Info, Check, ChevronRight,
} from "lucide-react";
import axios from "axios";
import Modal from "../../../../components/Modal";
import Alerts from "../../components/Alerts";
import ConfirmDialog from "../../components/ConfirmDialog";

const API = "http://localhost:8000";

// ============================================================
// AWS STYLE
// ============================================================
const S = {
    page: "#f2f3f5",
    card: "#ffffff",
    border: "#d5dbdb",
    text: "#16191f",
    muted: "#545b64",
    dim: "#879196",
    orange: "#ff9900",
    orangeHover: "#ec7211",
    blue: "#0073bb",
    green: "#1e8900",
    red: "#d13212",
};

const IREC_COLORS = {
    sin_tendencia: { c: S.green, bg: "#f2f8f0" },
    leve: { c: "#b38a00", bg: "#fffbe6" },
    moderada: { c: S.orange, bg: "#fff8f0" },
    elevada: { c: S.red, bg: "#fdf3f1" },
    critica: { c: "#8b0000", bg: "#fef0f0" },
};
const IREC_LABELS = { sin_tendencia: "Sin tendencia", leve: "Leve", moderada: "Moderada", elevada: "Elevada", critica: "Crítica" };

const PIPELINE_STEPS = [
    { k: "generate", label: "Generando datos", icon: Database },
    { k: "ingest", label: "Ingesta y normalización", icon: Layers },
    { k: "clean", label: "Limpieza y anonimización", icon: Filter },
    { k: "nlp", label: "Análisis NLP", icon: Brain },
    { k: "vision", label: "Visión computacional", icon: ScanEye },
    { k: "community", label: "Asociación comunitaria", icon: Users },
    { k: "irec", label: "Cálculo IREC", icon: Gauge },
];

// ============================================================
// IREC GAUGE
// ============================================================
const IRECGauge = ({ value = 0, level = "sin_tendencia" }) => {
    const cfg = IREC_COLORS[level] || IREC_COLORS.sin_tendencia;
    const angle = Math.max(0, Math.min(180, (value / 100) * 180));
    const rad = (angle * Math.PI) / 180;
    const r = 52, cx = 70, cy = 70;
    const x = cx + r * Math.cos(Math.PI - rad);
    const y = cy - r * Math.sin(Math.PI - rad);
    const large = angle > 90 ? 1 : 0;
    return (
        <div className="flex flex-col items-center">
            <svg width="150" height="90" viewBox="0 0 140 90">
                <path d={`M 18 70 A 52 52 0 ${large} 1 ${x} ${y}`} fill="none" stroke="#eaeded" strokeWidth="9" strokeLinecap="square" />
                <path d={`M 18 70 A 52 52 0 ${large} 1 ${x} ${y}`} fill="none" stroke={cfg.c} strokeWidth="9" strokeLinecap="square" style={{ transition: "all 0.8s" }} />
                <text x="70" y="78" textAnchor="middle" fill={cfg.c} fontSize="22" fontWeight="bold" fontFamily="monospace">{value.toFixed(0)}</text>
                <text x="70" y="90" textAnchor="middle" fill={S.dim} fontSize="8" fontWeight="600">IREC/100</text>
            </svg>
            <span className="text-xs font-semibold px-2.5 py-0.5 border" style={{ backgroundColor: cfg.bg, color: cfg.c, borderColor: cfg.c + "30" }}>{IREC_LABELS[level]}</span>
        </div>
    );
};

// ============================================================
// PIPELINE PROGRESS (loading state)
// ============================================================
const PipelineProgress = ({ step }) => {
    const idx = PIPELINE_STEPS.findIndex(s => s.k === step);
    return (
        <div className="bg-[#f2f3f5] border border-[#d5dbdb] p-4">
            <p className="text-sm font-semibold text-[#16191f] mb-3">Progreso del Pipeline</p>
            <div className="space-y-0.5">
                {PIPELINE_STEPS.map((s, i) => {
                    const done = i < idx;
                    const active = i === idx;
                    return (
                        <div key={s.k} className="flex items-center gap-3 py-2 px-3 transition-all" style={{ backgroundColor: active ? "#fff8f0" : "transparent" }}>
                            <s.icon className={`w-4 h-4 ${active ? "text-[#ff9900] animate-pulse" : done ? "text-[#1e8900]" : "text-[#d5dbdb]"}`} />
                            <span className={`text-sm flex-1 ${active ? "font-semibold text-[#16191f]" : done ? "text-[#545b64]" : "text-[#d5dbdb]"}`}>{s.label}</span>
                            {done && <Check className="w-4 h-4 text-[#1e8900]" />}
                            {active && <Loader2 className="w-4 h-4 text-[#ff9900] animate-spin" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================
// MAIN PAGE
// ============================================================
const IRECDashboard = () => {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [detailId, setDetailId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [alert, setAlert] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await axios.get(`${API}/api/analyses`); setAnalyses(r.data.analyses || []); } catch (e) { }
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    const createAnalysis = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await axios.post(`${API}/api/analyses`, {
                name: newName.trim(),
                mode: "simulation",
                status: "pending",
                institutions: [],
                radius_km: 5,
                irec_value: 0,
                irec_level: "sin_tendencia",
            });
            setShowCreate(false);
            setNewName("");
            setAlert({ type: "success", message: `Análisis "${newName.trim()}" creado` });
            setTimeout(() => setAlert(null), 3000);
            load();
        } catch (e) {
            setAlert({ type: "error", message: "Error al crear análisis" });
        }
        setCreating(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await axios.delete(`${API}/api/analyses/${deleteId}`);
        setDeleteId(null);
        setAlert({ type: "success", message: "Análisis eliminado" });
        setTimeout(() => setAlert(null), 3000);
        load();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: S.page }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: S.orange }} /></div>;

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: S.page, color: S.text }}>
            <Alerts type={alert?.type} message={alert?.message} show={!!alert} onClose={() => setAlert(null)} />
            <ConfirmDialog isOpen={!!deleteId} message="¿Eliminar este análisis permanentemente?" onConfirm={confirmDelete} onClose={() => setDeleteId(null)} confirmText="Eliminar" />

            {/* Create modal - JUST NAME */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Análisis">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#16191f] mb-1.5">Nombre del análisis <span className="text-[#d13212]">*</span></label>
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Análisis Semestre 2026-I"
                            className="w-full border border-[#d5dbdb] px-3 py-2.5 text-sm outline-none focus:border-[#ff9900]" />
                    </div>
                    <div className="bg-[#f1f6fc] border border-[#d5dbdb] p-3 flex gap-2">
                        <Info className="w-4 h-4 text-[#0073bb] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#545b64]">Al crear el análisis podrás configurar la institución, radio y ejecutar el pipeline. Una vez ejecutado, la configuración quedará bloqueada.</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#d5dbdb] text-sm text-[#545b64] hover:bg-[#f2f3f5]">Cancelar</button>
                        <button onClick={createAnalysis} disabled={creating || !newName.trim()}
                            className="px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: creating ? S.dim : S.orange }}>
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Análisis"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Detail modal */}
            {detailId && <AnalysisRun analysisId={detailId} analyses={analyses} onClose={() => { setDetailId(null); load(); }} />}

            <div className="max-w-[1300px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: "#fff8f0" }}><Activity className="w-4 h-4" style={{ color: S.orange }} /></div>
                            IREC · Índice de Riesgo Emocional Comunitario
                        </h1>
                        <p className="text-sm text-[#879196] mt-1">Sistema de detección de tendencias en comunidades educativas</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md"
                        style={{ backgroundColor: S.orange }}>
                        <Plus className="w-4 h-4" /> Nuevo Análisis
                    </button>
                </div>

                {/* Analyses table */}
                {analyses.length === 0 ? (
                    <div className="bg-white border border-[#d5dbdb] p-16 text-center">
                        <BarChart3 className="w-12 h-12 text-[#d5dbdb] mx-auto mb-4" />
                        <p className="text-[#545b64] font-semibold text-lg">No hay análisis</p>
                        <p className="text-[#879196] text-sm mt-1 mb-6">Crea tu primer análisis para comenzar</p>
                        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: S.orange }}><Plus className="w-4 h-4" /> Crear primer análisis</button>
                    </div>
                ) : (
                    <div className="bg-white border border-[#d5dbdb]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#d5dbdb] bg-[#f2f3f5] text-left">
                                    {["Nombre", "Institución", "IREC", "Nivel", "Estado", "Fecha", ""].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold text-[#545b64] uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {analyses.map(a => {
                                    const cfg = IREC_COLORS[a.irec_level] || IREC_COLORS.sin_tendencia;
                                    const hasRun = a.result || a.pipeline?.total_received > 0;
                                    const isAlert = ["elevada", "critica"].includes(a.irec_level);
                                    return (
                                        <tr key={a.id} className="border-b border-[#eaeded] hover:bg-[#f2f3f5]">
                                            <td className="px-4 py-3 font-medium max-w-[220px] truncate">{a.name}</td>
                                            <td className="px-4 py-3 text-xs text-[#545b64]">{a.institutions?.[0] || "Sin configurar"}</td>
                                            <td className="px-4 py-3 font-mono font-bold" style={{ color: cfg.c }}>{hasRun ? a.irec_value?.toFixed(0) : "—"}</td>
                                            <td className="px-4 py-3">{hasRun ? <span className="text-xs px-2 py-0.5 border" style={{ backgroundColor: cfg.bg, color: cfg.c, borderColor: cfg.c + "40" }}>{IREC_LABELS[a.irec_level]}</span> : <span className="text-xs text-[#879196]">Pendiente</span>}</td>
                                            <td className="px-4 py-3">{hasRun ? (isAlert ? <span className="flex items-center gap-1 text-xs text-[#d13212]"><AlertTriangle className="w-3 h-3" /> Alerta</span> : <span className="text-xs text-[#1e8900]">Normal</span>) : <span className="text-xs text-[#879196]">Sin ejecutar</span>}</td>
                                            <td className="px-4 py-3 text-xs text-[#879196]">{a.created_at?.slice(0, 10)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    <button onClick={() => setDetailId(a.id)} className="p-1.5 hover:bg-[#f2f3f5] text-[#545b64] hover:text-[#0073bb]" title="Abrir"><Eye className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 hover:bg-[#fdf3f1] text-[#545b64] hover:text-[#d13212]" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================
// ANALYSIS RUN VIEW (modal with config + execute + results)
// ============================================================
const AnalysisRun = ({ analysisId, analyses, onClose }) => {
    const analysis = analyses.find(a => a.id === analysisId) || {};
    const hasRun = !!(analysis.result || analysis.pipeline?.total_received > 0);
    const [insts, setInsts] = useState([]);
    const [selInst, setSelInst] = useState(analysis.institution_id || "");
    const [radius, setRadius] = useState(analysis.radius_km || 5);
    const [running, setRunning] = useState(false);
    const [pipelineStep, setPipelineStep] = useState(null);
    const [result, setResult] = useState(analysis.result || null);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(`${API}/api/institutions?active_only=true`).then(r => {
            const data = r.data.institutions || [];
            setInsts(data);
            if (!selInst && data.length > 0) setSelInst(data[0].id);
        }).catch(() => { });
    }, []);

    const selectedInst = insts.find(i => i.id === selInst);

    const runAnalysis = async () => {
        if (!selInst) return;
        setRunning(true);
        setError(null);
        setResult(null);

        // Simulate pipeline steps visually
        const steps = PIPELINE_STEPS.map(s => s.k);
        for (const step of steps) {
            setPipelineStep(step);
            await new Promise(r => setTimeout(r, 600));
        }

        const inst = insts.find(i => i.id === selInst);
        try {
            const resp = await axios.post(`${API}/api/ingest/start-analysis`, {
                institutions: inst ? [inst.name] : [],
                zones: inst?.address ? [inst.address] : [],
                zone_range_km: radius,
                analysis_name: analysis.name || "Análisis",
            });
            setResult(resp.data);
            setPipelineStep("done");

            const irec = resp.data?.irec?.[0];
            await axios.put(`${API}/api/analyses/${analysisId}`, {
                name: analysis.name,
                institutions: inst ? [inst.name] : [],
                institution_id: selInst,
                radius_km: radius,
                irec_value: irec?.irec_value || 0,
                irec_level: irec?.irec_level || "sin_tendencia",
                pipeline: resp.data?.pipeline || {},
                result: resp.data,
            }).catch(() => { });
        } catch (e) {
            setError(e.response?.data?.detail || "Error en el análisis");
            setPipelineStep(null);
        }
        setRunning(false);
    };

    const irec = result?.irec?.[0];
    const pipeline = result?.pipeline || {};
    const familyData = irec?.breakdown
        ? Object.entries(irec.breakdown).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Math.abs(v), color: [S.orange, "#8e44ad", S.blue, S.green][Object.keys(irec.breakdown).indexOf(k) % 4] }))
        : [];

    return (
        <Modal isOpen={true} onClose={onClose} title={analysis.name || "Ejecutar Análisis"}>
            <div className="space-y-6">
                {/* Config (locked if already run) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#16191f] mb-1.5">
                            {hasRun ? <Lock className="w-3 h-3 inline mr-1" /> : null} Institución
                        </label>
                        <select value={selInst} onChange={e => setSelInst(e.target.value)} disabled={hasRun || running}
                            className="w-full border border-[#d5dbdb] px-3 py-2.5 text-sm outline-none focus:border-[#ff9900] disabled:bg-[#f2f3f5] disabled:text-[#879196]">
                            {insts.map(i => <option key={i.id} value={i.id}>{i.name} ({i.acronym})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#16191f] mb-1.5">
                            {hasRun ? <Lock className="w-3 h-3 inline mr-1" /> : null} Radio (km)
                        </label>
                        <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} min={1} max={50} disabled={hasRun || running}
                            className="w-full border border-[#d5dbdb] px-3 py-2.5 text-sm outline-none disabled:bg-[#f2f3f5] disabled:text-[#879196]" />
                    </div>
                </div>
                {selectedInst?.address && <p className="text-xs text-[#879196]"><MapPin className="w-3 h-3 inline mr-1" />{selectedInst.address} · Lat: {selectedInst.latitude?.toFixed(4)}, Lng: {selectedInst.longitude?.toFixed(4)}</p>}

                {/* Run button */}
                {!hasRun && (
                    <button onClick={runAnalysis} disabled={running || !selInst}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: running ? S.dim : S.orange }}>
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {running ? "Ejecutando pipeline..." : "Ejecutar Análisis"}
                    </button>
                )}
                {hasRun && !running && !result && (
                    <button onClick={runAnalysis} disabled={running}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white"
                        style={{ backgroundColor: S.orange }}>
                        <RefreshCw className="w-4 h-4" /> Re-ejecutar Análisis
                    </button>
                )}

                {/* Pipeline progress */}
                {running && pipelineStep && <PipelineProgress step={pipelineStep} />}

                {/* Error */}
                {error && (
                    <div className="bg-[#fdf3f1] border border-[#d13212]/30 p-4 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#d13212] flex-shrink-0" />
                        <p className="text-sm text-[#d13212]">{error}</p>
                    </div>
                )}

                {/* Results */}
                {result && !running && (
                    <>
                        {/* Alert */}
                        {irec && (
                            <div className="p-4 border" style={{ backgroundColor: IREC_COLORS[irec.irec_level]?.bg, borderColor: IREC_COLORS[irec.irec_level]?.c + "40" }}>
                                <div className="flex items-center gap-3">
                                    {["elevada", "critica"].includes(irec.irec_level) ? <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: S.red }} /> : <Shield className="w-5 h-5 flex-shrink-0" style={{ color: S.green }} />}
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: IREC_COLORS[irec.irec_level]?.c }}>{["elevada", "critica"].includes(irec.irec_level) ? "Alerta de Riesgo" : "Estado Normal"}</p>
                                        <p className="text-xs text-[#545b64] mt-0.5">{irec.explanation?.slice(0, 200)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { l: "Recibidos", v: pipeline.total_received },
                                { l: "Filtrados", v: pipeline.matched_by_filters },
                                { l: "Alta Asoc.", v: pipeline.high_association },
                                { l: "Limpios", v: pipeline.clean_records },
                            ].map((s, i) => (
                                <div key={i} className="bg-[#f2f3f5] border border-[#eaeded] p-3 text-center">
                                    <p className="text-xs text-[#879196] uppercase">{s.l}</p>
                                    <p className="text-xl font-bold font-mono">{s.v || 0}</p>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 flex flex-col items-center">
                                <p className="text-xs text-[#879196] uppercase mb-2">IREC</p>
                                {irec && <IRECGauge value={irec.irec_value} level={irec.irec_level} />}
                            </div>
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4">
                                <p className="text-xs text-[#879196] uppercase mb-2">Factores</p>
                                {familyData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={familyData} cx="50%" cy="50%" innerRadius={25} outerRadius={48} paddingAngle={2} dataKey="value">{familyData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart></ResponsiveContainer>
                                        <div className="flex flex-wrap gap-1 mt-2">{familyData.map((e, i) => <span key={i} className="px-1.5 py-0.5 text-[10px] text-[#545b64]" style={{ backgroundColor: e.color + "15" }}>{e.name}: {e.value.toFixed(1)}%</span>)}</div>
                                    </>
                                ) : <p className="text-[#d5dbdb] text-xs text-center py-10">Sin datos</p>}
                            </div>
                            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4">
                                <p className="text-xs text-[#879196] uppercase mb-2">Pipeline</p>
                                <div className="space-y-0.5">
                                    {PIPELINE_STEPS.map((s, i) => (
                                        <div key={s.k} className="flex items-center gap-2 text-xs text-[#545b64] py-1">
                                            <s.icon className="w-3 h-3 text-[#1e8900]" />
                                            <span>{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default IRECDashboard;
