import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Mail,
    Phone,
    GraduationCap,
    Building2,
    BadgeCheck,
    Clock,
    CalendarDays,
    TrendingUp,
    Award,
    ClipboardList,
    UserCircle2,
    MapPin,
    Target,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Fingerprint,
    Eye,
    EyeOff,
    KeyRound,
} from "lucide-react";
import Alerts from "../../../components/Alerts";
import PinDisplay from "../../../../../components/PinDisplay";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";

// ──────────────────────────────────────────────
// Circular progress ring
// ──────────────────────────────────────────────
const CircularProgress = ({ value, max, size = 160, stroke = 12 }) => {
    const pct = Math.min(100, (value / (max || 1)) * 100);
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    const color =
        pct >= 100
            ? "#10b981"   // completado
            : pct >= 60
                ? "#3b82f6"   // en camino
                : pct >= 30
                    ? "#f59e0b"   // iniciado
                    : "#e5e7eb";  // sin iniciar

    return (
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            {/* track */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={stroke}
            />
            {/* progress */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease" }}
            />
        </svg>
    );
};

// ──────────────────────────────────────────────
// Badge según porcentaje
// ──────────────────────────────────────────────
const ProgressBadge = ({ pct }) => {
    if (pct >= 100)
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Award className="w-3 h-3" /> Completado
            </span>
        );
    if (pct >= 60)
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                <TrendingUp className="w-3 h-3" /> En camino
            </span>
        );
    if (pct >= 30)
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                <AlertCircle className="w-3 h-3" /> Iniciado
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            <Clock className="w-3 h-3" /> Sin iniciar
        </span>
    );
};

// ──────────────────────────────────────────────
// Icono de asistencia
// ──────────────────────────────────────────────
const AsistenciaIcon = ({ estado }) => {
    if (estado === "PRESENTE")
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
    if (estado === "AUSENTE")
        return <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
    return <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const fmt = (d) =>
    new Date(d).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const getEstadoColor = (estado) =>
({
    ACTIVO: "bg-emerald-50 text-emerald-600 border-emerald-100",
    EN_PROGRESO: "bg-blue-50 text-blue-600 border-blue-100",
    INACTIVO: "bg-slate-50 text-slate-500 border-slate-200",
    PENDIENTE: "bg-amber-50 text-amber-600 border-amber-100",
    FINALIZADO: "bg-rose-50 text-rose-500 border-rose-100",
}[estado] ?? "bg-slate-50 text-slate-500 border-slate-200");

// ══════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════
export const Perfil = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPin, setShowPin] = useState(false);

    // Alerts
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const showAlert = (type, msg) => {
        setAlertType(type);
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const handleToggleEstado = async (nuevoEstado) => {
        try {
            const res = await fetch(`/api/ac-sociales/ac-social/asignacion/${id}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (!res.ok) throw new Error("Error al cambiar el estado de la participación");
            showAlert("success", `Participación ${nuevoEstado === 'ACTIVO' ? 'activada' : 'desactivada'} correctamente.`);
            setConfirmDeactivate(false);
            // Recargar datos en lugar de volver atrás para que vea el cambio
            setTimeout(() => {
                fetchData();
            }, 1500);
        } catch (err) {
            showAlert("error", err.message);
            setConfirmDeactivate(false);
        }
    };

    const handleResetHoras = async () => {
        try {
            const res = await fetch(`/api/ac-sociales/ac-social/asignacion/${id}/reset-horas`, {
                method: "PATCH"
            });
            if (!res.ok) throw new Error("Error al reiniciar las horas");
            showAlert("success", "Las horas han sido reiniciadas a 0.");
            setConfirmReset(false);
            setTimeout(() => {
                fetchData();
            }, 1500);
        } catch (err) {
            showAlert("error", err.message);
            setConfirmReset(false);
        }
    };

    // ── fetch principal ──────────────────────
    const fetchData = () => {
        setLoading(true);
        fetch(`/api/ac-sociales/ac-social/asignacion/${id}`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                
                const asistenciaReal = [];
                if (d.asistencia_social_diaria && d.asistencia_social_diaria.length > 0) {
                    d.asistencia_social_diaria.forEach(registro => {
                        asistenciaReal.push({
                            id: registro.id_asistencia,
                            fecha: registro.fecha_marcaje,
                            horas: Number((registro.horas_ganadas || 0).toFixed(1)),
                            estado: registro.hora_salida ? "PRESENTE" : "EN CURSO",
                            observacion: registro.hora_salida 
                                ? `Salida marcada: ${new Date(registro.hora_salida).toLocaleTimeString()}` 
                                : "En progreso (sin salida)"
                        });
                    });
                }
                
                setAsistencias(asistenciaReal);
                setLoading(false);
            })
            .catch(() => {
                setError("No se pudo cargar el perfil del asignado.");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
                <p className="text-rose-500 text-lg bg-white p-6 rounded-2xl shadow-sm border border-rose-100">{error}</p>
            </div>
        );

    const isColegiado = data?.id_colegiado != null;
    const persona = isColegiado ? data?.colegiados : data?.pasantes;
    
    const actividad = {
        nombre: data?.actividades_sociales?.nombre,
        ubicacion: data?.actividades_sociales?.ubicacion,
        tipo: data?.actividades_sociales?.tipo,
        estado: data?.actividades_sociales?.estado,
        fecha_inicio: data?.actividades_sociales?.fecha_inicio,
        fecha_fin: data?.actividades_sociales?.fecha_fin,
        motivo: data?.actividades_sociales?.motivo,
    };
    
    const HORAS_META_REAL = data?.horas_meta || 60;

    const horasTotal = Number((data?.total_horas || 0).toFixed(1));
    const pct = Math.min(100, Math.round((horasTotal / HORAS_META_REAL) * 100));
    const presentes = asistencias.filter((a) => a.estado === "PRESENTE").length;
    const ausentes = asistencias.filter((a) => a.estado === "AUSENTE").length;
    const tardanzas = asistencias.filter((a) => a.estado === "TARDANZA").length;
    const promedioPorSesion =
        asistencias.length > 0
            ? Number((horasTotal / asistencias.filter((a) => a.horas > 0).length || 0).toFixed(1))
            : 0;

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ── TOP BUTTONS ── */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 w-fit hover:bg-slate-50"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Volver a la actividad
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setConfirmReset(true)}
                            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium transition-colors bg-amber-50 px-4 py-2 rounded-xl shadow-sm border border-amber-100 hover:bg-amber-100"
                        >
                            <Clock className="w-5 h-5" />
                            Reiniciar Horas
                        </button>
                        {data?.estado === "INACTIVO" ? (
                            <button
                                onClick={() => handleToggleEstado("ACTIVO")}
                                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors bg-emerald-50 px-4 py-2 rounded-xl shadow-sm border border-emerald-100 hover:bg-emerald-100"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Activar Participación
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmDeactivate(true)}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors bg-red-50 px-4 py-2 rounded-xl shadow-sm border border-red-100 hover:bg-red-100"
                            >
                                <XCircle className="w-5 h-5" />
                                Desactivar Participación
                            </button>
                        )}
                    </div>
                </div>

                {/* ══ HERO CARD ══════════════════════════════ */}
                <div className="relative bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden backdrop-blur-xl bg-white/80">
                    {/* top accent strip */}
                    <div className={`h-2 w-full ${isColegiado ? "bg-gradient-to-r from-teal-400 to-cyan-400" : "bg-gradient-to-r from-rose-400 to-pink-400"}`} />

                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-sm
                                ${isColegiado
                                    ? "bg-gradient-to-br from-teal-400 to-cyan-500"
                                    : "bg-gradient-to-br from-rose-400 to-pink-500"}`}
                            >
                                {persona?.nombre?.charAt(0) ?? "?"}
                            </div>
                            <span className={`absolute -bottom-2 -right-2 text-xs font-semibold px-2 py-0.5 rounded-full border shadow-sm
                                ${isColegiado
                                    ? "bg-teal-50 text-teal-600 border-teal-100"
                                    : "bg-rose-50 text-rose-500 border-rose-100"}`}
                            >
                                {isColegiado ? "Colegiado" : "Pasante"}
                            </span>
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-start gap-3">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {persona?.nombre} {persona?.apellido}
                                </h1>
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getEstadoColor(persona?.estado)}`}>
                                    {persona?.estado}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <Fingerprint className="w-4 h-4 text-slate-400" />
                                    <span className="font-mono font-medium text-slate-600">{persona?.carnet_identidad}</span>
                                </div>
                                {isColegiado ? (
                                    <div className="flex items-center gap-1.5">
                                        <GraduationCap className="w-4 h-4 text-teal-500" />
                                        <span className="text-slate-600">{persona?.especialidades ?? "Sin especialidad"}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-rose-400" />
                                        <span className="text-slate-600">{persona?.institucion ?? "Sin institución"}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-600">{persona?.correo ?? "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-600">{persona?.telefono ?? "N/A"}</span>
                                </div>
                                {persona?.pin_acceso && (
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-slate-400" />
                                        <PinDisplay pin={persona.pin_acceso} />
                                    </div>
                                )}
                            </div>

                            {/* Actividad */}
                            <div className="mt-2 p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                    <ClipboardList className="w-4 h-4 text-teal-500" />
                                    <span className="font-medium text-slate-700">{actividad.nombre}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {actividad.ubicacion}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <CalendarDays className="w-4 h-4 text-slate-400" />
                                    {fmt(actividad.fecha_inicio)} → {fmt(actividad.fecha_fin)}
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getEstadoColor(actividad.estado)}`}>
                                    {actividad.estado?.replace("_", " ")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ STATS ROW ══════════════════════════════ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Horas Totales", value: horasTotal, icon: <Clock className="w-5 h-5 text-teal-500" /> },
                        { label: "Sesiones", value: asistencias.length, icon: <CalendarDays className="w-5 h-5 text-blue-500" /> },
                        { label: "Prom. hrs/sesión", value: promedioPorSesion, icon: <TrendingUp className="w-5 h-5 text-violet-500" /> },
                        { label: "Avance", value: `${pct}%`, icon: <Target className="w-5 h-5 text-amber-500" /> },
                    ].map((s) => (
                        <div key={s.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">{s.icon}</div>
                            </div>
                            <p className="text-3xl font-extrabold text-slate-800">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* ══ HORAS: ANILLO + DETALLE ═══════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Anillo */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-700 self-start flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Progreso de Horas
                        </h2>

                        <div className="relative flex items-center justify-center">
                            <CircularProgress value={horasTotal} max={HORAS_META_REAL} size={180} stroke={14} />
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-extrabold text-slate-800">{horasTotal}</span>
                                <span className="text-sm text-slate-400">/ {HORAS_META_REAL} hrs</span>
                            </div>
                        </div>

                        <ProgressBadge pct={pct} />

                        <p className="text-sm text-slate-500 text-center">
                            {HORAS_META_REAL - horasTotal > 0
                                ? <>Faltan <strong className="text-slate-700">{HORAS_META_REAL - horasTotal} hrs</strong> para completar la meta.</>
                                : <><strong className="text-emerald-500">¡Meta alcanzada!</strong> Excelente desempeño.</>}
                        </p>
                    </div>

                    {/* Desglose */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col gap-5">
                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <UserCircle2 className="w-5 h-5 text-teal-500" />
                            Desglose de Asistencia
                        </h2>

                        {[
                            { label: "Presente", count: presentes, total: asistencias.length, color: "bg-emerald-400", light: "bg-emerald-50 text-emerald-600 border border-emerald-100" },
                            { label: "Tardanza", count: tardanzas, total: asistencias.length, color: "bg-amber-400", light: "bg-amber-50 text-amber-600 border border-amber-100" },
                            { label: "Ausente", count: ausentes, total: asistencias.length, color: "bg-rose-400", light: "bg-rose-50 text-rose-600 border border-rose-100" },
                        ].map((row) => (
                            <div key={row.label} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className={`font-semibold px-2 py-0.5 rounded-lg text-xs ${row.light}`}>{row.label}</span>
                                    <span className="text-slate-500 font-medium">{row.count}/{row.total}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${row.color} transition-all duration-700`}
                                        style={{ width: row.total ? `${(row.count / row.total) * 100}%` : "0%" }}
                                    />
                                </div>
                            </div>
                        ))}

                        {isColegiado && (
                            <div className="mt-4 p-4 bg-teal-50/50 rounded-2xl border border-teal-100 text-sm text-teal-700 flex items-start gap-3">
                                <BadgeCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-teal-500" />
                                <div className="flex flex-col gap-1">
                                    <span>Colegiado inscrito desde <strong>{fmt(persona?.fecha_inscripcion)}</strong>.</span>
                                    <span>Última renovación: <strong>{fmt(persona?.fecha_renovacion)}</strong>.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ TIMELINE DE ASISTENCIAS ═══════════════ */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm p-8">
                    <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-blue-500" />
                        Historial de Asistencias
                    </h2>

                    {asistencias.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Sin asistencias registradas aún.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* vertical line */}
                            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

                            <div className="space-y-4">
                                {asistencias.map((a, i) => (
                                    <div key={a.id ?? i} className="relative flex items-start gap-5 group">
                                        {/* dot + icon */}
                                        <div className="z-10 flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-teal-300 transition-colors shadow-sm">
                                            <AsistenciaIcon estado={a.estado} />
                                        </div>

                                        {/* card */}
                                        <div className="flex-1 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-700">{fmt(a.fecha)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border
                                                        ${a.estado === "PRESENTE" ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            : a.estado === "TARDANZA" ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                : "bg-rose-50 text-rose-500 border-rose-100"}`}
                                                    >
                                                        {a.estado}
                                                    </span>
                                                    {a.horas > 0 && (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">
                                                            <Clock className="w-3 h-3" /> {a.horas} hrs
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {a.observacion && (
                                                <p className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    "{a.observacion}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal de confirmación para desactivar */}
            <ConfirmDeleteModal
                isOpen={confirmDeactivate}
                title="¿Desactivar participación?"
                message="¿Estás seguro de que deseas desactivar la participación de esta persona en esta actividad social? Ya no acumulará más horas."
                confirmLabel="Desactivar"
                confirmColor="red"
                onClose={() => setConfirmDeactivate(false)}
                onConfirm={() => handleToggleEstado("INACTIVO")}
            />

            {/* Modal de confirmación para reiniciar horas */}
            <ConfirmDeleteModal
                isOpen={confirmReset}
                title="¿Reiniciar horas a cero?"
                message="¿Estás completamente seguro de que deseas reiniciar las horas acumuladas a 0? Esta acción es irreversible, aunque el historial de marcajes se mantendrá."
                confirmLabel="Sí, reiniciar"
                confirmColor="amber"
                onClose={() => setConfirmReset(false)}
                onConfirm={handleResetHoras}
            />

            {/* Alerts */}
            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />
        </div>
    );
};


