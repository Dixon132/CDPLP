import { useEffect, useState } from "react";
import { getAllConvenios, cambiarEstadoConvenio } from "../../services/convenios";
import Modal from "../../../../components/Modal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import CreateConvenio from "./Components/CreateConvenio";
import ModificarConvenio from "./Components/ModificarConvenio";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import { Handshake, Plus, Edit3, Calendar, CheckCircle, XCircle, Clock, Trash2, RotateCcw, Eye, EyeOff } from "lucide-react";

const Convenios = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [convenios, setConvenios] = useState([]);
    const [estadoFiltro, setEstadoFiltro] = useState("ACTIVO");

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [confirmStateChange, setConfirmStateChange] = useState({ open: false, id: null, nuevoEstado: "" });

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    const fetchData = async () => {
        const { data, total, totalPages, page: cp } = await getAllConvenios({ page, search, estado: estadoFiltro });
        setConvenios(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    };
    useEffect(() => { fetchData(); }, [page, search, estadoFiltro]);

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const getEstadoIcon = (e) => {
        switch (e?.toUpperCase()) {
            case "ACTIVO": return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "INACTIVO": return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };
    const getEstadoBadge = (e) => {
        const b = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (e?.toUpperCase()) {
            case "ACTIVO": return `${b} bg-green-100 text-green-800 border border-green-200`;
            case "INACTIVO": return `${b} bg-red-100 text-red-800 border border-red-200`;
            case "PENDIENTE": return `${b} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default: return `${b} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    const handleStateChange = async () => {
        const { id, nuevoEstado } = confirmStateChange;
        setConfirmStateChange({ open: false, id: null, nuevoEstado: "" });
        try {
            await cambiarEstadoConvenio(id, nuevoEstado);
            showAlertFn("success", `Convenio ${nuevoEstado === "ACTIVO" ? "activado" : "desactivado"} correctamente.`);
            fetchData();
        } catch (error) {
            showAlertFn("error", "Error al cambiar estado del convenio");
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Gestión de Convenios" icon={<Handshake />}
                stats={[{ label: "Total", value: total, color: "blue" }]}
                searchPlaceholder="Buscar por nombre o descripción..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    {
                        label: estadoFiltro === "ACTIVO" ? "Ver Inactivos" : "Ver Activos",
                        icon: estadoFiltro === "ACTIVO" ? <EyeOff /> : <Eye />,
                        onClick: () => { setEstadoFiltro(estadoFiltro === "ACTIVO" ? "INACTIVO" : "ACTIVO"); setPage(1); },
                        color: "slate",
                    },
                    {
                        label: "Crear Convenio", icon: <Plus />,
                        onClick: () => setShowCreate(true), color: "purple",
                    }
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="convenios"
                    columns={[
                        {
                            label: "Convenio", key: "nombre",
                            render: (c) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {c.nombre?.charAt(0)?.toUpperCase() || "C"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{c.nombre}</p>
                                        <p className="text-xs text-slate-500">ID: {c.id_convenio}</p>
                                    </div>
                                </div>
                            ),
                        },
                        { label: "Descripción", key: "descripcion", render: (c) => <p className="text-sm text-slate-700 max-w-xs truncate">{c.descripcion || "—"}</p> },
                        {
                            label: "Fecha", key: "fecha_inicio",
                            render: (c) => (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm text-slate-700">{c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString() : "—"}</span>
                                </div>
                            ),
                        },
                        { label: "Estado", key: "estado", render: (c) => <span className={getEstadoBadge(c.estado)}>{getEstadoIcon(c.estado)} {c.estado || "—"}</span> },
                    ]}
                    data={convenios}
                    actions={[
                        {
                            label: "Modificar", icon: Edit3,
                            className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                            onClick: (c) => { setCurrentId(c.id_convenio); setShowEdit(true); },
                        },
                        {
                            label: "Desactivar", icon: Trash2,
                            show: (c) => c.estado === "ACTIVO",
                            className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200",
                            onClick: (c) => setConfirmStateChange({ open: true, id: c.id_convenio, nuevoEstado: "INACTIVO" }),
                        },
                        {
                            label: "Activar", icon: RotateCcw,
                            show: (c) => c.estado !== "ACTIVO",
                            className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200",
                            onClick: (c) => setConfirmStateChange({ open: true, id: c.id_convenio, nuevoEstado: "ACTIVO" }),
                        }
                    ]}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                />
            </div>

            <Modal isOpen={showCreate} title="Crear Convenio" onClose={() => setShowCreate(false)}>
                <CreateConvenio
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        showAlertFn("success", "Convenio creado correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal isOpen={showEdit} title="Modificar Convenio" onClose={() => setShowEdit(false)}>
                <ModificarConvenio
                    id={currentId}
                    onClose={() => setShowEdit(false)}
                    onSuccess={() => {
                        setShowEdit(false);
                        showAlertFn("success", "Convenio modificado correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <ConfirmDeleteModal
                isOpen={confirmStateChange.open}
                title={confirmStateChange.nuevoEstado === "ACTIVO" ? "¿Activar convenio?" : "¿Desactivar convenio?"}
                message={confirmStateChange.nuevoEstado === "ACTIVO" ? "¿Estás seguro de que deseas reactivar este convenio?" : "¿Estás seguro de que deseas desactivar este convenio? Quedará oculto de la lista de activos."}
                confirmLabel={confirmStateChange.nuevoEstado === "ACTIVO" ? "Activar" : "Desactivar"}
                confirmColor={confirmStateChange.nuevoEstado === "ACTIVO" ? "emerald" : "amber"}
                onClose={() => setConfirmStateChange({ open: false, id: null, nuevoEstado: "" })}
                onConfirm={handleStateChange}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Convenios;
