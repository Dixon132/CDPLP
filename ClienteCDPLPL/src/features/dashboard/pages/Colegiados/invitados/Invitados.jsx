import { useEffect, useState } from 'react';
import Table from "../../../components/Table";
import Modal from "../../../../../components/Modal";
import Alerts from "../../../components/Alerts";
import { Outlet } from "react-router-dom";
import { getAllInvitados, deleteInvitado } from "../../../services/invitados";
import CreateInvitado from "./Components/CreateInvitado";
import ModificarInvitado from "./Components/ModificarInvitado";
import GenerarReporteInvitados from "./Components/GenerarReporte";
import {
    UserCircle,
    UserPlus,
    Edit3,
    Trash2,
    Download,
    Search,
    Mail,
    Phone,
    AlertCircle,
    Sparkles,
    Rocket,
    BarChart3,
    Eye,
    Plus,
} from 'lucide-react';
import Header from '../../../components/Header';
import ConfirmDialog from '../../../components/ConfirmDialog';

const Invitados = () => {
    const [invitados, setInvitados] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [modalReporte, setModalReporte] = useState(false);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invitadoToDelete, setInvitadoToDelete] = useState(null);
    const [invitadoSeleccionado, setInvitadoSeleccionado] = useState(null);

    const fetchInvitados = async () => {
        const { data, total, page: currentPage, totalPages } =
            await getAllInvitados({ page, search });
        setInvitados(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchInvitados();
    }, [page, search]);

    const handleSuccess = (message = 'Operación realizada con éxito.') => {
        setAlertType('success');
        setAlertMessage(message);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleError = (message = 'Ocurrió un error.') => {
        setAlertType('error');
        setAlertMessage(message);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const confirmDelete = (id) => {
        setInvitadoToDelete(id);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        try {
            await deleteInvitado(invitadoToDelete);
            handleSuccess('Invitado eliminado correctamente');
            fetchInvitados();
        } catch (error) {
            handleError('Error al eliminar el invitado');
        } finally {
            setShowDeleteConfirm(false);
            setInvitadoToDelete(null);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <Header
                icon={<UserCircle />}
                title="Invitados"
                stats={[
                    { label: "Total", value: total, color: "purple" },

                ]}
                searchPlaceholder="Buscar invitados..."
                onSearch={(value) => { setSearch(value); setPage(1); }}
                buttons={[
                    {
                        label: "Añadir Invitado",
                        icon: <Plus />,
                        onClick: () => setMostrarModal(true),
                        color: "purple", // se transforma en un gradient
                        type: "create", // aplica estilos especiales
                    }
                ]}
            />

            {/*  Tabla genérica */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <Table
                    data={invitados}
                    pagination={{
                        total,
                        totalPage,
                        page,
                        onPageChange: setPage,
                    }}
                    columns={[
                        {
                            label: "Invitado",
                            key: "nombre",
                            render: (item) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold shadow-sm">
                                        {item.nombre[0]}{item.apellido[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p>
                                        <p className="text-sm text-slate-500 font-medium">ID: {item.id_invitado}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            label: "Correo",
                            key: "correo",
                            render: (item) =>
                                item.correo ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Mail className="w-4 h-4 text-slate-400" /> {item.correo}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Sin correo</span>
                                )
                        },
                        {
                            label: "Teléfono",
                            key: "telefono",
                            render: (item) =>
                                item.telefono ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Phone className="w-4 h-4 text-slate-400" /> {item.telefono}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Sin teléfono</span>
                                )
                        },
                    ]}
                    actions={[
                        {
                            label: "Editar",
                            icon: Edit3,
                            className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 transition-colors",
                            onClick: (item) => {
                                setMostrarModal2(true);
                                setInvitadoSeleccionado(item.id_invitado);
                            }
                        },
                        {
                            label: "Eliminar",
                            icon: Trash2,
                            className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 transition-colors",
                            onClick: (item) => confirmDelete(item.id_invitado)
                        }
                    ]}
                />
            </div>

            {/* Modal confirmación de eliminación */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                message="¿Estás seguro de que deseas eliminar este invitado? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onClose={() => setShowDeleteConfirm(false)}
                confirmText="Eliminar"
            />

            {/*  Modales */}
            <Modal isOpen={mostrarModal} title="" onClose={() => setMostrarModal(false)}>
                <CreateInvitado
                    onSuccess={() => {
                        setMostrarModal(false);
                        handleSuccess("Invitado creado correctamente");
                        fetchInvitados();
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Invitado" onClose={() => setMostrarModal2(false)}>
                <ModificarInvitado
                    id={invitadoSeleccionado}
                    onClose={() => {
                        setMostrarModal2(false);
                        fetchInvitados();
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte" onClose={() => setModalReporte(false)}>
                <GenerarReporteInvitados />
            </Modal>

            <Alerts type={alertType} message={alertMessage} show={alert} onClose={() => setAlert(false)} />

            <Outlet />
        </div>
    );
};

export default Invitados;
