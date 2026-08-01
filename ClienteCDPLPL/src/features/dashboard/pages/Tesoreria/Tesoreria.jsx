// src/pages/dashboard/pages/Tesoreria/Tesoreria.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Alerts from "../../components/Alerts";

import { getAllPresupuestos, deletePresupuesto } from "../../services/tesoreria";
import PresupuestoForm from "./components/PresupuestoForm";
import { getPresupuestoActivo } from '../../services/configFinanciera';

import {
    Wallet, Plus, Search, Calendar, DollarSign, TrendingUp, TrendingDown,
    Activity, Edit3, Trash2, CheckCircle, XCircle, Clock, AlertCircle,
    Banknote
} from 'lucide-react';

export default function Tesoreria() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [search, setSearch] = useState("");
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [presupuestoToDelete, setPresupuestoToDelete] = useState(null);
    const [presupuestoActivoNombre, setPresupuestoActivoNombre] = useState(null);

    // Confirm que aparece DESPUÉS de que el form guarda exitosamente
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    const [alert, setAlert] = useState({ show: false, type: "success", message: "", duration: 2000 });
    const showAlert = (type, message, duration = 2000) =>
        setAlert({ show: true, type, message, duration });

    const fetchPresupuestos = async () => {
        const { data, total, totalPages, page: cp } = await getAllPresupuestos({ page, search });
        setPresupuestos(data); setTotal(total); setTotalPage(totalPages); setPage(cp);
    };
    useEffect(() => { 
        fetchPresupuestos();
        getPresupuestoActivo().then(res => {
            const idActivo = res.valor;
            if (idActivo) {
                getAllPresupuestos({ limit: 100 }).then(data => {
                    const found = (data.data || []).find(p => String(p.id_presupuesto) === String(idActivo));
                    if (found) setPresupuestoActivoNombre(found.nombre_presupuesto);
                }).catch(() => {});
            }
        }).catch(() => {});
    }, [page, search]);

    const handleConfirmDelete = async () => {
        if (!presupuestoToDelete?.id_presupuesto) return;
        try {
            await deletePresupuesto(presupuestoToDelete.id_presupuesto);
            setPresupuestoToDelete(null);
            showAlert("success", "Presupuesto eliminado correctamente", 4000);
            fetchPresupuestos();
        } catch { showAlert("error", "Error al eliminar el presupuesto", 4000); }
    };

    const formatCurrency = (amount) =>
        `Bs. ${parseFloat(amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

    const calculateUsedPercentage = (montoTotal, saldoRestante) => {
        if (!montoTotal || montoTotal === 0) return 0;
        return (((parseFloat(montoTotal) - (parseFloat(saldoRestante) || 0)) / parseFloat(montoTotal)) * 100).toFixed(1);
    };

    const getEstadoBadge = (estado) => {
        const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado?.toUpperCase()) {
            case "ACTIVO": return `${base} bg-green-100 text-green-800 border border-green-200`;
            case "INACTIVO": return `${base} bg-red-100 text-red-800 border border-red-200`;
            case "PENDIENTE": return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case "AGOTADO": return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
            default: return `${base} bg-blue-100 text-blue-800 border border-blue-200`;
        }
    };
    const getEstadoIcon = (estado) => {
        switch (estado?.toUpperCase()) {
            case "ACTIVO": return <CheckCircle className="w-3 h-3 text-green-500" />;
            case "INACTIVO": return <XCircle className="w-3 h-3 text-red-500" />;
            case "PENDIENTE": return <Clock className="w-3 h-3 text-yellow-500" />;
            case "AGOTADO": return <AlertCircle className="w-3 h-3 text-gray-500" />;
            default: return <Activity className="w-3 h-3 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">Módulo de Tesorería</h1>
                            <p className="text-slate-600 text-sm">Gestión integral de presupuestos y finanzas</p>
                        </div>
                    </div>
                </div>
                {presupuestoActivoNombre && (
                    <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Banknote className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Presupuesto Activo Actual</p>
                            <p className="text-sm font-bold text-emerald-800">{presupuestoActivoNombre}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    {/* ✅ Abre el form DIRECTAMENTE */}
                    <button onClick={() => setShowModalCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:scale-105">
                        <Plus className="w-4 h-4" /> Crear Presupuesto
                    </button>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Buscar presupuesto..."
                            className="w-full pl-10 pr-4 py-3 bg-white/70 border rounded-xl focus:ring-2" />
                    </div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="tesoreria-presupuestos"
                    data={presupuestos}
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                    columns={[
                        {
                            label: "Presupuesto", key: "nombre_presupuesto", render: (p) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div><p className="font-semibold text-slate-800">{p.nombre_presupuesto}</p><p className="text-xs text-slate-500">{p.descripcion}</p></div>
                                </div>)
                        },
                        {
                            label: "Montos", key: "monto_total", render: (p) => (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm"><TrendingUp className="w-3 h-3 text-emerald-500" /> Total: <span className="font-semibold text-emerald-600">{formatCurrency(p.monto_total)}</span></div>
                                    <div className="flex items-center gap-2 text-sm"><TrendingDown className="w-3 h-3 text-blue-500" /> Disponible: <span className="font-semibold text-blue-600">{formatCurrency(p.saldo_restante)}</span></div>
                                </div>)
                        },
                        {
                            label: "Progreso", key: "uso", render: (p) => {
                                const pct = calculateUsedPercentage(p.monto_total, p.saldo_restante);
                                const isLow = parseFloat(pct) > 80;
                                return (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm"><span>Usado</span><span className={isLow ? 'text-red-600' : 'text-slate-800'}>{pct}%</span></div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className={`${isLow ? 'bg-red-500' : 'bg-emerald-500'} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                        </div>
                                    </div>);
                            }
                        },
                        {
                            label: "Fecha", key: "fecha_asignacion", render: (p) => (
                                <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-3 h-3" /> {p.fecha_asignacion?.split('T')[0] || "-"}</div>)
                        },
                        {
                            label: "Estado", key: "estado", render: (p) => (
                                <span className={getEstadoBadge(p.estado)}>{getEstadoIcon(p.estado)} {p.estado}</span>)
                        },
                    ]}
                    actions={[
                        {
                            label: "Movimientos", icon: Activity, className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm",
                            onClick: (p) => { window.location.href = `/dashboard/tesoreria/movimientos/${p.id_presupuesto}`; }
                        },
                        {
                            label: "Editar", icon: Edit3, className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm",
                            // ✅ Abre el form DIRECTAMENTE
                            onClick: (p) => { setSelectedId(p.id_presupuesto); setShowModalEdit(true); }
                        },
                        {
                            label: "Eliminar", icon: Trash2, className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm",
                            onClick: (p) => setPresupuestoToDelete(p)
                        },
                    ]}
                />
            </div>

            {/* ✅ Modal crear — confirm aparece DESPUÉS de guardar exitosamente (en onSuccess) */}
            <Modal isOpen={showModalCreate} title="Crear Presupuesto" onClose={() => setShowModalCreate(false)}>
                <PresupuestoForm
                    onClose={() => setShowModalCreate(false)}
                    onSuccess={() => {
                        // El form guardó — ahora pedimos confirmación antes de cerrar
                        setConfirmSave({
                            open: true,
                            variant: "create",
                            callback: () => { setShowModalCreate(false); fetchPresupuestos(); showAlert("success", "Presupuesto creado correctamente", 3000); },
                        });
                    }}
                />
            </Modal>

            {/* ✅ Modal editar — confirm aparece DESPUÉS de guardar exitosamente (en onSuccess) */}
            <Modal isOpen={showModalEdit} title="Editar Presupuesto" onClose={() => setShowModalEdit(false)}>
                <PresupuestoForm
                    presupuestoId={selectedId}
                    onClose={() => setShowModalEdit(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true,
                            variant: "edit",
                            callback: () => { setShowModalEdit(false); fetchPresupuestos(); showAlert("success", "Presupuesto actualizado correctamente", 3000); },
                        });
                    }}
                />
            </Modal>

            {/* ✅ Confirm que aparece tras guardar exitosamente */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create"
                    ? "El registro fue procesado. ¿Confirmas que deseas guardarlo?"
                    : "Los cambios fueron procesados. ¿Confirmas que deseas guardarlos?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            {/* ✅ Doble confirmación eliminar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!presupuestoToDelete}
                onClose={() => setPresupuestoToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Presupuesto"
                message={`¿Seguro que deseas eliminar "${presupuestoToDelete?.nombre_presupuesto || "este presupuesto"}"? Esta acción no se puede deshacer.`}
                waitSeconds={4}
            />

            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={alert.duration}
                onClose={() => setAlert((p) => ({ ...p, show: false }))} />
        </div>
    );
}
