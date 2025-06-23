import axios from "axios";
import { useEffect, useState } from 'react';
import { H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import AsignarRol from "./Components/AsignarRol";
import { estadoRol, getAllRoles } from "../../services/roles";
import {
    Shield,
    ShieldCheck,
    ShieldX,
    Eye,
    EyeOff,
    Edit3,
    UserCheck,
    UserX,
    Search,
    Calendar,
    User,
    Crown,
    CheckCircle,
    XCircle,
    Clock,
    Settings
} from 'lucide-react';

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [currentId, setCurrentId] = useState(null)
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarInactivos, setMostrarInactivos] = useState(false)

    const fetchRoles = async () => {
        try {
            const { data, total, page: currentPage, totalPages } = await getAllRoles({ page, search, inactivos: mostrarInactivos });
            setRoles(data);
            setTotal(total);
            setTotalPage(totalPages);
            setPage(currentPage);
        } catch (error) {
            console.error('Error al obtener roles:', error);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [page, search, mostrarInactivos]);

    const handleDesactivarRol = async (idRol) => {
        try {
            await desactivarRol(idRol);
            fetchRoles(); // Recargar la lista después de desactivar
        } catch (error) {
            console.error('Error al desactivar rol:', error);
        }
    };

    const handleSuccess = () => {
        setMostrarModal(false);
        fetchRoles();
    };

    const getEstadoIcon = (activo) => {
        return activo
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <XCircle className="w-4 h-4 text-red-500" />;
    };

    const getEstadoBadge = (activo) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        return activo
            ? `${baseClasses} bg-green-100 text-green-800 border border-green-200`
            : `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
    };

    const getRolIcon = (rol) => {
        switch (rol?.toLowerCase()) {
            case 'admin':
            case 'administrador':
                return <Crown className="w-4 h-4 text-yellow-500" />;
            case 'moderador':
                return <Shield className="w-4 h-4 text-blue-500" />;
            case 'usuario':
                return <User className="w-4 h-4 text-gray-500" />;
            default:
                return <Settings className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getRolBadge = (rol) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (rol?.toLowerCase()) {
            case 'admin':
            case 'administrador':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case 'moderador':
                return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
            case 'usuario':
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
            default:
                return `${baseClasses} bg-indigo-100 text-indigo-800 border border-indigo-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-cyan-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <H1 className="text-2xl font-bold text-slate-800 mb-1">
                                Gestión de Roles
                            </H1>
                            <p className="text-slate-600 text-sm">
                                {total} roles {mostrarInactivos ? "inactivos" : "activos"} registrados
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{total}</div>
                            <div className="text-xs text-slate-500">Total</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{roles.filter(r => r.activo).length}</div>
                            <div className="text-xs text-slate-500">Activos</div>
                        </div>
                    </div>
                </div>

                {/* Controles mejorados */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={() => setMostrarInactivos(!mostrarInactivos)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${mostrarInactivos
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25"
                                : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25"
                            }`}
                    >
                        {mostrarInactivos ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {mostrarInactivos ? "Ver Activos" : "Ver Inactivos"}
                    </button>
                </div>

                {/* Búsqueda mejorada */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, rol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Tabla mejorada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Periodo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {!roles?.length ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Shield className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-500 font-medium">No se encontraron roles</p>
                                            <p className="text-slate-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                roles.map((rol) => (
                                    <tr key={rol.id_rol} className="hover:bg-indigo-50/30 transition-colors duration-150">
                                        {/* Usuario */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                    {rol.usuarios?.nombre?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {`${rol.usuarios?.nombre || 'N/A'} ${rol.usuarios?.apellido || ''}`}
                                                    </p>
                                                    <p className="text-sm text-slate-500">ID: {rol.id_rol}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Rol */}
                                        <td className="px-6 py-4">
                                            <span className={getRolBadge(rol.rol)}>
                                                {getRolIcon(rol.rol)}
                                                {rol.rol}
                                            </span>
                                        </td>

                                        {/* Periodo */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Inicio:</span>
                                                    {new Date(rol.fecha_inicio).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Fin:</span>
                                                    {rol.fecha_fin ? new Date(rol.fecha_fin).toLocaleDateString() : 'No definida'}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={getEstadoBadge(rol.activo)}>
                                                {getEstadoIcon(rol.activo)}
                                                {rol.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* Botón modificar */}
                                                <button
                                                    onClick={() => {
                                                        setCurrentId(rol.id_rol)
                                                        setMostrarModal(true)
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors duration-150"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    Editar
                                                </button>

                                                {/* Botón estado */}
                                                <button
                                                    onClick={() => {
                                                        if (mostrarInactivos) {
                                                            estadoRol(rol.id_rol, "ACTIVO")
                                                        } else {
                                                            estadoRol(rol.id_rol, "INACTIVO")
                                                        }
                                                        fetchRoles()
                                                    }}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${mostrarInactivos
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                        }`}
                                                >
                                                    {mostrarInactivos ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                                                    {mostrarInactivos ? "Activar" : "Desactivar"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                    />
                </div>
            </div>

            {/* Modal existente */}
            <Modal
                isOpen={mostrarModal}
                title="Modificar Rol"
                onClose={() => setMostrarModal(false)}
            >
                <AsignarRol id={currentId} onClose={() => setMostrarModal(false)} />
            </Modal>
        </div>
    );
};

export default Roles;