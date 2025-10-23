import { useEffect, useState } from 'react';
import { gelAllActividadesSociales } from "../../services/ac-sociales";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import VerDetallesColegiado from "./components/VerDetallesColegiado";
import ModificarColegiado from "./components/ModificarColegiado";
import CreateActSocial from "./components/CreateActSocial";
import GenerarReporteActividadesSociales from "./components/GenerarReporteActividadesSociales";

// Iconos lucide-react
import {
    Calendar,
    MapPin,
    Users,
    PartyPopper,
    Search,
    Plus,
    Eye,
    Edit3,
    Trash2,
    Filter,
    BarChart3,
    Sparkles,
    Globe,
    Target,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Heart,
    Star,
    Zap,
    Activity,
    TrendingUp,
    Award,
    Gift,
    Music,
    Camera,
    Coffee,
    Sunset,
    Flame,
    Rocket
} from 'lucide-react';

const Ac_sociales = () => {
    // Estados existentes
    const [actSociales, setActSociales] = useState([]);
    const [mostrarModal, SetMostrarModal] = useState(false);
    const [search, setSearch] = useState('');
    const [currentId, setCurrentId] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [modalReporte, setModalReporte] = useState(false);
    const [modalVerDetalles, setModalVerDetalles] = useState(false);
    const [modalModificar, setModalModificar] = useState(false);

    // Nuevos estados para funcionalidad épica
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [vistaActual, setVistaActual] = useState('tabla'); // 'tabla' o 'cards'

    // Función para obtener información de estado con estilo
    const getEstadoInfo = (estado) => {
        switch (estado?.toUpperCase()) {
            case "ACTIVO":
            case "PLANIFICADO":
                return {
                    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    icon: <CheckCircle className="w-3 h-3" />,
                    bgGradient: "from-emerald-50 to-green-50"
                };
            case "EN PROGRESO":
            case "EJECUTANDO":
                return {
                    color: "bg-blue-100 text-blue-800 border-blue-200",
                    icon: <Activity className="w-3 h-3" />,
                    bgGradient: "from-blue-50 to-indigo-50"
                };
            case "FINALIZADO":
            case "COMPLETADO":
                return {
                    color: "bg-purple-100 text-purple-800 border-purple-200",
                    icon: <Award className="w-3 h-3" />,
                    bgGradient: "from-purple-50 to-pink-50"
                };
            case "CANCELADO":
                return {
                    color: "bg-red-100 text-red-800 border-red-200",
                    icon: <AlertCircle className="w-3 h-3" />,
                    bgGradient: "from-red-50 to-orange-50"
                };
            case "PENDIENTE":
                return {
                    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    icon: <Clock className="w-3 h-3" />,
                    bgGradient: "from-yellow-50 to-orange-50"
                };
            default:
                return {
                    color: "bg-gray-100 text-gray-800 border-gray-200",
                    icon: <AlertCircle className="w-3 h-3" />,
                    bgGradient: "from-gray-50 to-slate-50"
                };
        }
    };

    // Función para obtener icono por tipo de actividad
    const getTipoIcon = (tipo) => {
        switch (tipo?.toLowerCase()) {
            case "cultural":
                return <Music className="w-4 h-4" />;
            case "deportiva":
                return <Activity className="w-4 h-4" />;
            case "social":
                return <Users className="w-4 h-4" />;
            case "recreativa":
                return <PartyPopper className="w-4 h-4" />;
            case "educativa":
                return <FileText className="w-4 h-4" />;
            case "benefica":
                return <Heart className="w-4 h-4" />;
            case "celebracion":
                return <Gift className="w-4 h-4" />;
            default:
                return <Star className="w-4 h-4" />;
        }
    };

    // Estados disponibles
    const estadosDisponibles = ["TODOS", "ACTIVO", "EN PROGRESO", "FINALIZADO", "CANCELADO", "PENDIENTE"];
    const tiposDisponibles = ["TODOS", "CULTURAL", "DEPORTIVA", "SOCIAL", "RECREATIVA", "EDUCATIVA", "BENEFICA"];

    // Función fetch mejorada
    async function fetchSociales() {
        const { data, total, page: currentPage, totalPages } = await gelAllActividadesSociales({ page, search });
        setActSociales(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    }

    useEffect(() => {
        fetchSociales();
    }, [page, search]);

    // Filtrado de actividades
    const actividadesFiltradas = actSociales.filter(item => {
        const coincideEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado;
        const coincideTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
        return coincideEstado && coincideTipo;
    });

    // Función para obtener estadísticas
    const getEstadisticas = () => {
        const stats = {
            total: actSociales.length,
            activo: actSociales.filter(a => a.estado === 'ACTIVO').length,
            progreso: actSociales.filter(a => a.estado === 'EN PROGRESO').length,
            finalizado: actSociales.filter(a => a.estado === 'FINALIZADO').length,
            pendiente: actSociales.filter(a => a.estado === 'PENDIENTE').length,
        };
        return stats;
    };

    const stats = getEstadisticas();
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50/40 to-indigo-50/30">
            {/* Header Épico */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 via-purple-600/10 to-indigo-600/10"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-2xl">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur-lg opacity-70"></div>
                                    <div className="relative p-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl shadow-xl">
                                        <PartyPopper className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                        Centro de
                                    </h1>

                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setVistaActual(vistaActual === 'tabla' ? 'cards' : 'tabla')}
                                    className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl text-slate-600 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    {vistaActual === 'tabla' ? <Target className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setModalReporte(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Reportes
                                </button>
                                <button
                                    onClick={() => SetMostrarModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Actividad
                                </button>
                            </div>
                        </div>

                        {/* Estadísticas Dinámicas */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-2xl border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                                        <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total</p>
                                        <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-4 rounded-2xl border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-xl shadow-lg">
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Activas</p>
                                        <p className="text-2xl font-bold text-emerald-700">{stats.activo}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-4 rounded-2xl border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                                        <Activity className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">En Progreso</p>
                                        <p className="text-2xl font-bold text-blue-700">{stats.progreso}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-2xl border border-purple-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500 rounded-xl shadow-lg">
                                        <Award className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Finalizadas</p>
                                        <p className="text-2xl font-bold text-purple-700">{stats.finalizado}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-4 rounded-2xl border border-yellow-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-500 rounded-xl shadow-lg">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-yellow-600 font-medium uppercase tracking-wide">Pendientes</p>
                                        <p className="text-2xl font-bold text-yellow-700">{stats.pendiente}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controles Avanzados */}
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar actividades..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 shadow-lg"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-500" />
                                    <select
                                        value={filtroEstado}
                                        onChange={(e) => setFiltroEstado(e.target.value)}
                                        className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 shadow-lg"
                                    >
                                        {estadosDisponibles.map(estado => (
                                            <option key={estado} value={estado}>{estado}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-slate-500" />
                                    <select
                                        value={filtroTipo}
                                        onChange={(e) => setFiltroTipo(e.target.value)}
                                        className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 shadow-lg"
                                    >
                                        {tiposDisponibles.map(tipo => (
                                            <option key={tipo} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Contenido Principal */}
            <div className="p-8">
                {vistaActual === 'tabla' ? (
                    /* Vista Tabla Épica */
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-200/60">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Nombre
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4" />
                                                Ubicación
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">Motivo</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">Convenio</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Inicio
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Fin
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4" />
                                                Tipo
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-pink-200/30">
                                    {!actividadesFiltradas.length ? (
                                        <tr>
                                            <td colSpan="10" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="p-4 bg-pink-100 rounded-full">
                                                        <PartyPopper className="w-8 h-8 text-pink-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium">No hay actividades sociales</p>
                                                        <p className="text-slate-400 text-sm">Crea la primera actividad para comenzar a conectar</p>
                                                    </div>
                                                    <button
                                                        onClick={() => SetMostrarModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                                                    >
                                                        Crear Actividad
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        actividadesFiltradas.map((item) => {
                                            const estadoInfo = getEstadoInfo(item.estado);
                                            const tipoIcon = getTipoIcon(item.tipo);
                                            return (
                                                <tr key={item.id_actividad_social} className="hover:bg-pink-50/50 transition-all duration-200">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-lg">
                                                                {tipoIcon}
                                                                <span className="text-white text-xs">
                                                                    {tipoIcon}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">{item.nombre}</div>
                                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                                    {tipoIcon}
                                                                    {item.tipo}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-600 max-w-xs truncate text-sm">
                                                            {item.descripcion}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <MapPin className="w-4 h-4 text-pink-500" />
                                                            <span className="text-sm">{item.ubicacion}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-600 text-sm">
                                                            {item.motivo}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-700 font-medium">
                                                            {item.convenio?.nombre || 'Sin convenio'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <Calendar className="w-4 h-4 text-green-500" />
                                                            <span className="text-sm">{parseDate(item.fecha_inicio)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <Calendar className="w-4 h-4 text-red-500" />
                                                            <span className="text-sm">{parseDate(item.fecha_fin)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${estadoInfo.color}`}>
                                                            {estadoInfo.icon}
                                                            {item.estado}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1">
                                                            {tipoIcon}
                                                            <span className="text-sm font-medium text-slate-700">{item.tipo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setCurrentId(item.id_actividad_social);
                                                                    setModalVerDetalles(true);
                                                                }}
                                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-150 hover:scale-105"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setCurrentId(item.id_actividad_social);
                                                                    setModalModificar(true);
                                                                }}
                                                                className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors duration-150 hover:scale-105"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
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

                        {/* Paginación épica */}
                        {totalPage > 1 && (
                            <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-4 border-t border-pink-200/60">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Mostrando <span className="font-medium">{actividadesFiltradas.length}</span> de <span className="font-medium">{total}</span> actividades
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1 bg-white border border-pink-300 rounded-lg text-sm disabled:opacity-50 hover:bg-pink-50 transition-colors"
                                        >
                                            Anterior
                                        </button>
                                        <span className="px-3 py-1 bg-pink-600 text-white rounded-lg text-sm font-medium">
                                            {page} de {totalPage}
                                        </span>
                                        <button
                                            onClick={() => setPage(Math.min(totalPage, page + 1))}
                                            disabled={page === totalPage}
                                            className="px-3 py-1 bg-white border border-pink-300 rounded-lgtext-sm disabled:opacity-50 hover:bg-pink-50 transition-colors"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Vista Cards Épica */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {!actividadesFiltradas.length ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20">
                                <div className="p-6 bg-pink-100 rounded-full mb-6">
                                    <PartyPopper className="w-12 h-12 text-pink-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No hay actividades sociales</h3>
                                <p className="text-slate-500 mb-6 text-center max-w-md">
                                    Crea la primera actividad para comenzar a conectar con tu comunidad
                                </p>
                                <button
                                    onClick={() => SetMostrarModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
                                >
                                    <Plus className="w-4 h-4 inline mr-2" />
                                    Crear Primera Actividad
                                </button>
                            </div>
                        ) : (
                            actividadesFiltradas.map((item) => {
                                const estadoInfo = getEstadoInfo(item.estado);
                                const tipoIcon = getTipoIcon(item.tipo);
                                return (
                                    <div
                                        key={item.id_actividad_social}
                                        className={`bg-gradient-to-br ${estadoInfo.bgGradient} backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden`}
                                    >
                                        {/* Header de la card */}
                                        <div className="relative p-6 pb-4">
                                            <div className="absolute top-4 right-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${estadoInfo.color}`}>
                                                    {estadoInfo.icon}
                                                    {item.estado}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg">
                                                    {tipoIcon}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 mb-1">{item.nombre}</h3>
                                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                                        {tipoIcon}
                                                        <span>{item.tipo}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{item.descripcion}</p>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <MapPin className="w-4 h-4 text-pink-500" />
                                                    <span>{item.ubicacion}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    <span>{item.motivo}</span>
                                                </div>

                                                {item.convenio && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Globe className="w-4 h-4 text-green-500" />
                                                        <span>{item.convenio.nombre}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Fechas */}
                                        <div className="px-6 py-3 bg-white/50 backdrop-blur-sm border-t border-white/60">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="font-medium">Inicio:</span>
                                                    <span>{parseDate(item.fecha_inicio)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-600">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="font-medium">Fin:</span>
                                                    <span>{parseDate(item.fecha_fin)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="p-4 bg-white/70 backdrop-blur-sm">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setCurrentId(item.id_actividad_social);
                                                        setModalVerDetalles(true);
                                                    }}
                                                    className="flex-1 p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all duration-150 hover:scale-105 flex items-center justify-center gap-2 text-sm font-medium"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCurrentId(item.id_actividad_social);
                                                        setModalModificar(true);
                                                    }}
                                                    className="flex-1 p-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-all duration-150 hover:scale-105 flex items-center justify-center gap-2 text-sm font-medium"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                    Editar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>



            <Modal isOpen={mostrarModal} onClose={() => SetMostrarModal(false)} title="Crear actividad social">
                <CreateActSocial />
            </Modal>
            <Modal isOpen={modalVerDetalles} onClose={() => setModalVerDetalles(false)}>
                <VerDetallesColegiado id={currentId} />
            </Modal>

            <Modal isOpen={modalModificar} onClose={() => {
                setModalModificar(false)
                fetchSociales()
            }}>
                <ModificarColegiado id={currentId} />
            </Modal>
            <Modal isOpen={modalReporte} onClose={() => setModalReporte(false)}>
                <GenerarReporteActividadesSociales />
            </Modal>
        </div>
    );
};

export default Ac_sociales;