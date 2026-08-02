import { useEffect, useState } from "react";
import {
    getDocumentosRequeridosAdmin,
    createDocumentoRequerido,
    updateDocumentoRequerido,
    toggleEstadoDocumentoRequerido,
} from "../../../services/documentosRequeridos";
import Modal from "../../../../../components/Modal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ResponsiveTable from "../../../components/ResponsiveTable";
import Alerts from "../../../components/Alerts";
import { useSession } from "../../../../../context/SessionProvider";
import {
    FileText,
    Plus,
    Edit3,
    UserCheck,
    UserX,
} from "lucide-react";

// ── Form inline para crear / editar ───────────────────────────────────────────
function DocumentoRequeridoForm({ initial = {}, onSubmit, onCancel, loading }) {
    const [nombre, setNombre] = useState(initial.nombre || "");
    const [descripcion, setDescripcion] = useState(initial.descripcion || "");
    const [esOpcional, setEsOpcional] = useState(initial.es_opcional ?? false);
    const [orden, setOrden] = useState(initial.orden ?? 0);
    const [vigenciaMeses, setVigenciaMeses] = useState(initial.vigencia_meses ?? "");
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!nombre.trim()) errs.nombre = "El nombre es obligatorio";
        else if (nombre.trim().length < 3) errs.nombre = "Mínimo 3 caracteres";
        if (orden !== "" && isNaN(Number(orden))) errs.orden = "El orden debe ser un número";
        if (vigenciaMeses !== "" && (isNaN(Number(vigenciaMeses)) || Number(vigenciaMeses) < 1)) {
            errs.vigenciaMeses = "Debe ser un número mayor a 0";
        }
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onSubmit({
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            es_opcional: esOpcional,
            orden: Number(orden),
            vigencia_meses: vigenciaMeses === "" ? null : Number(vigenciaMeses),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setErrors((p) => ({ ...p, nombre: "" })); }}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.nombre ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition`}
                    placeholder="Ej. Carnet de Identidad"
                    disabled={loading}
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Descripción
                </label>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
                    placeholder="Descripción breve (opcional)"
                    disabled={loading}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Vigencia (meses)
                </label>
                <input
                    type="number"
                    min={1}
                    value={vigenciaMeses}
                    onChange={(e) => { setVigenciaMeses(e.target.value); setErrors((p) => ({ ...p, vigenciaMeses: "" })); }}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.vigenciaMeses ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition`}
                    placeholder="Déjalo en blanco si el documento no vence"
                    disabled={loading}
                />
                {errors.vigenciaMeses ? (
                    <p className="text-xs text-red-500 mt-1">{errors.vigenciaMeses}</p>
                ) : (
                    <p className="text-xs text-slate-400 mt-1">Al subir este documento, la fecha de vencimiento se calculará automáticamente</p>
                )}
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Orden
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={orden}
                        onChange={(e) => { setOrden(e.target.value); setErrors((p) => ({ ...p, orden: "" })); }}
                        className={`w-full px-4 py-2.5 rounded-xl border ${errors.orden ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition`}
                        disabled={loading}
                    />
                    {errors.orden && <p className="text-xs text-red-500 mt-1">{errors.orden}</p>}
                </div>

                <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={esOpcional}
                                onChange={(e) => setEsOpcional(e.target.checked)}
                                className="sr-only peer"
                                disabled={loading}
                            />
                            <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Es opcional</span>
                    </label>
                </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    )}
                    Guardar
                </button>
            </div>
        </form>
    );
}

// ── Componente principal ───────────────────────────────────────────────────────
const DocumentosRequeridosCRUD = () => {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("ajustes.documentos_requeridos");
    const [documentos, setDocumentos] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Modal crear
    const [showCreate, setShowCreate] = useState(false);
    const [savingCreate, setSavingCreate] = useState(false);

    // Modal editar
    const [editTarget, setEditTarget] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // ConfirmAction (crear/editar)
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // Confirmar toggle estado
    const [toggleTarget, setToggleTarget] = useState(null);

    // Alerts
    const [alert, setAlert] = useState({ show: false, type: "success", msg: "" });

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showAlert = (type, msg) => {
        setAlert({ show: true, type, msg });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3500);
    };

    const loadData = async () => {
        setLoadingData(true);
        try {
            const res = await getDocumentosRequeridosAdmin();
            setDocumentos(res.data ?? []);
        } catch {
            showAlert("error", "Error al cargar documentos requeridos.");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ── Crear ─────────────────────────────────────────────────────────────────
    const handleCreateSubmit = (data) => {
        setSavingCreate(true);
        createDocumentoRequerido(data)
            .then(() => {
                setConfirmSave({
                    open: true,
                    variant: "create",
                    callback: () => {
                        setShowCreate(false);
                        showAlert("success", "Documento requerido creado correctamente.");
                        loadData();
                    },
                });
            })
            .catch(() => {
                showAlert("error", "Error al crear el documento requerido.");
            })
            .finally(() => setSavingCreate(false));
    };

    // ── Editar ────────────────────────────────────────────────────────────────
    const handleEditSubmit = (data) => {
        if (!editTarget) return;
        setSavingEdit(true);
        updateDocumentoRequerido(editTarget.id_doc_req, data)
            .then(() => {
                setConfirmSave({
                    open: true,
                    variant: "edit",
                    callback: () => {
                        setEditTarget(null);
                        showAlert("success", "Documento requerido actualizado correctamente.");
                        loadData();
                    },
                });
            })
            .catch(() => {
                showAlert("error", "Error al actualizar el documento requerido.");
            })
            .finally(() => setSavingEdit(false));
    };

    // ── Toggle estado ─────────────────────────────────────────────────────────
    const handleToggleEstado = async () => {
        if (!toggleTarget) return;
        try {
            await toggleEstadoDocumentoRequerido(toggleTarget.id_doc_req);
            showAlert(
                "success",
                toggleTarget.activo
                    ? "Documento desactivado correctamente."
                    : "Documento activado correctamente."
            );
            loadData();
        } catch {
            showAlert("error", "Error al cambiar el estado del documento.");
        } finally {
            setToggleTarget(null);
        }
    };

    // ── Badges ────────────────────────────────────────────────────────────────
    const EstadoBadge = ({ activo }) =>
        activo ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                ● Activo
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                ● Inactivo
            </span>
        );

    const OpcionalBadge = ({ esOpcional }) =>
        esOpcional ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                Opcional
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                Obligatorio
            </span>
        );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Cabecera de sección */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Documentos Requeridos</h2>
                        <p className="text-xs text-slate-500">
                            {documentos.length} documento{documentos.length !== 1 ? "s" : ""} registrado{documentos.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                {esEditor && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar documento
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div>
                {loadingData ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">
                        Cargando documentos requeridos…
                    </div>
                ) : (
                    <ResponsiveTable
                        storageKey="documentos-requeridos"
                        columns={[
                            {
                                label: "Nombre",
                                key: "nombre",
                                render: (item) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm">
                                            {item.nombre?.[0]?.toUpperCase() ?? "?"}
                                        </div>
                                        <span className="font-semibold text-slate-800">{item.nombre}</span>
                                    </div>
                                ),
                            },
                            {
                                label: "Descripción",
                                key: "descripcion",
                                render: (item) => (
                                    <span className="text-slate-500 text-sm">
                                        {item.descripcion || <em className="text-slate-300">Sin descripción</em>}
                                    </span>
                                ),
                            },
                            {
                                label: "Tipo",
                                key: "es_opcional",
                                render: (item) => <OpcionalBadge esOpcional={item.es_opcional} />,
                            },
                            {
                                label: "Vigencia",
                                key: "vigencia_meses",
                                render: (item) => (
                                    <span className="text-slate-600 text-sm">
                                        {item.vigencia_meses ? `${item.vigencia_meses} mes(es)` : <em className="text-slate-300">No vence</em>}
                                    </span>
                                ),
                            },
                            {
                                label: "Orden",
                                key: "orden",
                                render: (item) => (
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm">
                                        {item.orden}
                                    </span>
                                ),
                            },
                            {
                                label: "Estado",
                                key: "activo",
                                render: (item) => <EstadoBadge activo={item.activo} />,
                            },
                        ]}
                        data={documentos}
                        actions={esEditor ? [
                            {
                                label: "Editar",
                                icon: Edit3,
                                className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 border border-amber-100 flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest",
                                onClick: (item) => setEditTarget(item),
                            },
                            {
                                label: (item) => (item.activo ? "Desactivar" : "Activar"),
                                icon: (item) => (item.activo ? UserX : UserCheck),
                                className: (item) =>
                                    item.activo
                                        ? "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 border border-rose-100 flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest"
                                        : "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 border border-emerald-100 flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest",
                                onClick: (item) => setToggleTarget(item),
                            },
                        ] : []}
                        emptyMessage="No hay documentos requeridos registrados"
                    />
                )}
            </div>

            {/* ── Modal crear ── */}
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Agregar Documento Requerido"
            >
                <DocumentoRequeridoForm
                    onSubmit={handleCreateSubmit}
                    onCancel={() => setShowCreate(false)}
                    loading={savingCreate}
                />
            </Modal>

            {/* ── Modal editar ── */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Editar Documento Requerido"
            >
                {editTarget && (
                    <DocumentoRequeridoForm
                        initial={editTarget}
                        onSubmit={handleEditSubmit}
                        onCancel={() => setEditTarget(null)}
                        loading={savingEdit}
                    />
                )}
            </Modal>

            {/* ── ConfirmAction tras guardar ── */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={
                    confirmSave.variant === "create"
                        ? "¿Confirmas que deseas crear este documento requerido?"
                        : "¿Confirmas que deseas guardar los cambios realizados?"
                }
                onClose={() => setConfirmSave((s) => ({ ...s, open: false }))}
                onConfirm={() => {
                    setConfirmSave((s) => ({ ...s, open: false }));
                    confirmSave.callback?.();
                }}
            />

            {/* ── ConfirmDeleteModal para activar / desactivar ── */}
            <ConfirmDeleteModal
                isOpen={!!toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggleEstado}
                title={toggleTarget?.activo ? "Desactivar Documento" : "Activar Documento"}
                message={
                    toggleTarget?.activo
                        ? `¿Confirmas que deseas desactivar el documento "${toggleTarget?.nombre}"? No será requerido en nuevas postulaciones.`
                        : `¿Confirmas que deseas activar el documento "${toggleTarget?.nombre}"? Volverá a ser requerido en postulaciones.`
                }
                waitSeconds={toggleTarget?.activo ? 4 : 2}
                confirmColor={toggleTarget?.activo ? "amber" : "emerald"}
                confirmIcon={
                    toggleTarget?.activo ? (
                        <UserX className="w-4 h-4" />
                    ) : (
                        <UserCheck className="w-4 h-4" />
                    )
                }
                confirmLabel={toggleTarget?.activo ? "Desactivar" : "Activar"}
            />

            {/* ── Alert feedback ── */}
            <Alerts
                type={alert.type}
                message={alert.msg}
                show={alert.show}
                onClose={() => setAlert((a) => ({ ...a, show: false }))}
            />
        </div>
    );
};

export default DocumentosRequeridosCRUD;
