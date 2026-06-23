import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Shield, Filter, RefreshCw, Lock, Plus, Pencil, Trash2, Eye, FileText, Key, Users, Package, Settings, BarChart3, File } from 'lucide-react';
import Header from '../../components/Header';
import Table from '../../components/Table';

const Auditorias = () => {
    const [auditorias, setAuditorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState('');

    useEffect(() => {
        const fetchAuditorias = async () => {
            try {
                const res = await axios.get('/api/auditorias');
                setAuditorias(res.data);
            } catch (err) {
                setError('Error al cargar auditorías');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAuditorias();
    }, []);

    const getActionIcon = (accion) => {
        switch (accion) {
            case 'LOGIN':    return <Lock size={13} />;
            case 'CREATE':   return <Plus size={13} />;
            case 'UPDATE':   return <Pencil size={13} />;
            case 'DELETE':   return <Trash2 size={13} />;
            case 'VIEW':     return <Eye size={13} />;
            default:         return <FileText size={13} />;
        }
    };

    const getActionColor = (accion) => {
        switch (accion) {
            case 'LOGIN':    return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Creó':     return 'bg-green-100 text-green-800 border-green-200';
            case 'Registro': return 'bg-green-100 text-green-800 border-green-200';
            case 'UPDATE':   return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'DELETE':   return 'bg-red-100 text-red-800 border-red-200';
            case 'VIEW':     return 'bg-purple-100 text-purple-800 border-purple-200';
            default:         return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getModuleIcon = (modulo) => {
        switch (modulo) {
            case 'Autenticación': return <Key size={14} />;
            case 'Usuarios':      return <Users size={14} />;
            case 'Productos':     return <Package size={14} />;
            case 'Sistema':       return <Settings size={14} />;
            case 'Reportes':      return <BarChart3 size={14} />;
            default:              return <File size={14} />;
        }
    };

    const filteredAuditorias = useMemo(() => {
        return auditorias
            .filter(a =>
                (searchTerm === '' ||
                    a.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (a.usuario && `${a.usuario.nombre} ${a.usuario.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()))) &&
                (filterModule === '' || a.modulo === filterModule)
            )
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar descendente por fecha
    }, [auditorias, searchTerm, filterModule]);

    const modules = [...new Set(auditorias.map(a => a.modulo))];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <RefreshCw className="animate-spin text-indigo-600 w-12 h-12" />
                <p className="ml-4 text-lg text-indigo-600 font-medium">Cargando auditorías...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-700 font-semibold text-xl">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
            <Header
                title="Centro de Auditorías"
                icon={<Shield className="w-8 h-8" />}
                stats={[
                    { value: auditorias.length, label: "Total Registros" }
                ]}
                searchPlaceholder="Buscar por descripción o usuario..."
                onSearch={setSearchTerm}
            />

            <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-sm w-full">
                    <Filter className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <select
                        value={filterModule}
                        onChange={(e) => setFilterModule(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring focus:ring-indigo-200"
                    >
                        <option value="">Todos los módulos</option>
                        {modules.map((mod) => (
                            <option key={mod} value={mod}>{mod}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <Table
                    columns={[
                        {
                            label: "#",
                            key: "id_auditoria",
                            render: (a, index) => <span className="font-medium text-slate-400 text-xs">{index + 1}</span>
                        },
                        {
                            label: "Usuario",
                            key: "usuario",
                            render: (a) => a.usuario ? `${a.usuario.nombre} ${a.usuario.apellido}` : 'Sistema'
                        },
                        {
                            label: "Acción",
                            key: "accion",
                            render: (a) => (
                                <span className={`px-3 py-1 rounded-full border text-xs font-semibold inline-flex items-center gap-2 ${getActionColor(a.accion)}`}>
                                    {getActionIcon(a.accion)} {a.accion}
                                </span>
                            )
                        },
                        {
                            label: "Módulo",
                            key: "modulo",
                            render: (a) => (
                                <span className="flex items-center gap-2 text-slate-600">
                                    {getModuleIcon(a.modulo)} {a.modulo}
                                </span>
                            )
                        },
                        {
                            label: "Descripción",
                            key: "descripcion",
                            render: (a) => <span className="text-slate-600">{a.descripcion}</span>
                        },
                        {
                            label: "Fecha",
                            key: "fecha",
                            render: (a) => (
                                <span className="text-sm text-slate-500">
                                    {new Date(a.fecha).toLocaleString('es-ES', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            )
                        }
                    ]}
                    data={filteredAuditorias}
                    emptyMessage="No se encontraron auditorías"
                />
            </div>
        </div>
    );
};

export default Auditorias;
