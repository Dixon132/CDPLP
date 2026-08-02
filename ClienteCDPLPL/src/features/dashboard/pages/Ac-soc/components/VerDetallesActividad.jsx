import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Calendar, MapPin, Target, FileText, Users, UserPlus, Eye, EyeOff,
    Mail, Briefcase, GraduationCap, Building2, ArrowLeft,
    X, Clock, Edit3, PartyPopper,
} from "lucide-react";
import Modal from "../../../../../components/Modal";
import Header from "../../../components/Header";
import ResponsiveTable from "../../../components/ResponsiveTable";
import AsignarColegiados from "./AsignarColegiados";
import Alerts from "../../../components/Alerts";
import AsignarPasantes from "./AsignarPasante";
import { getActividadSocialById, updateMetaAsignacion } from "../../../services/ac-sociales";
import { useSession } from "../../../../../context/SessionProvider";

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
        <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{pct}%</span>
        </div>
    );
}

export const VerDetallesActividad = () => {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("actividades_sociales");
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

    const columns = [
        {
            label: "Persona", key: "persona", render: (item) => {
                const persona = item.colegiados || item.pasantes;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-slate-800 shrink-0">
                            {persona?.nombre?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{persona?.nombre} {persona?.apellido}</p>
                            <p className="text-xs text-slate-500">CI: {persona?.carnet_identidad}</p>
                        </div>
                    </div>
                );
            }
        },
        {
            label: "Tipo", key: "tipo", render: (item) => {
                const esColegiado = item.id_colegiado != null;
                const Icono = esColegiado ? GraduationCap : Briefcase;
                return (
                    <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${esColegiado ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-orange-50 text-orange-600 border-orange-100"}`}>
                            <Icono className="w-3 h-3" /> {esColegiado ? "Colegiado" : "Pasante"}
                        </span>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">
                            {esColegiado ? (item.colegiados?.especialidades || "—") : (item.pasantes?.institucion || "—")}
                        </p>
                    </div>
                );
            }
        },
        {
            label: "Contacto", key: "correo", render: (item) => {
                const persona = item.colegiados || item.pasantes;
                return (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{persona?.correo || "N/A"}</span>
                    </div>
                );
            }
        },
        {
            label: "Horas", key: "horas", render: (item) => (
                <div className="space-y-1 text-xs min-w-[130px]">
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Entrada</span>
                        <span className="font-medium text-slate-700">{formatTime(item.hora_entrada)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Salida</span>
                        <span className="font-medium text-slate-700">{formatTime(item.hora_salida)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Total</span>
                        <span className={`font-semibold ${item.total_horas ? "text-green-600" : "text-slate-400"}`}>{formatHoras(item.total_horas)}</span>
                    </div>
                    {item.horas_meta ? <BarraProgreso valor={item.total_horas || 0} meta={item.horas_meta} /> : null}
                </div>
            )
        },
    ];

    const actions = [
        { label: "Ver Perfil", icon: Eye, className: "px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200", onClick: (item) => navigate(`/dashboard/actividades_sociales/perfil/${item.id_asignacion}`) },
        ...(esEditor ? [{
            label: "Meta", icon: Edit3, className: "px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100",
            onClick: (item) => { setModalMeta({ id_asignacion: item.id_asignacion, horas_meta_actual: item.horas_meta }); setMetaInput(item.horas_meta ?? ""); },
        }] : []),
    ];

    return (
        <div className="min-h-full bg-slate-50/50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Header
                    title={nombre}
                    icon={<PartyPopper className="w-8 h-8" />}
                    showSearch={false}
                    stats={[]}
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

                {/* Información General — una sola tarjeta en vez de dos partidas */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-500" />Información General</h2>
                    <p className="text-slate-700 text-sm">{descripcion || "Sin descripción"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-4 h-4 text-slate-400 shrink-0" />{ubicacion || "—"}</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-4 h-4 text-slate-400 shrink-0" />{formatDate(fecha_inicio)}</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600"><Target className="w-4 h-4 text-slate-400 shrink-0" />{motivo || "—"}</div>
                        {convenio && <div className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="w-4 h-4 text-slate-400 shrink-0" />{convenio.nombre}</div>}
                    </div>
                </div>

                {/* Personas asignadas — una sola tabla en vez de dos grids de tarjetas separadas */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4">
                    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" /> Personas Asignadas ({todos.length})
                        </h2>
                        {esEditor && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setModalAsignarColegiados(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white font-medium text-sm rounded-lg hover:bg-slate-700 transition">
                                    <UserPlus className="w-4 h-4" /> Colegiado
                                </button>
                                <button onClick={() => setModalAsignarPasantes(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white font-medium text-sm rounded-lg hover:bg-slate-600 transition">
                                    <UserPlus className="w-4 h-4" /> Pasante
                                </button>
                            </div>
                        )}
                    </div>
                    <ResponsiveTable
                        storageKey="asignados-actividad-social"
                        columns={columns}
                        data={todos}
                        actions={actions}
                        emptyMessage="No hay personas asignadas a esta actividad"
                    />
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
