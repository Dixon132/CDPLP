import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Clock, LogOut, CheckCircle, Navigation, Building, Users, Activity } from "lucide-react";

function formatTime(isoDate) {
    if (!isoDate) return "--:--";
    return new Date(isoDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoDate) {
    if (!isoDate) return "--/--/----";
    return new Date(isoDate).toLocaleDateString("es-ES");
}

function formatHoras(horas) {
    if (!horas && horas !== 0) return "--";
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}m`;
}

// ──────────────────────────────────────────────
// Componente: Circular progress ring
// ──────────────────────────────────────────────
const CircularProgress = ({ value, max, size = 100, stroke = 10 }) => {
    const pct = Math.min(100, (value / (max || 1)) * 100);
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    const color =
        pct >= 100 ? "#10b981" // completado (emerald)
        : pct >= 50 ? "#3b82f6" // en camino (blue)
        : pct >= 1 ? "#f59e0b" // iniciado (amber)
        : "#e5e7eb"; // sin iniciar (gray)

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                {/* track */}
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
                {/* progress */}
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ - dash}
                    strokeLinecap="round" style={{ transition: "all 0.5s ease-out" }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-slate-800">{Math.round(pct)}%</span>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// Componente: Historial Diaria Timeline
// ──────────────────────────────────────────────
const HistoryTimeline = ({ historial }) => {
    if (!historial || historial.length === 0) {
        return (
            <div className="text-center py-4 text-slate-400 text-sm border-t border-slate-100 mt-4">
                No hay historial de asistencias aún.
            </div>
        );
    }

    return (
        <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Historial de los últimos 5 días
            </h4>
            <div className="space-y-3">
                {historial.map((reg) => (
                    <div key={reg.id_asistencia_diaria} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-sm">
                        <div className="w-10 h-10 shrink-0 bg-white border border-slate-200 rounded-full flex flex-col items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-slate-700">{new Date(reg.fecha_marcaje).getDate()}</span>
                            <span className="text-[10px] text-slate-400 leading-none uppercase">{new Date(reg.fecha_marcaje).toLocaleString('es-ES', { month: 'short' })}</span>
                        </div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <p className="text-slate-600 font-medium">Entrada: {formatTime(reg.hora_entrada)}</p>
                                <p className="text-slate-600 font-medium">Salida: {formatTime(reg.hora_salida)}</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md">
                                    +{formatHoras(reg.horas_ganadas || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function CampoPage() {
    const { tipo, id } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState("social"); // "social" | "institucional"
    const [asignaciones, setAsignaciones] = useState([]);
    const [registrosInst, setRegistrosInst] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    const token = sessionStorage.getItem("campo_token");
    const usuario = JSON.parse(sessionStorage.getItem("campo_usuario") || "{}");
    const isColegiado = usuario?.tipo === "COLEGIADO";

    useEffect(() => {
        if (!token) {
            navigate("/acceso");
            return;
        }
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        
        try {
            // Fetch Sociales
            const resSoc = await fetch(`/api/ac-sociales/ac-social/usuario/${usuario.tipo.toLowerCase()}/${usuario.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataSoc = await resSoc.json();
            if (resSoc.ok) setAsignaciones(dataSoc);

            // Fetch Institucionales (Solo colegiados)
            if (isColegiado) {
                const resInst = await fetch(`/api/ac-institucionales/ac-ins/usuario/${usuario.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataInst = await resInst.json();
                if (resInst.ok) setRegistrosInst(dataInst);
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const handleMarcaje = async (id_asignacion, tipo_marcaje, latRequerida, lngRequerida, radio) => {
        setActionLoading(true);
        setError("");
        setMsg("");

        const geoPromise = new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("Tu navegador no soporta GPS");
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }),
                () => reject("Activa el GPS de tu celular para poder marcar"),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });

        try {
            const posUser = await geoPromise;
            
            // Calculo de distancia básico (fórmula Haversine simplificada para distancias cortas)
            const R = 6371e3; // Radio de la tierra en metros
            const dLat = (posUser.latitud - latRequerida) * Math.PI / 180;
            const dLon = (posUser.longitud - lngRequerida) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(latRequerida * Math.PI / 180) * Math.cos(posUser.latitud * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distancia = R * c;

            if (distancia > radio) {
                setError(`Estás a ${Math.round(distancia)}m. Debes estar a menos de ${radio}m de la actividad.`);
                setActionLoading(false);
                return;
            }

            const res = await fetch(`/api/ac-sociales/ac-social/asignacion/${id_asignacion}/${tipo_marcaje}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    latitud: posUser.latitud,
                    longitud: posUser.longitud
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al marcar");

            setMsg(`¡Marcaste ${tipo_marcaje} con éxito!`);
            fetchData(); // Refrescar los datos
        } catch (err) {
            setError(typeof err === "string" ? err : err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const logout = () => {
        sessionStorage.removeItem("campo_token");
        sessionStorage.removeItem("campo_usuario");
        navigate("/acceso");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Cargando panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
            {/* Header Glassmorphism */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            CDPLP | Campo
                        </h1>
                        <p className="text-sm font-medium text-slate-500 capitalize">
                            {usuario.nombre} {usuario.apellido} • {usuario.tipo}
                        </p>
                    </div>
                    <button onClick={logout} className="p-2 text-rose-500 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
                
                {/* Alertas */}
                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="mt-0.5 text-rose-500 shrink-0">⚠️</div>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
                {msg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                        <p className="text-sm font-medium">{msg}</p>
                    </div>
                )}

                {/* Tabs */}
                {isColegiado && (
                    <div className="flex p-1 bg-slate-200/50 rounded-xl">
                        <button
                            onClick={() => setTab("social")}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === "social" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Users size={18} />
                            Act. Sociales
                        </button>
                        <button
                            onClick={() => setTab("institucional")}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === "institucional" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Building size={18} />
                            Act. Institucionales
                        </button>
                    </div>
                )}

                {/* Contenido: Actividades Sociales */}
                {tab === "social" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Tus Asignaciones de Campo</h2>
                        {asignaciones.length === 0 ? (
                            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <Users className="mx-auto text-slate-300 mb-3" size={48} />
                                <p className="text-slate-500 font-medium">No tienes actividades sociales asignadas en este momento.</p>
                            </div>
                        ) : (
                            asignaciones.map((asig) => {
                                const act = asig.actividades_sociales;
                                const historial = asig.asistencia_social_diaria || [];
                                
                                // Lógica del día actual
                                const hoyStr = new Date().toISOString().split('T')[0];
                                const ultimoRegistro = historial.length > 0 ? historial[0] : null;
                                const ultimoEsHoy = ultimoRegistro && new Date(ultimoRegistro.fecha_marcaje).toISOString().split('T')[0] === hoyStr;

                                const enCurso = ultimoEsHoy && ultimoRegistro.hora_entrada && !ultimoRegistro.hora_salida;
                                const finalizadoHoy = ultimoEsHoy && ultimoRegistro.hora_salida;
                                
                                // Metas
                                const horasTotal = asig.total_horas || 0;
                                const horasMeta = asig.horas_meta || 60; // fallback a 60 si no hay meta
                                const metaAlcanzada = horasTotal >= horasMeta;

                                return (
                                    <div key={asig.id_asignacion} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                        {enCurso && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>}
                                        {finalizadoHoy && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                                        
                                        <div className="flex flex-col sm:flex-row gap-6 mb-4">
                                            {/* Datos Izquierda */}
                                            <div className="flex-1">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-2">
                                                    {act.tipo}
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800 leading-tight">{act.nombre}</h3>
                                                <div className="mt-2 flex items-start gap-2 text-slate-500 text-sm">
                                                    <MapPin size={16} className="mt-0.5 shrink-0" />
                                                    <span>{act.ubicacion}</span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-slate-500 text-sm">
                                                    <Clock size={16} className="shrink-0" />
                                                    <span>{formatDate(act.fecha_inicio)} - {formatDate(act.fecha_fin)}</span>
                                                </div>
                                            </div>

                                            {/* Progreso Derecha */}
                                            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100 shrink-0">
                                                <CircularProgress value={horasTotal} max={horasMeta} size={90} stroke={8} />
                                                <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">
                                                    {Math.round(horasTotal * 10) / 10} / {horasMeta} hrs
                                                </p>
                                            </div>
                                        </div>

                                        {/* Acciones de Marcaje (Solo aplican si no ha completado el 100% o si deseas permitir horas extras) */}
                                        <div className="mt-4">
                                            {metaAlcanzada ? (
                                                <div className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl border border-emerald-200">
                                                    <CheckCircle size={18} />
                                                    ¡Meta de horas alcanzada!
                                                </div>
                                            ) : !ultimoEsHoy || (!enCurso && !finalizadoHoy) ? (
                                                <button
                                                    disabled={actionLoading}
                                                    onClick={() => handleMarcaje(asig.id_asignacion, 'entrada', act.latitud, act.longitud, act.radio_metros)}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-70"
                                                >
                                                    <Navigation size={18} />
                                                    Marcar Entrada Hoy (GPS)
                                                </button>
                                            ) : enCurso ? (
                                                <button
                                                    disabled={actionLoading}
                                                    onClick={() => handleMarcaje(asig.id_asignacion, 'salida', act.latitud, act.longitud, act.radio_metros)}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-70"
                                                >
                                                    <LogOut size={18} />
                                                    Finalizar Turno de Hoy
                                                </button>
                                            ) : (
                                                <div className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-500 font-semibold rounded-xl border border-slate-200">
                                                    <CheckCircle size={18} />
                                                    Ya marcaste tu salida de hoy
                                                </div>
                                            )}
                                        </div>

                                        {/* Componente Historial de los ultimos 5 dias */}
                                        <HistoryTimeline historial={historial} />

                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Contenido: Actividades Institucionales */}
                {tab === "institucional" && isColegiado && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Historial de Participación Institucional</h2>
                        <p className="text-sm text-slate-500 mb-4">Registro visual de los eventos, asambleas y capacitaciones a los que fuiste registrado.</p>
                        
                        {registrosInst.length === 0 ? (
                            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <Building className="mx-auto text-slate-300 mb-3" size={48} />
                                <p className="text-slate-500 font-medium">No tienes registros en actividades institucionales aún.</p>
                            </div>
                        ) : (
                            registrosInst.map((reg) => {
                                const actInst = reg.actividades_institucionales;
                                return (
                                    <div key={reg.id_registro} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                            <Building className="text-purple-600" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-base font-bold text-slate-800">{actInst.nombre}</h3>
                                            <p className="text-sm text-slate-500 mt-0.5">{actInst.tipo} • {formatDate(actInst.fecha_programada)}</p>
                                            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                                                {reg.estado_registro}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}
