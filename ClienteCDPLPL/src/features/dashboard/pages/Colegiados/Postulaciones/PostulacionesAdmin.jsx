import { useState, useEffect, useCallback } from 'react';
import {
    getPostulaciones,
    getPostulacionById,
    aceptarPostulacion,
    rechazarPostulacion,
    eliminarPostulacion,
    getConfigPagoAdmin,
    upsertConfigPago,
    uploadQrConfig
} from '../../../services/postulaciones';
import Header from '../../../components/Header';
import Alerts from '../../../components/Alerts';
import Modal from '../../../../../components/Modal';
import ConfirmDeleteModal from '../../../../../components/ConfirmDeleteModal';
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
    const [motivo, setMotivo] = useState('');
    const [rechazando, setRechazando] = useState(false);
    const [aceptando, setAceptando] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState(false);

    useEffect(() => {
        getPostulacionById(id)
            .then(setData)
            .catch(() => setError('Error al cargar la postulación.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleAceptar = async () => {
        setAceptando(true);
        try { await aceptarPostulacion(id); onAccept(); }
        catch { setError('Error al aceptar.'); setAceptando(false); }
    };

    const handleRechazar = async () => {
        setRechazando(true);
        try { await rechazarPostulacion(id, motivo); onReject(); }
        catch { setError('Error al rechazar.'); setRechazando(false); }
    };

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
                        {data.doc_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
                                <FileText className="w-4 h-4 text-slate-500" />
                                <span className="flex-1 text-sm text-slate-700 truncate">Documento {i + 1}</span>
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

            {/* Acciones — solo si está EN REVISIÓN */}
            {isEnRevision && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                    {showRejectInput ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700">Motivo del rechazo (opcional)</label>
                            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
                                placeholder="Ej: Documentación incompleta..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-black resize-none" />
                            <div className="flex gap-2">
                                <button onClick={() => setShowRejectInput(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all">
                                    Cancelar
                                </button>
                                <button onClick={handleRechazar} disabled={rechazando}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-all">
                                    {rechazando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Confirmar Rechazo
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setShowRejectInput(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-all">
                                <XCircle className="w-4 h-4" /> Rechazar
                            </button>
                            <button onClick={handleAceptar} disabled={aceptando}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-all">
                                {aceptando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Aceptar Postulación
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Modal: Ajustes de Configuración ────────────────────────
function AjustesConfigModal({ onClose, onSave }) {
    const [config, setConfig] = useState({ MONTO_INICIAL: '', QR: '', CUENTA: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [fileQr, setFileQr] = useState(null);

    useEffect(() => {
        getConfigPagoAdmin()
            .then(data => setConfig({
                MONTO_INICIAL: data.MONTO_INICIAL || '',
                QR: data.QR || '',
                CUENTA: data.CUENTA || ''
            }))
            .catch(() => setError('Error al cargar configuración.'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            let qrUrl = config.QR;
            if (fileQr) {
                const resQr = await uploadQrConfig(fileQr);
                qrUrl = resQr.ruta;
            }

            const items = [
                { clave: 'MONTO_INICIAL', valor: config.MONTO_INICIAL },
                { clave: 'CUENTA', valor: config.CUENTA },
            ];
            // Si hay un fileQr, el endpoint uploadQrConfig ya actualizó el QR, no hace falta reenviarlo,
            // pero lo reenviamos por si acaso, o si solo pegaron una URL manual.
            if (!fileQr && qrUrl) items.push({ clave: 'QR', valor: qrUrl });

            await upsertConfigPago(items);
            onSave();
        } catch {
            setError('Error al guardar configuración.');
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Monto Inicial (Bs)</label>
                <input type="number" required value={config.MONTO_INICIAL} onChange={e => setConfig({ ...config, MONTO_INICIAL: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                <p className="text-xs text-slate-500 mt-1">Monto de inscripción que se registrará automáticamente en los pagos.</p>
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen QR</label>
                <div className="space-y-2">
                    <input type="file" accept="image/*" onChange={e => setFileQr(e.target.files[0])}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                    <p className="text-xs font-semibold text-slate-400 text-center uppercase">O pega un enlace directo:</p>
                    <input type="url" value={config.QR} onChange={e => { setConfig({ ...config, QR: e.target.value }); setFileQr(null); }}
                        placeholder="https://.../mi-qr.jpg"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Datos de Cuenta Bancaria</label>
                <textarea rows={3} value={config.CUENTA} onChange={e => setConfig({ ...config, CUENTA: e.target.value })}
                    placeholder="Banco Nacional de Bolivia&#10;Cta: 123456789&#10;A nombre de: Colegio de Auditores"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                    Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Guardar Configuración
                </button>
            </div>
        </form>
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
    const [deleting, setDeleting] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);

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

    const handleAccept = () => {
        setShowModal(false);
        showAlert('success', '¡Postulación aceptada! El colegiado fue creado y se envió correo.');
        fetchData();
    };

    const handleReject = () => {
        setShowModal(false);
        showAlert('success', 'Postulación rechazada. Los archivos fueron eliminados y se envió correo.');
        fetchData();
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
                buttons={[
                    {
                        label: 'Ajustes',
                        icon: <Settings className="w-4 h-4" />,
                        onClick: () => setShowConfigModal(true),
                        className: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }
                ]}
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
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
                        <p className="font-medium">No hay postulaciones</p>
                        <p className="text-sm mt-1">Cambia el filtro o espera nuevas solicitudes</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    {['Postulante', 'Contacto', 'Especialidades', 'Estado', 'Fecha', 'Acciones'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map(item => (
                                    <tr key={item.id_postulacion} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-4">
                                            <div>
                                                <p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p>
                                                <p className="text-xs text-slate-500 font-mono">CI: {item.carnet_identidad}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-0.5 text-sm text-slate-600">
                                                <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" />{item.correo}</div>
                                                <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{item.telefono}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm text-slate-600 max-w-[160px] truncate" title={item.especialidades}>
                                                {item.especialidades || <span className="text-slate-400 italic">—</span>}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4"><EstadoBadge estado={item.estado} /></td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setSelectedId(item.id_postulacion); setShowModal(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-all">
                                                    <Eye className="w-3.5 h-3.5" /> Revisar
                                                </button>
                                                {item.estado === 'RECHAZADO' && (
                                                    <button
                                                        onClick={() => setDeleteId(item.id_postulacion)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-100 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Total: <strong>{total}</strong></p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slate-700 font-medium">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Ver postulación */}
            <Modal isOpen={showModal} title="Detalle de Postulación" onClose={() => setShowModal(false)}>
                {selectedId && (
                    <VerPostulacionModal
                        id={selectedId}
                        onClose={() => setShowModal(false)}
                        onAccept={handleAccept}
                        onReject={handleReject}
                    />
                )}
            </Modal>

            {/* Delete confirm */}
            <ConfirmDeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                message="¿Eliminar definitivamente esta postulación? Esta acción no puede deshacerse."
            />

            {/* Modal: Ajustes */}
            <Modal isOpen={showConfigModal} title="Configuración de Pagos" onClose={() => setShowConfigModal(false)}>
                <AjustesConfigModal 
                    onClose={() => setShowConfigModal(false)}
                    onSave={() => {
                        setShowConfigModal(false);
                        showAlert('success', 'Configuración actualizada.');
                    }}
                />
            </Modal>

            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert(a => ({ ...a, show: false }))} />
        </div>
    );
}
