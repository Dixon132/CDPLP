import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FlaskConical, ShieldCheck, Zap, Code2, Globe, LayoutDashboard,
    PlayCircle, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight,
    AlertTriangle, TrendingUp, FileBarChart2, Activity, Cpu, Bug,
    Terminal, Eye, BarChart3, Layers, Shield, Target, Wifi, WifiOff,
    ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, List,
    Radio, Gauge, PieChart, ArrowLeft
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT THEME DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
    bg: '#FAFAF8',          // Cream/Off-white background
    bgCard: '#FFFFFF',      // Pure white cards
    bgCardSolid: '#FFFFFF',
    border: '#E2E8F0',      // Soft gray border
    borderBright: '#CBD5E1',
    textPrimary: '#0F172A', // Very dark slate (near black)
    textSecondary: '#64748B', // Slate gray
    blue: '#2563EB',
    green: '#10B981',
    red: '#EF4444',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    orange: '#F97316',
};

const SUITES = [
    { id: 'ALL', label: 'Run All', icon: <PlayCircle size={16} />, color: C.blue, desc: 'Todas las pruebas' },
    { id: 'FUNCTIONAL', label: 'Functional', icon: <FlaskConical size={16} />, color: C.green, desc: 'Unit, Integration, E2E, Smoke...' },
    { id: 'API', label: 'API Tests', icon: <Globe size={16} />, color: C.cyan, desc: 'Todos los endpoints REST' },
    { id: 'SECURITY', label: 'Security', icon: <ShieldCheck size={16} />, color: C.red, desc: 'Auth, Injection, XSS, CSRF...' },
    { id: 'PERFORMANCE', label: 'Performance', icon: <Zap size={16} />, color: C.yellow, desc: 'Load, Stress, Spike...' },
    { id: 'QUALITY', label: 'Quality', icon: <Code2 size={16} />, color: C.purple, desc: 'Code Smells, Complexity...' },
    { id: 'BLACK_BOX', label: 'Black Box', icon: <Target size={16} />, color: C.orange, desc: 'Equivalence, BVA, Decision Table...' },
    { id: 'WHITE_BOX', label: 'White Box', icon: <Layers size={16} />, color: '#ec4899', desc: 'Statement, Branch, Path Coverage...' },
];

const SEVERITY_COLORS = {
    CRITICAL: C.red,
    HIGH: C.orange,
    MEDIUM: C.yellow,
    LOW: C.cyan,
    INFO: C.textSecondary,
};

const STATUS_CONFIG = {
    PASSED: { color: C.green, icon: <CheckCircle2 size={14} />, label: 'Passed' },
    FAILED: { color: C.red, icon: <XCircle size={14} />, label: 'Failed' },
    SKIPPED: { color: C.textSecondary, icon: <ChevronRight size={14} />, label: 'Skipped' },
    RUNNING: { color: C.blue, icon: <RefreshCw size={14} className="animate-spin" />, label: 'Running' },
    ERROR: { color: C.orange, icon: <AlertTriangle size={14} />, label: 'Error' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Card = ({ children, style = {}, className = '' }) => (
    <div style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        ...style,
    }} className={className}>
        {children}
    </div>
);

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ERROR;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20,
            background: `${cfg.color}15`, color: cfg.color,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            border: `1px solid ${cfg.color}30`,
        }}>
            {cfg.label}
        </span>
    );
};

const ProgressBar = ({ value, max = 100, color = C.blue, height = 6 }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div style={{ background: '#F1F5F9', borderRadius: 99, height, overflow: 'hidden' }}>
            <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 99,
                background: color,
                transition: 'width 0.6s ease',
            }} />
        </div>
    );
};

const KpiCard = ({ icon, title, value, subtitle, trend, trendUp, color = C.blue }) => (
    <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${color}15`, color,
            }}>
                {icon}
            </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary, lineHeight: 1.1, marginBottom: 4 }}>
            {value ?? '—'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
        </div>
        {subtitle && (
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{subtitle}</div>
        )}
    </Card>
);

const SectionTitle = ({ icon, title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.blue }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
            </span>
        </div>
        {action}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════
const MOCK_OVERVIEW = {
    total_executions: 12,
    global_success_rate: 78.4,
    total_tests_run: 347,
    avg_duration_ms: 45230,
    last_execution: { status: 'PASSED', suite_type: 'API', started_at: new Date().toISOString(), duration_ms: 38400, passed: 47, failed: 5, skipped: 2, total_tests: 54 },
};

const MOCK_TRENDS = Array.from({ length: 10 }, (_, i) => ({
    date: `Jun ${i + 1}`,
    success_rate: 60 + Math.random() * 35,
    total_tests: 40 + Math.floor(Math.random() * 20),
}));

const MOCK_RESULTS = [
    {
        id: '1', test_name: 'test_create_colegiado_success', category: 'API', subcategory: 'COLEGIADOS', status: 'PASSED', duration_ms: 145,
        request_details: {
            method: 'POST',
            url: 'http://localhost:3000/api/colegiados/',
            payload: JSON.stringify({ nombre: "Juan", apellidos: "Perez", ci: "1234567" }, null, 2),
            expected_status: 201
        }
    },
    {
        id: '2', test_name: 'test_login_invalid_password', category: 'API', subcategory: 'AUTH', status: 'FAILED', duration_ms: 132,
        error_message: 'Expected status 401 but got 200',
        request_details: {
            method: 'POST',
            url: 'http://localhost:3000/api/usuarios/auth/login',
            payload: JSON.stringify({ correo: "admin@cdplp.com", contrase_a: "wrongpass" }, null, 2),
            expected_status: 401
        }
    },
    {
        id: '3', test_name: 'test_get_financiero_metrics', category: 'API', subcategory: 'FINANCIERO', status: 'PASSED', duration_ms: 310,
        request_details: {
            method: 'GET',
            url: 'http://localhost:3000/api/financiero/presupuestos',
            payload: null,
            expected_status: 200
        }
    },
    {
        id: '4', test_name: 'test_sql_injection_login', category: 'SECURITY', subcategory: 'INJECTION', status: 'PASSED', duration_ms: 156,
        request_details: {
            method: 'POST',
            url: 'http://localhost:3000/api/usuarios/auth/login',
            payload: JSON.stringify({ correo: "admin' OR '1'='1", contrase_a: "any" }, null, 2),
            expected_status: 400
        }
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardView = ({ overview, trends, onRun, isRunning, activeExecution }) => {
    const last = overview?.last_execution;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <KpiCard icon={<Activity size={24} />} title="Success Rate Global" value={`${overview?.global_success_rate?.toFixed(1) ?? '—'}%`}
                    color={overview?.global_success_rate >= 80 ? C.green : overview?.global_success_rate >= 60 ? C.yellow : C.red} />
                <KpiCard icon={<FlaskConical size={24} />} title="Pruebas Realizadas" value={overview?.total_tests_run ?? '—'}
                    color={C.blue} subtitle="Histórico" />
                <KpiCard icon={<Clock size={24} />} title="Última Duración" value={`${((last?.duration_ms ?? 0) / 1000).toFixed(1)}s`}
                    color={C.cyan} subtitle={last?.suite_type} />
                <KpiCard icon={<Layers size={24} />} title="Categorías" value="40+"
                    color={C.purple} subtitle="Soportadas" />
            </div>

            {/* QUICK RUN + CHART */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 16 }}>
                <Card style={{ padding: 24 }}>
                    <SectionTitle icon={<PlayCircle size={18} />} title="Ejecutar Suites (40+ Tipos)" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {SUITES.map(suite => (
                            <button
                                key={suite.id}
                                onClick={() => onRun(suite.id)}
                                disabled={isRunning}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                                    padding: '14px', borderRadius: 10, border: `1px solid ${C.border}`,
                                    background: isRunning ? '#F8FAFC' : '#FFFFFF',
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                                onMouseEnter={e => !isRunning && (e.currentTarget.style.borderColor = suite.color, e.currentTarget.style.boxShadow = `0 4px 12px ${suite.color}20`)}
                                onMouseLeave={e => !isRunning && (e.currentTarget.style.borderColor = C.border, e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: suite.color, fontWeight: 700, fontSize: 13 }}>
                                    {suite.icon} {suite.label}
                                </div>
                                <div style={{ fontSize: 11, color: C.textSecondary, textAlign: 'left', lineHeight: 1.3 }}>{suite.desc}</div>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card style={{ padding: 24 }}>
                    <SectionTitle icon={<TrendingUp size={18} />} title="Evolución de Calidad" />
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={trends ?? MOCK_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="qaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                            <Tooltip
                                contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textPrimary, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(v) => [`${v.toFixed(1)}%`, 'Success Rate']}
                            />
                            <Area type="monotone" dataKey="success_rate" stroke={C.blue} fill="url(#qaGrad)" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: C.blue, strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};


const ResultsView = ({ results }) => {
    const data = results ?? MOCK_RESULTS;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, marginBottom: 8 }}>
                Visualización de Pruebas (Ejemplos API)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
                {data.map((r, i) => (
                    <Card key={r.id || i} style={{ padding: 0, overflow: 'hidden', border: `1px solid ${r.status === 'FAILED' ? `${C.red}40` : C.border}` }}>
                        {/* Header */}
                        <div style={{ background: '#F8FAFC', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: STATUS_CONFIG[r.status]?.color }}>{STATUS_CONFIG[r.status]?.icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, fontFamily: 'monospace' }}>{r.test_name}</span>
                            </div>
                            <span style={{ fontSize: 11, background: '#E2E8F0', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{r.duration_ms}ms</span>
                        </div>

                        {/* Request Summary */}
                        {r.request_details && (
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F1F5F9', padding: '8px 12px', borderRadius: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: r.request_details.method === 'GET' ? C.blue : r.request_details.method === 'POST' ? C.green : C.orange }}>
                                        {r.request_details.method}
                                    </span>
                                    <span style={{ fontSize: 13, color: C.textPrimary, fontFamily: 'monospace', flex: 1 }}>{r.request_details.url}</span>
                                    <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600 }}>Expected: <span style={{ color: C.textPrimary }}>{r.request_details.expected_status}</span></span>
                                </div>

                                {/* Code Block */}
                                {r.request_details.payload && (
                                    <div style={{ background: '#1E293B', borderRadius: 8, padding: '12px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 0, right: 12, background: '#334155', color: '#fff', fontSize: 9, padding: '2px 6px', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, fontWeight: 700 }}>
                                            JSON PAYLOAD
                                        </div>
                                        <pre style={{ margin: 0, marginTop: 8, fontSize: 12, color: '#A5B4FC', fontFamily: 'monospace', overflowX: 'auto' }}>
                                            {r.request_details.payload}
                                        </pre>
                                    </div>
                                )}

                                {/* Error if any */}
                                {r.error_message && (
                                    <div style={{ background: '#FEF2F2', border: `1px solid ${C.red}30`, borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: C.red, marginBottom: 4 }}>ERROR OUTPUT</div>
                                        <div style={{ fontSize: 12, color: '#991B1B', fontFamily: 'monospace' }}>{r.error_message}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE (STANDALONE - NO DASHBOARD LAYOUT)
// ═══════════════════════════════════════════════════════════════════════════════
const VIEWS = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'results', label: 'Test Grids (Visual)', icon: <List size={16} /> },
];

const QAPage = () => {
    const [activeView, setActiveView] = useState('dashboard');
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = useCallback((suiteId) => {
        setIsRunning(true);
        setTimeout(() => setIsRunning(false), 2000); // Demo mock
    }, []);

    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh', width: '100vw',
            background: C.bg,
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            color: C.textPrimary,
            overflowX: 'hidden'
        }}>
            {/* Header Standalone */}
            <header style={{
                background: '#FFFFFF',
                borderBottom: `1px solid ${C.border}`,
                padding: '16px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 50,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                        <ArrowLeft size={16} /> Volver al Sistema
                    </button>
                    <div style={{ width: 1, height: 24, background: C.border }} />
                    <div style={{
                        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#EEF2FF', color: C.blue
                    }}>
                        <FlaskConical size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary }}>Enterprise QA Platform</div>
                        <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>Sistema Independiente de Calidad · 40+ Pruebas Automatizadas</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
                        {VIEWS.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setActiveView(v.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '8px 16px', borderRadius: 6, border: 'none',
                                    background: activeView === v.id ? '#FFFFFF' : 'transparent',
                                    color: activeView === v.id ? C.blue : C.textSecondary,
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    boxShadow: activeView === v.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {v.icon}{v.label}
                            </button>
                        ))}
                    </div>

                    {/* Run All */}
                    <button
                        onClick={() => handleRun('ALL')}
                        disabled={isRunning}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px', borderRadius: 8, border: 'none',
                            background: isRunning ? '#94A3B8' : C.textPrimary,
                            color: '#FFFFFF',
                            fontSize: 14, fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    >
                        {isRunning ? <RefreshCw size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                        {isRunning ? 'Ejecutando...' : 'Ejecutar 40 Pruebas'}
                    </button>
                </div>
            </header>

            {/* Content Body */}
            <main style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
                {activeView === 'dashboard' && <DashboardView onRun={handleRun} isRunning={isRunning} />}
                {activeView === 'results' && <ResultsView />}
            </main>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default QAPage;
