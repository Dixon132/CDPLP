import { useState, useEffect } from 'react';
import { Save, Server, Globe, MonitorPlay, Code2, PlayCircle, ShieldCheck, Database, CheckCircle2, Clock, XCircle, RefreshCw, Loader2 } from 'lucide-react';

const C = { bgCard: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', textMuted: '#64748B', blue: '#2563EB', green: '#10B981', red: '#EF4444' };

const Toggle = ({ label, on, onToggle }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{label}</span>
        <div
            onClick={onToggle}
            style={{ width: 44, height: 24, borderRadius: 12, background: on ? C.blue : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: '0.2s' }}
        >
            <div style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: '0.2s' }} />
        </div>
    </div>
);

const InputConfig = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{label}</label>
        <input type="text" defaultValue={value} style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 4, outline: 'none', color: C.text, fontSize: 14 }} />
    </div>
);

const StatusRow = ({ name, status, icon }) => {
    const color = status === 'ONLINE' ? C.green : status === 'CHECKING' ? C.blue : C.red;
    const StatusIcon = status === 'ONLINE' ? CheckCircle2 : status === 'CHECKING' ? Loader2 : XCircle;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', borderRadius: 4, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.text }}>
                <span style={{ color: C.textMuted }}>{icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color }}>
                <StatusIcon size={16} style={status === 'CHECKING' ? { animation: 'spin 1s linear infinite' } : {}} />
                {status}
            </div>
        </div>
    );
};

const QASettings = () => {
    const [services, setServices] = useState({
        fastapi: 'CHECKING',
        backend: 'CHECKING',
        frontend: 'CHECKING',
        database: 'CHECKING',
    });
    const [screenshots, setScreenshots] = useState(true);
    const [videos, setVideos] = useState(false);

    const checkHealth = async () => {
        setServices({ fastapi: 'CHECKING', backend: 'CHECKING', frontend: 'CHECKING', database: 'CHECKING' });

        const check = async (url) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const res = await fetch(url, { signal: controller.signal, mode: 'no-cors' });
                clearTimeout(timeout);
                // mode: 'no-cors' returns opaque response (status 0) but means server is reachable
                return res.status === 0 || res.ok ? 'ONLINE' : 'OFFLINE';
            } catch {
                return 'OFFLINE';
            }
        };

        const checkJson = async (url) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                return res.ok ? 'ONLINE' : 'OFFLINE';
            } catch {
                return 'OFFLINE';
            }
        };

        // FastAPI has CORS enabled, so we can use normal fetch
        const fastapi = await checkJson('http://localhost:8000/health');
        // Backend and frontend may block CORS, use no-cors mode
        const backend = await check('http://localhost:3000/');
        const frontend = await check('http://localhost:5173/');

        const database = backend === 'ONLINE' ? 'ONLINE' : 'OFFLINE';

        setServices({ fastapi, backend, frontend, database });
    };

    useEffect(() => { checkHealth(); }, []);

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: 24 }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: 16, color: C.text }}>Configuración del Motor de QA</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <InputConfig label="URL Frontend (Target)" value="http://localhost:5173" />
                        <InputConfig label="URL Backend (Target)" value="http://localhost:3000" />
                        <InputConfig label="URL Test Server (QA)" value="http://localhost:3001" />
                        <InputConfig label="URL FastAPI QA Engine" value="http://localhost:8000" />
                        <InputConfig label="Timeout de Pruebas (ms)" value="30000" />
                        <InputConfig label="Nivel de Concurrencia" value="4 (Workers)" />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <h4 style={{ fontSize: 13, color: C.textMuted, textTransform: 'uppercase', marginBottom: 12 }}>Evidencias Automáticas</h4>
                        <Toggle label="Screenshots en Fallas (E2E)" on={screenshots} onToggle={() => setScreenshots(!screenshots)} />
                        <Toggle label="Videos de E2E (Playwright)" on={videos} onToggle={() => setVideos(!videos)} />
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.blue, color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>
                            <Save size={16} /> Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ width: 350, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, color: C.text, textTransform: 'uppercase' }}>Estado de Servicios</h3>
                    <button
                        onClick={checkHealth}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#F1F5F9', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: C.textMuted }}
                    >
                        <RefreshCw size={12} /> Refrescar
                    </button>
                </div>

                <StatusRow name="QA Engine (FastAPI)" status={services.fastapi} icon={<Server size={18} />} />
                <StatusRow name="Backend Express" status={services.backend} icon={<Database size={18} />} />
                <StatusRow name="Frontend React" status={services.frontend} icon={<Globe size={18} />} />
                <StatusRow name="PostgreSQL" status={services.database} icon={<Database size={18} />} />

                <div style={{ marginTop: 16, padding: 12, background: '#F8FAFC', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
                    <strong>Nota:</strong> El Test Server (:3001) solo se levanta durante la ejecución de pruebas. No aparece aquí porque es efímero.
                </div>
            </div>
        </div>
    );
};

export default QASettings;
