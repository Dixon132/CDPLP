import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Zap, Code2, Clock, CheckCircle2, XCircle, BarChart2, AlertTriangle, Loader2 } from 'lucide-react';

const C = { bgCard: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', textMuted: '#64748B', blue: '#2563EB', green: '#10B981', red: '#EF4444', orange: '#F59E0B', purple: '#8B5CF6' };

const GridCard = ({ title, icon, children }) => (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC' }}>
            <span style={{ color: C.textMuted }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        </div>
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {children}
        </div>
    </div>
);

const MetricRow = ({ label, value, color = C.text }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
);

const SkeletonRow = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '60%', height: 14, background: '#E2E8F0', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '20%', height: 14, background: '#E2E8F0', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
    </div>
);

const QADashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/metrics/overview')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => { setMetrics(data); setLoading(false); })
            .catch(err => { setError(`QA Engine offline: ${err.message}`); setLoading(false); });
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 20, background: C.bgCard, padding: '20px', border: `1px solid ${C.border}`, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={24} color={C.blue} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: C.textMuted, fontSize: 14 }}>Conectando con QA Engine...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 16, background: '#FEF2F2', padding: '20px', border: `1px solid ${C.red}40`, borderRadius: 4, alignItems: 'center' }}>
                    <AlertTriangle size={24} color={C.red} />
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#991B1B' }}>QA Engine No Disponible</div>
                        <div style={{ fontSize: 13, color: '#991B1B', marginTop: 4 }}>{error}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Levantar con: cd qa && python -m uvicorn api.main:app --port 8000</div>
                    </div>
                </div>
            </div>
        );
    }

    const exec = metrics?.last_execution;
    const byCategory = metrics?.by_category || {};
    const tools = metrics?.tools || {};
    const noData = metrics?.status === 'NO_DATA';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Top Global Status */}
            <div style={{ display: 'flex', gap: 20, background: C.bgCard, padding: '20px', border: `1px solid ${C.border}`, borderRadius: 4 }}>
                <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, paddingRight: 20 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Estado del Sistema</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: noData ? C.textMuted : metrics?.status === 'HEALTHY' ? C.green : C.orange, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {noData ? <Clock size={20} /> : metrics?.status === 'HEALTHY' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        {noData ? 'SIN DATOS' : metrics?.status}
                    </div>
                </div>
                <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, paddingRight: 20 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Última Ejecución</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 4 }}>
                        {exec ? new Date(exec.timestamp).toLocaleString('es-ES') : 'Nunca'}
                    </div>
                </div>
                <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, paddingRight: 20 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Tasa de Éxito</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: exec ? (exec.success_rate >= 90 ? C.green : exec.success_rate >= 70 ? C.orange : C.red) : C.textMuted, marginTop: 4 }}>
                        {exec ? `${exec.success_rate}%` : '--'}
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Total Pruebas</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4 }}>
                        {exec ? exec.total : '--'}
                    </div>
                </div>
            </div>

            {noData && (
                <div style={{ background: '#FFFBEB', border: `1px solid ${C.orange}40`, borderRadius: 4, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={18} color={C.orange} />
                    <span style={{ fontSize: 13, color: '#92400E' }}>No hay ejecuciones registradas. Ve al <strong>Test Catalog</strong> y ejecuta una suite.</span>
                </div>
            )}

            {/* Grid de métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <GridCard title="Resultados Generales" icon={<Activity size={16} />}>
                    <MetricRow label="Total de Pruebas" value={exec ? exec.total : '--'} />
                    <MetricRow label="Pruebas Exitosas" value={exec ? exec.passed : '--'} color={C.green} />
                    <MetricRow label="Pruebas Fallidas" value={exec ? exec.failed : '--'} color={exec?.failed > 0 ? C.red : C.textMuted} />
                    <MetricRow label="Exec ID" value={exec ? exec.exec_id?.slice(0, 12) + '...' : '--'} />
                </GridCard>

                <GridCard title="Por Categoría" icon={<BarChart2 size={16} />}>
                    {Object.keys(byCategory).length > 0 ? (
                        Object.entries(byCategory).slice(0, 6).map(([cat, data]) => (
                            <MetricRow key={cat} label={cat} value={`${data.passed}/${data.total}`} color={data.failed > 0 ? C.orange : C.green} />
                        ))
                    ) : (
                        <>
                            <MetricRow label="Smoke" value="--" />
                            <MetricRow label="API" value="--" />
                            <MetricRow label="Security" value="--" />
                            <MetricRow label="Quality" value="--" />
                        </>
                    )}
                </GridCard>

                <GridCard title="Seguridad" icon={<ShieldCheck size={16} />}>
                    <MetricRow label="Authentication" value={byCategory['Authentication'] ? `${byCategory['Authentication'].passed}/${byCategory['Authentication'].total}` : '--'} />
                    <MetricRow label="Authorization" value={byCategory['Authorization'] ? `${byCategory['Authorization'].passed}/${byCategory['Authorization'].total}` : '--'} />
                    <MetricRow label="SQL Injection" value={byCategory['SQL Injection'] ? `${byCategory['SQL Injection'].passed}/${byCategory['SQL Injection'].total}` : '--'} />
                    <MetricRow label="XSS" value={byCategory['XSS'] ? `${byCategory['XSS'].passed}/${byCategory['XSS'].total}` : '--'} />
                </GridCard>

                <GridCard title="Herramientas" icon={<Zap size={16} />}>
                    {Object.entries(tools).map(([tool, status]) => (
                        <MetricRow key={tool} label={tool} value={status} color={status === 'ONLINE' || status === 'READY' ? C.green : C.textMuted} />
                    ))}
                </GridCard>

                <GridCard title="Calidad" icon={<Code2 size={16} />}>
                    <MetricRow label="Static Analysis" value={byCategory['Static Analysis'] ? `${byCategory['Static Analysis'].passed}/${byCategory['Static Analysis'].total}` : '--'} />
                    <MetricRow label="Coverage" value={byCategory['Coverage'] ? `${byCategory['Coverage'].passed}/${byCategory['Coverage'].total}` : '--'} />
                    <MetricRow label="Equivalence Part." value={byCategory['Equivalence Partitioning'] ? `${byCategory['Equivalence Partitioning'].passed}/${byCategory['Equivalence Partitioning'].total}` : '--'} />
                    <MetricRow label="Boundary Value" value={byCategory['Boundary Value'] ? `${byCategory['Boundary Value'].passed}/${byCategory['Boundary Value'].total}` : '--'} />
                </GridCard>

                <GridCard title="Última Ejecución" icon={<Clock size={16} />}>
                    <MetricRow label="Fecha" value={exec ? new Date(exec.timestamp).toLocaleDateString('es-ES') : '--'} />
                    <MetricRow label="Hora" value={exec ? new Date(exec.timestamp).toLocaleTimeString('es-ES') : '--'} />
                    <MetricRow label="Duración" value={exec?.duration_ms ? `${Math.round(exec.duration_ms / 1000)}s` : '--'} />
                    <MetricRow label="Resultado" value={exec ? (exec.failed === 0 ? 'PASSED' : 'FAILED') : '--'} color={exec ? (exec.failed === 0 ? C.green : C.red) : C.textMuted} />
                </GridCard>
            </div>
        </div>
    );
};

export default QADashboard;
