import React, { useEffect, useState } from "react";
import {
    getRegistrosPorActividadInstitucional,
    getAsistenciasPorActividad,
    createAsistenciaActividad,
    deleteAsistenciaActividad,
    anularRegistroActividadInst,
} from "../../../services/ac-institucionales";
import {
    Users,
    UserCheck,
    UserX,
    CheckCircle,
    XCircle,
    UserPlus,
    ArrowLeft,
    ListChecks,
    Ban
} from 'lucide-react';
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/Header";
import ResponsiveTable from "../../../components/ResponsiveTable";
import Alerts from "../../../components/Alerts";
import Modal from "../../../../../components/Modal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import { CircularProgress, Box, Typography } from "@mui/material";

export default function GestionAsistenciaInst() {
    const [registros, setRegistros] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const navigate = useNavigate();

    // Confirmación de marcar / desmarcar asistencia
    const [asistenciaTarget, setAsistenciaTarget] = useState(null);

    // Doble confirmación para anular el registro (anula el pago asociado)
    const [anularTarget, setAnularTarget] = useState(null);

    // Estado para el Modal de Ver Lista
    const [showListaModal, setShowListaModal] = useState(false);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const rawRegs = await getRegistrosPorActividadInstitucional(id);
            const regs = Array.isArray(rawRegs) ? rawRegs : (rawRegs?.data || []);

            const rawAsis = await getAsistenciasPorActividad(id);
            const asis = Array.isArray(rawAsis) ? rawAsis : (rawAsis?.data || []);

            setRegistros(regs);
            setAsistencias(asis);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const hasAssisted = (r) => {
        if (r.id_colegiado) return asistencias.some((a) => a.id_colegiado === r.id_colegiado);
        if (r.id_invitado) return asistencias.some((a) => a.id_invitado === r.id_invitado);
        return false;
    };

    const findAsistenciaId = (r) => {
        if (r.id_colegiado) {
            const found = asistencias.find((a) => a.id_colegiado === r.id_colegiado);
            return found ? found.id_asistencia : null;
        }
        if (r.id_invitado) {
            const found = asistencias.find((a) => a.id_invitado === r.id_invitado);
            return found ? found.id_asistencia : null;
        }
        return null;
    };

    const confirmToggle = async () => {
        if (!asistenciaTarget) return;

        const existingId = findAsistenciaId(asistenciaTarget);
        try {
            if (existingId) {
                await deleteAsistenciaActividad(existingId);
            } else {
                await createAsistenciaActividad({
                    id_actividad: id,
                    id_colegiado: asistenciaTarget.id_colegiado || null,
                    id_invitado: asistenciaTarget.id_invitado || null,
                });
            }
            await fetchData();
            showAlertFn("success", existingId ? "Asistencia desmarcada." : "Asistencia marcada.");
        } catch (err) {
            console.error("Error toggling asistencia", err);
            showAlertFn("error", "Error al actualizar la asistencia.");
        } finally {
            setAsistenciaTarget(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 12 }}>
                <CircularProgress />
            </Box>
        );
    }

    const registrosTotales = registros.filter((r) => r.id_colegiado !== null || r.id_invitado !== null);

    const handleAnularRegistro = async () => {
        if (!anularTarget) return;
        try {
            await anularRegistroActividadInst(anularTarget.id_registro);
            showAlertFn("success", "Registro anulado correctamente.");
            fetchData();
        } catch (error) {
            console.error("Error al anular registro:", error);
            showAlertFn("error", "Error al anular el registro.");
        } finally {
            setAnularTarget(null);
        }
    };

    const nombreDe = (r) => {
        const persona = r?.colegiados || r?.invitados;
        return `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim() || "este inscrito";
    };

    const columns = [
        {
            label: "Asistente",
            key: "asistente",
            render: (r) => {
                const persona = r.colegiados || r.invitados;
                const esColegiado = r.id_colegiado !== null;
                const initial = persona?.nombre?.charAt(0)?.toUpperCase() || 'N';
                
                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${esColegiado ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                            {initial}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">
                                {persona?.nombre} {persona?.apellido}
                            </p>
                            <p className="text-xs text-slate-500">
                                {esColegiado ? `Colegiado ID: ${r.id_colegiado}` : 'Invitado'}
                            </p>
                        </div>
                    </div>
                );
            }
        },
        {
            label: "Estado Registro",
            key: "estado",
            render: (r) => {
                const est = r.estado_registro?.toUpperCase();
                let color = "bg-slate-50 text-slate-700 border-slate-200";
                if (est === 'CONFIRMADO') color = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (est === 'CANCELADO') color = "bg-rose-50 text-rose-700 border-rose-200";
                if (est === 'PENDIENTE') color = "bg-amber-50 text-amber-700 border-amber-200";

                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
                        {r.estado_registro}
                    </span>
                );
            }
        },
        {
            label: "Asistencia",
            key: "asistencia",
            render: (r) => {
                const asistio = hasAssisted(r);
                return (
                    <div className="flex items-center gap-2">
                        {asistio ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md text-xs">
                                <CheckCircle className="w-4 h-4" /> Asistió
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded-md text-xs">
                                <XCircle className="w-4 h-4" /> No asistió
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    const actions = [
        {
            label: (r) => hasAssisted(r) ? "Desmarcar" : "Marcar Asistencia",
            icon: (r) => hasAssisted(r) ? UserX : UserCheck,
            show: (r) => r.estado_registro !== 'ANULADO',
            className: (r) => hasAssisted(r) 
                ? "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100" 
                : "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100",
            onClick: (r) => setAsistenciaTarget(r)
        },
        {
            label: "Anular",
            icon: Ban,
            show: (r) => r.estado_registro !== 'ANULADO',
            className: "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100",
            onClick: (r) => setAnularTarget(r)
        }
    ];

    return (
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            <Header
                title="Gestión de Asistencia"
                icon={<Users className="w-8 h-8" />}
                showSearch={false}
                stats={[
                    { label: "Inscritos", value: registrosTotales.length, color: "blue" },
                    { label: "Asistieron", value: asistencias.length, color: "emerald" },
                    { label: "Pendientes", value: registrosTotales.length - asistencias.length, color: "amber" }
                ]}
                buttons={[
                    {
                        label: "Ver Lista",
                        icon: <ListChecks />,
                        onClick: () => setShowListaModal(true),
                        color: "emerald"
                    },
                    {
                        label: "Volver",
                        icon: <ArrowLeft />,
                        onClick: () => navigate(-1),
                        color: "blue"
                    }
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4">
                <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Colegiados Inscritos</h2>
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

            {/* ✅ Confirmación de marcar / desmarcar asistencia */}
            <ConfirmActionModal
                isOpen={!!asistenciaTarget}
                onClose={() => setAsistenciaTarget(null)}
                onConfirm={confirmToggle}
                title={asistenciaTarget && hasAssisted(asistenciaTarget) ? "Desmarcar asistencia" : "Marcar asistencia"}
                message={asistenciaTarget && hasAssisted(asistenciaTarget)
                    ? `¿Confirmas que deseas desmarcar la asistencia de ${nombreDe(asistenciaTarget)}?`
                    : `¿Confirmas que deseas marcar la asistencia de ${nombreDe(asistenciaTarget)}?`}
                confirmLabel={asistenciaTarget && hasAssisted(asistenciaTarget) ? "Desmarcar" : "Marcar"}
                confirmColor={asistenciaTarget && hasAssisted(asistenciaTarget) ? "amber" : "emerald"}
                confirmIcon={asistenciaTarget && hasAssisted(asistenciaTarget) ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            />

            {/* ✅ Doble confirmación para anular el registro (2s + 4s) */}
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

            {/* Modal de Ver Lista de Asistentes */}
            <Modal 
                isOpen={showListaModal} 
                onClose={() => setShowListaModal(false)}
                title="Lista de Asistentes"
            >
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {asistencias.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <UserX className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <Typography color="textSecondary">No hay asistencias confirmadas aún.</Typography>
                        </Box>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {asistencias.map(a => {
                                const persona = a.colegiados || a.invitados;
                                return (
                                <div key={a.id_asistencia} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                                        {persona?.nombre?.charAt(0)?.toUpperCase() || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {persona?.nombre} {persona?.apellido}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {a.id_colegiado ? `CI: ${persona?.carnet_identidad || "N/A"}` : 'Invitado'}
                                        </p>
                                    </div>
                                    <div className="ml-auto">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
}