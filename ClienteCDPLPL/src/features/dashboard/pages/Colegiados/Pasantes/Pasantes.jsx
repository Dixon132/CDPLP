import { useEffect, useState } from "react";
import Modal from "../../../../../components/Modal";
import Table from "../../../components/Table";
import { getAllPasantes, updateEstadoPasante, deletePasante } from "../../../services/pasantes";
import CreatePasante from "./Components/CreatePasante";
import ModificarPasante from "./Components/ModificarPasante";
import GenerarReportePasantes from "./components/GenerarReporte";
import parseDate from "../../../../../utils/parseData";
import Alerts from "../../../components/Alerts";
import { Outlet } from "react-router-dom";
import { getEstadoBadge, getEstadoIcon } from "../../../hooks/estados";

import {
    Briefcase,
    UserPlus,
    Eye, EyeOff,
    Mail, Phone,
    Building2, Calendar,
    Edit3, UserCheck, UserX,
    Download,
    Trash2
} from 'lucide-react';
import Header from "../../../components/Header";
import ConfirmDialog from "../../../components/ConfirmDialog";

const Pasantes = () => {
    const [pasantes, setPasantes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [totalPage, setTotalPage] = useState(1);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [modalReporte, setModalReporte] = useState(false);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pasanteSeleccionado, setPasanteSeleccionado] = useState(null);
    const [pasanteToDelete, setPasanteToDelete] = useState(null);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const [showDesacConfirm, setshowDesacConfirm] = useState(false);

    async function fetchPasantes() {
        const { data, total, page: currentPage, totalPages } = await getAllPasantes({
            page, search, inactivos: mostrarInactivos
        });
        setPasantes(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    }

    useEffect(() => {
        fetchPasantes();
    }, [page, search, mostrarInactivos]);

    //EVENTOS DE ALERTAS
    const handleSuccess = (message = 'Operación realizada con éxito ') => {
        setAlertType("success");
        setAlertMessage(message);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleError = (message = 'Ocurrió un error. Inténtalo de nuevo.') => {
        setAlertType("error");
        setAlertMessage(message);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    }

    const confirmarDesactivar = (id) => {
        setPasanteToDelete(id);
        setshowDesacConfirm(true);
    }

    const confirmDelete = (id) => {
        setPasanteToDelete(id);
        setShowDeleteConfirm(true);
    }

    const handleDesactivar = async () => {
        try {
            await updateEstadoPasante(pasanteToDelete, mostrarInactivos ? "ACTIVO" : "INACTIVO");
            handleSuccess(mostrarInactivos ? 'Pasante activado exitosamente!' : 'Pasante desactivado exitosamente!');
            fetchPasantes();
        } catch (e) {
            handleError(mostrarInactivos ? 'Error al activar pasante' : 'Error al desactivar pasante');
        } finally {
            setshowDesacConfirm(false);
            setPasanteToDelete(null);
        }
    }

    const handleDelete = async () => {
        try {
            await deletePasante(pasanteToDelete);
            handleSuccess("Pasante eliminado correctamente.");
            fetchPasantes();
        } catch (error) {
            handleError("Error al eliminar el pasante.");
        } finally {
            setShowDeleteConfirm(false);
            setPasanteToDelete(null);
        }
    }

    // Definir acciones según el estado de mostrarInactivos
    const getActions = () => {
        if (mostrarInactivos) {
            // Si estamos viendo inactivos: Editar, Activar, Eliminar
            return [
                {
                    label: "Editar",
                    icon: Edit3,
                    className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                    onClick: (item) => {
                        setPasanteSeleccionado(item.id_pasante);
                        setMostrarModal2(true);
                    }
                },
                {
                    label: "Activar",
                    icon: UserCheck,
                    className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200",
                    onClick: (item) => {
                        confirmarDesactivar(item.id_pasante);
                    }
                },
                {
                    label: "Eliminar",
                    icon: Trash2,
                    className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200",
                    onClick: (item) => {
                        confirmDelete(item.id_pasante);
                    }
                }
            ];
        } else {
            // Si estamos viendo activos: Editar, Desactivar
            return [
                {
                    label: "Editar",
                    icon: Edit3,
                    className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                    onClick: (item) => {
                        setPasanteSeleccionado(item.id_pasante);
                        setMostrarModal2(true);
                    }
                },
                {
                    label: "Desactivar",
                    icon: UserX,
                    className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200",
                    onClick: (item) => {
                        confirmarDesactivar(item.id_pasante);
                    }
                }
            ];
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 min-h-screen">
            <Header
                title="Pasantes"
                icon={<Briefcase />}
                stats={[
                    { label: 'Total', value: total, color: 'blue' }
                ]}
                searchPlaceholder="Buscar pasantes..."
                onSearch={(value) => { setSearch(value); setPage(1); }}
                buttons={[
                    {
                        label: "Añadir Pasante",
                        icon: <UserPlus />,
                        onClick: () => setMostrarModal(true),
                        color: "purple",
                    },
                    {
                        label: mostrarInactivos ? 'Ver activos' : 'Ver inactivos',
                        icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                        onClick: () => setMostrarInactivos(!mostrarInactivos),
                        color: mostrarInactivos ? "green" : "red",
                    },
                    {
                        label: "Generar Reporte",
                        icon: <Download />,
                        onClick: () => setModalReporte(true),
                        color: "blue",
                    }
                ]}
            />

            {/* ✅ Tabla usando <Table /> */}
            <Table
                data={pasantes}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
                columns={[
                    {
                        label: "Pasante",
                        key: "nombre",
                        render: (item) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {item.nombre?.charAt(0) || "P"}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p>
                                    <p className="text-sm text-slate-500">CI: {item.carnet_identidad}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Contacto",
                        key: "correo",
                        render: (item) => (
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> {item.correo || "N/A"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> {item.telefono || "N/A"}
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Institución",
                        key: "institucion",
                        render: (item) => (
                            <div className="flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-purple-500" /> {item.institucion || "N/A"}
                            </div>
                        )
                    },
                    {
                        label: "Fechas",
                        key: "createdAt",
                        render: (item) => (
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Creado: {parseDate(item.createdAt)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Actualizado: {parseDate(item.updatedAt)}
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (item) => (
                            <span className={getEstadoBadge(item.estado)}>
                                {getEstadoIcon(item.estado)} {item.estado}
                            </span>
                        )
                    },
                ]}
                actions={getActions()}
            />

            {/*  Modales */}

            {/*  MODALES DE CONFIRMACION */}

            <ConfirmDialog
                isOpen={showDesacConfirm}
                message={`¿Estás seguro de que deseas ${mostrarInactivos ? 'activar' : 'desactivar'} este pasante?`}
                onConfirm={handleDesactivar}
                onClose={() => setshowDesacConfirm(false)}
                confirmText={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                message="¿Estás seguro de que deseas eliminar permanentemente este pasante? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onClose={() => setShowDeleteConfirm(false)}
                confirmText="Eliminar"
            />

            {/*  MODALES DE ACCIONES */}

            <Modal isOpen={mostrarModal} title="Crear Pasante" onClose={() => setMostrarModal(false)}>
                <CreatePasante
                    onSuccess={() => {
                        setMostrarModal(false);
                        handleSuccess();
                        fetchPasantes();
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Pasante" onClose={() => setMostrarModal2(false)}>
                <ModificarPasante
                    id={pasanteSeleccionado}
                    onClose={() => {
                        setMostrarModal2(false);
                        handleSuccess()
                        fetchPasantes();
                    }}
                />
            </Modal>

            {/* MODAL DE REPORTES */}
            <Modal isOpen={modalReporte} title="Generar Reporte" onClose={() => setModalReporte(false)}>
                <GenerarReportePasantes />
            </Modal>

            {/* MODAL DE ALERTAS */}

            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />

        </div>
    );
};

export default Pasantes;