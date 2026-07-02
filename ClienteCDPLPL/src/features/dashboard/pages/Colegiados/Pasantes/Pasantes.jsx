import { useEffect, useState } from "react";
import Modal from "../../../../../components/Modal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import Table from "../../../components/Table";
import PinDisplay from "../../../../../components/PinDisplay";
import { getAllPasantes, updateEstadoPasante, deletePasante } from "../../../services/pasantes";
import CreatePasante from "./Components/CreatePasante";
import ModificarPasante from "./Components/ModificarPasante";
import GenerarReportePasantes from "./components/GenerarReporte";
import parseDate from "../../../../../utils/parseData";
import Alerts from "../../../components/Alerts";
import { getEstadoBadge, getEstadoIcon } from "../../../hooks/estados";
import { Briefcase, UserPlus, Eye, EyeOff, Mail, Phone, Building2, Calendar, Edit3, UserCheck, UserX, Trash2 } from 'lucide-react';
import Header from "../../../components/Header";

const Pasantes = () => {
    const [pasantes, setPasantes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [modalReporte, setModalReporte] = useState(false);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [pasanteSeleccionado, setPasanteSeleccionado] = useState(null);

    // Confirm DESPUÉS de guardar
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // Doble confirmación desactivar/activar
    const [desacTarget, setDesacTarget] = useState(null);
    // Doble confirmación eliminar
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    async function fetchPasantes() {
        const { data, total, page: cp, totalPages } = await getAllPasantes({ page, search, inactivos: mostrarInactivos });
        setPasantes(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    }
    useEffect(() => { fetchPasantes(); }, [page, search, mostrarInactivos]);

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const handleDesactivar = async () => {
        try {
            await updateEstadoPasante(desacTarget, mostrarInactivos ? "ACTIVO" : "INACTIVO");
            showAlertFn("success", mostrarInactivos ? "Pasante activado." : "Pasante desactivado.");
            fetchPasantes();
        } catch { showAlertFn("error", "Error al cambiar estado."); }
        finally { setDesacTarget(null); }
    };

    const handleDelete = async () => {
        try {
            await deletePasante(deleteTarget);
            showAlertFn("success", "Pasante eliminado correctamente.");
            fetchPasantes();
        } catch { showAlertFn("error", "Error al eliminar el pasante."); }
        finally { setDeleteTarget(null); }
    };

    const getActions = () => {
        const editarAction = {
            label: "Editar", icon: Edit3,
            className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100",
            onClick: (item) => { setPasanteSeleccionado(item.id_pasante); setMostrarModal2(true); },
        };
        if (mostrarInactivos) {
            return [
                editarAction,
                { label: "Activar", icon: UserCheck, className: "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100", onClick: (item) => setDesacTarget(item.id_pasante) },
                { label: "Eliminar", icon: Trash2, className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100", onClick: (item) => setDeleteTarget(item.id_pasante) },
            ];
        }
        return [
            editarAction,
            { label: "Desactivar", icon: UserX, className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100", onClick: (item) => setDesacTarget(item.id_pasante) },
        ];
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            <Header
                title="Pasantes" icon={<Briefcase className="w-8 h-8" />}
                stats={[{ label: 'Total', value: total, color: 'blue' }]}
                searchPlaceholder="Buscar pasantes..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    { label: "Añadir Pasante", icon: <UserPlus />, onClick: () => setMostrarModal(true), color: "purple" },
                    { label: mostrarInactivos ? 'Ver activos' : 'Ver inactivos', icon: mostrarInactivos ? <Eye /> : <EyeOff />, onClick: () => setMostrarInactivos(!mostrarInactivos), color: mostrarInactivos ? "emerald" : "rose" },
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <Table
                    data={pasantes}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                    columns={[
                        {
                            label: "Pasante", key: "nombre", render: (item) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold shadow-sm">{item.nombre?.charAt(0) || "P"}</div>
                                    <div><p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p><p className="text-sm text-slate-500">CI: {item.carnet_identidad}</p></div>
                                </div>)
                        },
                        {
                            label: "Contacto", key: "correo", render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {item.correo || "N/A"}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {item.telefono || "N/A"}</div>
                                </div>)
                        },
                        { label: "Institución", key: "institucion", render: (item) => <div className="flex items-center gap-2 text-sm text-slate-700"><Building2 className="w-4 h-4 text-purple-400" /> {item.institucion || "N/A"}</div> },
                        { label: "PIN Acceso", key: "pin_acceso", render: (item) => <PinDisplay pin={item.pin_acceso} /> },
                        {
                            label: "Fechas", key: "createdAt", render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Creado: <span className="font-medium">{parseDate(item.createdAt)}</span></div>
                                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Actualizado: <span className="font-medium">{parseDate(item.updatedAt)}</span></div>
                                </div>)
                        },
                        { label: "Estado", key: "estado", render: (item) => <span className={getEstadoBadge(item.estado)}>{getEstadoIcon(item.estado)} {item.estado}</span> },
                    ]}
                    actions={getActions()}
                />
            </div>

            {/* Forms — abren directo */}
            <Modal isOpen={mostrarModal} title="Crear Pasante" onClose={() => setMostrarModal(false)}>
                <CreatePasante
                    onClose={() => setMostrarModal(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: () => { setMostrarModal(false); showAlertFn("success", "Pasante registrado exitosamente."); fetchPasantes(); },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Pasante" onClose={() => setMostrarModal2(false)}>
                <ModificarPasante
                    id={pasanteSeleccionado}
                    onClose={() => setMostrarModal2(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: () => { setMostrarModal2(false); showAlertFn("success", "Pasante modificado exitosamente."); fetchPasantes(); },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte" onClose={() => setModalReporte(false)}>
                <GenerarReportePasantes />
            </Modal>

            {/* ✅ Confirm DESPUÉS de guardar */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas registrar este pasante?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            {/* ✅ Doble confirmación desactivar/activar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!desacTarget}
                onClose={() => setDesacTarget(null)}
                onConfirm={handleDesactivar}
                title={mostrarInactivos ? "Activar Pasante" : "Desactivar Pasante"}
                message={`¿Confirmas que deseas ${mostrarInactivos ? "activar" : "desactivar"} este pasante?`}
                waitSeconds={4}
                confirmColor={mostrarInactivos ? "emerald" : "amber"}
                confirmIcon={mostrarInactivos ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                confirmLabel={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            {/* ✅ Doble confirmación eliminar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Eliminar Pasante"
                message="¿Estás seguro de que deseas eliminar permanentemente este pasante? Esta acción no se puede deshacer."
                waitSeconds={4}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};
export default Pasantes;
