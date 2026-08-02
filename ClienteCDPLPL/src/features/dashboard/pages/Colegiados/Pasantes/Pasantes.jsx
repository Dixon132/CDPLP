import { useEffect, useState } from "react";
import Modal from "../../../../../components/Modal";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../../components/ConfirmDeleteModal";
import ResponsiveTable from "../../../components/ResponsiveTable";
import PinDisplay from "../../../../../components/PinDisplay";
import { getAllPasantes, updateEstadoPasante, deletePasante, createPasante, modificarPasante } from "../../../services/pasantes";
import CreatePasante from "./Components/CreatePasante";
import ModificarPasante from "./Components/ModificarPasante";
import GenerarReportePasantes from "./components/GenerarReporte";
import parseDate from "../../../../../utils/parseData";
import Alerts from "../../../components/Alerts";
import { getEstadoBadge, getEstadoIcon } from "../../../hooks/estados";
import { Briefcase, UserPlus, Eye, EyeOff, Mail, Phone, Building2, Calendar, Edit3, UserCheck, UserX, Trash2, KeyRound, Copy } from 'lucide-react';
import Header from "../../../components/Header";
import { useSession } from "../../../../../context/SessionProvider";

const Pasantes = () => {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("colegiados.pasantes");
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

    // Confirm ANTES de guardar — el callback es quien ejecuta la petición
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // PIN devuelto por el servidor al registrar (solo se muestra una vez)
    const [pinGenerado, setPinGenerado] = useState(null);

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
        if (!esEditor) return [];
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
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Pasantes" icon={<Briefcase className="w-8 h-8" />}
                stats={[{ label: 'Total', value: total, color: 'blue' }]}
                searchPlaceholder="Buscar pasantes..."
                onSearch={(v) => { setSearch(v); setPage(1); }}
                buttons={[
                    ...(esEditor ? [{ label: "Añadir Pasante", icon: <UserPlus />, onClick: () => setMostrarModal(true), color: "purple" }] : []),
                    { label: mostrarInactivos ? 'Ver activos' : 'Ver inactivos', icon: mostrarInactivos ? <Eye /> : <EyeOff />, onClick: () => setMostrarInactivos(!mostrarInactivos), color: mostrarInactivos ? "emerald" : "rose" },
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="pasantes"
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
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: async () => {
                                try {
                                    const response = await createPasante(payload);
                                    setMostrarModal(false);
                                    fetchPasantes();
                                    if (response?.pin_temporal) setPinGenerado(response.pin_temporal);
                                    else showAlertFn("success", "Pasante registrado exitosamente.");
                                } catch (err) { showAlertFn("error", err?.response?.data?.message || "Error al registrar el pasante."); }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Pasante" onClose={() => setMostrarModal2(false)}>
                <ModificarPasante
                    id={pasanteSeleccionado}
                    onClose={() => setMostrarModal2(false)}
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: async () => {
                                try {
                                    await modificarPasante(pasanteSeleccionado, payload);
                                    setMostrarModal2(false);
                                    showAlertFn("success", "Pasante modificado exitosamente.");
                                    fetchPasantes();
                                } catch { showAlertFn("error", "Error al modificar el pasante."); }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte" onClose={() => setModalReporte(false)}>
                <GenerarReportePasantes />
            </Modal>

            {/* PIN de acceso — solo se muestra esta vez */}
            <Modal isOpen={!!pinGenerado} title="PIN de acceso generado" onClose={() => setPinGenerado(null)}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <p className="text-slate-600 text-sm max-w-sm">
                        Guarda este PIN y comunícaselo al pasante. Es necesario para el acceso por GPS.
                    </p>
                    <PinDisplay pin={pinGenerado} />
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => navigator.clipboard.writeText(pinGenerado)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            <Copy className="w-4 h-4" /> Copiar
                        </button>
                        <button
                            onClick={() => { setPinGenerado(null); showAlertFn("success", "Pasante registrado exitosamente."); }}
                            className="px-4 py-2 rounded-lg font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md transition-all"
                        >
                            Entendido, continuar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ✅ Confirm ANTES de guardar — cancelar aborta la operación */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas registrar este pasante?" : "¿Confirmas que deseas guardar los cambios realizados?"}
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
