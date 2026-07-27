import React, { useEffect, useState, useMemo } from "react";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";

import { getAllActividadesInstitucionales, updateEstadoActividadInstitucional, getActividadInstDetailReport } from "../../services/ac-institucionales";
import CreateActInstitucional from "./components/CreateActInstitucional";
import EditActInstitucional from "./components/EditActInstitucional";
import RegisterColegiadoInst from "./components/RegisterColegiadoInst";
import GestionAsistenciaInst from "./components/GestionAsistenciaInst";
import GenerarReporteActividadesInst from "./components/GenerarReporteActividadesInst";

import {
    Sparkles, Calendar, Edit3, UserPlus, ClipboardList,
    Power, PowerOff, Download, Activity, Settings,
    Target, Rocket, CheckCircle2, XCircle, AlertCircle,
    Filter, Plus, DollarSign, Award,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import ActividadEstadoBadge, { ESTADOS_ACTIVIDAD } from "./components/ActividadEstadoBadge";

const AcInstitucionales = () => {
    const [actividades, setActividades] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [modalReporte, setModalReporte] = useState(false);
    const [filterType, setFilterType] = useState('all');

    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalRegister, setShowModalRegister] = useState(false);
    const [showModalAsistencia, setShowModalAsistencia] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // Confirm DESPUÉS de guardar
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // Doble confirmación toggle estado
    const [toggleTarget, setToggleTarget] = useState(null);

    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3000);
    };

    const navigate = useNavigate();

    const fetchActividades = async () => {
        const { data, total: t, page: cp, totalPages } =
            await getAllActividadesInstitucionales({ page, search });
        setActividades(data || []); setTotal(t || 0); setTotalPage(totalPages || 1); setPage(cp || 1);
    };
    useEffect(() => { fetchActividades(); }, [page, search]);

    const ejecutarToggle = async () => {
        if (!toggleTarget) return;
        const nuevoEstado = toggleTarget.estadoActual === "EN_CURSO" ? "TERMINADO" : "EN_CURSO";
        try {
            await updateEstadoActividadInstitucional(toggleTarget.id, nuevoEstado);
            showAlert("success", `Actividad ${nuevoEstado === "EN_CURSO" ? "activada" : "terminada"} correctamente.`);
            
            if (nuevoEstado === "TERMINADO") {
                try {
                    const blob = await getActividadInstDetailReport(toggleTarget.id);
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `lista_oficial_${toggleTarget.id}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                } catch (e) {
                    console.error(e);
                    showAlert("error", "Error al descargar la lista oficial.");
                }
            }

            fetchActividades();
        } catch { showAlert("error", "Error al cambiar el estado."); }
        finally { setToggleTarget(null); }
    };

    const getActivityIcon = (tipo) => {
        switch (tipo?.toLowerCase()) {
            case 'conferencia': return <Award className="w-5 h-5" />;
            case 'taller': return <Settings className="w-5 h-5" />;
            case 'seminario': return <Target className="w-5 h-5" />;
            case 'curso': return <Rocket className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };



    const filteredActividades = useMemo(() =>
        actividades.filter(i => filterType === 'all' || i.estado === filterType),
        [actividades, filterType]);

    return (
        <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
            <Header
                title="Actividades Institucionales" icon={<Sparkles className="w-8 h-8" />}
                stats={[
                    { value: total, label: "Total Actividades", color: "purple" },
                    { value: actividades.filter(a => a.estado === 'EN_CURSO').length, label: "En Curso", color: "emerald" },
                ]}
                searchPlaceholder="Buscar actividades..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    { label: "Generar Reporte", icon: <Download />, onClick: () => setModalReporte(true), color: "blue" },
                    { label: "Crear Actividad", icon: <Plus />, onClick: () => setShowModalCreate(true), color: "purple" },
                ]}
            />

            <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs w-full">
                    <Filter className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none shadow-sm text-slate-700 font-medium">
                        <option value="all">Todas</option>
                        {ESTADOS_ACTIVIDAD.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <Table
                    columns={[
                        {
                            label: "Actividad", key: "nombre", render: (a) => (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{getActivityIcon(a.tipo)}</div>
                                    <div><p className="font-bold text-slate-800">{a.nombre}</p><p className="text-slate-500 text-xs">ID: {a.id_actividad}</p></div>
                                </div>)
                        },
                        { label: "Descripción", key: "descripcion", render: (a) => <p className="text-slate-600 text-sm max-w-xs truncate">{a.descripcion}</p> },
                        { label: "Tipo", key: "tipo", render: (a) => <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">{a.tipo}</span> },
                        {
                            label: "Fecha", key: "fecha", render: (a) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {a.fecha_programada ? a.fecha_programada.split("T")[0] : "-"}
                                </div>)
                        },
                        {
                            label: "Costo", key: "costo", render: (a) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    {a.costo ? `Bs. ${a.costo}` : "Gratis"}
                                </div>)
                        },
                        { label: "Estado", key: "estado", render: (a) => <ActividadEstadoBadge estado={a.estado} /> },
                    ]}
                    data={filteredActividades}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                    emptyMessage="No se encontraron actividades"
                    actions={[
                        {
                            label: (a) => a.estado === "EN_CURSO" ? "Terminar" : "Activar",
                            icon: (a) => a.estado === "EN_CURSO" ? PowerOff : Power,
                            className: (a) => a.estado === "EN_CURSO"
                                ? "text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg"
                                : "text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg",
                            onClick: (a) => setToggleTarget({ id: a.id_actividad, estadoActual: a.estado }),
                            hide: (a) => a.estado === "EN_INSCRIPCION",
                        },
                        { label: "Editar", icon: Edit3, onClick: (a) => { setSelectedId(a.id_actividad); setShowModalEdit(true); } },
                        { label: "Registrar", icon: UserPlus, onClick: (a) => { setSelectedId(a.id_actividad); setShowModalRegister(true); } },
                        { label: "Asistencia", icon: ClipboardList, onClick: (a) => navigate(`/dashboard/asistencias/${a.id_actividad}`) },
                    ]}
                />
            </div>

            {/* Forms — abren directo */}
            <Modal isOpen={showModalCreate} title="Crear Actividad Institucional" onClose={() => setShowModalCreate(false)}>
                <CreateActInstitucional
                    onClose={() => setShowModalCreate(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: () => { setShowModalCreate(false); showAlert("success", "Actividad creada correctamente."); fetchActividades(); },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={showModalEdit} title="Editar Actividad Institucional" onClose={() => setShowModalEdit(false)}>
                {selectedId && (
                    <EditActInstitucional
                        id={selectedId}
                        onClose={() => setShowModalEdit(false)}
                        onSuccess={() => {
                            setConfirmSave({
                                open: true, variant: "edit",
                                callback: () => { setShowModalEdit(false); showAlert("success", "Actividad actualizada correctamente."); fetchActividades(); },
                            });
                        }}
                    />
                )}
            </Modal>

            <Modal isOpen={showModalRegister} title="Registrar Colegiado / Invitado" onClose={() => setShowModalRegister(false)}>
                {selectedId && <RegisterColegiadoInst id={selectedId} onClose={() => setShowModalRegister(false)} onSuccess={() => setShowModalRegister(false)} />}
            </Modal>

            <Modal isOpen={showModalAsistencia} title="Gestionar Asistencias" onClose={() => setShowModalAsistencia(false)}>
                {selectedId && <GestionAsistenciaInst id={selectedId} onClose={() => setShowModalAsistencia(false)} />}
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte de Actividades" onClose={() => setModalReporte(false)}>
                <GenerarReporteActividadesInst onClose={() => setModalReporte(false)} />
            </Modal>

            {/* ✅ Confirm DESPUÉS de guardar */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas guardar la nueva actividad?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            {/* ✅ Doble confirmación toggle (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={ejecutarToggle}
                title={toggleTarget?.estadoActual === "EN_CURSO" ? "Terminar Actividad" : "Activar Actividad"}
                message={`¿Confirmas que deseas ${toggleTarget?.estadoActual === "EN_CURSO" ? "marcar como terminada" : "activar"} esta actividad?`}
                waitSeconds={4}
                confirmColor={toggleTarget?.estadoActual === "EN_CURSO" ? "amber" : "emerald"}
                confirmIcon={toggleTarget?.estadoActual === "EN_CURSO" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                confirmLabel={toggleTarget?.estadoActual === "EN_CURSO" ? "Terminar" : "Activar"}
            />

            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert((a) => ({ ...a, show: false }))} />
        </div>
    );
};
export default AcInstitucionales;
