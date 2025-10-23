// src/pages/dashboard/pages/Tesoreria/Tesoreria.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table"; // ✅ Usa tu tabla reutilizable
import { Link } from "react-router-dom";

import {
    getAllPresupuestos,
    deletePresupuesto,
} from "../../services/tesoreria";

import PresupuestoForm from "./components/PresupuestoForm";
import GenerarReporteTesoreria from "./components/GenerarReporteTesoreria";

import {
    Wallet, Plus, Search, Calendar, DollarSign, TrendingUp, TrendingDown,
    Activity, Edit3, Trash2, Eye, Download, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';

export default function Tesoreria() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [search, setSearch] = useState("");
    const [modalReporte, setModalReporte] = useState(false);
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const fetchPresupuestos = async () => {
        const { data, total, totalPages, page: currentPage } =
            await getAllPresupuestos({ page, search });
        setPresupuestos(data);
        setTotal(total);
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

    const formatCurrency = (amount) =>
        `Bs. ${parseFloat(amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

    const calculateUsedPercentage = (montoTotal, saldoRestante) => {
        if (!montoTotal || montoTotal === 0) return 0;
        const used = parseFloat(montoTotal) - (parseFloat(saldoRestante) || 0);
        return ((used / parseFloat(montoTotal)) * 100).toFixed(1);
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
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">

            {/* ✅ Header Financiero */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">
                                Módulo de Tesorería
                            </h1>
                            <p className="text-slate-600 text-sm">
                                Gestión integral de presupuestos y finanzas
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setModalReporte(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl shadow-lg hover:scale-105"
                    >
                        <Download className="w-4 h-4" /> Generar Reporte
                    </button>
                </div>

                {/* ✅ Búsqueda */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={() => setShowModalCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:scale-105"
                    >
                        <Plus className="w-4 h-4" /> Crear Presupuesto
                    </button>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Buscar presupuesto..."
                            className="w-full pl-10 pr-4 py-3 bg-white/70 border rounded-xl focus:ring-2"
                        />
                    </div>
                </div>
            </div>

            {/* ✅ Tabla Principal */}
            <Table
                data={presupuestos}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
                columns={[
                    {
                        label: "Presupuesto",
                        key: "nombre_presupuesto",
                        render: (p) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{p.nombre_presupuesto}</p>
                                    <p className="text-xs text-slate-500">{p.descripcion}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Montos",
                        key: "monto_total",
                        render: (p) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    Total: <span className="font-semibold text-emerald-600">{formatCurrency(p.monto_total)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingDown className="w-3 h-3 text-blue-500" />
                                    Disponible:{" "}
                                    <span className="font-semibold text-blue-600">{formatCurrency(p.saldo_restante)}</span>
                                </div>
                            </div>
                        )
                    },
                    {
                        label: "Progreso",
                        key: "uso",
                        render: (p) => {
                            const usedPercentage = calculateUsedPercentage(p.monto_total, p.saldo_restante);
                            const isLow = parseFloat(usedPercentage) > 80;
                            return (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Usado</span>
                                        <span className={`${isLow ? 'text-red-600' : 'text-slate-800'}`}>{usedPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`${isLow ? 'bg-red-500' : 'bg-emerald-500'} h-2 rounded-full`}
                                            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        },
                    },
                    {
                        label: "Fecha",
                        key: "fecha_asignacion",
                        render: (p) => (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-3 h-3" /> {p.fecha_asignacion?.split('T')[0] || "-"}
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (p) => (
                            <span className={getEstadoBadge(p.estado)}>
                                {getEstadoIcon(p.estado)} {p.estado}
                            </span>
                        ),
                    },
                ]}
                actions={[
                    {
                        label: "Movimientos",
                        icon: Activity,
                        className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm",
                        onClick: (p) => {
                            window.location.href = `/dashboard/tesoreria/movimientos/${p.id_presupuesto}`;
                        },
                    },
                    {
                        label: "Editar",
                        icon: Edit3,
                        className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm",
                        onClick: (p) => {
                            setSelectedId(p.id_presupuesto);
                            setShowModalEdit(true);
                        },
                    },
                    {
                        label: "Eliminar",
                        icon: Trash2,
                        className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm",
                        onClick: (p) => handleDelete(p.id_presupuesto),
                    },
                ]}
            />

            {/* ✅ Modales */}
            <Modal isOpen={showModalCreate} title="Crear Presupuesto" onClose={() => setShowModalCreate(false)}>
                <PresupuestoForm
                    onClose={() => {
                        setShowModalCreate(false);
                        fetchPresupuestos();
                    }}
                />
            </Modal>

            <Modal isOpen={showModalEdit} title="Editar Presupuesto" onClose={() => setShowModalEdit(false)}>
                <PresupuestoForm
                    presupuestoId={selectedId}
                    onClose={() => {
                        setShowModalEdit(false);
                        fetchPresupuestos();
                    }}
                />
            </Modal>

            <Modal isOpen={modalReporte} title="Generar Reporte de Tesorería" onClose={() => setModalReporte(false)}>
                <GenerarReporteTesoreria />
            </Modal>
        </div>
    );
}
