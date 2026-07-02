import { useEffect, useState } from 'react';
import { eliminarCorrespondencia, getAllCorrespondencia, verCorrespondencia } from "../../services/correspondencia";
import Modal from "../../../../components/Modal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import CrearCorrespondencia from './components/CrearCorrespondencia';
import EditarCorrespondencia from './components/EditarCorrespondencia';
import GenerarReporteCorrespondencia from './components/GenerarReporteCorrespondencia';
import {
    Mail, Plus, Eye, Edit3, Trash2, User, Calendar, FileText,
    Filter, BarChart3, Clock, CheckCircle, AlertCircle,
    MessageCircle, Zap, Users, Sparkles, Target
} from 'lucide-react';

const Correspondencia = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [correspondencia, setCorrespondencia] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [vistaActual, setVistaActual] = useState('tabla');
    const [correspondenciaToDelete, setCorrespondenciaToDelete] = useState(null);
    const [modalReporte, setModalReporte] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '', duration: 2000 });

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalModificar, setMostrarModalModificar] = useState(false);
    const [actualId, setActualId] = useState(null);

    // Confirm DESPUÉS de guardar
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    const showAlert = (type, message, duration = 2000) =>
        setAlert({ show: true, type, message, duration });

    const getEstadoInfo = (estado) => {
        switch (estado) {
            case "RECIBIDO": return { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle className="w-3 h-3" />, bgGradient: "from-emerald-50 to-green-50" };
            case "VISTO": return { color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Eye className="w-3 h-3" />, bgGradient: "from-blue-50 to-indigo-50" };
            case "A DISCUSIÓN": return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <MessageCircle className="w-3 h-3" />, bgGradient: "from-yellow-50 to-orange-50" };
            case "PENDIENTE": return { color: "bg-orange-100 text-orange-800 border-orange-200", icon: <Clock className="w-3 h-3" />, bgGradient: "from-orange-50 to-red-50" };
            case "ARREGLADO": return { color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: <Zap className="w-3 h-3" />, bgGradient: "from-indigo-50 to-pink-50" };
            default: return { color: "bg-gray-100 text-gray-800 border-gray-200", icon: <AlertCircle className="w-3 h-3" />, bgGradient: "from-gray-50 to-slate-50" };
        }
    };

    const estadosDisponibles = ["TODOS", "RECIBIDO", "VISTO", "A DISCUSIÓN", "PENDIENTE", "ARREGLADO"];

    const fetchData = async () => {
        const { data, total, page: cp, totalPages } = await getAllCorrespondencia({ page, search });
        setCorrespondencia(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    };
    useEffect(() => { fetchData(); }, [page, search]);

    const correspondenciaFiltrada = filtroEstado === 'TODOS'
        ? correspondencia
        : correspondencia.filter(i => i.estado === filtroEstado);

    const stats = {
        total: correspondencia.length,
        recibido: correspondencia.filter(c => c.estado === 'RECIBIDO').length,
        visto: correspondencia.filter(c => c.estado === 'VISTO').length,
        pendiente: correspondencia.filter(c => c.estado === 'PENDIENTE').length,
        arreglado: correspondencia.filter(c => c.estado === 'ARREGLADO').length,
    };

    const handleEliminar = (item) => setCorrespondenciaToDelete(item);

    const handleConfirmEliminar = async () => {
        if (!correspondenciaToDelete?.id_correspondencia) return;
        try {
            await eliminarCorrespondencia(correspondenciaToDelete.id_correspondencia);
            setCorrespondenciaToDelete(null);
            showAlert('success', 'Correspondencia eliminada correctamente', 4000);
            setTimeout(() => fetchData(), 500);
        } catch { showAlert('error', 'Error al eliminar correspondencia', 4000); }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            <Header
                icon={<Mail className="w-8 h-8" />} title="Centro de Correspondencia"
                stats={[
                    { label: "Total", value: stats.total, color: "blue" },
                    { label: "Recibidos", value: stats.recibido, color: "green" },
                    { label: "Vistos", value: stats.visto, color: "blue" },
                    { label: "Pendientes", value: stats.pendiente, color: "red" },
                    { label: "Resueltos", value: stats.arreglado, color: "purple" },
                ]}
                searchPlaceholder="Buscar correspondencia..."
                onSearch={(v) => setSearch(v)}
                buttons={[
                    { label: vistaActual === 'tabla' ? 'Vista Grid' : 'Vista Tabla', icon: vistaActual === 'tabla' ? <Target className="w-4 h-4" /> : <FileText className="w-4 h-4" />, onClick: () => setVistaActual(vistaActual === 'tabla' ? 'cards' : 'tabla'), color: "purple" },
                    { label: "Reportes", icon: <BarChart3 className="w-4 h-4" />, onClick: () => setModalReporte(true), color: "red" },
                    { label: "Nueva Correspondencia", icon: <Plus className="w-4 h-4" />, onClick: () => setMostrarModal(true), color: "blue" },
                ]}
            />

            <div className="flex justify-end mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
                        className="px-4 py-2 bg-white/80 border border-slate-200 rounded-xl focus:outline-none shadow-sm">
                        {estadosDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </div>

            <div>
                {vistaActual === 'tabla' ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
                        <Table
                            columns={[
                                { label: "Asunto", key: "asunto", render: (item) => <div className="font-medium text-slate-800 max-w-xs truncate">{item.asunto}</div> },
                                { label: "Resumen", key: "resumen", render: (item) => <div className="text-slate-600 max-w-sm truncate text-sm">{item.resumen}</div> },
                                { label: "Estado", key: "estado", render: (item) => { const ei = getEstadoInfo(item.estado); return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${ei.color}`}>{ei.icon} {item.estado}</span>; } },
                                { label: "Contenido", key: "contenido", render: (item) => <button onClick={() => verCorrespondencia(item.id_correspondencia)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-xl font-semibold hover:bg-blue-500/20"><Eye className="w-3 h-3" /> Ver</button> },
                                { label: "Remitente", key: "remitente", render: (item) => <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-white" /></div><span className="text-slate-700 font-medium">{item.remitente}</span></div> },
                                { label: "Destinatario", key: "destinatario", render: (item) => <span className="text-slate-700">{item.destinatario?.nombre} {item.destinatario?.apellido}</span> },
                                { label: "Fecha", key: "fecha_envio", render: (item) => <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4" /> {new Date(item.fecha_envio).toLocaleDateString()}</div> },
                            ]}
                            data={correspondenciaFiltrada}
                            actions={[
                                { label: "Editar", icon: Edit3, onClick: (item) => { setActualId(item.id_correspondencia); setMostrarModalModificar(true); } },
                                { label: "Eliminar", icon: Trash2, onClick: (item) => handleEliminar(item) },
                            ]}
                            emptyMessage="No hay correspondencia"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {correspondenciaFiltrada.map((item) => {
                            const ei = getEstadoInfo(item.estado);
                            return (
                                <div key={item.id_correspondencia} className={`bg-gradient-to-br ${ei.bgGradient} p-6 rounded-2xl border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/80 rounded-xl shadow-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${ei.color}`}>{ei.icon} {item.estado}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">{item.asunto}</h3>
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{item.resumen}</p>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600"><User className="w-4 h-4" /> De: {item.remitente}</div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4" /> Para: {item.destinatario?.nombre} {item.destinatario?.apellido}</div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-4 h-4" /> {new Date(item.fecha_envio).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => verCorrespondencia(item.id_correspondencia)} className="flex-1 px-3 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-500/20 flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Ver</button>
                                        <button onClick={() => { setActualId(item.id_correspondencia); setMostrarModalModificar(true); }} className="p-2 bg-amber-500/10 text-amber-600 rounded-xl hover:bg-amber-500/20"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => handleEliminar(item)} className="p-2 bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500/20"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                        {!correspondenciaFiltrada.length && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16">
                                <div className="p-6 bg-blue-100 rounded-full mb-4"><Sparkles className="w-12 h-12 text-blue-500" /></div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">No hay resultados</h3>
                                <button onClick={() => setMostrarModal(true)} className="px-6 py-3 bg-blue-500/10 text-blue-600 rounded-xl font-semibold hover:bg-blue-500/20 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Crear Nueva
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Forms — abren directo */}
            <Modal isOpen={mostrarModal} onClose={() => setMostrarModal(false)}>
                <CrearCorrespondencia
                    onClose={() => setMostrarModal(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: () => { setMostrarModal(false); showAlert('success', 'Correspondencia creada correctamente', 3000); fetchData(); },
                        });
                    }}
                />
            </Modal>

            <Modal title="Modificar correspondencia" isOpen={mostrarModalModificar} onClose={() => setMostrarModalModificar(false)}>
                <EditarCorrespondencia
                    id={actualId}
                    onClose={() => setMostrarModalModificar(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: () => { setMostrarModalModificar(false); showAlert('success', 'Correspondencia actualizada correctamente', 3000); fetchData(); },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} onClose={() => setModalReporte(false)}>
                <GenerarReporteCorrespondencia />
            </Modal>

            {/* ✅ Confirm DESPUÉS de guardar */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas guardar la nueva correspondencia?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            {/* ✅ Doble confirmación eliminar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!correspondenciaToDelete}
                onClose={() => setCorrespondenciaToDelete(null)}
                onConfirm={handleConfirmEliminar}
                title="Eliminar correspondencia"
                message={`¿Seguro que deseas eliminar "${correspondenciaToDelete?.asunto || "esta correspondencia"}"? Esta acción no se puede deshacer.`}
                waitSeconds={4}
            />

            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={alert.duration}
                onClose={() => setAlert((p) => ({ ...p, show: false }))} />
        </div>
    );
};
export default Correspondencia;
