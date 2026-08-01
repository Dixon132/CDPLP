import { useEffect, useState } from "react";
import { getAllRoles, estadoRol, actualizarRol } from "../../services/roles";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import AsignarRol from "./Components/AsignarRol";
import { Shield, Eye, EyeOff, Edit3, ShieldCheck, ShieldX, Calendar, User, Crown, CheckCircle, XCircle, Settings } from "lucide-react";

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Confirm ANTES de guardar — el callback es quien ejecuta la petición
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "edit", callback: null });

    // Doble confirmación activar/desactivar
    const [estadoTarget, setEstadoTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    const fetchRoles = async () => {
        const { data, total, totalPages, page: cp } = await getAllRoles({ page, search, inactivos: mostrarInactivos });
        setRoles(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    };
    useEffect(() => { fetchRoles(); }, [page, search, mostrarInactivos]);

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleCambioEstado = async () => {
        try {
            await estadoRol(estadoTarget, mostrarInactivos ? "ACTIVO" : "INACTIVO");
            showAlertFn("success", mostrarInactivos ? "Rol activado correctamente." : "Rol desactivado correctamente.");
            fetchRoles();
        } catch { showAlertFn("error", "Error al actualizar el estado del rol."); }
        finally { setEstadoTarget(null); }
    };

    const getEstadoBadge = (activo) =>
        activo
            ? "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-500 border border-rose-100";

    const getEstadoIcon = (activo) =>
        activo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />;

    const getRolIcon = (rol) => {
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador": return <Crown className="w-4 h-4 text-amber-500" />;
            case "moderador": return <Shield className="w-4 h-4 text-blue-500" />;
            case "usuario": return <User className="w-4 h-4 text-slate-500" />;
            default: return <Settings className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getRolBadge = (rol) => {
        const b = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold";
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador": return `${b} bg-amber-50 text-amber-600 border border-amber-100`;
            case "moderador": return `${b} bg-blue-50 text-blue-600 border border-blue-100`;
            default: return `${b} bg-slate-50 text-slate-600 border border-slate-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Gestión de Roles" icon={<Shield className="w-8 h-8" />}
                stats={[{ label: "Total de Roles", value: total, color: "blue" }]}
                searchPlaceholder="Buscar roles o usuarios..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[{
                    label: mostrarInactivos ? "Ver Activos" : "Ver Inactivos",
                    icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                    onClick: () => setMostrarInactivos(!mostrarInactivos),
                    color: mostrarInactivos ? "emerald" : "rose",
                }]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="roles"
                    columns={[
                        {
                            label: "Usuario", key: "usuario", render: (r) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm shrink-0">{r.usuarios?.nombre?.[0]?.toUpperCase() || "U"}</div>
                                    <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{r.usuarios?.nombre} {r.usuarios?.apellido}</p><p className="text-xs text-slate-500">ID: {r.id_rol}</p></div>
                                </div>)
                        },
                        { label: "Rol", key: "rol", render: (r) => <span className={getRolBadge(r.rol)}>{getRolIcon(r.rol)} {r.rol}</span> },
                        {
                            label: "Período", key: "fecha", render: (r) => (
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{new Date(r.fecha_inicio).toLocaleDateString()}</span></div>
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString() : "—"}</span></div>
                                </div>)
                        },
                        { label: "Estado", key: "estado", render: (r) => <span className={getEstadoBadge(r.activo)}>{getEstadoIcon(r.activo)} {r.activo ? "Activo" : "Inactivo"}</span> },
                    ]}
                    data={roles}
                    actions={[
                        {
                            label: "Editar", icon: Edit3, className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100",
                            onClick: (r) => { setCurrentId(r.id_rol); setMostrarModal(true); }
                        },
                        {
                            label: mostrarInactivos ? "Activar" : "Desactivar", icon: mostrarInactivos ? ShieldCheck : ShieldX,
                            className: mostrarInactivos ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100" : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100",
                            onClick: (r) => setEstadoTarget(r.id_rol)
                        },
                    ]}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                />
            </div>

            {/* Form — abre directo y delega el guardado al confirm */}
            <Modal isOpen={mostrarModal} title="Asignar / Modificar Rol" onClose={() => setMostrarModal(false)}>
                <AsignarRol
                    id={currentId}
                    onClose={() => setMostrarModal(false)}
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: async () => {
                                try {
                                    await actualizarRol(currentId, payload);
                                    setMostrarModal(false);
                                    showAlertFn("success", "Rol actualizado correctamente.");
                                    fetchRoles();
                                } catch { showAlertFn("error", "Error al actualizar el rol."); }
                            },
                        });
                    }}
                />
            </Modal>

            {/* ✅ Confirm ANTES de guardar — cancelar aborta la operación */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title="¿Confirmar cambios?"
                message="¿Confirmas que deseas guardar los cambios realizados al rol?"
                onClose={() => setConfirmSave((prev) => ({ ...prev, open: false }))}
                onConfirm={async () => {
                    await confirmSave.callback?.();
                    setConfirmSave((prev) => ({ ...prev, open: false }));
                }}
            />

            {/* ✅ Doble confirmación activar/desactivar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!estadoTarget}
                onClose={() => setEstadoTarget(null)}
                onConfirm={handleCambioEstado}
                title={mostrarInactivos ? "Activar Rol" : "Desactivar Rol"}
                message={`¿Confirmas que deseas ${mostrarInactivos ? "activar" : "desactivar"} este rol?`}
                waitSeconds={4}
                confirmColor={mostrarInactivos ? "emerald" : "amber"}
                confirmIcon={mostrarInactivos ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                confirmLabel={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Roles;
