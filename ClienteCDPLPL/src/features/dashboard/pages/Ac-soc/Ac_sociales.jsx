import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { gelAllActividadesSociales } from "../../services/ac-sociales";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import Table from "../../components/Table";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";
import CreateActSocial from "./components/CreateActSocial";
import ModificarActividadSocial from "./components/ModificarActividadSocial";
import GenerarReporteActividadesSociales from "./components/GenerarReporteActividadesSociales";
import { PartyPopper, Plus, Edit3, Eye, Target, FileText, Calendar, MapPin, BarChart3 } from "lucide-react";
import { getEstadoBadge, getEstadoIcon, getTipoIcon } from "../../hooks/estados";
import { VerDetallesActividad } from "./components/VerDetallesActividad";

const Ac_sociales = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [actividades, setActividades] = useState([]);
    const [vista, setVista] = useState("tabla");
    const [currentId, setCurrentId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showVer, setShowVer] = useState(false);
    const [showReporte, setShowReporte] = useState(false);

    // Confirm DESPUÉS de guardar
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

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
            const { data, total, totalPages, page: cp } = await gelAllActividadesSociales({ page, search });
            setActividades(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
        } catch { showAlertFn("error", "Error al cargar actividades"); }
    };
    useEffect(() => { fetchData(); }, [page, search]);

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
                    { label: vista === "tabla" ? "Vista Cards" : "Vista Tabla", icon: vista === "tabla" ? <Target /> : <FileText />, onClick: () => setVista(vista === "tabla" ? "cards" : "tabla"), color: "blue" },
                    { label: "Reportes", icon: <BarChart3 />, onClick: () => setShowReporte(true), color: "green" },
                    { label: "Nueva Actividad", icon: <Plus />, onClick: () => setShowCreate(true), color: "indigo" },
                ]}
            />

            {vista === "tabla" ? (
                <Table
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
                            label: "Fechas", key: "fecha_inicio", render: (a) => (
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-green-500" /><span>{parseDate(a.fecha_inicio)}</span></div>
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-red-500" /><span>{parseDate(a.fecha_fin)}</span></div>
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
                    ]}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {actividades.map((a) => (
                        <div key={a.id_actividad_social} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 hover:shadow-xl hover:scale-[1.02] transition">
                            <div className="p-6 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{getTipoIcon(a.tipo)}</div>
                                        <div><p className="font-bold text-slate-800">{a.nombre}</p><p className="text-xs text-slate-500">{a.tipo}</p></div>
                                    </div>
                                    <span className={getEstadoBadge(a.estado)}>{getEstadoIcon(a.estado)} {a.estado}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">{a.descripcion}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-1"><MapPin className="w-4 h-4 text-blue-500" /> {a.ubicacion}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-1"><Calendar className="w-4 h-4 text-green-500" /> {parseDate(a.fecha_inicio)}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-1"><Calendar className="w-4 h-4 text-red-500" /> {parseDate(a.fecha_fin)}</p>
                            </div>
                            <div className="flex justify-between p-4 border-t border-white/50 bg-white/60">
                                <button onClick={() => navigate(`/dashboard/actividades_sociales/detalles/${a.id_actividad_social}`)} className="px-4 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                                    <Eye className="w-4 h-4 inline mr-1" /> Ver
                                </button>
                                <button onClick={() => { setCurrentId(a.id_actividad_social); setShowEdit(true); }} className="px-4 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200">
                                    <Edit3 className="w-4 h-4 inline mr-1" /> Editar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Forms — abren directo */}
            <Modal isOpen={showCreate} title="Crear Actividad Social" onClose={() => setShowCreate(false)}>
                <CreateActSocial
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: () => { setShowCreate(false); showAlertFn("success", "Actividad creada correctamente."); fetchData(); },
                        });
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
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: () => { setShowEdit(false); showAlertFn("success", "Actividad modificada correctamente."); fetchData(); },
                        });
                    }}
                    onDelete={() => { setShowEdit(false); showAlertFn("success", "Actividad eliminada correctamente."); fetchData(); }}
                />
            </Modal>

            <Modal isOpen={showReporte} title="Reporte de Actividades Sociales" onClose={() => setShowReporte(false)}>
                <GenerarReporteActividadesSociales />
            </Modal>

            {/* ✅ Confirm DESPUÉS de guardar */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas guardar la nueva actividad?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Ac_sociales;
