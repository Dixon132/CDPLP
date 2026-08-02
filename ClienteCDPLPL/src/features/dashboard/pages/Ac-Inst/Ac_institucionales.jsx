import React, { useEffect, useState, useMemo } from "react";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";

import { getAllActividadesInstitucionales } from "../../services/ac-institucionales";
import CreateActInstitucional from "./components/CreateActInstitucional";

import {
    Sparkles, Calendar, Eye,
    Activity, Settings,
    Target, Rocket,
    Filter, Plus, DollarSign, Award,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import ActividadEstadoBadge, { ESTADOS_ACTIVIDAD } from "./components/ActividadEstadoBadge";
import { useSession } from "../../../../context/SessionProvider";

/**
 * Lista de actividades institucionales. Toda la gestión puntual de una
 * actividad (editar, terminar/activar, registrar gente, marcar asistencia)
 * vive en su propia página (`DetalleActividadInst`) — acá solo hay un punto
 * de entrada, "Ver detalles", para no amontonar botones por fila.
 */
const AcInstitucionales = () => {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("actividades_institucionales");
    const navigate = useNavigate();

    const [actividades, setActividades] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [filterType, setFilterType] = useState('all');

    const [showModalCreate, setShowModalCreate] = useState(false);
    const [confirmSave, setConfirmSave] = useState({ open: false, callback: null });

    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3000);
    };

    const fetchActividades = async () => {
        const { data, total: t, page: cp, totalPages } =
            await getAllActividadesInstitucionales({ page, search });
        setActividades(data || []); setTotal(t || 0); setTotalPage(totalPages || 1); setPage(cp || 1);
    };
    useEffect(() => { fetchActividades(); }, [page, search]);

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
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            <Header
                title="Actividades Institucionales" icon={<Sparkles className="w-8 h-8" />}
                stats={[
                    { value: total, label: "Total Actividades", color: "purple" },
                    { value: actividades.filter(a => a.estado === 'EN_CURSO').length, label: "En Curso", color: "emerald" },
                ]}
                searchPlaceholder="Buscar actividades..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    ...(esEditor ? [{ label: "Crear Actividad", icon: <Plus />, onClick: () => setShowModalCreate(true), color: "purple" }] : []),
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

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="actividades-institucionales"
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
                        { label: "Ver detalles", icon: Eye, onClick: (a) => navigate(`/dashboard/actividades_institucionales/detalles/${a.id_actividad}`) },
                    ]}
                />
            </div>

            {/* Crear actividad */}
            <Modal isOpen={showModalCreate} title="Crear Actividad Institucional" onClose={() => setShowModalCreate(false)}>
                <CreateActInstitucional
                    onClose={() => setShowModalCreate(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true,
                            callback: () => { setShowModalCreate(false); showAlert("success", "Actividad creada correctamente."); fetchActividades(); },
                        });
                    }}
                />
            </Modal>

            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant="create"
                title="¿Confirmar creación?"
                message="¿Confirmas que deseas guardar la nueva actividad?"
                onClose={() => setConfirmSave({ open: false, callback: null })}
                onConfirm={() => { setConfirmSave({ open: false, callback: null }); confirmSave.callback?.(); }}
            />

            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert((a) => ({ ...a, show: false }))} />
        </div>
    );
};
export default AcInstitucionales;
