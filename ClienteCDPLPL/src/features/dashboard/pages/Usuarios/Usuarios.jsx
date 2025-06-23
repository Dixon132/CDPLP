import axios from "axios";
import { useEffect, useState } from 'react';

import { ActivarUsuarios, desactivarUsuarios, getAllActiveUsuarios } from "../../services/usuarios";

import { EmptyTd, H1, InputSearch, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import CreateUser from "./Components/CreateUser";
import ModificarUser from "./Components/ModificarUser";
import {
    Users,
    UserPlus,
    Eye,
    EyeOff,
    Edit3,
    UserCheck,
    UserX,
    Search,
    Mail,
    Phone,
    MapPin,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

const Usuarios = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [users, setUsers] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [mostrarModalModificar, SetMostrarModalModificar] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
    const [UsuarioModificando, setUsuarioModificando] = useState(null)

    console.log('renderizando componente usuarios')

    async function fetchUsuarios() {
        const { data, total, page: currentPage, totalPages } = await getAllActiveUsuarios({ page, search, inactivos: mostrarInactivos });
        setUsers(data)
        setTotal(total)
        setTotalPage(totalPages)
        setPage(currentPage)
        console.log('se hizo peticion de usuarios')
    }

    useEffect(() => {
        fetchUsuarios()
    }, [page, search, mostrarInactivos]);

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'ACTIVO':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'INACTIVO':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'PENDIENTE':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEstadoBadge = (estado) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado) {
            case 'ACTIVO':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'INACTIVO':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            case 'PENDIENTE':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <H1 className="text-2xl font-bold text-slate-800 mb-1">
                                Gestión de Usuarios
                            </H1>
                            <p className="text-slate-600 text-sm">
                                {total} usuarios {mostrarInactivos ? "inactivos" : "activos"} registrados
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{total}</div>
                            <div className="text-xs text-slate-500">Total</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{users.filter(u => u.estado === 'ACTIVO').length}</div>
                            <div className="text-xs text-slate-500">Activos</div>
                        </div>
                    </div>
                </div>

                {/* Controles mejorados */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={() => SetMostrarModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 hover:scale-105"
                    >
                        <UserPlus className="w-4 h-4" />
                        Crear Usuario
                    </button>

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
                        placeholder="Buscar por nombre, apellido, correo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Tabla mejorada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-purple-50 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Dirección</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {!users.length ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-500 font-medium">No se encontraron usuarios</p>
                                            <p className="text-slate-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((item, index) => (
                                    <tr key={item.id_usuario} className="hover:bg-purple-50/30 transition-colors duration-150">
                                        {/* Información del usuario */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                    {item.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{item.nombre} {item.apellido}</p>
                                                    <p className="text-sm text-slate-500">ID: {item.id_usuario}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contacto */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Mail className="w-3 h-3" />
                                                    {item.correo}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone className="w-3 h-3" />
                                                    {item.telefono}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Dirección */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm text-slate-700">{item.direccion}</span>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={getEstadoBadge(item.estado)}>
                                                {getEstadoIcon(item.estado)}
                                                {item.estado}
                                            </span>
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* Botón modificar */}
                                                <button
                                                    onClick={() => {
                                                        SetMostrarModalModificar(true)
                                                        setUsuarioModificando(item.id_usuario)
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
                                                            ActivarUsuarios(item.id_usuario)
                                                        } else {
                                                            desactivarUsuarios(item.id_usuario)
                                                        }
                                                        fetchUsuarios()
                                                    }}
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${mostrarInactivos
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                        }`}
                                                >
                                                    {mostrarInactivos ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
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
                    <Tfooter total={total} totalPage={totalPage} Page={page} />
                </div>
            </div>

            {/* Modales existentes */}
            <Modal isOpen={mostrarModal} title='Crear Usuario' onClose={() => SetMostrarModal(false)}>
                <CreateUser />
            </Modal>

            <Modal title={'Modificar Usuario'} isOpen={mostrarModalModificar} onClose={() => SetMostrarModalModificar(false)}>
                <ModificarUser id={UsuarioModificando} onClose={() => SetMostrarModalModificar(false)} />
            </Modal>
        </div>
    );
};

export default Usuarios;