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
import PinDisplay from "../../../../components/PinDisplay";

import {
    Users, UserCircle, UserPlus, Plus, Eye, BarChart3, EyeOff, FileText, CreditCard,
    Edit3, UserCheck, UserX, Download, Search, Calendar,
    Mail, Phone, GraduationCap, CheckCircle, XCircle, Clock, Key
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
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* ✅ Header */}

            <Header
                icon={<Users className="w-8 h-8" />}
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
                        color: mostrarInactivos ? "emerald" : "rose",
                        type: "toggle",
                    }
                ]}
            />
            {/* ✅ Tabla genérica */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
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
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                        {item.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {item.nombre} {item.apellido}
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">CI: {item.carnet_identidad}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            label: "Contacto",
                            key: "correo",
                            render: (item) => (
                                <div className="space-y-1 text-slate-600">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {item.correo}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.telefono}
                                    </div>
                                </div>
                            )
                        },
                        {
                            label: "Especialidad",
                            key: "especialidades",
                            render: (item) => (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                                    {item.especialidades}
                                </div>
                            )
                        },
                        {
                            label: "PIN Acceso",
                            key: "pin_acceso",
                            render: (item) => (
                                <PinDisplay pin={item.pin_acceso} />
                            )
                        },
                        {
                            label: "Fechas",
                            key: "fecha_inscripcion",
                            render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Inscripción: <span className="font-medium">{parseDate(item.fecha_inscripcion)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Renovación: <span className="font-medium">{parseDate(item.fecha_renovacion)}</span>
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
                            className: "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors",
                            onClick: (item) =>
                                (window.location.href = `/dashboard/colegiados/pagos/${item.id_colegiado}`)
                        },
                        {
                            label: "Docs",
                            icon: FileText,
                            className: "px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-medium shadow-sm hover:bg-blue-100 transition-colors",
                            onClick: (item) =>
                                (window.location.href = `/dashboard/colegiados/documentos/${item.id_colegiado}`)
                        },
                        {
                            label: "Editar",
                            icon: Edit3,
                            className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 transition-colors",
                            onClick: (item) => {
                                setMostrarModal2(true);
                                setColegiadoSeleccionado(item.id_colegiado);
                            }
                        },
                        {
                            label: mostrarInactivos ? "Activar" : "Desactivar",
                            icon: mostrarInactivos ? UserCheck : UserX,
                            className: mostrarInactivos
                                ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors"
                                : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 transition-colors",
                            onClick: (item) => {
                                confirmarDesactivar(item.id_colegiado)
                            }
                        }
                    ]}
                />
            </div>

            {/* Modales */}
            <Modal isOpen={mostrarModal} title="Crear Colegiado" onClose={() => SetMostrarModal(false)}>
                <CreateColegiado
                    onSuccess={() => {
                        SetMostrarModal(false);
                        handleSuccess('Colegiado registrado exitosamente');
                        fetchColegiados();
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Colegiado" onClose={() => setMostrarModal2(false)}>
                <ModificarColegiado
                    id={colegiadoSeleccionado}
                    onClose={() => {
                        setMostrarModal2(false);
                        handleSuccess('Colegiado modificado exitosamente');
                        fetchColegiados();
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
