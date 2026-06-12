import { useEffect, useState } from "react";
import {
    ActivarUsuarios,
    desactivarUsuarios,
    getAllActiveUsuarios,
} from "../../services/usuarios";
import Modal from "../../../../components/Modal";
import CreateUser from "./Components/CreateUser";
import ModificarUser from "./Components/ModificarUser";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import ConfirmDialog from "../../components/ConfirmDialog";

import {
    Users,
    UserPlus,
    Edit3,
    UserCheck,
    UserX,
    Mail,
    Phone,
    MapPin,
    Eye,
    EyeOff,
} from "lucide-react";

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

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [showConfirm, setShowConfirm] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    // 🔹 Cargar usuarios
    const fetchUsuarios = async () => {
        const { data, total, page: currentPage, totalPages } =
            await getAllActiveUsuarios({
                page,
                search,
                inactivos: mostrarInactivos,
            });
        setUsers(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchUsuarios();
    }, [page, search, mostrarInactivos]);

    // 🔹 Alertas
    const handleSuccess = (msg = "Operación exitosa") => {
        setAlertType("success");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleError = (msg = "Ocurrió un error. Inténtalo de nuevo.") => {
        setAlertType("error");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    // 🔹 Confirmar activación/desactivación
    const confirmarCambioEstado = (id) => {
        setUsuarioSeleccionado(id);
        setShowConfirm(true);
    };

    const handleCambioEstado = async () => {
        try {
            if (mostrarInactivos)
                await ActivarUsuarios(usuarioSeleccionado);
            else
                await desactivarUsuarios(usuarioSeleccionado);

            handleSuccess(
                mostrarInactivos
                    ? "Usuario activado correctamente"
                    : "Usuario desactivado correctamente"
            );
            fetchUsuarios();
        } catch (error) {
            handleError("Error al actualizar el estado del usuario.");
        } finally {
            setShowConfirm(false);
            setUsuarioSeleccionado(null);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* ✅ Header reutilizable */}
            <Header
                title="Gestión de Usuarios"
                icon={<Users className="w-8 h-8" />}
                stats={[{ label: "Total", value: total, color: "purple" }]}
                searchPlaceholder="Buscar por nombre, correo o dirección..."
                onSearch={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                buttons={[
                    {
                        label: "Añadir Usuario",
                        icon: <UserPlus />,
                        onClick: () => setMostrarModal(true),
                        color: "purple",
                    },
                    {
                        label: mostrarInactivos ? "Ver Activos" : "Ver Inactivos",
                        icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                        onClick: () => setMostrarInactivos(!mostrarInactivos),
                        color: mostrarInactivos ? "emerald" : "rose",
                    },
                ]}
            />

            {/* ✅ Tabla reutilizable */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <Table
                    columns={[
                        {
                            label: "Usuario",
                            key: "nombre",
                            render: (item) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold shadow-sm">
                                        {item.nombre[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {item.nombre} {item.apellido}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            ID: {item.id_usuario}
                                        </p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            label: "Contacto",
                            key: "correo",
                            render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-slate-400" /> {item.correo}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400" /> {item.telefono}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            label: "Dirección",
                            key: "direccion",
                            render: (item) => (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 text-purple-400" />{" "}
                                    {item.direccion || "N/A"}
                                </div>
                            ),
                        },
                        {
                            label: "Estado",
                            key: "estado",
                            render: (item) => (
                                <span className={getEstadoBadge(item.estado)}>
                                    {getEstadoIcon(item.estado)} {item.estado}
                                </span>
                            ),
                        },
                    ]}
                    data={users}
                    actions={[
                        {
                            label: "Editar",
                            icon: Edit3,
                            className:
                                "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 transition-colors",
                            onClick: (item) => {
                                setUsuarioModificando(item.id_usuario);
                                setMostrarModalModificar(true);
                            },
                        },
                        {
                            label: mostrarInactivos ? "Activar" : "Desactivar",
                            icon: mostrarInactivos ? UserCheck : UserX,
                            className: mostrarInactivos
                                ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors"
                                : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 transition-colors",
                            onClick: (item) => confirmarCambioEstado(item.id_usuario),
                        },
                    ]}
                    pagination={{
                        total,
                        totalPage,
                        page,
                        onPageChange: setPage,
                    }}
                />
            </div>

            {/* ✅ Modales */}
            <Modal
                isOpen={mostrarModal}
                title="Crear Usuario"
                onClose={() => setMostrarModal(false)}
            >
                <CreateUser
                    onSuccess={() => {
                        setMostrarModal(false);
                        handleSuccess();
                        fetchUsuarios();
                    }}
                />
            </Modal>

            <Modal
                isOpen={mostrarModalModificar}
                title="Modificar Usuario"
                onClose={() => setMostrarModalModificar(false)}
            >
                <ModificarUser
                    id={usuarioModificando}
                    onClose={() => {
                        setMostrarModalModificar(false);
                        handleSuccess();
                        fetchUsuarios();
                    }}
                />
            </Modal>

            {/* Confirmación */}
            <ConfirmDialog
                isOpen={showConfirm}
                message={`¿Seguro que deseas ${mostrarInactivos ? "activar" : "desactivar"
                    } este usuario?`}
                onConfirm={handleCambioEstado}
                onClose={() => setShowConfirm(false)}
                confirmText={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            {/* Alertas */}
            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />
        </div>
    );
};

export default Usuarios;
