import React, { useEffect, useState } from "react";
import {
    getPresupuestoById,
    getMovimientosByPresupuesto,
    deleteMovimientoFinanciero,
} from "../../services/tesoreria";
import { Button } from "../../components/Button";

import MovimientoForm from "./components/MovimientoForm";
import Modal from "../../../../components/Modal";
import { Link, useParams } from "react-router-dom";

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
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
                    <div className="absolute bottom-20 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
                </div>

                <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-3xl shadow-2xl">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-white/30 rounded-full animate-spin"></div>
                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
                        </div>
                        <div className="mt-6 text-center">
                            <h3 className="text-2xl font-bold text-white mb-2">Cargando experiencia</h3>
                            <p className="text-white/70 text-lg">Preparando tu dashboard financiero...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float-delayed"></div>
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float-slow"></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-8">
                {/* Glassmorphism Header */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 mb-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                    {presupuesto.nombre_presupuesto}
                                </h1>
                                <p className="text-white/70 text-lg font-medium">Sistema de Gestión Financiera</p>
                            </div>
                        </div>
                        <Link to={`dashboard/tesoreria`}>
                            <button className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg">
                                <span className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>Volver</span>
                                </span>
                            </button>
                        </Link>
                    </div>

                    {/* Animated Stats Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Monto Total */}
                        <div className="group bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-white/20 rounded-xl">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-100 text-sm font-semibold uppercase tracking-wider">Presupuesto Total</p>
                                        <p className="text-white text-3xl font-black mt-1">
                                            Bs. {formatMoney(presupuesto.monto_total)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Saldo Restante */}
                        <div className="group bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-white/20 rounded-xl">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Saldo Disponible</p>
                                        <p className="text-white text-3xl font-black mt-1">
                                            Bs. {formatMoney(presupuesto.saldo_restante)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="group bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-white/20 rounded-xl">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-purple-100 text-sm font-semibold uppercase tracking-wider">Progreso de Uso</p>
                                        <p className="text-white text-3xl font-black mt-1">
                                            {calculateProgress().toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className="bg-white h-2 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${calculateProgress()}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Action Button */}
                    <div className="mt-8">
                        <Button
                            className="group bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-0 relative overflow-hidden"
                            onClick={() => setShowModalCrearMovimiento(true)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative z-10 flex items-center space-x-3 text-lg">
                                <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Crear Nuevo Movimiento</span>
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Futuristic Table */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-8 py-6 border-b border-white/10">
                        <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span>Registro de Movimientos</span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                    <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-xl font-bold text-white/90 mb-2">No hay movimientos registrados</h4>
                                                    <p className="text-white/60 text-lg">¡Comienza creando tu primer movimiento financiero!</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    movimientos.map((m, index) => (
                                        <tr
                                            key={m.id_movimiento}
                                            className="group border-b border-white/5 hover:bg-white/5 transition-all duration-300"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${m.tipo_movimiento === 'INGRESO'
                                                    ? 'bg-gradient-to-r from-green-400 to-emerald-600 text-white'
                                                    : 'bg-gradient-to-r from-red-400 to-pink-600 text-white'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${m.tipo_movimiento === 'INGRESO' ? 'bg-green-200' : 'bg-red-200'
                                                        }`}></div>
                                                    {m.tipo_movimiento}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                                    <span className="text-white font-medium">{m.categoria}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <div className="text-white/90 truncate group-hover:text-white transition-colors duration-300" title={m.descripcion}>
                                                    {m.descripcion}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`text-lg font-bold ${m.tipo_movimiento === 'INGRESO' ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {m.tipo_movimiento === 'INGRESO' ? '+' : '-'}Bs. {formatMoney(m.monto)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2 text-white/70">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{m.fecha_movimiento ? m.fecha_movimiento.split("T")[0] : "-"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        className="group/btn bg-blue-500/20 hover:bg-blue-500 border border-blue-400/30 hover:border-blue-400 text-blue-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 backdrop-blur-sm"
                                                        onClick={() => {
                                                            setSelectedMovId(m.id_movimiento);
                                                            setShowModalEditarMovimiento(true);
                                                        }}
                                                    >
                                                        <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="group/btn bg-red-500/20 hover:bg-red-500 border border-red-400/30 hover:border-red-400 text-red-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 backdrop-blur-sm"
                                                        onClick={() => handleDeleteMovimiento(m.id_movimiento)}
                                                    >
                                                        <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
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

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-30px) rotate(120deg); }
                    66% { transform: translateY(-20px) rotate(240deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-20px) rotate(-120deg); }
                    66% { transform: translateY(-30px) rotate(-240deg); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-40px) rotate(180deg); }
                }
                .animate-float {
                    animation: float 20s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 25s ease-in-out infinite;
                }
                .animate-float-slow {
                    animation: float-slow 30s ease-in-out infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
}