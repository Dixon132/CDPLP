import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Calendar, MapPin, Target, FileText, Users, UserPlus, Eye, EyeOff,
    Mail, Phone, Briefcase, GraduationCap, Building2, ArrowLeft,
    X, Clock, TrendingUp, Trophy, CheckCircle2, Edit3, PartyPopper, Key
} from "lucide-react";
import Modal from "../../../../../components/Modal";
import Header from "../../../components/Header";
import AsignarColegiados from "./AsignarColegiados";
import Alerts from "../../../components/Alerts";
import AsignarPasantes from "./AsignarPasante";
import PinDisplay from "../../../../../components/PinDisplay";
import { getActividadSocialById, updateMetaAsignacion } from "../../../services/ac-sociales";

function formatTime(isoDate) {
    if (!isoDate) return "—";
    return new Date(isoDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatHoras(horas) {
    if (horas === null || horas === undefined) return "—";
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}m`;
}

function BarraProgreso({ valor, meta }) {
    if (!meta) return <span className="text-xs text-slate-400">Sin meta</span>;
    const pct = Math.min(100, Math.round((valor / meta) * 100));
    const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600 min-w-[36px]">{pct}%</span>
        </div>
    );
}

export const VerDetallesActividad = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [modalAsignarColegiados, setModalAsignarColegiados] = useState(false);
    const [modalAsignarPasantes, setModalAsignarPasantes] = useState(false);
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");
    const [modalMeta, setModalMeta] = useState(null); // { id_asignacion, horas_meta_actual }
    const [metaInput, setMetaInput] = useState("");
    const [savingMeta, setSavingMeta] = useState(false);

    // Vía axios: lleva el token de sesión e informa el fallo en vez de guardar
    // el cuerpo del error como si fueran datos.
    const getData = () => {
        getActividadSocialById(id)
            .then((data) => { setData(data); setError(null); })
            .catch((err) => {
                console.error(err);
                setError(err?.response?.status === 401
                    ? "Tu sesión no tiene acceso a esta actividad."
                    : "Error al cargar datos");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { getData(); }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
    if (error) return (
        <div className="flex items-center justify-center min-h-full">
            <p className="text-red-500 text-lg">{error}</p>
        </div>
    );

    if (!data) return null;

    const { nombre, descripcion, ubicacion, motivo, fecha_inicio, estado, tipo, convenio } = data;

    const separador = () => {
        const lista = data?.colegiados_asignados_social || [];
        return {
            colegiados_asignados_social: lista.filter(i => i.id_colegiado != null && (mostrarInactivos ? i.estado === "INACTIVO" : i.estado !== "INACTIVO")),
            pasantes_asignados_social: lista.filter(i => i.id_pasante != null && (mostrarInactivos ? i.estado === "INACTIVO" : i.estado !== "INACTIVO")),
        };
    };
    const { colegiados_asignados_social, pasantes_asignados_social } = separador();
    const todos = [...colegiados_asignados_social, ...pasantes_asignados_social];

    // ── Estadísticas ──────────────────────────────────────────────────────────
    const totalHorasEquipo = todos.reduce((acc, i) => acc + (i.total_horas || 0), 0);
    const promedio = todos.length > 0 ? totalHorasEquipo / todos.length : 0;
    const conEntrada = todos.filter(i => i.hora_entrada).length;
    const cumplieronMeta = todos.filter(i => i.horas_meta && i.total_horas >= i.horas_meta).length;
    const ranking = [...todos]
        .filter(i => i.total_horas)
        .sort((a, b) => (b.total_horas || 0) - (a.total_horas || 0))
        .slice(0, 3)
        .map(i => ({ nombre: `${(i.colegiados || i.pasantes)?.nombre} ${(i.colegiados || i.pasantes)?.apellido}`, horas: i.total_horas }));

    const formatDate = (date) => new Date(date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    const getEstadoColor = (e) => {
        const colors = { ACTIVO: "bg-green-100 text-green-700", "EN PROGRESO": "bg-blue-100 text-blue-700", FINALIZADO: "bg-gray-100 text-gray-700", PENDIENTE: "bg-yellow-100 text-yellow-700" };
        return colors[e] || "bg-gray-100 text-gray-700";
    };
    const handleSuccess = (msg = "Operación realizada con éxito") => { setAlertType("success"); setAlertMessage(msg); setAlert(true); setTimeout(() => setAlert(false), 3000); };
    const handleError = (msg = "Ocurrió un error.") => { setAlertType("error"); setAlertMessage(msg); setAlert(true); setTimeout(() => setAlert(false), 3000); };

    const saveMeta = async () => {
        if (!modalMeta || isNaN(Number(metaInput))) return;
        setSavingMeta(true);
        try {
            await updateMetaAsignacion(modalMeta.id_asignacion, Number(metaInput));
            handleSuccess("Meta actualizada correctamente");
            setModalMeta(null);
            getData();
        } catch {
            handleError("Error al guardar la meta");
        } finally {
            setSavingMeta(false);
        }
    };

    const AsignadoCard = ({ item, tipo }) => {
        const persona = item.colegiados || item.pasantes;
        const colors = tipo === "colegiado"
            ? { bg: "bg-white", border: "border-slate-200", text: "text-slate-600", icon: GraduationCap, avatarBg: "bg-slate-800" }
            : { bg: "bg-white", border: "border-slate-200", text: "text-slate-600", icon: Building2, avatarBg: "bg-slate-700" };
        const InfoIcon = colors.icon;

        return (
            <div className={`p-4 ${colors.bg} rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 ${colors.avatarBg} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                            {persona?.nombre?.charAt(0) || "?"}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-sm">{persona?.nombre} {persona?.apellido}</p>
                            <p className="text-xs text-slate-500">CI: {persona?.carnet_identidad}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setModalMeta({ id_asignacion: item.id_asignacion, horas_meta_actual: item.horas_meta }); setMetaInput(item.horas_meta ?? ""); }}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors`}
                        title="Editar meta de horas"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Info de contacto */}
                <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5"><InfoIcon className={`w-3.5 h-3.5 ${colors.text}`} /><span>{tipo === "colegiado" ? (item.colegiados?.especialidades || "N/A") : (item.pasantes?.institucion || "N/A")}</span></div>
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{persona?.correo || "N/A"}</span></div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-slate-400 text-xs"><Key className="w-3.5 h-3.5" /></span>
                        <PinDisplay pin={persona?.pin_acceso} />
                    </div>
                </div>

                {/* Datos de horas */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Entrada</span>
                        <span className="font-medium text-slate-700">{formatTime(item.hora_entrada)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Salida</span>
                        <span className="font-medium text-slate-700">{formatTime(item.hora_salida)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total</span>
                        <span className={`font-semibold ${item.total_horas ? "text-green-600" : "text-slate-400"}`}>{formatHoras(item.total_horas)}</span>
                    </div>
                    {item.horas_meta && (
                        <div className="pt-1">
                            <BarraProgreso valor={item.total_horas || 0} meta={item.horas_meta} />
                            <p className="text-xs text-slate-400 mt-0.5">Meta: {formatHoras(item.horas_meta)}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate(`/dashboard/actividades_sociales/perfil/${item.id_asignacion}`)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors`}
                >
                    <Eye className="w-3.5 h-3.5" /> Ver Perfil Completo
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-full bg-slate-50/50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Header
                    title={nombre}
                    icon={<PartyPopper className="w-8 h-8" />}
                    showSearch={false}
                    stats={todos.length > 0 ? [
                        { label: "Horas Totales", value: formatHoras(totalHorasEquipo), color: "blue" },
                        { label: "Promedio / persona", value: formatHoras(promedio), color: "blue" },
                        { label: "Con Entrada", value: `${conEntrada} / ${todos.length}`, color: "green" },
                        { label: "Cumplieron Meta", value: `${cumplieronMeta} / ${todos.length}`, color: "amber" }
                    ] : []}
                    buttons={[
                        {
                            label: mostrarInactivos ? "Ver Activos" : "Ver Inactivos",
                            icon: mostrarInactivos ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
                            onClick: () => setMostrarInactivos(!mostrarInactivos),
                            color: mostrarInactivos ? "emerald" : "rose"
                        },
                        {
                            label: "Volver",
                            icon: <ArrowLeft className="w-4 h-4" />,
                            onClick: () => navigate(-1),
                            color: "blue"
                        }
                    ]}
                />

                <div className="flex items-center gap-3 px-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${getEstadoColor(estado)}`}>{estado}</span>
                    <span className="px-4 py-1.5 rounded-full text-sm font-bold shadow-sm bg-blue-100 text-blue-700">{tipo}</span>
                </div>

                {todos.length > 0 && ranking.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-700 mb-2">🏆 Top por horas</p>
                        <div className="flex flex-wrap gap-3">
                            {ranking.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                                    <span className="text-sm font-medium text-slate-700">{r.nombre}</span>
                                    <span className="text-xs text-slate-600 font-semibold">{formatHoras(r.horas)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info General */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-500" />Información General</h2>
                        <div className="space-y-3">
                            <div><p className="text-sm text-slate-500 mb-1">Descripción</p><p className="text-slate-700 text-sm">{descripcion || "Sin descripción"}</p></div>
                            <div className="flex items-start gap-2"><MapPin className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Ubicación</p><p className="text-slate-700 text-sm">{ubicacion}</p></div></div>
                            <div className="flex items-start gap-2"><Target className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Motivo</p><p className="text-slate-700 text-sm">{motivo}</p></div></div>
                            {convenio && <div className="flex items-start gap-2"><Building2 className="w-5 h-5 text-slate-400 mt-0.5" /><div><p className="text-sm text-slate-500">Convenio</p><p className="text-slate-700 text-sm">{convenio.nombre}</p></div></div>}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-500" />Fechas</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg"><p className="text-sm text-slate-500 font-medium mb-1">Fecha de Inicio</p><p className="text-lg text-slate-800 font-medium">{formatDate(fecha_inicio)}</p></div>
                        </div>
                    </div>
                </div>

                {/* Colegiados Asignados */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-slate-500" />Voluntariado (Colegiados Asignados: {colegiados_asignados_social.length})</h2>
                        <button onClick={() => setModalAsignarColegiados(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-medium text-sm rounded-lg hover:bg-slate-700 transition">
                            <UserPlus className="w-4 h-4" /> Asignar
                        </button>
                    </div>
                    {colegiados_asignados_social.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {colegiados_asignados_social.map((item, i) => <AsignadoCard key={i} item={item} tipo="colegiado" />)}
                        </div>
                    ) : (
                        <div className="text-center py-12"><Users className="w-16 h-16 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay colegiados asignados</p></div>
                    )}
                </div>

                {/* Pasantes Asignados */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-slate-500" />Práctica Académica (Pasantes Asignados: {pasantes_asignados_social.length})</h2>
                        <button onClick={() => setModalAsignarPasantes(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-medium text-sm rounded-lg hover:bg-slate-700 transition">
                            <UserPlus className="w-4 h-4" /> Asignar
                        </button>
                    </div>
                    {pasantes_asignados_social.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pasantes_asignados_social.map((item, i) => <AsignadoCard key={i} item={item} tipo="pasante" />)}
                        </div>
                    ) : (
                        <div className="text-center py-12"><Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay pasantes asignados</p></div>
                    )}
                </div>
            </div>

            {/* Modales */}
            <Modal isOpen={modalAsignarColegiados} title="Asignar a Voluntariado (Colegiados)" onClose={() => setModalAsignarColegiados(false)}>
                <AsignarColegiados id={id} asignados={colegiados_asignados_social} onSuccess={() => { setModalAsignarColegiados(false); handleSuccess("Colegiado asignado correctamente"); getData(); }} />
            </Modal>

            {modalAsignarPasantes && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-800">Asignar a Práctica Académica (Pasantes)</h3>
                            <button onClick={() => setModalAsignarPasantes(false)} className="p-2 hover:bg-slate-100 rounded-lg transition"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6">
                            <AsignarPasantes id={id} asignados={pasantes_asignados_social} onSuccess={() => { setModalAsignarPasantes(false); handleSuccess("Pasante asignado correctamente"); getData(); }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal editar Meta */}
            {modalMeta && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600" />Meta de horas</h3>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={metaInput}
                            onChange={(e) => setMetaInput(e.target.value)}
                            placeholder="Ej: 8"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-lg text-center mb-4 focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setModalMeta(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                            <button onClick={saveMeta} disabled={savingMeta} className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                                {savingMeta ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Alerts type={alertType} message={alertMessage} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};

function StatCard({ icon, label, value, color }) {
    const colors = {
        blue: "from-blue-50 to-blue-100 text-blue-700 border-blue-200",
        green: "from-green-50 to-green-100 text-green-700 border-green-200",
        amber: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 border`}>
            <div className="flex items-center gap-2 mb-1 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
            <p className="text-xl font-bold">{value}</p>
        </div>
    );
}

