import { useState, useEffect, useCallback } from 'react';
import {
    getPostulaciones,
    getPostulacionById,
    aceptarPostulacion,
    rechazarPostulacion,
    eliminarPostulacion
} from '../../../services/postulaciones';
import Header from '../../../components/Header';
import Alerts from '../../../components/Alerts';
import Modal from '../../../../../components/Modal';
import ConfirmDeleteModal from '../../../../../components/ConfirmDeleteModal';
import ConfirmActionModal from '../../../../../components/ConfirmActionModal';
import ResponsiveTable from '../../../components/ResponsiveTable';
import {
    ClipboardList, Eye, CheckCircle2, XCircle, Trash2,
    User, Mail, Phone, CreditCard, FileText, Calendar,
    Loader2, ChevronLeft, ChevronRight, Search, Filter,
    ExternalLink, AlertCircle, Download, Tag, Settings
} from 'lucide-react';

const ESTADOS = [
    { value: '', label: 'Todas' },
    { value: 'EN_REVISION', label: 'En revisión' },
    { value: 'ACTIVO', label: 'Aceptadas' },
    { value: 'RECHAZADO', label: 'Rechazadas' },
];

const ESTADO_CONFIG = {
    EN_REVISION: { label: 'En revisión', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
    ACTIVO: { label: 'Aceptada', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
    RECHAZADO: { label: 'Rechazada', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
};

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CONFIG[estado] ?? { label: estado, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm text-slate-700 font-medium">{value}</p>
            </div>
        </div>
    );
}

// ─── Modal: Ver detalles ──────────────────────────────────────
function VerPostulacionModal({ id, onClose, onAccept, onReject }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getPostulacionById(id)
            .then(setData)
            .catch(() => setError('Error al cargar la postulación.'))
            .finally(() => setLoading(false));
    }, [id]);



    if (loading) return (
        <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
    );

    if (error && !data) return (
        <div className="flex items-center gap-2 text-sm text-red-600 p-4">
            <AlertCircle className="w-4 h-4" /> {error}
        </div>
    );

    const isEnRevision = data?.estado === 'EN_REVISION';

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900">{data.nombre} {data.apellido}</h3>
                    <div className="mt-1"><EstadoBadge estado={data.estado} /></div>
                </div>
                <p className="text-xs text-slate-400">{new Date(data.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>

            {/* Datos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <InfoRow icon={CreditCard} label="Carnet" value={data.carnet_identidad} />
                <InfoRow icon={Mail} label="Correo" value={data.correo} />
                <InfoRow icon={Phone} label="Teléfono" value={data.telefono} />
                <InfoRow icon={Tag} label="Especialidades" value={data.especialidades} />
            </div>

            {/* Documentos */}
            {data.doc_urls?.length > 0 && (
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Documentos subidos</p>
                    <div className="space-y-2">
                        {data.doc_urls.map((doc, i) => (
                            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
                                <FileText className="w-4 h-4 text-slate-500" />
                                <span className="flex-1 text-sm text-slate-700 truncate">{doc.nombre}</span>
                                <ExternalLink className="w-4 h-4 text-slate-400" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Comprobante */}
            {data.comprobante_url && (
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Comprobante de pago</p>
                    <a href={data.comprobante_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all">
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span className="flex-1 text-sm text-emerald-700 font-medium">Ver comprobante de pago</span>
                        <ExternalLink className="w-4 h-4 text-emerald-500" />
                    </a>
                </div>
            )}

            {/* Motivo rechazo si ya fue rechazada */}
            {data.estado === 'RECHAZADO' && data.motivo_rechazo && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Motivo de rechazo</p>
                    <p className="text-sm text-red-700">{data.motivo_rechazo}</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Acciones */}
            {(isEnRevision || data?.estado === 'RECHAZADO') && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div className="flex gap-3">
                            {isEnRevision && (
                                <button onClick={() => onReject(id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-all">
                                    <XCircle className="w-4 h-4" /> Rechazar
                                </button>
                            )}
                            <button onClick={() => onAccept(id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all">
                                <CheckCircle2 className="w-4 h-4" />
                                Aceptar Postulación
                            </button>
                        </div>
                </div>
            )}
        </div>
    );
}



// ─── MAIN PAGE ────────────────────────────────────────────────
export default function PostulacionesAdmin() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('EN_REVISION');
    const [loading, setLoading] = useState(true);

    const [selectedId, setSelectedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [rejectId, setRejectId] = useState(null);
    const [acceptId, setAcceptId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPostulaciones({ estado: estadoFiltro, page, search });
            setData(res.data);
            setTotal(res.total);
            setTotalPages(res.totalPages);
        } catch {
            showAlert('error', 'Error al cargar postulaciones.');
        } finally {
            setLoading(false);
        }
    }, [estadoFiltro, page, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConfirmAccept = async () => {
        try {
            await aceptarPostulacion(acceptId);
            setAcceptId(null);
            setShowModal(false);
            showAlert('success', '¡Postulación aceptada! El colegiado fue creado exitosamente.');
            fetchData();
        } catch {
            showAlert('error', 'Error al aceptar la postulación.');
        }
    };

    const handleConfirmReject = async () => {
        try {
            await rechazarPostulacion(rejectId, null);
            setRejectId(null);
            setShowModal(false);
            showAlert('success', 'Postulación rechazada. Los archivos se mantienen.');
            fetchData();
        } catch {
            showAlert('error', 'Error al rechazar la postulación.');
        }
    };
    const handleDelete = async () => {
        setDeleting(true);
        try {
            await eliminarPostulacion(deleteId);
            setDeleteId(null);
            showAlert('success', 'Postulación eliminada definitivamente.');
            fetchData();
        } catch {
            showAlert('error', 'Error al eliminar.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            <Header
                icon={<ClipboardList className="w-8 h-8" />}
                title="Postulaciones"
                stats={[{ label: 'Total', value: total, color: 'purple' }]}
                searchPlaceholder="Buscar por nombre, CI, correo..."
                onSearch={val => { setSearch(val); setPage(1); }}
            />

            {/* Filter tabs */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 p-1.5 flex gap-1 w-fit">
                {ESTADOS.map(est => (
                    <button key={est.value}
                        onClick={() => { setEstadoFiltro(est.value); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                            ${estadoFiltro === est.value
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'}`}>
                        {est.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <ResponsiveTable
                        storageKey="postulaciones_view"
                        emptyMessage={
                            <div className="flex flex-col items-center justify-center text-slate-400 py-6">
                                <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
                                <p className="font-medium">No hay postulaciones</p>
                                <p className="text-sm mt-1">Cambia el filtro o espera nuevas solicitudes</p>
                            </div>
                        }
                        columns={[
                            {
                                label: "Postulante", key: "nombre", render: (item) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm shrink-0">
                                            {item.nombre ? item.nombre[0].toUpperCase() : 'P'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 truncate">{item.nombre} {item.apellido}</p>
                                            <p className="text-xs text-slate-500 font-mono">CI: {item.carnet_identidad}</p>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: "Contacto", key: "correo", render: (item) => (
                                    <div className="space-y-0.5 text-sm text-slate-600">
                                        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{item.correo}</span></div>
                                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate">{item.telefono}</span></div>
                                    </div>
                                )
                            },
                            {
                                label: "Especialidades", key: "especialidades", render: (item) => (
                                    <p className="text-sm text-slate-600 max-w-[160px] truncate" title={item.especialidades}>
                                        {item.especialidades || <span className="text-slate-400 italic">—</span>}
                                    </p>
                                )
                            },
                            {
                                label: "Estado", key: "estado", render: (item) => <EstadoBadge estado={item.estado} />
                            },
                            {
                                label: "Fecha", key: "createdAt", render: (item) => (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                )
                            }
                        ]}
                        data={data}
                        actions={[
                            {
                                label: "Revisar", icon: Eye, className: "px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-200",
                                onClick: (item) => { setSelectedId(item.id_postulacion); setShowModal(true); }
                            },
                            {
                                label: "Eliminar", icon: Trash2, className: "px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-medium shadow-sm hover:bg-red-100",
                                show: (item) => item.estado === 'RECHAZADO',
                                onClick: (item) => setDeleteId(item.id_postulacion)
                            }
                        ]}
                        pagination={{ total, totalPage: totalPages, page, onPageChange: setPage }}
                    />
                )}
            </div>

            {/* Modal: Ver postulación */}
            <Modal isOpen={showModal} title="Detalle de Postulación" onClose={() => setShowModal(false)}>
                {selectedId && (
                    <VerPostulacionModal
                        id={selectedId}
                        onClose={() => setShowModal(false)}
                        onAccept={(id) => setAcceptId(id)}
                        onReject={(id) => setRejectId(id)}
                    />
                )}
            </Modal>

            <ConfirmDeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                message="¿Eliminar definitivamente esta postulación? Esta acción no puede deshacerse."
            />

            {/* Confirm Reject */}
            <ConfirmDeleteModal
                isOpen={!!rejectId}
                onClose={() => setRejectId(null)}
                onConfirm={handleConfirmReject}
                title="Rechazar Postulación"
                message="¿Estás seguro que deseas rechazar esta postulación? Los documentos se mantendrán por si se subsanan errores."
                confirmLabel="Rechazar"
                confirmColor="red"
                confirmIcon={<XCircle className="w-4 h-4" />}
            />

            {/* Confirm Accept */}
            <ConfirmActionModal
                isOpen={!!acceptId}
                onClose={() => setAcceptId(null)}
                onConfirm={handleConfirmAccept}
                title="Aceptar Postulación"
                message="¿Estás seguro que deseas aceptar esta postulación? Se creará el registro de colegiado correspondiente."
                confirmLabel="Aceptar"
                confirmColor="emerald"
                confirmIcon={<CheckCircle2 className="w-4 h-4" />}
            />



            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert(a => ({ ...a, show: false }))} />
        </div>
    );
}
