import React, { useEffect, useState } from "react";
import {
    getPresupuestoById,
    getMovimientosByPresupuesto,
    deleteMovimientoFinanciero,
} from "../../services/tesoreria";
import { Button } from "../../components/Button";

import MovimientoForm from "./components/MovimientoForm";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Edit3, Trash2, Plus, Calendar, Activity } from "lucide-react";

export default function MovimientosPorPresupuesto() {
    const [presupuesto, setPresupuesto] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { id } = useParams()
    const presupuestoId = id
    // Modales
    const [showModalCrearMovimiento, setShowModalCrearMovimiento] = useState(false);
    const [showModalEditarMovimiento, setShowModalEditarMovimiento] = useState(false);

    // ID de movimiento seleccionado para editar
    const [selectedMovId, setSelectedMovId] = useState(null);

    // Cargar datos del presupuesto y sus movimientos
    const fetchData = async () => {
        setLoading(true);
        const dataPres = await getPresupuestoById(presupuestoId);
        setPresupuesto(dataPres);
        setMovimientos(dataPres.movimientos ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [presupuestoId]);

    const handleDeleteMovimiento = async (id_movimiento) => {
        if (window.confirm("¿Eliminar este movimiento?")) {
            await deleteMovimientoFinanciero(id_movimiento);
            fetchData();
        }
    };

    if (loading || !presupuesto) {
        return (
            <div className="min-h-screen bg-slate-50/50 flex items-center justify-center relative overflow-hidden">
                <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-slate-200 p-12 rounded-3xl shadow-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        <div className="mt-6 text-center">
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Cargando presupuesto</h3>
                            <p className="text-slate-500">Preparando tu dashboard financiero...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-BO').format(amount || 0);
    };

    const calculateProgress = () => {
        if (!presupuesto.monto_total) return 0;
        const usado = presupuesto.monto_total - (presupuesto.saldo_restante || 0);
        return Math.min((usado / presupuesto.monto_total) * 100, 100);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
            <div className="relative z-10 container mx-auto px-6 py-8 space-y-6">
                
                {/* BACK BUTTON */}
                <Link to={`/dashboard/tesoreria`}>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 w-fit hover:bg-slate-50 mb-4">
                        <ArrowLeft className="w-5 h-5" />
                        Volver a Tesorería
                    </button>
                </Link>

                {/* Glassmorphism Header Light */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                                <Wallet className="w-8 h-8 text-indigo-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {presupuesto.nombre_presupuesto}
                                </h1>
                                <p className="text-slate-500 font-medium">{presupuesto.descripcion || "Sistema de Gestión Financiera"}</p>
                            </div>
                        </div>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap w-fit"
                            onClick={() => setShowModalCrearMovimiento(true)}
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Movimiento
                        </Button>
                    </div>

                    {/* Animated Stats Cards Light */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                        {/* Monto Total */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <Wallet className="w-6 h-6 text-slate-500" />
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Presupuesto Total</p>
                                    <p className="text-slate-800 text-2xl font-black mt-1">
                                        Bs. {formatMoney(presupuesto.monto_total)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Saldo Restante */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                    <TrendingDown className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="text-right">
                                    <p className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Saldo Disponible</p>
                                    <p className="text-slate-800 text-2xl font-black mt-1">
                                        Bs. {formatMoney(presupuesto.saldo_restante)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <Activity className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div className="text-right">
                                    <p className="text-indigo-600 text-xs font-semibold uppercase tracking-wider">Progreso de Uso</p>
                                    <p className="text-slate-800 text-2xl font-black mt-1">
                                        {calculateProgress().toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-indigo-400 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${calculateProgress()}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla Reutilizable Elegante */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <Table
                        columns={[
                            {
                                label: "Tipo",
                                key: "tipo_movimiento",
                                render: (m) => (
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${m.tipo_movimiento === 'INGRESO'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${m.tipo_movimiento === 'INGRESO' ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}></div>
                                        {m.tipo_movimiento}
                                    </div>
                                )
                            },
                            {
                                label: "Categoría",
                                key: "categoria",
                                render: (m) => (
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                        <span className="text-slate-700 font-medium">{m.categoria}</span>
                                    </div>
                                )
                            },
                            {
                                label: "Descripción",
                                key: "descripcion",
                                render: (m) => (
                                    <div className="text-slate-600 truncate max-w-xs" title={m.descripcion}>
                                        {m.descripcion}
                                    </div>
                                )
                            },
                            {
                                label: "Monto",
                                key: "monto",
                                render: (m) => (
                                    <div className={`text-base font-bold ${m.tipo_movimiento === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                        {m.tipo_movimiento === 'INGRESO' ? '+' : '-'}Bs. {formatMoney(m.monto)}
                                    </div>
                                )
                            },
                            {
                                label: "Fecha",
                                key: "fecha",
                                render: (m) => (
                                    <div className="flex items-center space-x-2 text-slate-500 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>{m.fecha_movimiento ? m.fecha_movimiento.split("T")[0] : "-"}</span>
                                    </div>
                                )
                            }
                        ]}
                        data={movimientos}
                        actions={[
                            {
                                label: "Editar",
                                icon: Edit3,
                                className: "px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium hover:bg-amber-100 transition-colors shadow-sm",
                                onClick: (m) => {
                                    setSelectedMovId(m.id_movimiento);
                                    setShowModalEditarMovimiento(true);
                                }
                            },
                            {
                                label: "Eliminar",
                                icon: Trash2,
                                className: "px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-medium hover:bg-rose-100 transition-colors shadow-sm",
                                onClick: (m) => handleDeleteMovimiento(m.id_movimiento)
                            }
                        ]}
                        emptyMessage="No hay movimientos registrados"
                    />
                </div>
            </div>

            {/***— Modal Crear Movimiento —***/}
            <Modal
                isOpen={showModalCrearMovimiento}
                title="Nuevo Movimiento Financiero"
                onClose={() => setShowModalCrearMovimiento(false)}
            >
                <MovimientoForm
                    presupuestoId={presupuestoId}
                    onClose={() => {
                        setShowModalCrearMovimiento(false);
                        fetchData();
                    }}
                    onSuccess={fetchData}
                />
            </Modal>

            {/***— Modal Editar Movimiento —***/}
            <Modal
                isOpen={showModalEditarMovimiento}
                title="Editar Movimiento Financiero"
                onClose={() => setShowModalEditarMovimiento(false)}
            >
                {selectedMovId && (
                    <MovimientoForm
                        presupuestoId={presupuestoId}
                        movimientoId={selectedMovId}
                        onClose={() => {
                            setShowModalEditarMovimiento(false);
                            fetchData();
                        }}
                        onSuccess={fetchData}
                    />
                )}
            </Modal>
        </div>
    );
}