import Modal from "../../../../components/Modal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import { useEffect, useState } from 'react';
import { getAllColegiados, updateEstadoColegiado, createColegiado, modificarColegiados } from "../../services/colegiados";
import CreateColegiado from "./components/CreateColegiado";
import ModificarColegiado from "./components/ModificarColegiado";
import Documentos from "./Documentos";
import Pagos from "./Pagos";
import parseDate from "../../../../utils/parseData";
import Alerts from "../../components/Alerts";
import { Outlet } from "react-router-dom";
import PinDisplay from "../../../../components/PinDisplay";
import { Users, Plus, Eye, EyeOff, FileText, CreditCard, Edit3, UserCheck, UserX, Calendar, Mail, Phone, GraduationCap, KeyRound, Copy } from 'lucide-react';
import Header from "../../components/Header";
import { getEstadoBadge, getEstadoIcon } from "../../hooks/estados";
import { useSession } from "../../../../context/SessionProvider";

const Colegiados = () => {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar("colegiados");
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [colegiados, setColegiados] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    const [mostrarModal, SetMostrarModal] = useState(false);
    const [mostrarModal2, setMostrarModal2] = useState(false);
    const [colegiadoSeleccionado, setColegiadoSeleccionado] = useState(null);

    // Pagos/Documentos se ven en un modal grande en vez de navegar a otra
    // página — evita perder el contexto de la tabla de colegiados.
    const [pagosModalId, setPagosModalId] = useState(null);
    const [documentosModalId, setDocumentosModalId] = useState(null);

    // Confirm ANTES de guardar — el callback es quien ejecuta la petición
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    // PIN devuelto por el servidor al registrar (solo se muestra una vez)
    const [pinGenerado, setPinGenerado] = useState(null);

    // Doble confirmación desactivar/activar
    const [desacTarget, setDesacTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    async function fetchColegiados() {
        const { data, total, page: cp, totalPages } =
            await getAllColegiados({ page, search, inactivos: mostrarInactivos });
        setColegiados(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    }

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    useEffect(() => { fetchColegiados(); }, [page, search, mostrarInactivos]);

    const handleEstado = async () => {
        try {
            await updateEstadoColegiado(desacTarget, mostrarInactivos ? "ACTIVO" : "INACTIVO");
            showAlertFn('success', mostrarInactivos ? 'Colegiado activado exitosamente.' : 'Colegiado desactivado exitosamente.');
            fetchColegiados();
        } catch { showAlertFn('error', 'Error al cambiar estado del colegiado.'); }
        finally { setDesacTarget(null); }
    };

    const getActions = () => [
        { label: "Pagos", icon: CreditCard, className: "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100", onClick: (item) => setPagosModalId(item.id_colegiado) },
        { label: "Docs", icon: FileText, className: "px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-medium shadow-sm hover:bg-blue-100", onClick: (item) => setDocumentosModalId(item.id_colegiado) },
        ...(esEditor ? [
            {
                label: "Editar", icon: Edit3, className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium shadow-sm hover:bg-amber-100",
                onClick: (item) => { setColegiadoSeleccionado(item.id_colegiado); setMostrarModal2(true); }
            },
            {
                label: mostrarInactivos ? "Activar" : "Desactivar", icon: mostrarInactivos ? UserCheck : UserX,
                className: mostrarInactivos ? "px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium shadow-sm hover:bg-emerald-100" : "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium shadow-sm hover:bg-rose-100",
                onClick: (item) => setDesacTarget(item.id_colegiado)
            },
        ] : []),
    ];

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                icon={<Users className="w-8 h-8" />} title="Gestión de Colegiados"
                stats={[{ label: "Total", value: total, color: "purple" }]}
                searchPlaceholder="Buscar colegiados..."
                onSearch={(v) => setSearch(v)}
                buttons={[
                    ...(esEditor ? [{ label: "Añadir colegiado", icon: <Plus />, onClick: () => SetMostrarModal(true), color: "purple" }] : []),
                    { label: mostrarInactivos ? "Ver activos" : "Ver inactivos", icon: mostrarInactivos ? <Eye /> : <EyeOff />, onClick: () => setMostrarInactivos(!mostrarInactivos), color: mostrarInactivos ? "emerald" : "rose" },
                ]}
            />

            {/* Tabla genérica / Grid */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    data={colegiados}
                    storageKey="colegiados"
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                    columns={[
                        {
                            label: "Colegiado", key: "nombre", render: (item) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm">{item.nombre.charAt(0)}</div>
                                    <div><p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p><p className="text-sm text-slate-500">CI: {item.carnet_identidad}</p></div>
                                </div>)
                        },
                        {
                            label: "Contacto", key: "correo", render: (item) => (
                                <div className="space-y-1 text-slate-600">
                                    <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-slate-400" /> {item.correo}</div>
                                    <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-slate-400" /> {item.telefono}</div>
                                </div>)
                        },
                        {
                            label: "Especialidad", key: "especialidades", render: (item) => (
                                <div className="flex items-center gap-2 text-slate-700"><GraduationCap className="w-4 h-4 text-indigo-400" />{item.especialidades}</div>)
                        },
                        { label: "PIN Acceso", key: "pin_acceso", render: (item) => <PinDisplay pin={item.pin_acceso} /> },
                        {
                            label: "Fechas", key: "fecha_inscripcion", render: (item) => (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Inscripción: <span className="font-medium">{parseDate(item.fecha_inscripcion)}</span></div>
                                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Renovación: <span className="font-medium">{parseDate(item.fecha_renovacion)}</span></div>
                                </div>)
                        },
                        { label: "Estado", key: "estado", render: (item) => <span className={getEstadoBadge(item.estado)}>{getEstadoIcon(item.estado)} {item.estado}</span> },
                    ]}
                    actions={getActions()}
                />
            </div>

            {/* Forms — abren directo y delegan el guardado al confirm */}
            <Modal isOpen={mostrarModal} title="Crear Colegiado" onClose={() => SetMostrarModal(false)}>
                <CreateColegiado
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: async () => {
                                try {
                                    const response = await createColegiado(payload);
                                    SetMostrarModal(false);
                                    fetchColegiados();
                                    if (response?.pin_temporal) setPinGenerado(response.pin_temporal);
                                    else showAlertFn('success', 'Colegiado registrado exitosamente.');
                                } catch { showAlertFn('error', 'Error al registrar el colegiado.'); }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={mostrarModal2} title="Modificar Colegiado" onClose={() => setMostrarModal2(false)}>
                <ModificarColegiado
                    id={colegiadoSeleccionado}
                    onClose={() => setMostrarModal2(false)}
                    onSubmitForm={(payload) => {
                        setConfirmSave({
                            open: true, variant: "edit",
                            callback: async () => {
                                try {
                                    await modificarColegiados(colegiadoSeleccionado, payload);
                                    setMostrarModal2(false);
                                    showAlertFn('success', 'Colegiado modificado exitosamente.');
                                    fetchColegiados();
                                } catch { showAlertFn('error', 'Error al modificar el colegiado.'); }
                            },
                        });
                    }}
                />
            </Modal>

            {/* Pagos y Documentos — modal grande, sin salir de la lista */}
            <Modal isOpen={!!pagosModalId} size="xl" title="Pagos del Colegiado" onClose={() => setPagosModalId(null)}>
                <Pagos id={pagosModalId} dentroDeModal />
            </Modal>

            <Modal isOpen={!!documentosModalId} size="xl" title="Documentos del Colegiado" onClose={() => setDocumentosModalId(null)}>
                <Documentos id={documentosModalId} dentroDeModal />
            </Modal>

            {/* PIN de acceso — solo se muestra esta vez */}
            <Modal isOpen={!!pinGenerado} title="PIN de acceso generado" onClose={() => setPinGenerado(null)}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <p className="text-slate-600 text-sm max-w-sm">
                        Guarda este PIN y comunícaselo al colegiado. Es necesario para el acceso por GPS.
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
                            onClick={() => { setPinGenerado(null); showAlertFn('success', 'Colegiado registrado exitosamente.'); }}
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
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas registrar este colegiado?" : "¿Confirmas que deseas guardar los cambios realizados?"}
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
                onConfirm={handleEstado}
                title={mostrarInactivos ? "Activar Colegiado" : "Desactivar Colegiado"}
                message={`¿Confirmas que deseas ${mostrarInactivos ? "activar" : "desactivar"} este colegiado?`}
                waitSeconds={4}
                confirmColor={mostrarInactivos ? "emerald" : "amber"}
                confirmIcon={mostrarInactivos ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                confirmLabel={mostrarInactivos ? "Activar" : "Desactivar"}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
            <Outlet />
        </div>
    );
};
export default Colegiados;
