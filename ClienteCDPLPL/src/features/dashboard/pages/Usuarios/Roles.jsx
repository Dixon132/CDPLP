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
            ? "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-500 border border-rose-100";

    const getEstadoIcon = (activo) =>
        activo ? (
            <CheckCircle className="w-3.5 h-3.5" />
        ) : (
            <XCircle className="w-3.5 h-3.5" />
        );

    const getRolIcon = (rol) => {
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return <Crown className="w-4 h-4 text-amber-500" />;
            case "moderador":
                return <Shield className="w-4 h-4 text-blue-500" />;
            case "usuario":
                return <User className="w-4 h-4 text-slate-500" />;
            default:
                return <Settings className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getRolBadge = (rol) => {
        const base =
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold";
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return `${base} bg-amber-50 text-amber-600 border border-amber-100`;
            case "moderador":
                return `${base} bg-blue-50 text-blue-600 border border-blue-100`;
            default:
                return `${base} bg-slate-50 text-slate-600 border border-slate-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* HEADER REUTILIZABLE */}
            <Header
                title="Gestión de Roles"
                icon={<Shield className="w-8 h-8" />}
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
                        color: mostrarInactivos ? "emerald" : "rose",
                    },
                ]}
            />

            {/* TABLA REUTILIZABLE */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <Table
                    columns={[
                        {
                            label: "Usuario",
                            key: "usuario",
                            render: (r) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                        {r.usuarios?.nombre?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {r.usuarios?.nombre} {r.usuarios?.apellido}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">ID: {r.id_rol}</p>
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
                                <div className="text-sm text-slate-600 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />{" "}
                                        {new Date(r.fecha_inicio).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />{" "}
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
                                "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 transition-colors",
                            onClick: (r) => {
                                setCurrentId(r.id_rol);
                                setMostrarModal(true);
                            },
                        },
                        {
                            label: mostrarInactivos ? "Activar" : "Desactivar",
                            icon: mostrarInactivos ? ShieldCheck : ShieldX,
                            className: mostrarInactivos
                                ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors"
                                : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 transition-colors",
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
            </div>

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
