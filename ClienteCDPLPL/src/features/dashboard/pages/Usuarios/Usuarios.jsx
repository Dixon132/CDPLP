import { useEffect, useState } from "react";
import { ActivarUsuarios, desactivarUsuarios, getAllActiveUsuarios, createUsuario, ModificarUsuario } from "../../services/usuarios";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import CreateUser from "./Components/CreateUser";
import ModificarUser from "./Components/ModificarUser";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import { Users, UserPlus, Edit3, UserCheck, UserX, Mail, Phone, MapPin, Eye, EyeOff } from "lucide-react";
import { getEstadoBadge, getEstadoIcon } from "../../hooks/estados";

const Usuarios = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalModificar, setMostrarModalModificar] = useState(false);
    const [usuarioModificando, setUsuarioModificando] = useState(null);

    // Confirm ANTES de guardar — el callback es quien ejecuta la petición
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // Doble confirmación activar/desactivar
    const [estadoTarget, setEstadoTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    const fetchUsuarios = async () => {
        const { data, total, page: cp, totalPages } =
            await getAllActiveUsuarios({ page, search, inactivos: mostrarInactivos });
        setUsers(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    };
    useEffect(() => { fetchUsuarios(); }, [page, search, mostrarInactivos]);

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleCambioEstado = async () => {
        try {
            if (mostrarInactivos) await ActivarUsuarios(estadoTarget);
            else await desactivarUsuarios(estadoTarget);
            showAlertFn("success", mostrarInactivos ? "Usuario activado correctamente." : "Usuario desactivado correctamente.");
            fetchUsuarios();
        } catch { showAlertFn("error", "Error al actualizar el estado del usuario."); }
        finally { setEstadoTarget(null); }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Gestión de Usuarios" icon={<Users className="w-8 h-8" />}
                stats={[{ label: "Total", value: total, color: "purple" }]}
                searchPlaceholder="Buscar por nombre, correo o dirección..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    { label: "Añadir Usuario", icon: <UserPlus />, onClick: () => setMostrarModal(true), color: "purple" },
                    { label: mostrarInactivos ? "Ver Activos" : "Ver Inactivos", icon: mostrarInactivos ? <Eye /> : <EyeOff />, onClick: () => setMostrarInactivos(!mostrarInactivos), color: mostrarInactivos ? "emerald" : "rose" },
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="usuarios"
                    columns={[
                        {
                            label: "Usuario", key: "nombre", render: (item) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold shadow-sm shrink-0">{item.nombre[0].toUpperCase()}</div>
                                    <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{item.nombre} {item.apellido}</p><p className="text-xs text-slate-500">ID: {item.id_usuario}</p></div>
                                </div>)
                        },
                        {
                            label: "Contacto", key: "correo", render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{item.correo}</span></div>
                                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{item.telefono}</span></div>
                                </div>)
                        },
                        {
                            label: "Dirección", key: "direccion", render: (item) => (
                                <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-4 h-4 text-purple-400 shrink-0" /> <span className="truncate">{item.direccion || "N/A"}</span></div>)
                        },
                        { label: "Estado", key: "estado", render: (item) => <span className={getEstadoBadge(item.estado)}>{getEstadoIcon(item.estado)} {item.estado}</span> },
                    ]}
                    data={users}
                    actions={[
                        {
                            label: "Editar", icon: Edit3, className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100",
                            onClick: (item) => { setUsuarioModificando(item.id_usuario); setMostrarModalModificar(true); }
                        },
                        {
                            label: mostrarInactivos ? "Activar" : "Desactivar", icon: mostrarInactivos ? UserCheck : UserX,
                            className: mostrarInactivos ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100" : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100",
                            onClick: (item) => setEstadoTarget(item.id_usuario)
                        },
                    ]}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                />
            </div>

            {/* Forms — abren directo y delegan el guardado al confirm */}
            <Modal isOpen={mostrarModal} title="Crear Usuario" onClose={() => setMostrarModal(false)}>
                <CreateUser
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: async () => {
                                try {
                                    await createUsuario(payload);
                                    setMostrarModal(false);
                                    showAlertFn("success", "Usuario creado correctamente.");
                                    fetchUsuarios();
                                } catch { showAlertFn("error", "Error al crear el usuario."); }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModalModificar} title="Modificar Usuario" onClose={() => setMostrarModalModificar(false)}>
                <ModificarUser
                    id={usuarioModificando}
                    onClose={() => setMostrarModalModificar(false)}
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: async () => {
                                try {
                                    await ModificarUsuario(usuarioModificando, payload);
                                    setMostrarModalModificar(false);
                                    showAlertFn("success", "Usuario modificado correctamente.");
                                    fetchUsuarios();
                                } catch { showAlertFn("error", "Error al modificar el usuario."); }
                            },
                        });
                    }}
                />
            </Modal>

            {/* ✅ Confirm ANTES de guardar — cancelar aborta la operación */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas crear este usuario?" : "¿Confirmas que deseas guardar los cambios realizados?"}
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
                title={mostrarInactivos ? "Activar Usuario" : "Desactivar Usuario"}
                message={`¿Confirmas que deseas ${mostrarInactivos ? "activar" : "desactivar"} este usuario?`}
                waitSeconds={4}
                confirmColor={mostrarInactivos ? "emerald" : "amber"}
                confirmIcon={mostrarInactivos ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                confirmLabel={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Usuarios;
