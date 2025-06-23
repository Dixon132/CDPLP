import { useEffect, useState } from "react";
import { getAllConvenios } from "../../services/convenios";
import {
    EmptyTd,
    H1,
    InputSearch,
    Tables,
    TBody,
    Td,
    Tfooter,
    THead
} from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button } from "../../components/Button";
import CreateConvenio from "./Components/CreateConvenio";
import ModificarConvenio from "./Components/ModificarConvenio";
import {
    FileText,
    Plus,
    Search,
    Calendar,
    Edit3,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Handshake
} from 'lucide-react';

const Convenios = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [convenios, setConvenios] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const fetchData = async () => {
        const { data, total, page: cur, totalPages } = await getAllConvenios({
            page,
            search,
        });
        setConvenios(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(cur);
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const getEstadoIcon = (estado) => {
        switch (estado.toUpperCase()) {
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
        switch (estado.toUpperCase()) {
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
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                            <Handshake className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <H1 className="text-2xl font-bold text-slate-800 mb-1">
                                Gestión de Convenios
                            </H1>
                            <p className="text-slate-600 text-sm">
                                {total} convenios registrados
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
                            <div className="text-2xl font-bold text-green-600">{convenios.filter(c => c.estado?.toUpperCase() === 'ACTIVO').length}</div>
                            <div className="text-xs text-slate-500">Activos</div>
                        </div>
                    </div>
                </div>

                {/* Controles mejorados */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 hover:scale-105"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Convenio
                    </button>
                </div>

                {/* Búsqueda mejorada */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Convenio</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fechas</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {!convenios.length ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-500 font-medium">No se encontraron convenios</p>
                                            <p className="text-slate-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                convenios.map((c) => (
                                    <tr key={c.id_convenio} className="hover:bg-purple-50/30 transition-colors duration-150">
                                        {/* Información del convenio */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                    {c.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{c.nombre}</p>
                                                    <p className="text-sm text-slate-500">ID: {c.id_convenio}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Descripción */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 max-w-xs truncate" title={c.descripcion}>
                                                {c.descripcion}
                                            </p>
                                        </td>

                                        {/* Fechas */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Inicio:</span>
                                                    {new Date(c.fecha_inicio).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Fin:</span>
                                                    {c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString() : "—"}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={getEstadoBadge(c.estado)}>
                                                {getEstadoIcon(c.estado)}
                                                {c.estado}
                                            </span>
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setCurrentId(c.id_convenio);
                                                    setShowEdit(true);
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors duration-150"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                                Modificar
                                            </button>
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
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            </div>

            {/* Modal Crear */}
            <Modal isOpen={showCreate} title="Crear Convenio" onClose={() => setShowCreate(false)}>
                <CreateConvenio
                    onClose={() => {
                        setShowCreate(false);
                        fetchData();
                    }}
                />
            </Modal>

            {/* Modal Editar */}
            <Modal
                title="Modificar Convenio"
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
            >
                <ModificarConvenio
                    id={currentId}
                    onClose={() => {
                        setShowEdit(false);
                        fetchData();
                    }}
                />
            </Modal>
        </div>
    );
};

export default Convenios;