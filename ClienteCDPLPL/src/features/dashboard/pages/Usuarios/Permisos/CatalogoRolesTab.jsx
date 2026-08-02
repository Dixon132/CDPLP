import { useEffect, useState } from "react";
import {
    getCatalogoRoles,
    createCatalogoRol,
    updateCatalogoRol,
    toggleEstadoCatalogoRol,
} from "../../../services/catalogoRoles";
import Modal from "../../../../../components/Modal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import ResponsiveTable from "../../../components/ResponsiveTable";
import Alerts from "../../../components/Alerts";
import { Plus, Edit3, ShieldCheck, ShieldX, Lock, Crown } from "lucide-react";

function RolForm({ initial = {}, onSubmit, onCancel }) {
    const [nombre, setNombre] = useState(initial.nombre || "");
    const [descripcion, setDescripcion] = useState(initial.descripcion || "");
    const [error, setError] = useState("");
    const esEdicion = !!initial.id_rol_catalogo;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!esEdicion && nombre.trim().length < 3) {
            setError("El nombre debe tener al menos 3 caracteres");
            return;
        }
        onSubmit(esEdicion ? { descripcion: descripcion.trim() } : { nombre: nombre.trim(), descripcion: descripcion.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nombre {!esEdicion && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setError(""); }}
                    disabled={esEdicion}
                    className={`w-full px-4 py-2.5 rounded-xl border ${error ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition disabled:bg-slate-100 disabled:text-slate-400`}
                    placeholder="Ej. AUXILIAR_CONTABLE"
                />
                {esEdicion && (
                    <p className="text-xs text-slate-400 mt-1">El nombre de un rol ya creado no se puede cambiar.</p>
                )}
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
                    placeholder="Para qué se usa este rol (opcional)"
                />
            </div>
            <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition">
                    Cancelar
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition">
                    Guardar
                </button>
            </div>
        </form>
    );
}

const CatalogoRolesTab = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [toggleTarget, setToggleTarget] = useState(null);

    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });
    const [alert, setAlert] = useState({ show: false, type: "success", msg: "" });

    const showAlert = (type, msg) => {
        setAlert({ show: true, type, msg });
        setTimeout(() => setAlert((a) => ({ ...a, show: false })), 3500);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            setRoles(await getCatalogoRoles());
        } catch {
            showAlert("error", "Error al cargar el catálogo de roles.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadData(); }, []);

    const handleToggleEstado = async () => {
        if (!toggleTarget) return;
        try {
            await toggleEstadoCatalogoRol(toggleTarget.id_rol_catalogo);
            showAlert("success", toggleTarget.activo ? "Rol desactivado correctamente." : "Rol activado correctamente.");
            loadData();
        } catch {
            showAlert("error", "Error al cambiar el estado del rol.");
        } finally {
            setToggleTarget(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 max-w-xl">
                    Roles de negocio (Presidente, Tesorero, etc.). Cada uno tiene una plantilla de permisos por
                    defecto en la pestaña "Permisos por rol" — los overrides individuales de la pestaña "Permisos
                    por usuario" ganan sobre esta plantilla sin modificarla.
                </p>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition shadow-sm shrink-0"
                >
                    <Plus className="w-4 h-4" /> Nuevo rol
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">Cargando roles…</div>
            ) : (
                <ResponsiveTable
                    storageKey="catalogo-roles"
                    columns={[
                        {
                            label: "Rol", key: "nombre", render: (r) => (
                                <div className="flex items-center gap-2">
                                    {r.es_sistema ? <Lock className="w-4 h-4 text-slate-400" /> : <Crown className="w-4 h-4 text-amber-500" />}
                                    <span className="font-semibold text-slate-800">{r.nombre.replaceAll("_", " ")}</span>
                                </div>
                            ),
                        },
                        {
                            label: "Descripción", key: "descripcion", render: (r) => (
                                <span className="text-slate-500 text-sm">{r.descripcion || <em className="text-slate-300">Sin descripción</em>}</span>
                            ),
                        },
                        {
                            label: "Estado", key: "activo", render: (r) => (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.activo ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                    ● {r.activo ? "Activo" : "Inactivo"}
                                </span>
                            ),
                        },
                    ]}
                    data={roles}
                    actions={[
                        {
                            label: "Editar", icon: Edit3,
                            className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 border border-amber-100",
                            onClick: (r) => setEditTarget(r),
                        },
                        {
                            label: (r) => (r.activo ? "Desactivar" : "Activar"),
                            icon: (r) => (r.activo ? ShieldX : ShieldCheck),
                            className: (r) =>
                                r.es_sistema
                                    ? "px-3 py-1.5 bg-slate-50 text-slate-300 rounded-xl font-medium cursor-not-allowed"
                                    : r.activo
                                        ? "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 border border-rose-100"
                                        : "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 border border-emerald-100",
                            onClick: (r) => { if (!r.es_sistema) setToggleTarget(r); },
                        },
                    ]}
                    emptyMessage="No hay roles registrados"
                />
            )}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Rol">
                <RolForm
                    onSubmit={(data) => {
                        setConfirmSave({
                            open: true,
                            variant: "create",
                            callback: async () => {
                                try {
                                    await createCatalogoRol(data);
                                    setShowCreate(false);
                                    showAlert("success", "Rol creado correctamente.");
                                    loadData();
                                } catch (err) {
                                    showAlert("error", err?.response?.data?.message || "Error al crear el rol.");
                                }
                            },
                        });
                    }}
                    onCancel={() => setShowCreate(false)}
                />
            </Modal>

            <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Rol">
                {editTarget && (
                    <RolForm
                        initial={editTarget}
                        onSubmit={(data) => {
                            setConfirmSave({
                                open: true,
                                variant: "edit",
                                callback: async () => {
                                    try {
                                        await updateCatalogoRol(editTarget.id_rol_catalogo, data);
                                        setEditTarget(null);
                                        showAlert("success", "Rol actualizado correctamente.");
                                        loadData();
                                    } catch {
                                        showAlert("error", "Error al actualizar el rol.");
                                    }
                                },
                            });
                        }}
                        onCancel={() => setEditTarget(null)}
                    />
                )}
            </Modal>

            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas crear este rol?" : "¿Confirmas que deseas guardar los cambios?"}
                onClose={() => setConfirmSave((s) => ({ ...s, open: false }))}
                onConfirm={async () => {
                    await confirmSave.callback?.();
                    setConfirmSave((s) => ({ ...s, open: false }));
                }}
            />

            <ConfirmDeleteModal
                isOpen={!!toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggleEstado}
                title={toggleTarget?.activo ? "Desactivar Rol" : "Activar Rol"}
                message={
                    toggleTarget?.activo
                        ? `¿Confirmas que deseas desactivar el rol "${toggleTarget?.nombre}"? Ya no podrá asignarse a usuarios nuevos.`
                        : `¿Confirmas que deseas activar el rol "${toggleTarget?.nombre}"?`
                }
                waitSeconds={toggleTarget?.activo ? 4 : 2}
                confirmColor={toggleTarget?.activo ? "amber" : "emerald"}
                confirmIcon={toggleTarget?.activo ? <ShieldX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                confirmLabel={toggleTarget?.activo ? "Desactivar" : "Activar"}
            />

            <Alerts type={alert.type} message={alert.msg} show={alert.show} onClose={() => setAlert((a) => ({ ...a, show: false }))} />
        </div>
    );
};

export default CatalogoRolesTab;
