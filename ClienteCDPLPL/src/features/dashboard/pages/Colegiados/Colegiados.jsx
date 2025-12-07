import Modal from "../../../../components/Modal";
import Table from "../../components/Table"; // ✅ Tabla reutilizable
import { useEffect, useState } from 'react';
import { getAllColegiados, updateEstadoColegiado } from "../../services/colegiados";
import CreateColegiado from "./components/CreateColegiado";
import ModificarColegiado from "./components/ModificarColegiado";
import GenerarReporteColegios from "./components/GenerarReporte";
import parseDate from "../../../../utils/parseData";
import Alerts from "../../components/Alerts";
import { Link, Outlet } from "react-router-dom";

import {
    Users, UserCircle, UserPlus, Plus, Eye, BarChart3, EyeOff, FileText, CreditCard,
    Edit3, UserCheck, UserX, Download, Search, Calendar,
    Mail, Phone, GraduationCap, CheckCircle, XCircle, Clock
} from 'lucide-react';
import Header from "../../components/Header";
import { getEstadoBadge, getEstadoIcon } from "../../hooks/estados";
import ConfirmDialog from "../../components/ConfirmDialog";

const Colegiados = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [colegiados, setColegiados] = useState([]);
    const [mostrarModal, SetMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [modalReporte, setModalReporte] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [colegiadoSeleccionado, setColegiadoSeleccionado] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [showDesacConfirm, setshowDesacConfirm] = useState(false);
    const [ToDelete, setToDelete] = useState(null);

    async function fetchColegiados() {
        const { data, total, page: currentPage, totalPages } =
            await getAllColegiados({ page, search, inactivos: mostrarInactivos });
        setColegiados(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    }

    const handleSuccess = (message = 'Operación realizada con exito') => {
        setAlertType('success')
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

    useEffect(() => {
        fetchColegiados();
    }, [page, search, mostrarInactivos]);

    const confirmarDesactivar = (id) => {
        setToDelete(id);
        setshowDesacConfirm(true);
    }
    const handleEstado = () => {
        try {
            updateEstadoColegiado(ToDelete, mostrarInactivos ? "ACTIVO" : "INACTIVO")
            handleSuccess(mostrarInactivos ? 'Colegiado activado exitosamente!' : 'Colegiado desactivado exitosamente!');
            fetchColegiados()
        } catch (e) {
            handleError(mostrarInactivos ? 'Error al activar colegiado' : 'Error al desactivar colegiado');
        } finally {
            setshowDesacConfirm(false);
            setToDelete(null);
        }
    }

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* ✅ Header */}

            <Header
                icon={<Users />}
                title="Gestión de Colegiados"
                stats={[
                    { label: "Total", value: total, color: "purple" },

                ]}
                searchPlaceholder="Buscar colegiados..."
                onSearch={(value) => { setSearch(value); }}
                buttons={[
                    {
                        label: "Añadir colegiado",
                        icon: <Plus />,
                        onClick: () => SetMostrarModal(true),
                        color: "purple",
                        type: "create",
                    },
                    {
                        label: "Reporte",
                        icon: <BarChart3 />,
                        onClick: () => setModalReporte(true),
                        color: "blue",
                        type: "report",
                    },
                    {
                        label: mostrarInactivos ? "Ver activos" : "Ver inactivos",
                        icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                        onClick: () => setMostrarInactivos(!mostrarInactivos),
                        color: mostrarInactivos ? "green" : "red",
                        type: "toggle",
                    }
                ]}
            />
            {/* ✅ Tabla genérica */}
            <Table
                data={colegiados}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
                columns={[
                    {
                        label: "Colegiado",
                        key: "nombre",
                        render: (item) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {item.nombre.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {item.nombre} {item.apellido}
                                    </p>
                                    <p className="text-sm text-slate-500">CI: {item.carnet_identidad}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Contacto",
                        key: "correo",
                        render: (item) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-3 h-3" /> {item.correo}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3 h-3" /> {item.telefono}
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Especialidad",
                        key: "especialidades",
                        render: (item) => (
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-500" />
                                {item.especialidades}
                            </div>
                        )
                    },
                    {
                        label: "Fechas",
                        key: "fecha_inscripcion",
                        render: (item) => (
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Inscripción: {parseDate(item.fecha_inscripcion)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Renovación: {parseDate(item.fecha_renovacion)}
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
                actions={[
                    {
                        label: "Pagos",
                        icon: CreditCard,
                        className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200",
                        onClick: (item) =>
                            (window.location.href = `/dashboard/colegiados/pagos/${item.id_colegiado}`)
                    },
                    {
                        label: "Docs",
                        icon: FileText,
                        className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200",
                        onClick: (item) =>
                            (window.location.href = `/dashboard/colegiados/documentos/${item.id_colegiado}`)
                    },
                    {
                        label: "Editar",
                        icon: Edit3,
                        className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                        onClick: (item) => {
                            setMostrarModal2(true);
                            setColegiadoSeleccionado(item.id_colegiado);
                        }
                    },
                    {
                        label: mostrarInactivos ? "Activar" : "Desactivar",
                        icon: mostrarInactivos ? UserCheck : UserX,
                        className: mostrarInactivos
                            ? "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                            : "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200",
                        onClick: (item) => {
                            confirmarDesactivar(item.id_colegiado)
                        }
                    }
                ]}
            />

            {/* Modales */}
            <Modal isOpen={mostrarModal} title="Crear Colegiado" onClose={() => SetMostrarModal(false)}>
                <CreateColegiado
                    onSuccess={() => {
                        SetMostrarModal(false);
                        handleSuccess();
                        fetchProyectos();
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Colegiado" onClose={() => setMostrarModal2(false)}>
                <ModificarColegiado
                    id={colegiadoSeleccionado}
                    onClose={() => {
                        setMostrarModal2(false);
                        handleSuccess();
                        fetchProyectos();
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte" onClose={() => setModalReporte(false)}>
                <GenerarReporteColegios />
            </Modal>

            <ConfirmDialog
                isOpen={showDesacConfirm}
                message={`¿Estás seguro de que deseas ${mostrarInactivos ? 'activar' : 'desactivar'} este colegiado?`}
                onConfirm={handleEstado}
                onClose={() => setshowDesacConfirm(false)}
                confirmText={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />

            <Outlet />
        </div>
    );
};

export default Colegiados;
