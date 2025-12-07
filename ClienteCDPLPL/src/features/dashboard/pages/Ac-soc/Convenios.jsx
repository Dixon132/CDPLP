import { useEffect, useState } from "react";
import { getAllConvenios } from "../../services/convenios";
import Modal from "../../../../components/Modal";
import CreateConvenio from "./Components/CreateConvenio";
import ModificarConvenio from "./Components/ModificarConvenio";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";

import {
    Handshake,
    Plus,
    Edit3,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";

const Convenios = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [convenios, setConvenios] = useState([]);

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    // ✅ Cargar datos
    const fetchData = async () => {
        const { data, total, totalPages, page: currentPage } = await getAllConvenios({
            page,
            search,
        });
        setConvenios(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    // ✅ Alertas
    const handleSuccess = (msg = "Operación realizada con éxito") => {
        setAlertType("success");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleError = (msg = "Ocurrió un error. Inténtalo nuevamente.") => {
        setAlertType("error");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    // ✅ Estilos de estado
    const getEstadoIcon = (estado) => {
        switch (estado?.toUpperCase()) {
            case "ACTIVO":
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "INACTIVO":
                return <XCircle className="w-4 h-4 text-red-500" />;
            case "PENDIENTE":
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEstadoBadge = (estado) => {
        const base =
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado?.toUpperCase()) {
            case "ACTIVO":
                return `${base} bg-green-100 text-green-800 border border-green-200`;
            case "INACTIVO":
                return `${base} bg-red-100 text-red-800 border border-red-200`;
            case "PENDIENTE":
                return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default:
                return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* ✅ HEADER REUTILIZABLE */}
            <Header
                title="Gestión de Convenios"
                icon={<Handshake />}
                stats={[{ label: "Total", value: total, color: "blue" }]}
                searchPlaceholder="Buscar por nombre o descripción..."
                onSearch={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                buttons={[
                    {
                        label: "Crear Convenio",
                        icon: <Plus />,
                        onClick: () => setShowCreate(true),
                        color: "purple",
                    },
                ]}
            />

            {/* ✅ TABLA REUTILIZABLE */}
            <Table
                columns={[
                    {
                        label: "Convenio",
                        key: "nombre",
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
                    {
                        label: "Descripción",
                        key: "descripcion",
                        render: (c) => (
                            <p
                                className="text-sm text-slate-700 max-w-xs truncate"
                                title={c.descripcion}
                            >
                                {c.descripcion || "—"}
                            </p>
                        ),
                    },
                    {
                        label: "Fechas",
                        key: "fecha_inicio",
                        render: (c) => (
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-slate-500">Inicio:</span>
                                    {c.fecha_inicio
                                        ? new Date(c.fecha_inicio).toLocaleDateString()
                                        : "—"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-slate-500">Fin:</span>
                                    {c.fecha_fin
                                        ? new Date(c.fecha_fin).toLocaleDateString()
                                        : "—"}
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (c) => (
                            <span className={getEstadoBadge(c.estado)}>
                                {getEstadoIcon(c.estado)} {c.estado || "—"}
                            </span>
                        ),
                    },
                ]}
                data={convenios}
                actions={[
                    {
                        label: "Modificar",
                        icon: Edit3,
                        className:
                            "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                        onClick: (c) => {
                            setCurrentId(c.id_convenio);
                            setShowEdit(true);
                        },
                    },
                ]}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
            />

            {/* ✅ MODALES */}
            <Modal
                isOpen={showCreate}
                title="Crear Convenio"
                onClose={() => setShowCreate(false)}
            >
                <CreateConvenio
                    onClose={() => {
                        setShowCreate(false);
                        handleSuccess("Convenio creado correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal
                isOpen={showEdit}
                title="Modificar Convenio"
                onClose={() => setShowEdit(false)}
            >
                <ModificarConvenio
                    id={currentId}
                    onClose={() => {
                        setShowEdit(false);
                        handleSuccess("Convenio actualizado correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            {/* ✅ ALERTAS */}
            <Alerts
                type={alertType}
                message={alertMessage}
                show={alert}
                onClose={() => setAlert(false)}
            />
        </div>
    );
};

export default Convenios;
