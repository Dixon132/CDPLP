// src/pages/dashboard/pages/Tesoreria/Tesoreria.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import {
    H1,
    Tables,
    THead,
    TBody,
    Td,
    Tfooter,
    EmptyTd,
} from "../../components/Tables";
import {
    getAllPresupuestos,
    deletePresupuesto,
} from "../../services/tesoreria";
import PresupuestoForm from "./components/PresupuestoForm";
import MovimientosPorPresupuesto from "./MovimientosPorPresupuesto";
import GenerarReporteTesoreria from "./components/GenerarReporteTesoreria";
import {
    Wallet,
    Plus,
    Search,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Activity,
    Edit3,
    Trash2,
    Eye,
    FileText,
    Download,
    PieChart,
    BarChart3,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { Link } from "react-router-dom";

export default function Tesoreria() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [search, setSearch] = useState("");
    const [modalReporte, setModalReporte] = useState(false)
    // Modales
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalMovimientos, setShowModalMovimientos] = useState(false);

    // ID de presupuesto seleccionado para editar o ver movimientos
    const [selectedId, setSelectedId] = useState(null);

    const fetchPresupuestos = async () => {
        const { data, total: t, page: currentPage, totalPages } =
            await getAllPresupuestos({ page, search });
        setPresupuestos(data);
        setTotal(t);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchPresupuestos();
    }, [page, search]);

    const handleDelete = async (id) => {
        if (window.confirm("¿Deseas eliminar este presupuesto?")) {
            await deletePresupuesto(id);
            fetchPresupuestos();
        }
    };

    const getEstadoBadge = (estado) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado?.toUpperCase()) {
            case 'ACTIVO':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'INACTIVO':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            case 'PENDIENTE':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case 'AGOTADO':
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
            default:
                return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado?.toUpperCase()) {
            case 'ACTIVO':
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'INACTIVO':
                return <XCircle className="w-3 h-3 text-red-500" />;
            case 'PENDIENTE':
                return <Clock className="w-3 h-3 text-yellow-500" />;
            case 'AGOTADO':
                return <AlertCircle className="w-3 h-3 text-gray-500" />;
            default:
                return <Activity className="w-3 h-3 text-blue-500" />;
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return "Bs. 0.00";
        return `Bs. ${parseFloat(amount).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
    };

    const calculateTotalBudget = () => {
        return presupuestos.reduce((sum, p) => sum + (parseFloat(p.monto_total) || 0), 0);
    };

    const calculateTotalRemaining = () => {
        return presupuestos.reduce((sum, p) => sum + (parseFloat(p.saldo_restante) || 0), 0);
    };

    const calculateUsedPercentage = (montoTotal, saldoRestante) => {
        if (!montoTotal || montoTotal === 0) return 0;
        const usado = parseFloat(montoTotal) - (parseFloat(saldoRestante) || 0);
        return ((usado / parseFloat(montoTotal)) * 100).toFixed(1);
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <H1 className="text-2xl font-bold text-slate-800 mb-1">
                                Módulo de Tesorería
                            </H1>
                            <p className="text-slate-600 text-sm">
                                Gestión integral de presupuestos y finanzas
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas financieras */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(calculateTotalBudget())}</div>
                            <div className="text-xs text-slate-500">Presupuesto Total</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotalRemaining())}</div>
                            <div className="text-xs text-slate-500">Saldo Disponible</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-600">{total}</div>
                            <div className="text-xs text-slate-500">Presupuestos</div>
                        </div>
                    </div>
                </div>

                {/* Controles mejorados */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={() => setShowModalCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 hover:scale-105"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Presupuesto
                    </button>

                    <button
                        onClick={() => setModalReporte(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 hover:scale-105"
                    >
                        <Download className="w-4 h-4" />
                        Generar Reporte
                    </button>
                </div>

                {/* Búsqueda mejorada */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar presupuesto por nombre o descripción..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Tabla mejorada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-emerald-50 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Presupuesto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Montos</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Progreso</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {presupuestos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Wallet className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-500 font-medium">No se encontraron presupuestos</p>
                                            <p className="text-slate-400 text-sm">Crea tu primer presupuesto para comenzar</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                presupuestos.map((p) => {
                                    const usedPercentage = calculateUsedPercentage(p.monto_total, p.saldo_restante);
                                    const isLowBalance = parseFloat(usedPercentage) > 80;

                                    return (
                                        <tr key={p.id_presupuesto} className="hover:bg-emerald-50/30 transition-colors duration-150">
                                            {/* Información del presupuesto */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                        <DollarSign className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{p.nombre_presupuesto}</p>
                                                        <p className="text-sm text-slate-500 max-w-xs truncate">{p.descripcion}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Montos */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-slate-600">Total:</span>
                                                        <span className="font-semibold text-emerald-600">
                                                            {formatCurrency(p.monto_total)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <TrendingDown className="w-3 h-3 text-blue-500" />
                                                        <span className="text-slate-600">Disponible:</span>
                                                        <span className={`font-semibold ${isLowBalance ? 'text-red-600' : 'text-blue-600'}`}>
                                                            {formatCurrency(p.saldo_restante)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Progreso de uso */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">Usado</span>
                                                        <span className={`font-medium ${isLowBalance ? 'text-red-600' : 'text-slate-800'}`}>
                                                            {usedPercentage}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${isLowBalance ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                                                }`}
                                                            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Fecha */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    {p.fecha_asignacion ? p.fecha_asignacion.split("T")[0] : "-"}
                                                </div>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-6 py-4">
                                                <span className={getEstadoBadge(p.estado)}>
                                                    {getEstadoIcon(p.estado)}
                                                    {p.estado}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button

                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors duration-150"
                                                    >
                                                        <Activity className="w-3 h-3" />
                                                        <Link to={`/dashboard/tesoreria/movimientos/${p.id_presupuesto}`}>

                                                            Movimientos
                                                        </Link>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedId(p.id_presupuesto);
                                                            setShowModalEdit(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors duration-150"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                        Editar
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(p.id_presupuesto)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors duration-150"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer de paginación */}
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200/60">
                    <Tfooter
                        total={total}
                        totalPage={totalPage}
                        Page={page}
                        onChangePage={(p) => setPage(p)}
                    />
                </div>
            </div>

            {/* Modales existentes */}
            <Modal
                isOpen={showModalCreate}
                title="Crear Presupuesto"
                onClose={() => setShowModalCreate(false)}
            >
                <PresupuestoForm
                    onClose={() => {
                        setShowModalCreate(false);
                        fetchPresupuestos();
                    }}
                    onSuccess={fetchPresupuestos}
                />
            </Modal>

            <Modal
                isOpen={showModalEdit}
                title="Editar Presupuesto"
                onClose={() => setShowModalEdit(false)}
            >
                {selectedId && (
                    <PresupuestoForm
                        presupuestoId={selectedId}
                        onClose={() => {
                            setShowModalEdit(false);
                            fetchPresupuestos();
                        }}
                        onSuccess={fetchPresupuestos}
                    />
                )}
            </Modal>



            <Modal
                isOpen={modalReporte}
                title="Generar Reporte de Tesorería"
                onClose={() => setModalReporte(false)}
            >
                <GenerarReporteTesoreria />
            </Modal>
        </div>
    );
}