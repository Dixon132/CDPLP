import { useEffect, useState } from 'react';
import { eliminarCorrespondencia, getAllCorrespondencia, verCorrespondencia } from "../../services/correspondencia";
import Modal from "../../../../components/Modal";
import CrearCorrespondencia from './components/CrearCorrespondencia';
import EditarCorrespondencia from './components/EditarCorrespondencia';
import GenerarReporteCorrespondencia from './components/GenerarReporteCorrespondencia';
import {
    Mail,
    Search,
    Plus,
    Eye,
    Edit3,
    Trash2,
    Send,
    User,
    Calendar,
    FileText,
    Filter,
    BarChart3,
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    MessageCircle,
    Zap,
    Users,
    Archive,
    TrendingUp,
    Download,
    Sparkles,
    Globe,
    Target
} from 'lucide-react';

const Correspondencia = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [correspondencia, setCorrespondencia] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalModificar, setMostrarModalModificar] = useState(false);
    const [actualId, setActualId] = useState(null);
    const [modalReporte, setModalReporte] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [vistaActual, setVistaActual] = useState('tabla'); // 'tabla' o 'cards'

    const getEstadoInfo = (estado) => {
        switch (estado) {
            case "RECIBIDO":
                return {
                    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    icon: <CheckCircle className="w-3 h-3" />,
                    bgGradient: "from-emerald-50 to-green-50"
                };
            case "VISTO":
                return {
                    color: "bg-blue-100 text-blue-800 border-blue-200",
                    icon: <Eye className="w-3 h-3" />,
                    bgGradient: "from-blue-50 to-indigo-50"
                };
            case "A DISCUCION":
                return {
                    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    icon: <MessageCircle className="w-3 h-3" />,
                    bgGradient: "from-yellow-50 to-orange-50"
                };
            case "PENDIENTE":
                return {
                    color: "bg-orange-100 text-orange-800 border-orange-200",
                    icon: <Clock className="w-3 h-3" />,
                    bgGradient: "from-orange-50 to-red-50"
                };
            case "ARREGLADO":
                return {
                    color: "bg-purple-100 text-purple-800 border-purple-200",
                    icon: <Zap className="w-3 h-3" />,
                    bgGradient: "from-purple-50 to-pink-50"
                };
            default:
                return {
                    color: "bg-gray-100 text-gray-800 border-gray-200",
                    icon: <AlertCircle className="w-3 h-3" />,
                    bgGradient: "from-gray-50 to-slate-50"
                };
        }
    };

    const estadosDisponibles = ["TODOS", "RECIBIDO", "VISTO", "A DISCUCION", "PENDIENTE", "ARREGLADO"];

    const fetchData = async () => {
        const { data, total, page: currentPage, totalPages } = await getAllCorrespondencia({ page, search });
        setCorrespondencia(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const correspondenciaFiltrada = filtroEstado === 'TODOS'
        ? correspondencia
        : correspondencia.filter(item => item.estado === filtroEstado);

    const getEstadisticas = () => {
        const stats = {
            total: correspondencia.length,
            recibido: correspondencia.filter(c => c.estado === 'RECIBIDO').length,
            visto: correspondencia.filter(c => c.estado === 'VISTO').length,
            pendiente: correspondencia.filter(c => c.estado === 'PENDIENTE').length,
            arreglado: correspondencia.filter(c => c.estado === 'ARREGLADO').length,
        };
        return stats;
    };

    const stats = getEstadisticas();

    const handleEliminar = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta correspondencia?')) {
            await eliminarCorrespondencia(id);
            alert("Correspondencia eliminada correctamente");
            setTimeout(() => fetchData(), 500);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/40 to-indigo-50/30">
            {/* Header Épico */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-indigo-600/10"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-2xl">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl blur-lg opacity-70"></div>
                                    <div className="relative p-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-xl">
                                        <Mail className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                        Centro de Correspondencia
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
                                    onClick={() => setMostrarModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Correspondencia
                                </button>
                            </div>
                        </div>

                        {/* Estadísticas Dinámicas */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-2xl border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                                        <Archive className="w-5 h-5 text-white" />
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
                                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Recibidos</p>
                                        <p className="text-2xl font-bold text-emerald-700">{stats.recibido}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-4 rounded-2xl border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                                        <Eye className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Vistos</p>
                                        <p className="text-2xl font-bold text-blue-700">{stats.visto}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-red-100 p-4 rounded-2xl border border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500 rounded-xl shadow-lg">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Pendientes</p>
                                        <p className="text-2xl font-bold text-orange-700">{stats.pendiente}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-2xl border border-purple-200/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500 rounded-xl shadow-lg">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Resueltos</p>
                                        <p className="text-2xl font-bold text-purple-700">{stats.arreglado}</p>
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
                                    placeholder="Buscar correspondencia..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 shadow-lg"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <select
                                    value={filtroEstado}
                                    onChange={(e) => setFiltroEstado(e.target.value)}
                                    className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-lg"
                                >
                                    {estadosDisponibles.map(estado => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="p-8">
                {vistaActual === 'tabla' ? (
                    /* Vista Tabla Mejorada */
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200/60">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Asunto
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">Resumen</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">Contenido</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Remitente
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">Destinatario</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Fecha
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-violet-700 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-violet-200/30">
                                    {!correspondenciaFiltrada.length ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="p-4 bg-violet-100 rounded-full">
                                                        <Mail className="w-8 h-8 text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 font-medium">No hay correspondencia</p>
                                                        <p className="text-slate-400 text-sm">Crea la primera correspondencia para comenzar</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setMostrarModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                                                    >
                                                        Crear Correspondencia
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        correspondenciaFiltrada.map((item) => {
                                            const estadoInfo = getEstadoInfo(item.estado);
                                            return (
                                                <tr key={item.id_correspondencia} className="hover:bg-violet-50/50 transition-all duration-200">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-800 max-w-xs truncate">
                                                            {item.asunto}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-600 max-w-sm truncate text-sm">
                                                            {item.resumen}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${estadoInfo.color}`}>
                                                            {estadoInfo.icon}
                                                            {item.estado}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => verCorrespondencia(item.id_correspondencia)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors duration-150"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            Ver
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                                                                <User className="w-4 h-4 text-white" />
                                                            </div>
                                                            <span className="text-slate-700 font-medium">{item.remitente}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-700">
                                                            {item.destinatario?.nombre} {item.destinatario?.apellido}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(item.fecha_envio).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setMostrarModalModificar(true);
                                                                    setActualId(item.id_correspondencia);
                                                                }}
                                                                className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors duration-150"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEliminar(item.id_correspondencia)}
                                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-150"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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
                    </div>
                ) : (
                    /* Vista Cards Creativa */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {correspondenciaFiltrada.map((item) => {
                            const estadoInfo = getEstadoInfo(item.estado);
                            return (
                                <div key={item.id_correspondencia} className={`bg-gradient-to-br ${estadoInfo.bgGradient} p-6 rounded-2xl border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/80 rounded-xl shadow-lg">
                                                <Mail className="w-5 h-5 text-violet-600" />
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${estadoInfo.color}`}>
                                                {estadoInfo.icon}
                                                {item.estado}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">{item.asunto}</h3>
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{item.resumen}</p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <User className="w-4 h-4" />
                                            <span>De: {item.remitente}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Users className="w-4 h-4" />
                                            <span>Para: {item.destinatario?.nombre} {item.destinatario?.apellido}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(item.fecha_envio).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => verCorrespondencia(item.id_correspondencia)}
                                            className="flex-1 px-3 py-2 bg-white/80 text-violet-700 rounded-lg text-sm font-medium hover:bg-white transition-colors duration-150 flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => {
                                                setMostrarModalModificar(true);
                                                setActualId(item.id_correspondencia);
                                            }}
                                            className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors duration-150"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEliminar(item.id_correspondencia)}
                                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-150"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {!correspondenciaFiltrada.length && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16">
                                <div className="p-6 bg-violet-100 rounded-full mb-4">
                                    <Sparkles className="w-12 h-12 text-violet-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">¡Espacio para brillar!</h3>
                                <p className="text-slate-500 mb-6 text-center">No hay correspondencia que coincida con tu búsqueda.</p>
                                <button
                                    onClick={() => setMostrarModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear Nueva
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modales */}
            <Modal isOpen={mostrarModal} onClose={() => setMostrarModal(false)}>
                <CrearCorrespondencia onClose={() => { setMostrarModal(false); fetchData(); }} />
            </Modal>

            <Modal title="Modificar correspondencia" isOpen={mostrarModalModificar} onClose={() => setMostrarModalModificar(false)}>
                <EditarCorrespondencia id={actualId} onClose={() => { setMostrarModalModificar(false); fetchData(); }} />
            </Modal>

            <Modal isOpen={modalReporte} onClose={() => setModalReporte(false)}>
                <GenerarReporteCorrespondencia />
            </Modal>
        </div>
    );
};

export default Correspondencia;