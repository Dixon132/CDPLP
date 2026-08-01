import { useEffect, useState } from 'react';
import ResponsiveTable from "../../../components/ResponsiveTable";
import Modal from "../../../../../components/Modal";
import Alerts from "../../../components/Alerts";
import { Outlet, useNavigate } from "react-router-dom";
import { getAllInvitados, updateEstadoInvitado, createInvitado, updateInvitado } from "../../../services/invitados";
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
    EyeOff,
    Plus,
    DollarSign,
    UserX,
    UserCheck,
} from 'lucide-react';
import Header from '../../../components/Header';
import ConfirmActionModal from '../../../../../components/ConfirmActionModal';
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";

const Invitados = () => {
    const navigate = useNavigate();
    const [invitados, setInvitados] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [invitadoSeleccionado, setInvitadoSeleccionado] = useState(null);
    const [desacTarget, setDesacTarget] = useState(null);

    // Confirm ANTES de guardar — el callback es quien ejecuta la petición
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [modalReporte, setModalReporte] = useState(false);

    const [alert, setAlert] = useState(false);

    const fetchInvitados = async () => {
        const { data, total, page: currentPage, totalPages } =
            await getAllInvitados({ page, search, inactivos: mostrarInactivos });
        setInvitados(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchInvitados();
    }, [page, search, mostrarInactivos]);

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

    const handleDesactivar = async () => {
        try {
            await updateEstadoInvitado(desacTarget, mostrarInactivos ? "ACTIVO" : "INACTIVO");
            handleSuccess(mostrarInactivos ? "Invitado activado correctamente." : "Invitado desactivado correctamente.");
            fetchInvitados();
        } catch {
            handleError('Error al cambiar el estado del invitado');
        } finally {
            setDesacTarget(null);
        }
    };

    const getActions = () => {
        const editarAction = {
            label: "Editar",
            icon: Edit3,
            className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100 transition-colors",
            onClick: (item) => {
                setMostrarModal2(true);
                setInvitadoSeleccionado(item.id_invitado);
            }
        };

        const verPagosAction = {
            label: "Ver Pagos",
            icon: DollarSign,
            className: "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors",
            onClick: (item) => {
                navigate(`/dashboard/invitados/pagos/${item.id_invitado}`);
            }
        };

        if (mostrarInactivos) {
            return [
                editarAction,
                verPagosAction,
                {
                    label: "Activar",
                    icon: UserCheck,
                    className: "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100 transition-colors",
                    onClick: (item) => setDesacTarget(item.id_invitado)
                }
            ];
        }

        return [
            editarAction,
            verPagosAction,
            {
                label: "Desactivar",
                icon: UserX,
                className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100 transition-colors",
                onClick: (item) => setDesacTarget(item.id_invitado)
            }
        ];
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
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
                        label: mostrarInactivos ? 'Ver activos' : 'Ver inactivos',
                        icon: mostrarInactivos ? <Eye /> : <EyeOff />,
                        onClick: () => { setMostrarInactivos(!mostrarInactivos); setPage(1); },
                        color: mostrarInactivos ? "emerald" : "rose",
                    },
                    {
                        label: "Añadir Invitado",
                        icon: <Plus />,
                        onClick: () => setMostrarModal(true),
                        color: "purple", // se transforma en un gradient
                        type: "create", // aplica estilos especiales
                    }
                ]}
            />

            {/*  Tabla genérica / Grid */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="invitados"
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
                        {
                            label: "Estado",
                            key: "estado",
                            render: (item) => (
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${item.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {item.estado || 'ACTIVO'}
                                </span>
                            )
                        }
                    ]}
                    actions={getActions()}
                />
            </div>



            {/* ✅ Confirm ANTES de guardar — cancelar aborta la operación */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas registrar este invitado?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave((prev) => ({ ...prev, open: false }))}
                onConfirm={async () => {
                    await confirmSave.callback?.();
                    setConfirmSave((prev) => ({ ...prev, open: false }));
                }}
            />

            {/* ✅ Doble confirmación desactivar/activar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!desacTarget}
                onClose={() => setDesacTarget(null)}
                onConfirm={handleDesactivar}
                title={mostrarInactivos ? "Activar Invitado" : "Desactivar Invitado"}
                message={mostrarInactivos 
                    ? "¿Estás seguro de que deseas activar a este invitado? Podrá ser usado nuevamente en el sistema." 
                    : "¿Estás seguro de que deseas desactivar a este invitado? No aparecerá en las listas activas."}
                waitSeconds={4}
                confirmColor={mostrarInactivos ? "emerald" : "amber"}
                confirmIcon={mostrarInactivos ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                confirmLabel={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            {/*  Modales */}
            <Modal isOpen={mostrarModal} title="Crear Invitado" onClose={() => setMostrarModal(false)}>
                <CreateInvitado
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: async () => {
                                try {
                                    await createInvitado(payload);
                                    setMostrarModal(false);
                                    handleSuccess("Invitado creado correctamente.");
                                    fetchInvitados();
                                } catch { handleError("Error al crear el invitado."); }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Invitado" onClose={() => setMostrarModal2(false)}>
                <ModificarInvitado
                    id={invitadoSeleccionado}
                    onClose={() => setMostrarModal2(false)}
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: async () => {
                                try {
                                    await updateInvitado(invitadoSeleccionado, payload);
                                    setMostrarModal2(false);
                                    handleSuccess("Invitado modificado exitosamente.");
                                    fetchInvitados();
                                } catch { handleError("Error al modificar el invitado."); }
                            },
                        });
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
