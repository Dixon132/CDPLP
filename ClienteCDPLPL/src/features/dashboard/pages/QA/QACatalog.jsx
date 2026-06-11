import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play, Info, Cpu, FileText, CheckCircle2, Shield, Zap, Code2, Search } from 'lucide-react';

const C = { bgCard: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', textMuted: '#64748B', blue: '#2563EB', green: '#10B981', red: '#EF4444', purple: '#8B5CF6', cyan: '#06B6D4' };

const CATEGORIES = [
    {
        id: 'SMOKE', name: 'Smoke Testing', group: 'Funcional', icon: <Zap size={16} color={C.green} />,
        objective: 'Verificación rápida de que todos los componentes críticos están operativos.',
        time: '~10s', tool: 'Pytest + Requests',
        tests: [
            { name: 'Backend Alive', desc: 'Servidor Express responde en :3001' },
            { name: 'Database Connected', desc: 'Signup crea registro o detecta duplicado' },
            { name: 'Login Returns Token', desc: 'Login retorna JWT válido' },
            { name: 'Prisma Operational', desc: 'GET colegiados con auth responde' },
            { name: 'Public Endpoint', desc: 'ac-sociales responde sin auth' },
            { name: 'Auditorías Module', desc: 'Módulo auditorías operativo' },
        ]
    },
    {
        id: 'API', name: 'API Testing', group: 'Funcional', icon: <Search size={16} color={C.blue} />,
        objective: 'Verificar contratos REST: status codes, body JSON, campos obligatorios.',
        time: '~30s', tool: 'Pytest + Requests',
        tests: [
            { name: 'Login Success', desc: 'POST /login → 200 + token' },
            { name: 'Login Wrong Password', desc: 'POST /login → 401' },
            { name: 'No Token Protected', desc: 'GET protegido sin token → 401' },
            { name: 'List Colegiados', desc: 'GET /colegiados → array' },
            { name: 'Create Colegiado', desc: 'POST /colegiados → id_colegiado' },
            { name: 'List Correspondencia', desc: 'GET /correspondencia → 200/403' },
            { name: 'List Sociales', desc: 'GET /ac-sociales → 200 (público)' },
            { name: 'List Institucional', desc: 'GET /ac-institucionales → 200/403' },
            { name: 'List Presupuestos', desc: 'GET /financiero/presupuestos → 200/403' },
            { name: 'List Auditorías', desc: 'GET /auditorias → array' },
            { name: 'List Usuarios', desc: 'GET /usuarios → 200' },
            { name: 'Get Simple', desc: 'GET /colegiados/getSimple → array' },
        ]
    },
    {
        id: 'INT', name: 'Integration Testing', group: 'Funcional', icon: <Code2 size={16} color={C.cyan} />,
        objective: 'Verificar flujos multi-módulo que involucran múltiples tablas.',
        time: '~45s', tool: 'Pytest + Requests',
        tests: [
            { name: 'Pago → Movimiento', desc: 'Crear pago genera movimiento financiero' },
            { name: 'Actividad Institucional', desc: 'Crear actividad y verificar persistencia' },
            { name: 'Audit Trail', desc: 'Acciones generan registros de auditoría' },
            { name: 'Anulación → Egreso', desc: 'Anular pago genera EGRESO de reversión' },
        ]
    },
    {
        id: 'E2E', name: 'End-to-End Testing', group: 'Funcional', icon: <Cpu size={16} color={C.purple} />,
        objective: 'Flujos completos de usuario via browser automation.',
        time: '~2m', tool: 'Playwright',
        tests: [
            { name: 'Login Flow', desc: 'Navegar → llenar form → verificar dashboard' },
            { name: 'Logout Flow', desc: 'Dashboard → cerrar sesión → login' },
            { name: 'Protected Route', desc: 'Sin token → redirige a login' },
            { name: 'Sidebar Navigation', desc: 'Links del menú navegan correctamente' },
        ]
    },
    {
        id: 'EP', name: 'Equivalence Partitioning', group: 'Caja Negra', icon: <Search size={16} color="#F59E0B" />,
        objective: 'Dividir datos de entrada en particiones válidas e inválidas.',
        time: '~15s', tool: 'Pytest + Requests',
        tests: [
            { name: 'Email Válido', desc: 'Formato correcto → 200' },
            { name: 'Email Sin @', desc: 'Formato inválido → 401' },
            { name: 'Email Vacío', desc: 'String vacío → 401' },
            { name: 'Contraseña Vacía', desc: 'String vacío → 401' },
            { name: 'Monto Positivo', desc: 'Valor válido → 200' },
            { name: 'Monto Negativo', desc: 'Valor inválido → 400' },
            { name: 'Monto Cero', desc: 'Valor límite → 400' },
            { name: 'Monto String', desc: 'Tipo inválido → 400' },
        ]
    },
    {
        id: 'BVA', name: 'Boundary Value Analysis', group: 'Caja Negra', icon: <Search size={16} color="#F59E0B" />,
        objective: 'Probar valores en los límites extremos de los campos.',
        time: '~15s', tool: 'Pytest + Requests',
        tests: [
            { name: 'Nombre 1 char', desc: 'Mínimo aceptable' },
            { name: 'Nombre 100 chars', desc: 'Límite VarChar(100)' },
            { name: 'Nombre 101 chars', desc: 'Sobre límite' },
            { name: 'Monto 0.01', desc: 'Mínimo positivo' },
            { name: 'Monto 99999999.99', desc: 'Máximo Decimal(10,2)' },
            { name: 'Monto Overflow', desc: 'Excede Decimal(10,2)' },
            { name: 'Carnet 20 chars', desc: 'Límite VarChar(20)' },
            { name: 'Carnet 21 chars', desc: 'Sobre límite' },
        ]
    },
    {
        id: 'AUTH-SEC', name: 'Authentication Testing', group: 'Seguridad', icon: <Shield size={16} color={C.red} />,
        objective: 'Verificar que el JWT no puede ser bypasseado.',
        time: '~15s', tool: 'Pytest + PyJWT',
        tests: [
            { name: 'Sin Token', desc: 'Request sin Authorization → 401' },
            { name: 'Firma Inválida', desc: 'Token con secret incorrecto → 401' },
            { name: 'Token Expirado', desc: 'exp en el pasado → 401' },
            { name: 'User Inexistente', desc: 'userId que no existe → 401' },
            { name: 'Bearer Prefix', desc: 'Con "Bearer " prefix → 401' },
            { name: 'Wrong Password', desc: 'Contraseña incorrecta → 401' },
            { name: 'User No Existe', desc: 'Correo inexistente → 401' },
        ]
    },
    {
        id: 'AUTHZ', name: 'Authorization Testing', group: 'Seguridad', icon: <Shield size={16} color={C.red} />,
        objective: 'Verificar controles de roles y permisos.',
        time: '~15s', tool: 'Pytest + PyJWT',
        tests: [
            { name: 'Rol Insuficiente Financiero', desc: 'Sin TESORERO → 403' },
            { name: 'Rol Insuficiente Usuarios', desc: 'Sin PRESIDENTE → 403' },
            { name: 'Crear Rol Sin Permiso', desc: 'Sin rol adecuado → 403' },
            { name: 'PRESIDENTE Full Access', desc: 'Acceso total → 200' },
            { name: 'Documentos Sin Auth (bug)', desc: 'Endpoint sin middleware' },
            { name: 'Sociales Sin Auth (bug)', desc: 'Endpoint sin middleware' },
        ]
    },
    {
        id: 'SQLI', name: 'SQL Injection Testing', group: 'Seguridad', icon: <Shield size={16} color={C.red} />,
        objective: 'Verificar que Prisma protege contra inyecciones SQL.',
        time: '~15s', tool: 'Pytest + Requests',
        tests: [
            { name: "OR '1'='1'", desc: 'Inyección clásica → 401' },
            { name: 'DROP TABLE', desc: 'Destrucción → 401, tabla intacta' },
            { name: 'Double Quote', desc: 'Variante comillas dobles → 401' },
            { name: 'SQL en Nombre', desc: 'Prisma trata como string' },
            { name: 'SQL en URL Param', desc: 'Inyección en :id → 400/404' },
        ]
    },
    {
        id: 'XSS', name: 'XSS Testing', group: 'Seguridad', icon: <Shield size={16} color={C.red} />,
        objective: 'Verificar que scripts maliciosos no se ejecutan.',
        time: '~15s', tool: 'Pytest + Requests',
        tests: [
            { name: '<script> Tag', desc: 'Almacenado como string literal' },
            { name: 'Retrieve XSS', desc: 'JSON response, no HTML' },
            { name: 'IMG onerror', desc: 'Almacenado como string' },
            { name: 'javascript: Protocol', desc: 'Almacenado como string' },
            { name: 'Content-Type JSON', desc: 'Respuestas son application/json' },
        ]
    },
    {
        id: 'SA', name: 'Static Analysis', group: 'Calidad', icon: <Code2 size={16} color={C.purple} />,
        objective: 'Análisis estático del código Python con herramientas reales.',
        time: '~30s', tool: 'Flake8 + Radon + Bandit',
        tests: [
            { name: 'Flake8 Linting', desc: 'Estilo y errores de código' },
            { name: 'Radon CC', desc: 'Complejidad ciclomática' },
            { name: 'Radon MI', desc: 'Índice de mantenibilidad' },
            { name: 'Bandit Security', desc: 'Vulnerabilidades en Python' },
        ]
    },
    {
        id: 'COV', name: 'Coverage Reporting', group: 'Calidad', icon: <Code2 size={16} color={C.purple} />,
        objective: 'Generar reportes de cobertura reales.',
        time: '~30s', tool: 'Coverage.py',
        tests: [
            { name: 'Coverage Run', desc: 'Ejecutar con medición' },
            { name: 'Report Text', desc: 'Reporte en texto' },
            { name: 'Report HTML', desc: 'Reporte HTML navegable' },
            { name: 'Report JSON', desc: 'Reporte JSON para dashboard' },
        ]
    },
];

const QACatalog = () => {
    const [expanded, setExpanded] = useState({});
    const [preExec, setPreExec] = useState(null);
    const navigate = useNavigate();

    const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    const groups = ['Funcional', 'Caja Negra', 'Seguridad', 'Calidad'];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <h2 style={{ margin: 0, fontSize: 20, color: C.text }}>Catálogo de Pruebas — 12 Categorías</h2>
                <p style={{ margin: '8px 0 0', color: C.textMuted, fontSize: 13 }}>Pruebas reales ejecutadas contra localhost:3001. Selecciona una categoría para lanzar la ejecución.</p>
            </div>

            {groups.map(group => (
                <div key={group} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{group}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {CATEGORIES.filter(c => c.group === group).map(cat => (
                            <div key={cat.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                                <div
                                    style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', cursor: 'pointer' }}
                                    onClick={() => toggle(cat.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {expanded[cat.id] ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
                                        {cat.icon}
                                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cat.name}</span>
                                        <span style={{ fontSize: 11, background: '#E2E8F0', padding: '2px 8px', borderRadius: 12, color: C.textMuted }}>{cat.tests.length} tests</span>
                                        <span style={{ fontSize: 11, color: C.textMuted }}>{cat.time} • {cat.tool}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setPreExec(cat)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: C.blue, color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            <Play size={12} /> Ejecutar
                                        </button>
                                    </div>
                                </div>

                                {expanded[cat.id] && (
                                    <div style={{ borderTop: `1px solid ${C.border}` }}>
                                        <div style={{ padding: '8px 20px', background: '#FAFBFC', fontSize: 12, color: C.textMuted }}>{cat.objective}</div>
                                        {cat.tests.map((t, i) => (
                                            <div key={i} style={{ padding: '10px 20px', borderTop: `1px solid #F1F5F9`, display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <div style={{ width: 5, height: 5, background: C.blue, borderRadius: '50%' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                                                    <div style={{ fontSize: 12, color: C.textMuted }}>{t.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Modal de confirmación */}
            {preExec && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: C.bgCard, width: 500, borderRadius: 8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, background: '#F8FAFC' }}>
                            <h3 style={{ margin: 0, fontSize: 16, color: C.text }}>Ejecutar: {preExec.name}</h3>
                        </div>
                        <div style={{ padding: '20px', fontSize: 13, color: C.text, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: C.textMuted, marginBottom: 4 }}>Categoría:</div>
                                    <div style={{ fontWeight: 700 }}>{preExec.name}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: C.textMuted, marginBottom: 4 }}>Herramienta:</div>
                                    <div style={{ fontWeight: 600 }}>{preExec.tool}</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ color: C.textMuted, marginBottom: 4 }}>Tests a ejecutar ({preExec.tests.length}):</div>
                                <div style={{ background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', maxHeight: 120, overflowY: 'auto' }}>
                                    <ul style={{ margin: 0, paddingLeft: 20, color: C.textMuted, fontSize: 12 }}>
                                        {preExec.tests.map(t => <li key={t.name}>{t.name}</li>)}
                                    </ul>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text, fontWeight: 600 }}>
                                <CheckCircle2 size={16} color={C.green} /> Tiempo estimado: {preExec.time}
                            </div>
                        </div>
                        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#F8FAFC' }}>
                            <button onClick={() => setPreExec(null)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={() => navigate(`/qa/execution/${preExec.id}-${Date.now()}`)} style={{ padding: '8px 16px', background: C.blue, border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Iniciar Ejecución</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QACatalog;
