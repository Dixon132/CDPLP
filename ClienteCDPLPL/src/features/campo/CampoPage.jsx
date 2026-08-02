import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Clock, LogOut, CheckCircle, Navigation, Building, Users, Activity,
    AlertTriangle, Loader2, ChevronRight,
} from "lucide-react";

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

const HOY_LARGO = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

// Fondo de líneas punteadas — el mismo recurso que Home/About/Acceso.
const GridLines = () => (
    <div className="absolute inset-0 pointer-events-none z-0 flex justify-between px-4 md:px-20">
        <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
        <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
        <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
        <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
        <div className="h-full border-l border-dashed border-gray-300 w-1/5 border-r"></div>
    </div>
);

// ──────────────────────────────────────────────
// Barra de progreso — bloque con borde duro, sin gradientes.
// ──────────────────────────────────────────────
const ProgressBar = ({ pct, horasTotal, horasMeta }) => (
    <div className="shrink-0 border border-black p-3 bg-gray-50 sm:w-36">
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Avance</span>
            <span className="text-xs font-black text-black">{pct}%</span>
        </div>
        <div className="h-2.5 w-full bg-white border border-black overflow-hidden">
            <motion.div
                className={`h-full ${pct >= 100 ? "bg-emerald-600" : "bg-blue-800"}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            />
        </div>
        <p className="text-[9px] font-bold text-gray-500 mt-1.5 uppercase tracking-wide">
            {Math.round(horasTotal * 10) / 10} / {horasMeta} hrs
        </p>
    </div>
);

// ──────────────────────────────────────────────
// Componente: Historial Diaria Timeline
// ──────────────────────────────────────────────
const HistoryTimeline = ({ historial }) => {
    if (!historial || historial.length === 0) {
        return (
            <div className="text-center py-4 text-gray-400 text-xs font-bold uppercase tracking-widest border-t-2 border-black border-dashed mt-5">
                Sin historial aún
            </div>
        );
    }

    return (
        <div className="mt-5 pt-4 border-t-2 border-black border-dashed">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Activity size={12} />
                Últimos días
            </h4>
            <div className="space-y-2">
                {historial.slice(0, 5).map((reg) => (
                    <div key={reg.id_asistencia_diaria} className="flex items-center gap-3 border border-gray-300 p-2.5 text-sm">
                        <div className="w-10 h-10 shrink-0 border border-black flex flex-col items-center justify-center">
                            <span className="text-xs font-black text-black">{new Date(reg.fecha_marcaje).getDate()}</span>
                            <span className="text-[8px] text-gray-400 leading-none uppercase">{new Date(reg.fecha_marcaje).toLocaleString('es-ES', { month: 'short' })}</span>
                        </div>
                        <div className="flex-1 flex justify-between items-center min-w-0">
                            <p className="text-gray-600 text-xs font-medium">{formatTime(reg.hora_entrada)} — {formatTime(reg.hora_salida)}</p>
                            <span className="text-xs font-black text-emerald-700 shrink-0">
                                +{formatHoras(reg.horas_ganadas || 0)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function CampoPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState("social"); // "social" | "institucional"
    const [asignaciones, setAsignaciones] = useState([]);
    const [registrosInst, setRegistrosInst] = useState([]);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // id_asignacion en curso, o null
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setActionLoading(id_asignacion);
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
                setActionLoading(null);
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
            setActionLoading(null);
        }
    };

    const logout = () => {
        sessionStorage.removeItem("campo_token");
        sessionStorage.removeItem("campo_usuario");
        navigate("/acceso");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-2 border-black flex items-center justify-center animate-pulse">
                        <span className="font-black text-lg">CD</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cargando panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-white text-black font-sans pb-16">
            <GridLines />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-black">
                <div className="h-1 w-full bg-gradient-to-r from-blue-800 via-amber-500 to-blue-800" />
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 shrink-0 border-2 border-black bg-white flex items-center justify-center font-black text-lg">
                            {usuario.nombre?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black uppercase tracking-tight truncate">
                                {usuario.nombre} {usuario.apellido}
                            </h1>
                            <div className="inline-flex items-center gap-1 border border-black px-1.5 py-[1px] mt-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 shrink-0" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
                                    {isColegiado ? "Colegiado" : "Pasante"} · Campo
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2.5 border-2 border-black text-black hover:bg-black hover:text-white active:scale-95 transition-colors shrink-0"
                        title="Cerrar sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="relative z-10 max-w-4xl mx-auto px-4 mt-5 space-y-5">

                {/* Fecha de hoy */}
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 capitalize">
                    {HOY_LARGO}
                </p>

                {/* Alertas */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative bg-white border-2 border-black pl-5 pr-4 py-3.5 flex items-start gap-3 overflow-hidden"
                        >
                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600" />
                            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-sm font-semibold">{error}</p>
                        </motion.div>
                    )}
                    {msg && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative bg-white border-2 border-black pl-5 pr-4 py-3.5 flex items-start gap-3 overflow-hidden"
                        >
                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600" />
                            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm font-semibold">{msg}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                {isColegiado && (
                    <div className="grid grid-cols-2 border-2 border-black">
                        <button
                            onClick={() => setTab("social")}
                            className={`py-3 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-r-2 border-black transition-colors ${tab === "social" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                        >
                            <Users size={15} /> Académicas
                        </button>
                        <button
                            onClick={() => setTab("institucional")}
                            className={`py-3 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${tab === "institucional" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                        >
                            <Building size={15} /> Institucionales
                        </button>
                    </div>
                )}

                {/* Contenido: Actividades Académicas */}
                {tab === "social" && (
                    <div className="space-y-4">
                        {asignaciones.length === 0 ? (
                            <div className="p-10 text-center border-2 border-dashed border-gray-300">
                                <div className="w-14 h-14 mx-auto mb-3 border-2 border-black flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">No tienes actividades académicas asignadas</p>
                            </div>
                        ) : (
                            asignaciones.map((asig, idx) => {
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
                                const pct = Math.min(100, Math.round((horasTotal / (horasMeta || 1)) * 100));
                                const marcando = actionLoading === asig.id_asignacion;
                                const acentoColor = enCurso ? "border-amber-500" : finalizadoHoy ? "border-emerald-600" : "border-blue-800";

                                return (
                                    <motion.div
                                        key={asig.id_asignacion}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, delay: idx * 0.05 }}
                                        className="relative bg-white border-2 border-black p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(30,58,138,0.9)]"
                                    >
                                        <div className={`absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 ${acentoColor} -translate-x-0.5 -translate-y-0.5`} />

                                        <div className="flex flex-col sm:flex-row gap-5">
                                            {/* Datos Izquierda */}
                                            <div className="flex-1 min-w-0">
                                                <div className="inline-flex items-center border border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-2.5">
                                                    {act.tipo}
                                                </div>
                                                <h3 className="text-lg font-black uppercase tracking-tight leading-tight">{act.nombre}</h3>
                                                <div className="w-10 h-[3px] bg-amber-500 my-2.5" />
                                                <div className="space-y-1.5 text-sm text-gray-700 font-medium">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                                                        <span className="truncate">{act.ubicacion}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="shrink-0 text-gray-400" />
                                                        <span>{formatDate(act.fecha_inicio)} - {formatDate(act.fecha_fin)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <ProgressBar pct={pct} horasTotal={horasTotal} horasMeta={horasMeta} />
                                        </div>

                                        {/* Acciones de Marcaje */}
                                        <div className="mt-5">
                                            {metaAlcanzada ? (
                                                <div className="w-full flex items-center justify-center gap-2 py-3 border-2 border-emerald-600 text-emerald-700 font-bold uppercase tracking-widest text-xs">
                                                    <CheckCircle size={16} />
                                                    Meta de horas alcanzada
                                                </div>
                                            ) : !ultimoEsHoy || (!enCurso && !finalizadoHoy) ? (
                                                <button
                                                    disabled={marcando}
                                                    onClick={() => handleMarcaje(asig.id_asignacion, 'entrada', act.latitud, act.longitud, act.radio_metros)}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-800 hover:bg-white hover:text-blue-800 text-white font-bold uppercase tracking-widest text-xs border-2 border-blue-800 transition-colors disabled:opacity-60"
                                                >
                                                    {marcando ? <Loader2 size={17} className="animate-spin" /> : <Navigation size={17} />}
                                                    {marcando ? "Ubicando..." : "Marcar Entrada Hoy (GPS)"}
                                                </button>
                                            ) : enCurso ? (
                                                <button
                                                    disabled={marcando}
                                                    onClick={() => handleMarcaje(asig.id_asignacion, 'salida', act.latitud, act.longitud, act.radio_metros)}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-white hover:text-amber-600 text-black font-bold uppercase tracking-widest text-xs border-2 border-amber-500 transition-colors disabled:opacity-60"
                                                >
                                                    {marcando ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
                                                    {marcando ? "Ubicando..." : "Finalizar Turno de Hoy"}
                                                </button>
                                            ) : (
                                                <div className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-gray-300 text-gray-500 font-bold uppercase tracking-widest text-xs">
                                                    <CheckCircle size={16} />
                                                    Ya marcaste tu salida de hoy
                                                </div>
                                            )}
                                        </div>

                                        <HistoryTimeline historial={historial} />
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Contenido: Actividades Institucionales */}
                {tab === "institucional" && isColegiado && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 font-medium px-1">Registro de eventos, asambleas y capacitaciones a los que fuiste registrado.</p>

                        {registrosInst.length === 0 ? (
                            <div className="p-10 text-center border-2 border-dashed border-gray-300">
                                <div className="w-14 h-14 mx-auto mb-3 border-2 border-black flex items-center justify-center">
                                    <Building size={24} />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">No tienes registros institucionales aún</p>
                            </div>
                        ) : (
                            registrosInst.map((reg, idx) => {
                                const actInst = reg.actividades_institucionales;
                                return (
                                    <motion.div
                                        key={reg.id_registro}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                                        className="bg-white border-2 border-black p-4 flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 border-2 border-black flex items-center justify-center shrink-0">
                                            <Building size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black uppercase tracking-tight truncate">{actInst.nombre}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">{actInst.tipo} · {formatDate(actInst.fecha_programada)}</p>
                                            <div className="mt-1.5 inline-flex items-center border border-black px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-widest">
                                                {reg.estado_registro}
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-300 shrink-0" size={18} />
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}
