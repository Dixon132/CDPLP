import React, { useEffect, useState } from "react";
import {
    getRegistrosPorActividadInstitucional,
    getAsistenciasPorActividad,
    createAsistenciaActividad,
    deleteAsistenciaActividad,
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
import Table from "../../../components/Table";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Modal from "../../../../../components/Modal";
import { CircularProgress, Box, Typography } from "@mui/material";

export default function GestionAsistenciaInst() {
    const [registros, setRegistros] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const navigate = useNavigate();

    // Estados para el Modal de Confirmación
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedColegiado, setSelectedColegiado] = useState(null);
    const [confirmAction, setConfirmAction] = useState(""); // "MARCAR" o "DESMARCAR"

    // Estado para el Modal de Ver Lista
    const [showListaModal, setShowListaModal] = useState(false);

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

    const handleToggleClick = (r) => {
        const asistio = hasAssisted(r);
        setSelectedColegiado(r);
        setConfirmAction(asistio ? "DESMARCAR" : "MARCAR");
        setShowConfirm(true);
    };

    const confirmToggle = async () => {
        if (!selectedColegiado) return;
        
        const existingId = findAsistenciaId(selectedColegiado);
        try {
            if (existingId) {
                await deleteAsistenciaActividad(existingId);
            } else {
                await createAsistenciaActividad({
                    id_actividad: id,
                    id_colegiado: selectedColegiado.id_colegiado || null,
                    id_invitado: selectedColegiado.id_invitado || null,
                });
            }
            await fetchData();
            setShowConfirm(false);
        } catch (err) {
            console.error("Error toggling asistencia", err);
            alert("Error al actualizar la asistencia");
            setShowConfirm(false);
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
    const handleAnularRegistro = async (registro) => {
        if (window.confirm(`¿Estás seguro de que deseas anular el registro de ${registro.colegiados ? registro.colegiados.nombre + ' ' + registro.colegiados.apellido : registro.invitados?.nombre + ' ' + registro.invitados?.apellido}? Esta acción anulará el pago asociado y eliminará el comprobante.`)) {
            try {
                const { anularRegistroActividadInst } = await import('../../../services/ac-institucionales');
                await anularRegistroActividadInst(registro.id_registro);
                fetchData();
            } catch (error) {
                console.error("Error al anular registro:", error);
                alert("Error al anular el registro");
            }
        }
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
            onClick: (r) => handleToggleClick(r)
        },
        {
            label: "Anular",
            icon: Ban,
            show: (r) => r.estado_registro !== 'ANULADO',
            className: "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100",
            onClick: (r) => handleAnularRegistro(r)
        }
    ];

    return (
        <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
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

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Colegiados Inscritos</h2>
                    </div>
                </div>
                
                <Table 
                    columns={columns}
                    data={registrosTotales}
                    actions={actions}
                    emptyMessage="No hay inscritos para esta actividad"
                />
            </div>

            {/* Modal de Confirmación */}
            <ConfirmDialog
                isOpen={showConfirm}
                message={confirmAction === "MARCAR" 
                    ? "¿Estás seguro de que deseas MARCAR la asistencia de este inscrito?" 
                    : "¿Estás seguro de que deseas DESMARCAR la asistencia de este inscrito?"}
                onConfirm={confirmToggle}
                onClose={() => setShowConfirm(false)}
                confirmText={confirmAction === "MARCAR" ? "Marcar" : "Desmarcar"}
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
        </div>
    );
}