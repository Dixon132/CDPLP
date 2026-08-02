import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import {
    ArrowLeft, Calendar, DollarSign, Edit3, ListChecks, Power, PowerOff,
    Sparkles, UserPlus, Users, UserCheck, UserX, Ban, ClipboardCheck,
} from "lucide-react";
import Header from "../../components/Header";
import ResponsiveTable from "../../components/ResponsiveTable";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import Alerts from "../../components/Alerts";
import ActividadEstadoBadge from "./components/ActividadEstadoBadge";
import EditActInstitucional from "./components/EditActInstitucional";
import RegisterColegiadoInst from "./components/RegisterColegiadoInst";
import MarcarAsistenciaInst from "./components/MarcarAsistenciaInst";
import { useSession } from "../../../../context/SessionProvider";
import {
    getActividadInstitucionalById,
    updateEstadoActividadInstitucional,
    getActividadInstDetailReport,
    getRegistrosPorActividadInstitucional,
    getAsistenciasPorActividad,
    createAsistenciaActividad,
    deleteAsistenciaActividad,
    anularRegistroActividadInst,
} from "../../services/ac-institucionales";

/**
 * Página de detalle de una actividad institucional: info + gestión de
 * asistencia en un solo lugar. Antes "ver detalles" era un modal aparte y
 * "asistencia" otra página aparte (/dashboard/asistencias/:id) sin relación
 * visual entre sí; ahora es una sola vista con su propia URL.
 */
export default function DetalleActividadInst() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("actividades_institucionales");

    const [actividad, setActividad] = useState(null);
    const [registros, setRegistros] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalRegister, setShowModalRegister] = useState(false);
    const [showListaModal, setShowListaModal] = useState(false);
    const [showMarcarModal, setShowMarcarModal] = useState(false);
    const [confirmSave, setConfirmSave] = useState({ open: false, callback: null });
    const [toggleEstado, setToggleEstado] = useState(false);
    const [anularTarget, setAnularTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");
    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const fetchAll = async () => {
        try {
            const [act, rawRegs, rawAsis] = await Promise.all([
                getActividadInstitucionalById(id),
                getRegistrosPorActividadInstitucional(id),
                getAsistenciasPorActividad(id),
            ]);
            setActividad(act);
            setRegistros(Array.isArray(rawRegs) ? rawRegs : (rawRegs?.data ?? []));
            setAsistencias(Array.isArray(rawAsis) ? rawAsis : (rawAsis?.data ?? []));
        } catch {
            showAlertFn("error", "No se pudo cargar la actividad.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchAll(); }, [id]);

    const hasAssisted = (r) => {
        if (r.id_colegiado) return asistencias.some((a) => a.id_colegiado === r.id_colegiado);
        if (r.id_invitado) return asistencias.some((a) => a.id_invitado === r.id_invitado);
        return false;
    };
    const findAsistenciaId = (r) => {
        if (r.id_colegiado) return asistencias.find((a) => a.id_colegiado === r.id_colegiado)?.id_asistencia ?? null;
        if (r.id_invitado) return asistencias.find((a) => a.id_invitado === r.id_invitado)?.id_asistencia ?? null;
        return null;
    };
    const nombreDe = (r) => {
        const persona = r?.colegiados || r?.invitados;
        return `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim() || "este inscrito";
    };

    const handleGuardarAsistencias = async (seleccionados) => {
        try {
            const operaciones = registrosTotales
                .filter((r) => r.estado_registro !== "ANULADO")
                .flatMap((r) => {
                    const clave = r.id_colegiado ? `c-${r.id_colegiado}` : `i-${r.id_invitado}`;
                    const marcado = seleccionados.has(clave);
                    const yaAsistio = hasAssisted(r);
                    if (marcado && !yaAsistio) {
                        return [createAsistenciaActividad({
                            id_actividad: id,
                            id_colegiado: r.id_colegiado || null,
                            id_invitado: r.id_invitado || null,
                        })];
                    }
                    if (!marcado && yaAsistio) {
                        return [deleteAsistenciaActividad(findAsistenciaId(r))];
                    }
                    return [];
                });
            await Promise.all(operaciones);
            await fetchAll();
            setShowMarcarModal(false);
            showAlertFn("success", "Asistencia actualizada correctamente.");
        } catch {
            showAlertFn("error", "Error al actualizar la asistencia.");
        }
    };

    const handleAnularRegistro = async () => {
        if (!anularTarget) return;
        try {
            await anularRegistroActividadInst(anularTarget.id_registro);
            showAlertFn("success", "Registro anulado correctamente.");
            fetchAll();
        } catch {
            showAlertFn("error", "Error al anular el registro.");
        } finally {
            setAnularTarget(null);
        }
    };

    const ejecutarToggleEstado = async () => {
        const nuevoEstado = actividad.estado === "EN_CURSO" ? "TERMINADO" : "EN_CURSO";
        try {
            await updateEstadoActividadInstitucional(id, nuevoEstado);
            showAlertFn("success", `Actividad ${nuevoEstado === "EN_CURSO" ? "activada" : "terminada"} correctamente.`);
            if (nuevoEstado === "TERMINADO") {
                try {
                    const blob = await getActividadInstDetailReport(id);
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `lista_oficial_${id}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                } catch { /* la actividad ya cambió de estado; el PDF es un extra */ }
            }
            fetchAll();
        } catch {
            showAlertFn("error", "Error al cambiar el estado.");
        } finally {
            setToggleEstado(false);
        }
    };

    if (loading || !actividad) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    const registrosTotales = registros.filter((r) => r.id_colegiado !== null || r.id_invitado !== null);

    const columns = [
        {
            label: "Asistente",
            key: "asistente",
            render: (r) => {
                const persona = r.colegiados || r.invitados;
                const esColegiado = r.id_colegiado !== null;
                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${esColegiado ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"}`}>
                            {persona?.nombre?.charAt(0)?.toUpperCase() || "N"}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{persona?.nombre} {persona?.apellido}</p>
                            <p className="text-xs text-slate-500">{esColegiado ? `Colegiado ID: ${r.id_colegiado}` : "Invitado"}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            label: "Estado Registro",
            key: "estado",
            render: (r) => {
                const est = r.estado_registro?.toUpperCase();
                let color = "bg-slate-50 text-slate-700 border-slate-200";
                if (est === "CONFIRMADO") color = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (est === "CANCELADO") color = "bg-rose-50 text-rose-700 border-rose-200";
                if (est === "PENDIENTE") color = "bg-amber-50 text-amber-700 border-amber-200";
                return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>{r.estado_registro}</span>;
            },
        },
        {
            label: "Asistencia",
            key: "asistencia",
            render: (r) => (hasAssisted(r) ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md text-xs">
                    <UserCheck className="w-3.5 h-3.5" /> Asistió
                </span>
            ) : (
                <span className="flex items-center gap-1.5 text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded-md text-xs">
                    <UserX className="w-3.5 h-3.5" /> No asistió
                </span>
            )),
        },
    ];

    const actions = esEditor ? [
        {
            label: "Anular",
            icon: Ban,
            show: (r) => r.estado_registro !== "ANULADO",
            className: "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100",
            onClick: (r) => setAnularTarget(r),
        },
    ] : [];

    return (
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            <Header
                title={actividad.nombre}
                icon={<Sparkles className="w-8 h-8" />}
                showSearch={false}
                stats={[
                    { label: "Inscritos", value: registrosTotales.length, color: "blue" },
                    { label: "Asistieron", value: asistencias.length, color: "emerald" },
                ]}
                buttons={[
                    ...(esEditor && actividad.estado !== "EN_INSCRIPCION" ? [{
                        label: actividad.estado === "EN_CURSO" ? "Terminar" : "Activar",
                        icon: actividad.estado === "EN_CURSO" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
                        onClick: () => setToggleEstado(true),
                        color: actividad.estado === "EN_CURSO" ? "rose" : "emerald",
                    }] : []),
                    ...(esEditor ? [{ label: "Editar", icon: <Edit3 className="w-4 h-4" />, onClick: () => setShowModalEdit(true), color: "amber" }] : []),
                    { label: "Volver", icon: <ArrowLeft className="w-4 h-4" />, onClick: () => navigate(-1), color: "blue" },
                ]}
            />

            <div className="flex items-center gap-3 px-2">
                <ActividadEstadoBadge estado={actividad.estado} />
                <span className="px-4 py-1.5 rounded-full text-sm font-bold shadow-sm bg-purple-100 text-purple-700">{actividad.tipo}</span>
            </div>

            {/* Información General */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
                <p className="text-slate-600 text-sm">{actividad.descripcion || "Sin descripción"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        {actividad.fecha_programada ? actividad.fecha_programada.split("T")[0] : "—"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                        {actividad.costo ? `Bs. ${actividad.costo}` : "Gratis"}
                    </div>
                </div>
            </div>

            {/* Inscritos y asistencia */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> Inscritos
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowListaModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors"
                        >
                            <ListChecks className="w-4 h-4" /> Ver lista de asistentes
                        </button>
                        {esEditor && (
                            <button
                                onClick={() => setShowMarcarModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
                            >
                                <ClipboardCheck className="w-4 h-4" /> Marcar Asistencia
                            </button>
                        )}
                        {esEditor && (
                            <button
                                onClick={() => setShowModalRegister(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                <UserPlus className="w-4 h-4" /> Registrar
                            </button>
                        )}
                    </div>
                </div>

                <ResponsiveTable
                    storageKey="asistencia-institucional"
                    columns={columns}
                    data={registrosTotales}
                    actions={actions}
                    emptyMessage="No hay inscritos para esta actividad"
                />
            </div>

            {/* Editar actividad */}
            <Modal isOpen={showModalEdit} title="Editar Actividad Institucional" onClose={() => setShowModalEdit(false)}>
                <EditActInstitucional
                    id={id}
                    onClose={() => setShowModalEdit(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true,
                            callback: () => { setShowModalEdit(false); showAlertFn("success", "Actividad actualizada correctamente."); fetchAll(); },
                        });
                    }}
                />
            </Modal>

            {/* Registrar colegiado/invitado */}
            <Modal isOpen={showModalRegister} title="Registrar Colegiado / Invitado" onClose={() => setShowModalRegister(false)}>
                <RegisterColegiadoInst
                    id={id}
                    onClose={() => setShowModalRegister(false)}
                    onSuccess={() => { setShowModalRegister(false); fetchAll(); }}
                />
            </Modal>

            {/* Lista de asistentes confirmados */}
            <Modal isOpen={showListaModal} onClose={() => setShowListaModal(false)} title="Lista de Asistentes">
                <div className="max-h-[60vh] overflow-y-auto">
                    {asistencias.length === 0 ? (
                        <div className="text-center py-8">
                            <UserX className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">No hay asistencias confirmadas aún.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {asistencias.map((a) => {
                                const persona = a.colegiados || a.invitados;
                                return (
                                    <div key={a.id_asistencia} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                                            {persona?.nombre?.charAt(0)?.toUpperCase() || "N"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{persona?.nombre} {persona?.apellido}</p>
                                            <p className="text-xs text-slate-500">{a.id_colegiado ? `CI: ${persona?.carnet_identidad || "N/A"}` : "Invitado"}</p>
                                        </div>
                                        <UserCheck className="w-5 h-5 text-emerald-500 ml-auto" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirmar cambios de la edición */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant="edit"
                title="¿Confirmar cambios?"
                message="¿Confirmas que deseas guardar los cambios realizados?"
                onClose={() => setConfirmSave({ open: false, callback: null })}
                onConfirm={() => { setConfirmSave({ open: false, callback: null }); confirmSave.callback?.(); }}
            />

            {/* Terminar/Activar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={toggleEstado}
                onClose={() => setToggleEstado(false)}
                onConfirm={ejecutarToggleEstado}
                title={actividad.estado === "EN_CURSO" ? "Terminar Actividad" : "Activar Actividad"}
                message={`¿Confirmas que deseas ${actividad.estado === "EN_CURSO" ? "marcar como terminada" : "activar"} esta actividad?`}
                waitSeconds={4}
                confirmColor={actividad.estado === "EN_CURSO" ? "amber" : "emerald"}
                confirmIcon={actividad.estado === "EN_CURSO" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                confirmLabel={actividad.estado === "EN_CURSO" ? "Terminar" : "Activar"}
            />

            {/* Marcar asistencia — checklist rápido, confirma todo con "Listo" */}
            <Modal isOpen={showMarcarModal} onClose={() => setShowMarcarModal(false)} title="Marcar Asistencia">
                <MarcarAsistenciaInst
                    registros={registrosTotales}
                    asistencias={asistencias}
                    onClose={() => setShowMarcarModal(false)}
                    onGuardar={handleGuardarAsistencias}
                />
            </Modal>

            {/* Anular registro (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!anularTarget}
                onClose={() => setAnularTarget(null)}
                onConfirm={handleAnularRegistro}
                title="Anular Registro"
                message={`¿Confirmas que deseas anular el registro de ${nombreDe(anularTarget)}? Esta acción anulará el pago asociado y eliminará el comprobante.`}
                waitSeconds={4}
                confirmLabel="Anular"
                confirmColor="red"
                confirmIcon={<Ban className="w-4 h-4" />}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
}
