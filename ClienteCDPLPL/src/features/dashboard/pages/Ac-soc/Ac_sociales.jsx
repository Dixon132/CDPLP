import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { gelAllActividadesSociales } from "../../services/ac-sociales";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import CreateActSocial from "./components/CreateActSocial";
import VerDetallesColegiado from "./components/VerDetallesColegiado";
import ModificarActividadSocial from "./components/ModificarActividadSocial";
import GenerarReporteActividadesSociales from "./components/GenerarReporteActividadesSociales";
import {
    PartyPopper,
    Plus,
    Edit3,
    Eye,
    Target,
    FileText,
    Calendar,
    MapPin,
    Users,
    CheckCircle,
    Clock,
    Award,
    Star,
    Activity,
    Heart,
    BarChart3,
} from "lucide-react";
import { getEstadoBadge, getEstadoIcon, getTipoIcon } from "../../hooks/estados";
import { set } from "react-hook-form";

const Ac_sociales = () => {
    // Estados principales
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [actividades, setActividades] = useState([]);
    const [vista, setVista] = useState("tabla"); // "tabla" o "cards"
    const [currentId, setCurrentId] = useState(null);

    // Modales
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showVer, setShowVer] = useState(false);
    const [showReporte, setShowReporte] = useState(false);

    // Alertas
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const handleSuccess = (msg = "Operación realizada con éxito") => {
        setAlertType("success");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleError = (msg = "Ocurrió un error") => {
        setAlertType("error");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    // Obtener actividades
    const fetchData = async () => {
        try {
            const { data, total, totalPages, page: currentPage } =
                await gelAllActividadesSociales({ page, search });
            setActividades(data);
            setTotal(total);
            setTotalPage(totalPages);
            setPage(currentPage)
        } catch (error) {
            handleError("Error al cargar actividades");
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const navigate = useNavigate();

    const stats = useMemo(
        () => [
            { label: "Total", value: total, color: "blue" },
            {
                label: "Activas",
                value: actividades.filter((a) => a.estado === "ACTIVO").length,
                color: "green",
            },
            {
                label: "Finalizadas",
                value: actividades.filter((a) => a.estado === "FINALIZADO").length,
                color: "purple",
            },
        ],
        [actividades, total]
    );

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 min-h-screen">
            {/* ✅ HEADER REUTILIZABLE */}
            <Header
                title="Actividades Sociales"
                icon={<PartyPopper />}
                stats={stats}
                searchPlaceholder="Buscar actividad..."
                onSearch={(value) => {
                    setSearch(value);
                }}
                buttons={[
                    {
                        label: vista === "tabla" ? "Vista Cards" : "Vista Tabla",
                        icon: vista === "tabla" ? <Target /> : <FileText />,
                        onClick: () =>
                            setVista(vista === "tabla" ? "cards" : "tabla"),
                        color: "blue",
                    },
                    {
                        label: "Reportes",
                        icon: <BarChart3 />,
                        onClick: () => setShowReporte(true),
                        color: "green",
                    },
                    {
                        label: "Nueva Actividad",
                        icon: <Plus />,
                        onClick: () => setShowCreate(true),
                        color: "purple",
                    },
                ]}
            />

            {/* ✅ CONTENIDO PRINCIPAL */}
            {vista === "tabla" ? (
                <Table
                    columns={[
                        {
                            label: "Actividad",
                            key: "nombre",
                            render: (a) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow">
                                        {getTipoIcon(a.tipo)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {a.nombre}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {a.tipo}
                                        </p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            label: "Ubicación",
                            key: "ubicacion",
                            render: (a) => (
                                <div className="flex items-center gap-1 text-slate-600">
                                    <MapPin className="w-4 h-4 text-pink-500" />
                                    {a.ubicacion}
                                </div>
                            ),
                        },
                        {
                            label: "Motivo",
                            key: "motivo",
                            render: (a) => a.motivo || "—",
                        },
                        {
                            label: "Convenio",
                            key: "convenio",
                            render: (a) => a.convenio?.nombre || "Sin convenio",
                        },
                        {
                            label: "Fechas",
                            key: "fecha_inicio",
                            render: (a) => (
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-green-500" />
                                        <span>{parseDate(a.fecha_inicio)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-red-500" />
                                        <span>{parseDate(a.fecha_fin)}</span>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            label: "Estado",
                            key: "estado",
                            render: (a) => (
                                <span className={getEstadoBadge(a.estado)}>
                                    {getEstadoIcon(a.estado)} {a.estado}
                                </span>
                            ),
                        },
                    ]}
                    data={actividades}
                    actions={[
                        {
                            label: "Ver",
                            icon: Eye,
                            className:
                                "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200",
                            onClick: (a) => {
                                setCurrentId(a.id_actividad_social);
                                navigate(`/dashboard/actividades_sociales/detalles/${a.id_actividad_social}`);
                            },
                        },
                        {
                            label: "Editar",
                            icon: Edit3,
                            className:
                                "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                            onClick: (a) => {
                                setCurrentId(a.id_actividad_social);
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
            ) : (
                /* ✅ Vista Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {actividades.map((a) => (
                        <div
                            key={a.id_actividad_social}
                            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 hover:shadow-xl hover:scale-[1.02] transition"
                        >
                            <div className="p-6 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white shadow">
                                            {getTipoIcon(a.tipo)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">
                                                {a.nombre}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {a.tipo}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={getEstadoBadge(a.estado)}>
                                        {getEstadoIcon(a.estado)} {a.estado}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                    {a.descripcion}
                                </p>
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-pink-500" />{" "}
                                    {a.ubicacion}
                                </p>
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-green-500" />{" "}
                                    {parseDate(a.fecha_inicio)}
                                </p>
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-red-500" />{" "}
                                    {parseDate(a.fecha_fin)}
                                </p>
                            </div>

                            <div className="flex justify-between p-4 border-t border-white/50 bg-white/60">
                                <button
                                    onClick={() => {
                                        setCurrentId(a.id_actividad_social);
                                        navigate(`/dashboard/actividades_sociales/detalles/${a.id_actividad_social}`);
                                    }}
                                    className="px-4 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                                >
                                    <Eye className="w-4 h-4 inline mr-1" /> Ver
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentId(a.id_actividad_social);
                                        setShowEdit(true);
                                    }}
                                    className="px-4 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                                >
                                    <Edit3 className="w-4 h-4 inline mr-1" /> Editar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ MODALES */}
            <Modal
                isOpen={showCreate}
                title="Crear Actividad Social"
                onClose={() => setShowCreate(false)}
            >
                <CreateActSocial
                    onClose={() => {
                        setShowCreate(false);
                        handleSuccess("Actividad creada correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal
                isOpen={showVer}
                title="Detalles de Actividad"
                onClose={() => setShowVer(false)}
            >
                <VerDetallesColegiado id={currentId} />
            </Modal>

            <Modal
                isOpen={showEdit}
                title="Modificar Actividad"
                onClose={() => setShowEdit(false)}
            >
                <ModificarActividadSocial
                    id={currentId}
                    onClose={() => {
                        setShowEdit(false);
                        handleSuccess("Actividad modificada correctamente.");
                        fetchData();
                    }}
                    onDelete={() => {
                        setShowEdit(false);
                        handleSuccess("Actividad eliminada correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal
                isOpen={showReporte}
                title="Reporte de Actividades Sociales"
                onClose={() => setShowReporte(false)}
            >
                <GenerarReporteActividadesSociales />
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

export default Ac_sociales;