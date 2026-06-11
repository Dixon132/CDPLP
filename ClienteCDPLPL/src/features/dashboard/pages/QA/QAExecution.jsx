import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CheckCircle2, XCircle, Clock,
    ChevronDown, ChevronRight, FileJson, Search,
    Filter, AlertTriangle, Activity, Server
} from 'lucide-react';

const C = {
    bgApp: '#F8FAFC', bgCard: '#FFFFFF', border: '#E2E8F0',
    text: '#0F172A', textMuted: '#64748B', blue: '#2563EB',
    green: '#10B981', red: '#EF4444', orange: '#F59E0B',
    purple: '#8B5CF6', cyan: '#06B6D4'
};

const PIPELINE_STAGES = [
    { id: 'init', label: 'Preparación' },
    { id: 'config', label: 'Configuración' },
    { id: 'exec', label: 'Ejecución (13 categorías)' },
    { id: 'collect', label: 'Evidencias' },
    { id: 'report', label: 'Reportes' },
    { id: 'done', label: 'Finalización' },
];

// Colores por categoría
const CAT_COLORS = {
    'Smoke': '#10B981', 'API': '#2563EB', 'Integration': '#06B6D4',
    'E2E': '#8B5CF6', 'Equivalence Partitioning': '#F59E0B',
    'Boundary Value': '#F59E0B', 'Authentication': '#EF4444',
    'Authorization': '#EF4444', 'SQL Injection': '#EF4444',
    'XSS': '#EF4444', 'Static Analysis': '#8B5CF6',
    'Coverage': '#8B5CF6', 'Gherkin BDD': '#06B6D4'
};

const JSONViewer = ({ data, title }) => (
    <div style={{ background: '#1E293B', borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
        {title && <div style={{ background: '#0F172A', padding: '6px 12px', color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileJson size={12} /> {title}
        </div>}
        <div style={{ padding: 12, maxHeight: 200, overflowY: 'auto' }}>
            <pre style={{ margin: 0, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof data === 'object' ? JSON.stringify(data, null, 2) : (data || 'No data')}
            </pre>
        </div>
    </div>
);

const QAExecution = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentStage, setCurrentStage] = useState(0);
    const [progress, setProgress] = useState(0);
    const [testsRun, setTestsRun] = useState([]);
    const [pipelineError, setPipelineError] = useState(null);
    const [stageMessage, setStageMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCats, setExpandedCats] = useState(new Set());
    const [expandedTest, setExpandedTest] = useState(null);

    useEffect(() => {
        setTestsRun([]); setProgress(0); setCurrentStage(0); setPipelineError(null);
        const ws = new WebSocket(`ws://localhost:8000/ws/${id}`);
        ws.onopen = () => {
            ws.send(JSON.stringify({ action: "START", category: "ALL" }));
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.stage === "error") { setPipelineError(data.data?.error || "Error"); return; }
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.data?.message) setStageMessage(data.data.message);
            if (data.stage === "init") setCurrentStage(0);
            if (data.stage === "config") setCurrentStage(1);
            if (data.stage === "exec") setCurrentStage(2);
            if (data.stage === "collect") setCurrentStage(3);
            if (data.stage === "report") setCurrentStage(4);
            if (data.stage === "done") setCurrentStage(5);
            if (data.data?.test_result) {
                const tr = { ...data.data.test_result, _uuid: Math.random().toString(36).substr(2, 9) };
                setTestsRun(prev => [...prev, tr]);
            }
        };
        return () => { if (ws.readyState === 1) ws.close(); };
    }, [id]);

    const isDone = progress >= 100 || currentStage === 5;

    // Agrupar por CATEGORÍA (no por endpoint)
    const groupedByCategory = useMemo(() => {
        const groups = {};
        const filtered = testsRun.filter(t => {
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase();
            return (t.description?.toLowerCase().includes(s) ||
                t.endpoint?.toLowerCase().includes(s) ||
                t.id?.toLowerCase().includes(s) ||
                t.category?.toLowerCase().includes(s));
        });
        filtered.forEach(t => {
            const cat = t.category || 'General';
            if (!groups[cat]) groups[cat] = { tests: [], passed: 0, failed: 0 };
            groups[cat].tests.push(t);
            if (t.status === 'PASSED') groups[cat].passed++;
            else groups[cat].failed++;
        });
        return groups;
    }, [testsRun, searchTerm]);

    const toggleCat = (cat) => {
        const next = new Set(expandedCats);
        if (next.has(cat)) next.delete(cat); else next.add(cat);
        setExpandedCats(next);
    };

    const totalPassed = testsRun.filter(t => t.status === 'PASSED').length;
    const totalFailed = testsRun.filter(t => t.status !== 'PASSED').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgCard, padding: '16px 24px', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => navigate('/qa/catalog')} style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={16} /></button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, color: C.text, fontWeight: 700 }}>Ejecución QA — 13 Categorías</h2>
                        <div style={{ color: C.textMuted, fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>ID: {id}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: C.textMuted }}>Progreso</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? C.green : C.blue }}>{isDone ? 'COMPLETADO' : `${progress}%`}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✓ {totalPassed}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>✗ {totalFailed}</span>
                    </div>
                </div>
            </div>

            {/* Error */}
            {pipelineError && (
                <div style={{ background: '#FEF2F2', border: `1px solid ${C.red}`, padding: 16, borderRadius: 8, display: 'flex', gap: 12 }}>
                    <AlertTriangle size={20} color={C.red} />
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Error Crítico</div>
                        <pre style={{ fontSize: 12, color: '#991B1B', marginTop: 8, whiteSpace: 'pre-wrap', background: '#FEE2E2', padding: 8, borderRadius: 4 }}>{pipelineError}</pre>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
                {/* Sidebar: Pipeline + Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Pipeline stages */}
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.textMuted }}>Pipeline</h3>
                        {PIPELINE_STAGES.map((stage, idx) => {
                            const color = idx < currentStage ? C.green : idx === currentStage ? C.blue : C.textMuted;
                            return (
                                <div key={stage.id} style={{ display: 'flex', gap: 10, paddingBottom: 16, position: 'relative' }}>
                                    {idx < PIPELINE_STAGES.length - 1 && <div style={{ position: 'absolute', left: 7, top: 16, bottom: 0, width: 2, background: idx < currentStage ? C.green : '#E2E8F0' }} />}
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {idx < currentStage && <CheckCircle2 size={10} color="#fff" />}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: idx <= currentStage ? C.text : C.textMuted }}>{stage.label}</div>
                                </div>
                            );
                        })}
                        {stageMessage && <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontStyle: 'italic' }}>{stageMessage}</div>}
                    </div>
                    {/* Category summary */}
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.textMuted }}>Por Categoría</h3>
                        {Object.entries(groupedByCategory).map(([cat, data]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                                <span style={{ color: C.text, fontWeight: 500 }}>{cat}</span>
                                <span style={{ fontWeight: 700, color: data.failed > 0 ? C.red : C.green }}>{data.passed}/{data.tests.length}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main: Results by Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Search */}
                    <div style={{ display: 'flex', alignItems: 'center', background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', height: 40 }}>
                        <Search size={16} color={C.textMuted} />
                        <input type="text" placeholder="Buscar por categoría, endpoint, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, padding: '0 12px', fontSize: 13, color: C.text }} />
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{testsRun.length} tests</span>
                    </div>

                    {/* Categories */}
                    {Object.entries(groupedByCategory).map(([catName, catData]) => {
                        const isExpanded = expandedCats.has(catName);
                        const catColor = CAT_COLORS[catName] || C.blue;
                        return (
                            <div key={catName} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                                {/* Category Header */}
                                <div onClick={() => toggleCat(catName)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isExpanded ? `1px solid ${C.border}` : 'none', background: isExpanded ? '#F8FAFC' : '#FFF' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {isExpanded ? <ChevronDown size={16} color={C.textMuted} /> : <ChevronRight size={16} color={C.textMuted} />}
                                        <div style={{ width: 4, height: 24, borderRadius: 2, background: catColor }} />
                                        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{catName}</span>
                                        <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 10, color: C.textMuted, fontWeight: 600 }}>{catData.tests.length} tests</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700 }}>
                                        <span style={{ color: C.green, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={14} />{catData.passed}</span>
                                        {catData.failed > 0 && <span style={{ color: C.red, display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={14} />{catData.failed}</span>}
                                    </div>
                                </div>

                                {/* Tests inside category */}
                                {isExpanded && (
                                    <div style={{ padding: '8px 12px' }}>
                                        {catData.tests.map(t => {
                                            const isOpen = expandedTest === t._uuid;
                                            return (
                                                <div key={t._uuid} style={{ border: `1px solid ${isOpen ? catColor : '#F1F5F9'}`, borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                                                    <div onClick={() => setExpandedTest(isOpen ? null : t._uuid)} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isOpen ? '#F8FAFC' : '#FFF' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {t.status === 'PASSED' ? <CheckCircle2 size={14} color={C.green} /> : <XCircle size={14} color={C.red} />}
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{t.id}</span>
                                                            <span style={{ fontSize: 12, color: C.textMuted }}>{t.description || t.endpoint}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.status === 'PASSED' ? C.green : C.red, fontWeight: 700 }}>{t.actualCode}</span>
                                                            <span style={{ fontSize: 11, color: C.textMuted }}>{t.duration}</span>
                                                        </div>
                                                    </div>
                                                    {/* Detail panel */}
                                                    {isOpen && (
                                                        <div style={{ padding: 14, background: '#F8FAFC', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                            <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                                                                <div><span style={{ color: C.textMuted }}>Método:</span> <strong>{t.method}</strong></div>
                                                                <div><span style={{ color: C.textMuted }}>Esperado:</span> <strong>{t.expectedCode}</strong></div>
                                                                <div><span style={{ color: C.textMuted }}>Recibido:</span> <strong style={{ color: t.status === 'PASSED' ? C.green : C.red }}>{t.actualCode}</strong></div>
                                                                <div><span style={{ color: C.textMuted }}>Duración:</span> <strong>{t.duration}</strong></div>
                                                            </div>
                                                            {t.endpoint && <div style={{ fontSize: 12 }}><span style={{ color: C.textMuted }}>Endpoint:</span> <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 3 }}>{t.method} {t.endpoint}</code></div>}
                                                            {t.payload && Object.keys(t.payload).length > 0 && <JSONViewer title="Request Payload" data={t.payload} />}
                                                            {t.responseBody && <JSONViewer title="Response Body" data={t.responseBody} />}
                                                            {t.error && <div style={{ fontSize: 12, color: C.red, background: '#FEF2F2', padding: 8, borderRadius: 4 }}>{t.error}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {testsRun.length === 0 && !pipelineError && (
                        <div style={{ textAlign: 'center', padding: 40, color: C.textMuted }}>
                            <Activity size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                            <div style={{ fontSize: 14 }}>Esperando resultados del pipeline...</div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>{stageMessage || 'Conectando...'}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QAExecution;
