// src/pages/dashboard/pages/Ac-institucionales/AcInstitucionales.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import {
    EmptyTd,
    H1,
    Tables,
    TBody,
    Td,
    Tfooter,
    THead,
} from "../../components/Tables";

import {
    getAllActividadesInstitucionales,
    updateEstadoActividadInstitucional,
} from "../../services/ac-institucionales";

import CreateActInstitucional from "./components/CreateActInstitucional";
import EditActInstitucional from "./components/EditActInstitucional";
import RegisterColegiadoInst from "./components/RegisterColegiadoInst";
import GestionAsistenciaInst from "./components/GestionAsistenciaInst";
import GenerarReporteActividadesInst from "./components/GenerarReporteActividadesInst";

import {
    Sparkles,
    Calendar,
    Users,
    Edit3,
    UserPlus,
    ClipboardList,
    Power,
    PowerOff,
    Search,
    Download,
    TrendingUp,
    Activity,
    Star,
    Zap,
    Flame,
    ChevronRight,
    Play,
    Pause,
    DollarSign,
    Clock,
    MapPin,
    Award,
    Target,
    Rocket,
    PartyPopper,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Eye,
    BarChart3,
    Filter,
    RefreshCw,
    Settings
} from 'lucide-react';
import { Link } from "react-router-dom";

const AcInstitucionales = () => {
    const [actividades, setActividades] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [modalReporte, setModalReporte] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('fecha');

    // Flags para mostrar/ocultar modales
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalRegister, setShowModalRegister] = useState(false);
    const [showModalAsistencia, setShowModalAsistencia] = useState(false);

    // ID de la actividad seleccionada para Editar / Registrar / Asistencias
    const [selectedId, setSelectedId] = useState(null);

    // Traer la lista cada vez que cambien page o search
    const fetchActividades = async () => {
        const { data, total: t, page: currentPage, totalPages } =
            await getAllActividadesInstitucionales({ page, search });
        setActividades(data);
        setTotal(t);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchActividades();
    }, [page, search]);

    // Cambiar estado ACTIVO <-> INACTIVO
    const toggleEstado = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        await updateEstadoActividadInstitucional(id, nuevoEstado);
        fetchActividades();
    };

    const getActivityIcon = (tipo) => {
        switch (tipo?.toLowerCase()) {
            case 'conferencia': return <Award className="w-5 h-5" />;
            case 'taller': return <Settings className="w-5 h-5" />;
            case 'seminario': return <Target className="w-5 h-5" />;
            case 'curso': return <Rocket className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const getActivityGradient = (index) => {
        const gradients = [
            'from-purple-500 via-pink-500 to-red-500',
            'from-blue-500 via-cyan-500 to-teal-500',
            'from-green-500 via-emerald-500 to-cyan-500',
            'from-yellow-500 via-orange-500 to-red-500',
            'from-indigo-500 via-purple-500 to-pink-500',
            'from-rose-500 via-pink-500 to-purple-500',
        ];
        return gradients[index % gradients.length];
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'ACTIVO':
                return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30';
            case 'INACTIVO':
                return 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/30';
            default:
                return 'bg-gradient-to-r from-gray-400 to-slate-500 text-white shadow-lg shadow-gray-500/30';
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'ACTIVO':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'INACTIVO':
                return <XCircle className="w-4 h-4" />;
            default:
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    const filteredActividades = actividades.filter(item => {
        if (filterType === 'all') return true;
        return item.estado === filterType;
    });
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 overflow-hidden">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-300/20 to-teal-300/20 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
            </div>

            <div className="relative z-10 space-y-8 p-8">
                {/* Ultra Creative Header */}
                <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl border border-purple-200/50 shadow-2xl shadow-purple-500/20">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 opacity-60"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(147,51,234,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>

                    <div className="relative p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-40 animate-pulse"></div>
                                    <div className="relative p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl">
                                        <Sparkles className="w-8 h-8 text-white animate-bounce" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 mb-2">
                                        Actividades Institucionales
                                    </h1>
                                    <p className="text-gray-700 text-lg font-medium">
                                        🚀 {total} experiencias únicas • {filteredActividades.filter(a => a.estado === 'ACTIVO').length} activas
                                    </p>
                                </div>
                            </div>

                            {/* Mega Stats Dashboard */}
                            <div className="hidden lg:flex gap-6">
                                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur border border-purple-300/30 shadow-lg">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{total}</div>
                                    <div className="text-gray-600 text-sm font-semibold">Total</div>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur border border-green-300/30 shadow-lg">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                                        {filteredActividades.filter(a => a.estado === 'ACTIVO').length}
                                    </div>
                                    <div className="text-gray-600 text-sm font-semibold">Activas</div>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur border border-blue-300/30 shadow-lg">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                                        {new Date().getMonth() + 1}
                                    </div>
                                    <div className="text-gray-600 text-sm font-semibold">Este Mes</div>
                                </div>
                            </div>
                        </div>

                        {/* Ultra Creative Controls */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Search with glow effect */}
                            <div className="lg:col-span-2 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-focus-within:opacity-30 transition-all duration-300"></div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar actividades mágicas..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full pl-12 pr-6 py-4 bg-white/80 backdrop-blur-xl border border-purple-200/50 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 focus:bg-white transition-all duration-300 shadow-lg"
                                    />
                                </div>
                            </div>

                            {/* Filter dropdown */}
                            <div className="relative">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-6 py-4 bg-white/80 backdrop-blur-xl border border-purple-200/50 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none cursor-pointer shadow-lg"
                                >
                                    <option value="all">🌟 Todas</option>
                                    <option value="ACTIVO">✅ Activas</option>
                                    <option value="INACTIVO">❌ Inactivas</option>
                                </select>
                                <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Action Buttons with mega effects */}
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => setShowModalCreate(true)}
                                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl font-bold text-white shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/75 transform hover:scale-105 transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="relative flex items-center gap-3">
                                    <Rocket className="w-5 h-5 animate-bounce" />
                                    Crear Actividad
                                </div>
                            </button>

                            <button
                                onClick={() => setModalReporte(true)}
                                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl font-bold text-white shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/75 transform hover:scale-105 transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="relative flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 animate-pulse" />
                                    Reporte
                                </div>
                            </button>

                            <button
                                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                                className="group relative px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold text-white shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/75 transform hover:scale-105 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    {viewMode === 'grid' ? 'Vista Tabla' : 'Vista Grid'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {viewMode === 'grid' ? (
                    /* Ultra Creative Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {!filteredActividades.length ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-30 animate-pulse"></div>
                                    <PartyPopper className="relative w-24 h-24 text-purple-600 animate-bounce" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mt-6 mb-2">¡No hay actividades!</h3>
                                <p className="text-gray-600 text-center">Crea tu primera actividad épica y comienza la aventura</p>
                            </div>
                        ) : (
                            filteredActividades.map((item, index) => (
                                <div
                                    key={item.id_actividad}
                                    className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 hover:-rotate-1 transition-all duration-500"
                                >
                                    {/* Animated gradient background */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${getActivityGradient(index)} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>

                                    {/* Floating particles effect */}
                                    <div className="absolute inset-0 overflow-hidden">
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-ping"></div>
                                        <div className="absolute bottom-8 left-6 w-1 h-1 bg-pink-400 rounded-full opacity-75 animate-pulse animation-delay-1000"></div>
                                        <div className="absolute top-1/2 right-8 w-1.5 h-1.5 bg-indigo-400 rounded-full opacity-60 animate-pulse animation-delay-2000"></div>
                                    </div>

                                    <div className="relative p-8">
                                        {/* Header with icon and status */}
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 bg-gradient-to-br ${getActivityGradient(index)} rounded-xl shadow-lg`}>
                                                    {getActivityIcon(item.tipo)}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-purple-700 transition-colors">
                                                        {item.nombre}
                                                    </h3>
                                                    <span className="text-sm text-gray-600 font-medium">
                                                        {item.tipo}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold ${getEstadoBadge(item.estado)}`}>
                                                {getEstadoIcon(item.estado)}
                                                {item.estado}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                                            {item.descripcion}
                                        </p>

                                        {/* Info grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                                <span className="text-gray-600 text-sm">
                                                    {item.fecha_programada ? item.fecha_programada.split("T")[0] : "-"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                                <span className="text-gray-600 text-sm">
                                                    {item.costo ? `$${item.costo}` : "Gratis"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => toggleEstado(item.id_actividad, item.estado)}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${item.estado === "ACTIVO"
                                                    ? "bg-red-500/10 text-red-700 border border-red-300/50 hover:bg-red-500/20"
                                                    : "bg-green-500/10 text-green-700 border border-green-300/50 hover:bg-green-500/20"
                                                    }`}
                                            >
                                                {item.estado === "ACTIVO" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                {item.estado === "ACTIVO" ? "Pausar" : "Activar"}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSelectedId(item.id_actividad);
                                                    setShowModalEdit(true);
                                                }}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-700 border border-blue-300/50 rounded-xl font-semibold text-sm hover:bg-blue-500/20 transition-all duration-300"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                Editar
                                            </button>
                                        </div>

                                        {/* Additional actions */}
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedId(item.id_actividad);
                                                    setShowModalRegister(true);
                                                }}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/10 text-yellow-700 border border-yellow-300/50 rounded-xl font-semibold text-sm hover:bg-yellow-500/20 transition-all duration-300"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Registrar
                                            </button>

                                            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 text-purple-700 border border-purple-300/50 rounded-xl font-semibold text-sm hover:bg-purple-500/20 transition-all duration-300">
                                                <ClipboardList className="w-4 h-4" />
                                                <Link to={`/dashboard/asistencias/${item.id_actividad}`}>
                                                    Asistencia
                                                </Link>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Hover overlay effect */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/0 via-transparent to-pink-500/0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* Ultra Creative Table View */
                    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-indigo-900/50 border-b border-white/20">
                                    <tr>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Actividad</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Descripción</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Tipo</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Fecha</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Costo</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Estado</th>
                                        <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {!filteredActividades.length ? (
                                        <tr>
                                            <td colSpan="7" className="px-8 py-16 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <PartyPopper className="w-16 h-16 text-gray-400 animate-bounce" />
                                                    <p className="text-white font-bold text-xl">¡No hay actividades!</p>
                                                    <p className="text-gray-400">Crea tu primera actividad épica</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredActividades.map((item, index) => (
                                            <tr key={item.id_actividad} className="hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 transition-all duration-300">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 bg-gradient-to-br ${getActivityGradient(index)} rounded-lg shadow-lg`}>
                                                            {getActivityIcon(item.tipo)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">{item.nombre}</p>
                                                            <p className="text-gray-400 text-sm">ID: {item.id_actividad}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-gray-300 text-sm max-w-xs truncate">{item.descripcion}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 rounded-full text-sm font-semibold border border-indigo-500/30">
                                                        {item.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-300 text-sm">
                                                            {item.fecha_programada ? item.fecha_programada.split("T")[0] : "-"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="w-4 h-4 text-green-400" />
                                                        <span className="text-gray-300 text-sm">
                                                            {item.costo ? `$${item.costo}` : "Gratis"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold w-fit ${getEstadoBadge(item.estado)}`}>
                                                        {getEstadoIcon(item.estado)}
                                                        {item.estado}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => toggleEstado(item.id_actividad, item.estado)}
                                                            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${item.estado === "ACTIVO"
                                                                ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                                                                : "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
                                                                }`}
                                                        >
                                                            {item.estado === "ACTIVO" ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}

                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedId(item.id_actividad);
                                                                setShowModalEdit(true);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-all duration-300"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            Editar
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedId(item.id_actividad);
                                                                setShowModalRegister(true);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-xs font-semibold hover:bg-yellow-500/30 transition-all duration-300"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                            Registrar
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedId(item.id_actividad);
                                                                setShowModalAsistencia(true);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold hover:bg-purple-500/30 transition-all duration-300"
                                                        >
                                                            <ClipboardList className="w-3 h-3" />
                                                            Asistencia
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
                )}

                {/* Pagination */}
                {totalPage > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white rounded-xl font-semibold backdrop-blur border border-white/20 hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            Anterior
                        </button>

                        <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(5, totalPage) }, (_, i) => {
                                const pageNum = i + Math.max(1, page - 2);
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-12 h-12 rounded-xl font-bold transition-all duration-300 ${page === pageNum
                                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
                                            : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20"
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage(Math.min(totalPage, page + 1))}
                            disabled={page === totalPage}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white rounded-xl font-semibold backdrop-blur border border-white/20 hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/**— Modal: Crear Actividad Institucional —**/}
            <Modal
                isOpen={showModalCreate}
                title="Crear Actividad Institucional"
                onClose={() => setShowModalCreate(false)}
            >
                <CreateActInstitucional
                    onClose={() => {
                        setShowModalCreate(false);
                        fetchActividades();
                    }}
                    onSuccess={fetchActividades}
                />
            </Modal>

            {/**— Modal: Editar Actividad Institucional —**/}
            <Modal
                isOpen={showModalEdit}
                title="Editar Actividad Institucional"
                onClose={() => setShowModalEdit(false)}
            >
                {selectedId && (
                    <EditActInstitucional
                        id={selectedId}
                        onClose={() => {
                            setShowModalEdit(false);
                            fetchActividades();
                        }}
                        onSuccess={fetchActividades}
                    />
                )}
            </Modal>

            {/**— Modal: Registrar Colegiado / Invitado —**/}
            <Modal
                isOpen={showModalRegister}
                title="Registrar Colegiado / Invitado"
                onClose={() => setShowModalRegister(false)}
            >
                {selectedId && (
                    <RegisterColegiadoInst
                        id={selectedId}
                        onClose={() => setShowModalRegister(false)}
                        onSuccess={() => {
                            setShowModalRegister(false);
                            /* si quisieras refrescar un listado detallado de registros, lo harías aquí */
                        }}
                    />
                )}
            </Modal>

            {/**— Modal: Gestionar Asistencia (solo colegiados) —**/}
            <Modal
                isOpen={showModalAsistencia}
                title="Gestionar Asistencias Colegiados"
                onClose={() => setShowModalAsistencia(false)}
            >
                {selectedId && (
                    <GestionAsistenciaInst
                        id={selectedId}
                        onClose={() => setShowModalAsistencia(false)}
                    />
                )}
            </Modal>

            {/**— Modal: Generar Reporte —**/}
            <Modal
                isOpen={modalReporte}
                title="Generar Reporte Galáctico"
                onClose={() => setModalReporte(false)}
            >
                <GenerarReporteActividadesInst
                    onClose={() => setModalReporte(false)}
                />
            </Modal>
        </div>
    );
};

export default AcInstitucionales;