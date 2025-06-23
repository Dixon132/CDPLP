// src/pages/dashboard/pages/Ac-institucionales/GestionAsistenciaInst.jsx
import React, { useEffect, useState } from "react";
import {
    getRegistrosPorActividadInstitucional,
    getAsistenciasPorActividad,
    createAsistenciaActividad,
    deleteAsistenciaActividad,
} from "../../../services/ac-institucionales";
import {
    Users,
    UserCheck,
    UserX,
    CheckCircle,
    XCircle,
    Clock,
    UserPlus,
    Eye,
    Mail,
    Phone,
    Calendar,
    GraduationCap,
    Search,
    Filter,
    Download,
    FileText
} from 'lucide-react';
import { Link, useParams } from "react-router-dom";

export default function GestionAsistenciaInst() {
    const [registros, setRegistros] = useState([]);     // Inscritos (colegiados + invitados)
    const [asistencias, setAsistencias] = useState([]); // Colegiados que asistieron
    const [loading, setLoading] = useState(true);
    const { id } = useParams()
    // 1) Traer inscritos y asistencias; en caso de venir envuelto en { data: [...] }, extraemos el array
    const fetchData = async () => {
        setLoading(true);

        const rawRegs = await getRegistrosPorActividadInstitucional(id);
        console.log("rawRegs:", rawRegs);
        // Si rawRegs no es un array (p.ej. { data: [...] }), tomamos rawRegs.data
        const regs = Array.isArray(rawRegs) ? rawRegs : rawRegs.data;
        console.log("regs (extraído):", regs);

        const rawAsis = await getAsistenciasPorActividad(id);
        console.log("rawAsis:", rawAsis);
        const asis = Array.isArray(rawAsis) ? rawAsis : rawAsis.data;
        console.log("asis (extraído):", asis);

        setRegistros(regs);
        setAsistencias(asis);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    console.log("Estado final de registros:", registros);
    console.log("Estado final de asistencias:", asistencias);

    // 2) Saber si un colegiado ya asistió
    const hasAssisted = (id_colegiado) => {
        return asistencias.some((a) => a.id_colegiado === id_colegiado);
    };

    // 3) Encontrar id_asistencia para desmarcar
    const findAsistenciaId = (id_colegiado) => {
        const found = asistencias.find((a) => a.id_colegiado === id_colegiado);
        return found ? found.id_asistencia : null;
    };

    // 4) Toggle: si existe, DELETE; si no existe, POST
    const toggleAsistencia = async (id_colegiado) => {
        const existingId = findAsistenciaId(id_colegiado);
        if (existingId) {
            await deleteAsistenciaActividad(existingId);
        } else {
            await createAsistenciaActividad({
                id_actividad: id,
                id_colegiado: id_colegiado,
            });
        }
        await fetchData();
    };

    const getEstadoBadge = (estado) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado?.toUpperCase()) {
            case 'CONFIRMADO':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'PENDIENTE':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case 'CANCELADO':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado?.toUpperCase()) {
            case 'CONFIRMADO':
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'CANCELADO':
                return <XCircle className="w-3 h-3 text-red-500" />;
            case 'PENDIENTE':
                return <Clock className="w-3 h-3 text-yellow-500" />;
            default:
                return <Clock className="w-3 h-3 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-medium">Cargando datos de asistencia...</p>
                </div>
            </div>
        );
    }

    // 5) Filtramos sólo aquellos registros que tengan id_colegiado ≠ null
    const registrosColegiados = registros.filter((r) => r.id_colegiado !== null);
    console.log("registrosColegiados tras filtrar:", registrosColegiados);

    return (
        <div className="space-y-8 p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen max-w-none w-full">
            {/* Header Principal */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">
                                Gestión de Asistencia
                            </h1>
                            <p className="text-slate-600 text-sm">
                                Control de asistencia para la actividad institucional
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="hidden md:flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{registrosColegiados.length}</div>
                            <div className="text-xs text-slate-500">Inscritos</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{asistencias.length}</div>
                            <div className="text-xs text-slate-500">Asistieron</div>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-600">{registrosColegiados.length - asistencias.length}</div>
                            <div className="text-xs text-slate-500">Pendientes</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Colegiados Inscritos */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Colegiados Inscritos</h2>
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {registrosColegiados.length} Total
                        </span>
                    </div>
                </div>

                {registrosColegiados.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-slate-600 font-medium text-lg">No hay colegiados inscritos</p>
                                <p className="text-slate-400 text-sm mt-1">Los colegiados inscritos aparecerán aquí</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-auto max-h-[70vh]">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Colegiado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado Registro</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Asistencia</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60">
                                {registrosColegiados.map((reg) => {
                                    console.log("Registro completo (dentro de map):", reg);
                                    const persona = reg.colegiados;
                                    const asistio = hasAssisted(reg.id_colegiado);

                                    return (
                                        <tr key={reg.id_registro} className="hover:bg-blue-50/30 transition-colors duration-150">
                                            {/* Información del colegiado */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                        {persona?.nombre?.charAt(0)?.toUpperCase() || 'N'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">
                                                            {persona?.nombre} {persona?.apellido}
                                                        </p>
                                                        <p className="text-sm text-slate-500">
                                                            ID Colegiado: {reg.id_colegiado}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Estado del registro */}
                                            <td className="px-6 py-4">
                                                <span className={getEstadoBadge(reg.estado_registro)}>
                                                    {getEstadoIcon(reg.estado_registro)}
                                                    {reg.estado_registro}
                                                </span>
                                            </td>

                                            {/* Estado de asistencia */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {asistio ? (
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CheckCircle className="w-5 h-5" />
                                                            <span className="font-medium text-sm">Asistió</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-red-500">
                                                            <XCircle className="w-5 h-5" />
                                                            <span className="font-medium text-sm">No asistió</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleAsistencia(reg.id_colegiado)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg ${asistio
                                                        ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30"
                                                        : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30"
                                                        }`}
                                                >
                                                    {asistio ? (
                                                        <>
                                                            <UserX className="w-4 h-4" />
                                                            Desmarcar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck className="w-4 h-4" />
                                                            Marcar
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sección de Asistencias Confirmadas */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200/60">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Colegiados que Asistieron</h2>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {asistencias.length} Confirmados
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    {asistencias.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <UserCheck className="w-8 h-8 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-slate-600 font-medium text-lg">Nadie ha asistido aún</p>
                                    <p className="text-slate-400 text-sm mt-1">Las asistencias confirmadas aparecerán aquí</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {asistencias.map((a) => {
                                const persona = a.colegiados;
                                return (
                                    <div key={a.id_asistencia} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60 rounded-xl p-4 hover:shadow-lg transition-all duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                {persona?.nombre?.charAt(0)?.toUpperCase() || 'N'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">
                                                    {persona?.nombre} {persona?.apellido}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    <span className="text-xs text-green-600 font-medium">Asistencia confirmada</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer con botón de cerrar */}
            <div className="flex justify-end pt-4">
                <button

                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl font-medium shadow-lg shadow-slate-500/25 hover:shadow-xl hover:shadow-slate-500/30 transition-all duration-200 hover:scale-105"
                >
                    <XCircle className="w-4 h-4" />
                    <Link to={`/dashboard/actividades_institucionales`}>

                        Cerrar Gestión
                    </Link>
                </button>
            </div>
        </div>
    );
}