import { useEffect, useState } from "react";
import {
    getInstituciones,
    createInstitucion,
    updateInstitucion,
    deleteInstitucion,
} from "../../../services/instituciones";
import Modal from "../../../../../components/Modal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ResponsiveTable from "../../../components/ResponsiveTable";
import Alerts from "../../../components/Alerts";
import {
    Building2,
    Plus,
    Edit3,
    Trash2,
} from "lucide-react";

// ── Form inline para crear / editar ───────────────────────────────────────────
function InstitucionForm({ initial = {}, onSubmit, onCancel, loading }) {
    const [nombre, setNombre] = useState(initial.nombre || "");
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!nombre.trim()) errs.nombre = "El nombre es obligatorio";
        else if (nombre.trim().length < 3) errs.nombre = "Mínimo 3 caracteres";
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onSubmit({ nombre: nombre.trim() });
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
                    placeholder="Ej. Universidad Mayor de San Andrés"
                    disabled={loading}
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
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
const InstitucionesCRUD = () => {
    const [instituciones, setInstituciones] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Modal crear
    const [showCreate, setShowCreate] = useState(false);
    const [savingCreate, setSavingCreate] = useState(false);

    // Modal editar
    const [editTarget, setEditTarget] = useState(null); // institucion a editar
    const [savingEdit, setSavingEdit] = useState(false);

    // ConfirmAction (crear/editar)
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // Confirmar eliminar
    const [deleteTarget, setDeleteTarget] = useState(null); 

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
            const res = await getInstituciones();
            setInstituciones(res ?? []);
        } catch {
            showAlert("error", "Error al cargar instituciones.");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ── Crear ─────────────────────────────────────────────────────────────────
    const handleCreateSubmit = (data) => {
        setSavingCreate(true);
        createInstitucion(data)
            .then(() => {
                setConfirmSave({
                    open: true,
                    variant: "create",
                    callback: () => {
                        setShowCreate(false);
                        showAlert("success", "Institución creada correctamente.");
                        loadData();
                    },
                });
            })
            .catch((err) => {
                const msg =
                    err?.response?.status === 400
                        ? "Ya existe una institución con ese nombre."
                        : "Error al crear la institución.";
                showAlert("error", msg);
            })
            .finally(() => setSavingCreate(false));
    };

    // ── Editar ────────────────────────────────────────────────────────────────
    const handleEditSubmit = (data) => {
        if (!editTarget) return;
        setSavingEdit(true);
        updateInstitucion(editTarget.id_institucion, data)
            .then(() => {
                setConfirmSave({
                    open: true,
                    variant: "edit",
                    callback: () => {
                        setEditTarget(null);
                        showAlert("success", "Institución actualizada correctamente.");
                        loadData();
                    },
                });
            })
            .catch((err) => {
                const msg =
                    err?.response?.status === 400
                        ? "Ya existe una institución con ese nombre."
                        : "Error al actualizar la institución.";
                showAlert("error", msg);
            })
            .finally(() => setSavingEdit(false));
    };

    // ── Eliminar ─────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteInstitucion(deleteTarget.id_institucion);
            showAlert("success", "Institución eliminada correctamente.");
            loadData();
        } catch {
            showAlert("error", "Error al eliminar la institución.");
        } finally {
            setDeleteTarget(null);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Cabecera de sección */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Instituciones</h2>
                        <p className="text-xs text-slate-500">
                            {instituciones.length} institución{instituciones.length !== 1 ? "es" : ""} registrada{instituciones.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Agregar institución
                </button>
            </div>

            {/* Tabla */}
            <div>
                {loadingData ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">
                        Cargando instituciones…
                    </div>
                ) : (
                    <ResponsiveTable
                        storageKey="instituciones"
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
                            }
                        ]}
                        data={instituciones}
                        actions={[
                            {
                                label: "Editar",
                                icon: Edit3,
                                className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 border border-amber-100 flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest",
                                onClick: (item) => setEditTarget(item),
                            },
                            {
                                label: "Eliminar",
                                icon: Trash2,
                                className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 border border-rose-100 flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest",
                                onClick: (item) => setDeleteTarget(item),
                            },
                        ]}
                        emptyMessage="No hay instituciones registradas"
                    />
                )}
            </div>

            {/* ── Modal crear ── */}
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Agregar Institución"
            >
                <InstitucionForm
                    onSubmit={handleCreateSubmit}
                    onCancel={() => setShowCreate(false)}
                    loading={savingCreate}
                />
            </Modal>

            {/* ── Modal editar ── */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Editar Institución"
            >
                {editTarget && (
                    <InstitucionForm
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
                        ? "¿Confirmas que deseas crear esta institución?"
                        : "¿Confirmas que deseas guardar los cambios realizados?"
                }
                onClose={() => setConfirmSave((s) => ({ ...s, open: false }))}
                onConfirm={() => {
                    setConfirmSave((s) => ({ ...s, open: false }));
                    confirmSave.callback?.();
                }}
            />

            {/* ── ConfirmDeleteModal para eliminar ── */}
            <ConfirmDeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Eliminar Institución"
                message={`¿Confirmas que deseas eliminar la institución "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
                waitSeconds={4}
                confirmColor="rose"
                confirmIcon={<Trash2 className="w-4 h-4" />}
                confirmLabel="Eliminar"
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

export default InstitucionesCRUD;
