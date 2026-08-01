import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Plus, Calendar, Clock, Activity, Filter, Search, BarChart3, PieChart, LineChart as LineChartIcon, ExternalLink, Eye } from "lucide-react";

import {
    getPresupuestoById,
    getMovimientosFiltrados,
    getPresupuestoAnalytics,
    getCategoriasByPresupuesto,
    deleteMovimientoFinanciero
} from "../../services/tesoreria";

import { Button } from "../../components/Button";
import Modal from "../../../../components/Modal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Alerts from "../../components/Alerts";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import MovimientoForm from "./components/MovimientoForm";
import ModalDetallesMovimiento from "./components/ModalDetallesMovimiento";

/**
 * Fecha + hora en un único formato para toda la tabla.
 * Antes se mezclaban `toLocaleString` (con hora) y `toLocaleDateString` (sin
 * hora) según si la fila tenía `updatedAt`, y por eso unas mostraban la hora y
 * otras no.
 */
const formatFechaHora = (valor) => {
    if (!valor) return "—";
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

// Gráficos
import LineChart from "./components/charts/LineChart";
import BarChart from "./components/charts/BarChart";
import DonutChart from "./components/charts/DonutChart";
import GroupedBarChart from "./components/charts/GroupedBarChart";



export default function MovimientosPorPresupuesto() {
    const { id } = useParams();
    const presupuestoId = Number(id);

    // Estado principal
    const [presupuesto, setPresupuesto] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [categoriasList, setCategoriasList] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);

    // Estado de la tabla y filtros
    const [movimientos, setMovimientos] = useState([]);
    const [loadingTable, setLoadingTable] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    // Filtros
    const [search, setSearch] = useState("");
    const [searchTemp, setSearchTemp] = useState(""); // Para el input antes de presionar buscar
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [filtroMetodo, setFiltroMetodo] = useState("");
    const [filtroOrigen, setFiltroOrigen] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [sortOrder, setSortOrder] = useState("desc");
    // "actividad" = última vez que se tocó (alta/edición/anulación) | "fecha" = fecha contable
    const [sortBy, setSortBy] = useState("actividad");

    // Modales
    const [showModalCrearMovimiento, setShowModalCrearMovimiento] = useState(false);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [selectedMovimiento, setSelectedMovimiento] = useState(null);

    // Doble confirmación para anular un movimiento
    const [anularTarget, setAnularTarget] = useState(null);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");

    const showAlertFn = (type, msg) => {
        setAlertType(type); setAlertMsg(msg); setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    // 1. Cargar datos estáticos (Presupuesto, Analytics, Categorías)
    const fetchInitialData = async () => {
        try {
            const [dataPres, dataAnalytics, dataCat] = await Promise.all([
                getPresupuestoById(presupuestoId),
                getPresupuestoAnalytics(presupuestoId), // Sin los filtros globales de la tabla
                getCategoriasByPresupuesto(presupuestoId)
            ]);
            setPresupuesto(dataPres);
            setAnalytics(dataAnalytics);
            setCategoriasList(dataCat.categorias || []);
        } catch (error) {
            console.error("Error fetching initial data", error);
        } finally {
            setLoadingInitial(false);
        }
    };

    // 2. Cargar datos de la tabla (Paginación + Filtros)
    const fetchTableData = async () => {
        setLoadingTable(true);
        try {
            const res = await getMovimientosFiltrados(presupuestoId, {
                page,
                limit: 10,
                tipo: filtroTipo,
                categoria: filtroCategoria,
                metodo: filtroMetodo,
                origen: filtroOrigen,
                estado: filtroEstado,
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta,
                search: search,
                sortOrder: sortOrder,
                sortBy: sortBy
            });
            setMovimientos(res.data);
            setTotal(res.total);
            setTotalPage(res.totalPages);
        } catch (error) {
            console.error("Error fetching table data", error);
        } finally {
            setLoadingTable(false);
        }
    };

    // Efectos
    useEffect(() => {
        fetchInitialData();
    }, [presupuestoId]);

    useEffect(() => {
        fetchTableData();
    }, [page, filtroTipo, filtroCategoria, filtroMetodo, filtroOrigen, filtroEstado, fechaDesde, fechaHasta, search, sortOrder, sortBy, presupuestoId]);

    // Handlers
    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchTemp);
    };

    const handleLimpiarFiltros = () => {
        setFiltroTipo("");
        setFiltroCategoria("");
        setFiltroMetodo("");
        setFiltroOrigen("");
        setFiltroEstado("");
        setFechaDesde("");
        setFechaHasta("");
        setSearch("");
        setSearchTemp("");
        setPage(1);
    };

    const handleVerDetalles = (movimiento) => {
        setSelectedMovimiento(movimiento);
        setShowDetallesModal(true);
    };

    const handleSuccessForm = () => {
        setShowModalCrearMovimiento(false);
        fetchInitialData(); // Refrescar gráficos y KPIs
        fetchTableData();   // Refrescar tabla
    };

    const handleAnularMovimiento = async () => {
        if (!anularTarget) return;
        try {
            await deleteMovimientoFinanciero(anularTarget);
            setShowDetallesModal(false);
            setSelectedMovimiento(null);
            showAlertFn("success", "Movimiento anulado correctamente.");
            fetchInitialData();
            fetchTableData();
        } catch (error) {
            console.error("Error al anular el movimiento", error);
            showAlertFn("error", "Ocurrió un error al intentar anular el movimiento.");
        } finally {
            setAnularTarget(null);
        }
    };

    if (loadingInitial || !presupuesto || !analytics) {
        return (
            <div className="min-h-full bg-slate-50/50 flex items-center justify-center relative overflow-hidden">
                <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-slate-200 p-12 rounded-3xl shadow-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-emerald-500 rounded-full animate-spin"></div>
                        <div className="mt-6 text-center">
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Cargando datos financieros</h3>
                            <p className="text-slate-500">Preparando tu dashboard...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formatMoney = (amount) => new Intl.NumberFormat('es-BO').format(amount || 0);

    const calcProgreso = () => {
        if (!presupuesto.monto_total) return 0;
        const usado = parseFloat(presupuesto.monto_total) - parseFloat(presupuesto.saldo_restante || 0);
        return Math.min((usado / parseFloat(presupuesto.monto_total)) * 100, 100);
    };

    return (
        <div className="min-h-full bg-slate-50/50 p-6 space-y-6">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div>
                    <Link to="/dashboard/tesoreria" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-3">
                        <ArrowLeft size={16} /> Volver a Tesorería
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl shadow-md">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{presupuesto.nombre_presupuesto}</h1>
                            <p className="text-sm text-slate-500">{presupuesto.descripcion}</p>
                        </div>
                    </div>
                </div>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
                    onClick={() => setShowModalCrearMovimiento(true)}
                >
                    <Plus size={18} />
                    Nuevo Movimiento
                </Button>
            </div>

            {/* --- KPIs --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Presupuesto Total */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full transition-transform group-hover:scale-150 duration-500 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                <Wallet size={18} />
                            </div>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Presupuesto</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">Bs. {formatMoney(presupuesto.monto_total)}</p>
                    </div>
                </div>

                {/* Saldo Disponible */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full transition-transform group-hover:scale-150 duration-500 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Activity size={18} />
                                </div>
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Disponible</span>
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {(100 - calcProgreso()).toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">Bs. {formatMoney(presupuesto.saldo_restante)}</p>

                        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${calcProgreso()}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Ingresos Totales */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full transition-transform group-hover:scale-150 duration-500 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <TrendingUp size={18} />
                            </div>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Ingresos</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">Bs. {formatMoney(analytics.resumen.total_ingresos)}</p>
                    </div>
                </div>

                {/* Egresos Totales */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full transition-transform group-hover:scale-150 duration-500 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                <TrendingDown size={18} />
                            </div>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Egresos</span>
                        </div>
                        <p className="text-2xl font-black text-rose-600">Bs. {formatMoney(analytics.resumen.total_egresos)}</p>
                    </div>
                </div>
            </div>

            {/* --- GRÁFICOS (ANALYTICS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico de Evolución Acumulada */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <LineChartIcon className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-700">Evolución Financiera</h2>
                    </div>
                    <LineChart data={analytics.evolucion_mensual} />
                </div>

                {/* Donut Balance */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-700">Proporción</h2>
                    </div>
                    <div className="flex justify-center items-center h-[240px]">
                        <DonutChart
                            ingresos={analytics.resumen.total_ingresos}
                            egresos={analytics.resumen.total_egresos}
                        />
                    </div>
                </div>

                {/* Gastos por Categoría */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-700">Movimientos por Categoría (Top 8)</h2>
                    </div>
                    <BarChart data={analytics.por_categoria} />
                </div>

                {/* Comparativo Últimos 6 meses */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-700">Últimos 6 Meses</h2>
                    </div>
                    <div className="flex justify-center items-center h-[200px]">
                        <GroupedBarChart data={analytics.ultimos6_meses} />
                    </div>
                </div>

            </div>

            {/* --- SECCIÓN TABLA Y FILTROS --- */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-800">Historial de Movimientos</h2>
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                {total}
                            </span>
                        </div>

                        {/* Filtros */}
                        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <div className="relative">
                                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <select
                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    value={filtroTipo}
                                    onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="INGRESO">Ingresos</option>
                                    <option value="EGRESO">Egresos</option>
                                </select>
                            </div>

                            <select
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                value={filtroCategoria}
                                onChange={e => { setFiltroCategoria(e.target.value); setPage(1); }}
                            >
                                <option value="">Todas las categorías</option>
                                {categoriasList.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <select
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                value={filtroMetodo}
                                onChange={e => { setFiltroMetodo(e.target.value); setPage(1); }}
                            >
                                <option value="">Cualquier método</option>
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="QR">QR</option>
                                <option value="TRANSFERENCIA">Transferencia</option>
                            </select>

                            <select
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                value={filtroOrigen}
                                onChange={e => { setFiltroOrigen(e.target.value); setPage(1); }}
                            >
                                <option value="">Todos los orígenes</option>
                                <option value="MANUAL">Manual</option>
                                <option value="COLEGIATURA">Colegiatura</option>
                                <option value="ACTIVIDAD_INSTITUCIONAL">Cursos</option>
                                <option value="POSTULACION">Postulación</option>
                            </select>

                            <select
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                value={filtroEstado}
                                onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
                            >
                                <option value="">Todos los estados</option>
                                <option value="COMPLETADO">Completado</option>
                                <option value="ANULADO">Anulado</option>
                            </select>

                            <select
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                value={`${sortBy}:${sortOrder}`}
                                onChange={e => {
                                    const [by, order] = e.target.value.split(":");
                                    setSortBy(by); setSortOrder(order); setPage(1);
                                }}
                            >
                                <option value="actividad:desc">Última actividad (más reciente)</option>
                                <option value="actividad:asc">Última actividad (más antigua)</option>
                                <option value="fecha:desc">Fecha del movimiento (más reciente)</option>
                                <option value="fecha:asc">Fecha del movimiento (más antigua)</option>
                            </select>

                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    className="text-sm outline-none bg-transparent"
                                    value={fechaDesde}
                                    onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
                                    title="Fecha Desde"
                                />
                                <span className="text-slate-300">-</span>
                                <input
                                    type="date"
                                    className="text-sm outline-none bg-transparent"
                                    value={fechaHasta}
                                    onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
                                    title="Fecha Hasta"
                                />
                            </div>

                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar descripción..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    value={searchTemp}
                                    onChange={e => setSearchTemp(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm text-sm py-2">
                                Buscar
                            </Button>

                            {(filtroTipo || filtroCategoria || filtroMetodo || filtroOrigen || filtroEstado || fechaDesde || fechaHasta || search) && (
                                <button type="button" onClick={handleLimpiarFiltros} className="text-sm text-rose-600 font-medium hover:underline px-2">
                                    Limpiar
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Tabla Paginada */}
                <div className="relative p-2 sm:p-4">
                    {loadingTable && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <ResponsiveTable
                        storageKey="movimientos-presupuesto"
                        columns={[
                            {
                                label: "Tipo",
                                key: "tipo_movimiento",
                                render: (m) => (
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${m.tipo_movimiento === 'INGRESO'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${m.tipo_movimiento === 'INGRESO' ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}></div>
                                        {m.tipo_movimiento}
                                    </div>
                                )
                            },
                            {
                                label: "Categoría",
                                key: "categoria",
                                render: (m) => (
                                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                                        {m.categoria || "Sin categoría"}
                                    </span>
                                )
                            },
                            {
                                label: "Descripción",
                                key: "descripcion",
                                render: (m) => (
                                    <div className="text-slate-600 text-sm max-w-sm truncate" title={m.descripcion}>
                                        {m.descripcion}
                                    </div>
                                )
                            },
                            {
                                label: "Monto",
                                key: "monto",
                                render: (m) => (
                                    <div className={`text-sm font-black ${m.tipo_movimiento === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'} ${m.estado === 'ANULADO' ? 'line-through text-slate-400' : ''}`}>
                                        {m.tipo_movimiento === 'INGRESO' ? '+' : '-'}Bs. {formatMoney(m.monto)}
                                    </div>
                                )
                            },
                            {
                                label: "Método",
                                key: "metodo_pago",
                                render: (m) => (
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                        {m.metodo_pago || "EFECTIVO"}
                                    </span>
                                )
                            },
                            {
                                label: "Origen",
                                key: "origen",
                                render: (m) => (
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-600 uppercase">
                                            {m.tipo_origen_label || "MANUAL"}
                                        </span>
                                        {m.origen_info?.persona && (
                                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={m.origen_info.persona}>
                                                {m.origen_info.persona}
                                            </span>
                                        )}
                                    </div>
                                )
                            },
                            {
                                label: "Estado",
                                key: "estado",
                                render: (m) => (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.estado === 'ANULADO' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {m.estado || "COMPLETADO"}
                                    </span>
                                )
                            },
                            {
                                label: "Fecha del movimiento",
                                key: "fecha_movimiento",
                                render: (m) => (
                                    <div className="flex items-center space-x-2 text-slate-600 text-xs font-medium">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span>{formatFechaHora(m.fecha_movimiento)}</span>
                                    </div>
                                )
                            },
                            {
                                label: "Última actividad",
                                key: "updatedAt",
                                render: (m) => {
                                    const ultima = m.updatedAt ?? m.createdAt ?? m.fecha_movimiento;
                                    const editado = m.updatedAt && m.createdAt
                                        && new Date(m.updatedAt).getTime() - new Date(m.createdAt).getTime() > 1000;
                                    return (
                                        <div className="flex flex-col gap-0.5 text-xs font-medium">
                                            <div className="flex items-center space-x-2 text-slate-600">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>{formatFechaHora(ultima)}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                {m.estado === 'ANULADO' ? 'Anulado' : editado ? 'Modificado' : 'Creado'}
                                            </span>
                                        </div>
                                    );
                                }
                            },
                            {
                                label: "Autor",
                                key: "autor",
                                render: (m) => (
                                    <div className="text-slate-600 text-xs font-medium">
                                        <span className="font-semibold text-slate-800">{m.usuario?.nombre_completo || "Sistema"}</span>
                                        {m.usuario?.rol && <span className="block text-[10px] text-indigo-600 font-bold">{m.usuario.rol}</span>}
                                    </div>
                                )
                            },
                            {
                                label: "Comprobante",
                                key: "comprobante",
                                render: (m) => m.comprobante ? (
                                    <button
                                        onClick={() => window.open(m.comprobante, '_blank')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Ver comprobante
                                    </button>
                                ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                )
                            }
                        ]}
                        data={movimientos}
                        pagination={{
                            total,
                            totalPage,
                            page,
                            onPageChange: setPage,
                        }}
                        actions={[
                            {
                                label: "Ver detalles",
                                icon: Eye,
                                className: "px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors shadow-sm",
                                onClick: (m) => handleVerDetalles(m)
                            }
                        ]}
                        emptyMessage={loadingTable ? "Buscando movimientos..." : "No se encontraron movimientos con los filtros actuales."}
                    />
                </div>
            </div>

            {/* --- MODALES --- */}
            <Modal
                isOpen={showModalCrearMovimiento}
                title="Nuevo Movimiento Financiero"
                onClose={() => setShowModalCrearMovimiento(false)}
            >
                <MovimientoForm
                    presupuestoId={presupuestoId}
                    onClose={() => setShowModalCrearMovimiento(false)}
                    onSuccess={handleSuccessForm}
                />
            </Modal>

            <ModalDetallesMovimiento
                isOpen={showDetallesModal}
                onClose={() => { setShowDetallesModal(false); setSelectedMovimiento(null); }}
                movimiento={selectedMovimiento}
                onAnular={(idMovimiento) => setAnularTarget(idMovimiento)}
            />

            {/* ✅ Doble confirmación para anular el movimiento (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!anularTarget}
                onClose={() => setAnularTarget(null)}
                onConfirm={handleAnularMovimiento}
                title="Anular Movimiento"
                message="¿Confirmas que deseas anular este movimiento? Su estado pasará a ANULADO y se ajustará el presupuesto."
                waitSeconds={4}
                confirmLabel="Anular"
                confirmColor="red"
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
}