import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Shield, User, Calendar, FileText, Activity, Filter, Download, RefreshCw } from 'lucide-react';

const Auditorias = () => {
    const [auditorias, setAuditorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [sortBy, setSortBy] = useState('fecha');
    const [sortOrder, setSortOrder] = useState('desc');

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
            case 'LOGIN': return '🔐';
            case 'CREATE': return '➕';
            case 'UPDATE': return '✏️';
            case 'DELETE': return '🗑️';
            case 'VIEW': return '👁️';
            default: return '📝';
        }
    };

    const getActionColor = (accion) => {
        switch (accion) {
            case 'LOGIN': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
            case 'UPDATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
            case 'VIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getModuleIcon = (modulo) => {
        switch (modulo) {
            case 'Autenticación': return '🔑';
            case 'Usuarios': return '👥';
            case 'Productos': return '📦';
            case 'Sistema': return '⚙️';
            case 'Reportes': return '📊';
            default: return '📄';
        }
    };

    const filteredAuditorias = auditorias
        .filter(a =>
            (searchTerm === '' ||
                a.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.usuario && `${a.usuario.nombre} ${a.usuario.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()))) &&
            (filterModule === '' || a.modulo === filterModule)
        )
        .sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'fecha') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Encabezado */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-full mb-6 shadow-lg">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                        Centro de Auditorías
                    </h1>
                    <p className="text-lg text-gray-600">Monitoreo completo de todas las actividades del sistema</p>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring focus:ring-indigo-200"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring focus:ring-indigo-200"
                        >
                            <option value="">Todos los módulos</option>
                            {modules.map((mod) => (
                                <option key={mod} value={mod}>{mod}</option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* Tabla */}
                <div className="overflow-x-auto bg-white shadow-xl rounded-2xl">
                    <table className="w-full table-auto">
                        <thead className="bg-indigo-600 text-white text-left text-sm">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Acción</th>
                                <th className="px-6 py-3">Módulo</th>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAuditorias.length > 0 ? (
                                filteredAuditorias.map((a) => (
                                    <tr key={a.id_auditoria} className="border-b hover:bg-indigo-50 transition">
                                        <td className="px-6 py-4 font-medium">{a.id_auditoria}</td>
                                        <td className="px-6 py-4">
                                            {a.usuario
                                                ? `${a.usuario.nombre} ${a.usuario.apellido}`
                                                : 'Sistema'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full border text-sm font-semibold inline-flex items-center gap-2 ${getActionColor(a.accion)}`}>
                                                {getActionIcon(a.accion)} {a.accion}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2">
                                                {getModuleIcon(a.modulo)} {a.modulo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{a.descripcion}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(a.fecha).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    Última actualización: {new Date().toLocaleString('es-ES')}
                </div>
            </div>
        </div>
    );
};

export default Auditorias;
