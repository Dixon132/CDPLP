import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { gelAllActividadesSociales, cambiarEstadoActividadSocial } from "../../services/ac-sociales";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import CreateActSocial from "./components/CreateActSocial";
import ModificarActividadSocial from "./components/ModificarActividadSocial";
import GenerarReporteActividadesSociales from "./components/GenerarReporteActividadesSociales";
import { PartyPopper, Plus, Edit3, Eye, Target, FileText, Calendar, MapPin, BarChart3, Trash2, RotateCcw, EyeOff } from "lucide-react";
import { getEstadoBadge, getEstadoIcon, getTipoIcon } from "../../hooks/estados";
import { VerDetallesActividad } from "./components/VerDetallesActividad";

const Ac_sociales = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [actividades, setActividades] = useState([]);
    const [estadoFiltro, setEstadoFiltro] = useState("ACTIVO");

    const [vista, setVista] = useState("tabla");
    const [currentId, setCurrentId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showVer, setShowVer] = useState(false);
    const [showReporte, setShowReporte] = useState(false);

    const [confirmStateChange, setConfirmStateChange] = useState({ open: false, id: null, nuevoEstado: "" });

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");
    const navigate = useNavigate();

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const fetchData = async () => {
        try {
            const { data, total, totalPages, page: cp } = await gelAllActividadesSociales({ page, search, estado: estadoFiltro });
            setActividades(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
        } catch { showAlertFn("error", "Error al cargar actividades"); }
    };
    useEffect(() => { fetchData(); }, [page, search, estadoFiltro]);

    const handleStateChange = async () => {
        const { id, nuevoEstado } = confirmStateChange;
        setConfirmStateChange({ open: false, id: null, nuevoEstado: "" });
        try {
            await cambiarEstadoActividadSocial(id, nuevoEstado);
            showAlertFn("success", `Actividad ${nuevoEstado === "ACTIVO" ? "activada" : "desactivada"} correctamente.`);
            fetchData();
        } catch (error) {
            showAlertFn("error", "Error al cambiar estado de la actividad");
        }
    };

    const stats = useMemo(() => [
        { label: "Total", value: total, color: "blue" },
        { label: "Activas", value: actividades.filter((a) => a.estado === "ACTIVO").length, color: "green" },
        { label: "Finalizadas", value: actividades.filter((a) => a.estado === "FINALIZADO").length, color: "indigo" },
    ], [actividades, total]);

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            <Header
                title="Actividades Sociales" icon={<PartyPopper />}
                stats={stats} searchPlaceholder="Buscar actividad..."
                onSearch={(v) => setSearch(v)}
                buttons={[
                    {
                        label: estadoFiltro === "ACTIVO" ? "Ver Inactivos" : "Ver Activos",
                        icon: estadoFiltro === "ACTIVO" ? <EyeOff /> : <Eye />,
                        onClick: () => { setEstadoFiltro(estadoFiltro === "ACTIVO" ? "INACTIVO" : "ACTIVO"); setPage(1); },
                        color: "slate",
                    },
                    { label: "Reportes", icon: <BarChart3 />, onClick: () => setShowReporte(true), color: "green" },
                    { label: "Nueva Actividad", icon: <Plus />, onClick: () => setShowCreate(true), color: "indigo" },
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="actividades_sociales"
                    columns={[
                        {
                            label: "Actividad", key: "nombre", render: (a) => (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{getTipoIcon(a.tipo)}</div>
                                    <div><p className="font-semibold text-slate-800">{a.nombre}</p><p className="text-xs text-slate-500">{a.tipo}</p></div>
                                </div>)
                        },
                        { label: "Ubicación", key: "ubicacion", render: (a) => <div className="flex items-center gap-1 text-slate-600"><MapPin className="w-4 h-4 text-blue-500" />{a.ubicacion}</div> },
                        { label: "Motivo", key: "motivo", render: (a) => a.motivo || "—" },
                        { label: "Convenio", key: "convenio", render: (a) => a.convenio?.nombre || "Sin convenio" },
                        {
                            label: "Fecha", key: "fecha_inicio", render: (a) => (
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-green-500" /><span>{parseDate(a.fecha_inicio)}</span></div>
                                </div>)
                        },
                        { label: "Estado", key: "estado", render: (a) => <span className={getEstadoBadge(a.estado)}>{getEstadoIcon(a.estado)} {a.estado}</span> },
                    ]}
                    data={actividades}
                    actions={[
                        { label: "Ver", icon: Eye, className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200", onClick: (a) => navigate(`/dashboard/actividades_sociales/detalles/${a.id_actividad_social}`) },
                        {
                            label: "Editar", icon: Edit3, className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                            onClick: (a) => { setCurrentId(a.id_actividad_social); setShowEdit(true); }
                        },
                        {
                            label: "Desactivar", icon: Trash2,
                            show: (a) => a.estado === "ACTIVO",
                            className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200",
                            onClick: (a) => setConfirmStateChange({ open: true, id: a.id_actividad_social, nuevoEstado: "INACTIVO" }),
                        },
                        {
                            label: "Activar", icon: RotateCcw,
                            show: (a) => a.estado !== "ACTIVO",
                            className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200",
                            onClick: (a) => setConfirmStateChange({ open: true, id: a.id_actividad_social, nuevoEstado: "ACTIVO" }),
                        }
                    ]}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                />
            </div>

            {/* Forms — abren directo */}
            <Modal isOpen={showCreate} title="Crear Actividad Social" onClose={() => setShowCreate(false)}>
                <CreateActSocial
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        showAlertFn("success", "Actividad creada correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal isOpen={showVer} title="Detalles de Actividad" onClose={() => setShowVer(false)}>
                <VerDetallesActividad id={currentId} />
            </Modal>

            <Modal isOpen={showEdit} title="Modificar Actividad" onClose={() => setShowEdit(false)}>
                <ModificarActividadSocial
                    id={currentId}
                    onClose={() => setShowEdit(false)}
                    onSuccess={() => {
                        setShowEdit(false);
                        showAlertFn("success", "Actividad modificada correctamente.");
                        fetchData();
                    }}
                />
            </Modal>

            <Modal isOpen={showReporte} title="Reporte de Actividades Sociales" onClose={() => setShowReporte(false)}>
                <GenerarReporteActividadesSociales />
            </Modal>

            <ConfirmDeleteModal
                isOpen={confirmStateChange.open}
                title={confirmStateChange.nuevoEstado === "ACTIVO" ? "¿Activar actividad?" : "¿Desactivar actividad?"}
                message={confirmStateChange.nuevoEstado === "ACTIVO" ? "¿Estás seguro de que deseas reactivar esta actividad?" : "¿Estás seguro de que deseas desactivar esta actividad? Quedará oculta de la lista de activas."}
                confirmLabel={confirmStateChange.nuevoEstado === "ACTIVO" ? "Activar" : "Desactivar"}
                confirmColor={confirmStateChange.nuevoEstado === "ACTIVO" ? "emerald" : "amber"}
                onClose={() => setConfirmStateChange({ open: false, id: null, nuevoEstado: "" })}
                onConfirm={handleStateChange}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Ac_sociales;
