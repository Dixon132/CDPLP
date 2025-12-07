import { useEffect, useState } from "react";
import {
    getAllRoles,
    estadoRol,
} from "../../services/roles";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import ConfirmDialog from "../../components/ConfirmDialog";
import AsignarRol from "./Components/AsignarRol";

import {
    Shield,
    Eye,
    EyeOff,
    Edit3,
    ShieldCheck,
    ShieldX,
    Search,
    Calendar,
    User,
    Crown,
    CheckCircle,
    XCircle,
    Settings,
} from "lucide-react";

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [showConfirm, setShowConfirm] = useState(false);
    const [rolSeleccionado, setRolSeleccionado] = useState(null);

    const fetchRoles = async () => {
        const { data, total, totalPages, page: currentPage } = await getAllRoles({
            page,
            search,
            inactivos: mostrarInactivos,
        });
        setRoles(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchRoles();
    }, [page, search, mostrarInactivos]);

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

    const confirmarCambioEstado = (id) => {
        setRolSeleccionado(id);
        setShowConfirm(true);
    };

    const handleCambioEstado = async () => {
        try {
            await estadoRol(
                rolSeleccionado,
                mostrarInactivos ? "ACTIVO" : "INACTIVO"
            );
            handleSuccess(
                mostrarInactivos
                    ? "Rol activado correctamente."
                    : "Rol desactivado correctamente."
            );
            fetchRoles();
        } catch (error) {
            handleError("Error al actualizar el estado del rol.");
        } finally {
            setShowConfirm(false);
            setRolSeleccionado(null);
        }
    };

    // ==== ESTILOS Y BADGES ====

    const getEstadoBadge = (activo) =>
        activo
            ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
            : "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200";

    const getEstadoIcon = (activo) =>
        activo ? (
            <CheckCircle className="w-4 h-4" />
        ) : (
            <XCircle className="w-4 h-4" />
        );

    const getRolIcon = (rol) => {
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return <Crown className="w-4 h-4 text-yellow-500" />;
            case "moderador":
                return <Shield className="w-4 h-4 text-blue-500" />;
            case "usuario":
                return <User className="w-4 h-4 text-gray-500" />;
            default:
                return <Settings className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getRolBadge = (rol) => {
        const base =
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case "moderador":
                return `${base} bg-blue-100 text-blue-800 border border-blue-200`;
            default:
                return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-cyan-50/20 min-h-screen">
            {/* HEADER REUTILIZABLE */}
            <Header
                title="Gestión de Roles"
                icon={<Shield />}
                stats={[
                    {
                        label: "Total de Roles",
                        value: total,
                        color: "blue",
                    },
                ]}
                searchPlaceholder="Buscar roles o usuarios..."
                onSearch={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                buttons={[
                    {
                        label: mostrarInactivos ? "Ver Activos" : "Ver Inactivos",
                        icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                        onClick: () => setMostrarInactivos(!mostrarInactivos),
                        color: mostrarInactivos ? "green" : "red",
                    },
                ]}
            />

            {/* TABLA REUTILIZABLE */}
            <Table
                columns={[
                    {
                        label: "Usuario",
                        key: "usuario",
                        render: (r) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {r.usuarios?.nombre?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {r.usuarios?.nombre} {r.usuarios?.apellido}
                                    </p>
                                    <p className="text-xs text-slate-500">ID: {r.id_rol}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Rol",
                        key: "rol",
                        render: (r) => (
                            <span className={getRolBadge(r.rol)}>
                                {getRolIcon(r.rol)} {r.rol}
                            </span>
                        ),
                    },
                    {
                        label: "Período",
                        key: "fecha",
                        render: (r) => (
                            <div className="text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />{" "}
                                    {new Date(r.fecha_inicio).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />{" "}
                                    {r.fecha_fin
                                        ? new Date(r.fecha_fin).toLocaleDateString()
                                        : "—"}
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (r) => (
                            <span className={getEstadoBadge(r.activo)}>
                                {getEstadoIcon(r.activo)} {r.activo ? "Activo" : "Inactivo"}
                            </span>
                        ),
                    },
                ]}
                data={roles}
                actions={[
                    {
                        label: "Editar",
                        icon: Edit3,
                        className:
                            "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                        onClick: (r) => {
                            setCurrentId(r.id_rol);
                            setMostrarModal(true);
                        },
                    },
                    {
                        label: mostrarInactivos ? "Activar" : "Desactivar",
                        icon: mostrarInactivos ? ShieldCheck : ShieldX,
                        className: mostrarInactivos
                            ? "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            : "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200",
                        onClick: (r) => confirmarCambioEstado(r.id_rol),
                    },
                ]}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
            />

            {/* MODAL DE ASIGNACIÓN */}
            <Modal
                isOpen={mostrarModal}
                title="Asignar / Modificar Rol"
                onClose={() => setMostrarModal(false)}
            >
                <AsignarRol
                    id={currentId}
                    onClose={() => {
                        setMostrarModal(false);
                        handleSuccess()
                        fetchRoles();
                    }}
                />
            </Modal>

            {/* CONFIRMACIÓN */}
            <ConfirmDialog
                isOpen={showConfirm}
                message={`¿Seguro que deseas ${mostrarInactivos ? "activar" : "desactivar"
                    } este rol?`}
                onConfirm={handleCambioEstado}
                onClose={() => setShowConfirm(false)}
                confirmText={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            {/* ALERTAS */}
            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />
        </div>
    );
};

export default Roles;
