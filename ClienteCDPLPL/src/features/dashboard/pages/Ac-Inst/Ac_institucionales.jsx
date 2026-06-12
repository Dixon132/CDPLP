// src/pages/dashboard/pages/Ac-institucionales/AcInstitucionales.jsx
import React, { useEffect, useState, useMemo } from "react";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table";
import Header from "../../components/Header";

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
    Settings,
    Plus
} from 'lucide-react';
import { Link, useNavigate } from "react-router-dom";

const AcInstitucionales = () => {
    const [actividades, setActividades] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [modalReporte, setModalReporte] = useState(false);
    const [filterType, setFilterType] = useState('all');

    // Flags para mostrar/ocultar modales
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalRegister, setShowModalRegister] = useState(false);
    const [showModalAsistencia, setShowModalAsistencia] = useState(false);

    // ID de la actividad seleccionada para Editar / Registrar / Asistencias
    const [selectedId, setSelectedId] = useState(null);

    const navigate = useNavigate();

    // Traer la lista cada vez que cambien page o search
    const fetchActividades = async () => {
        const { data, total: t, page: currentPage, totalPages } =
            await getAllActividadesInstitucionales({ page, search });
        setActividades(data || []);
        setTotal(t || 0);
        setTotalPage(totalPages || 1);
        setPage(currentPage || 1);
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

    const getEstadoBadge = (estado) => {
        const base = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border";
        switch (estado) {
            case 'ACTIVO':
                return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
            case 'INACTIVO':
                return `${base} bg-rose-50 text-rose-700 border-rose-200`;
            default:
                return `${base} bg-slate-50 text-slate-700 border-slate-200`;
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

    const filteredActividades = useMemo(() => {
        return actividades.filter(item => {
            if (filterType === 'all') return true;
            return item.estado === filterType;
        });
    }, [actividades, filterType]);

    return (
        <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
            {/* Header Reutilizable */}
            <Header
                title="Actividades Institucionales"
                icon={<Sparkles className="w-8 h-8" />}
                stats={[
                    { value: total, label: "Total Actividades", color: "purple" },
                    { value: actividades.filter(a => a.estado === 'ACTIVO').length, label: "Activas", color: "emerald" },
                ]}
                searchPlaceholder="Buscar actividades..."
                onSearch={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                buttons={[
                    {
                        label: "Generar Reporte",
                        icon: <Download />,
                        onClick: () => setModalReporte(true),
                        color: "blue",
                    },
                    {
                        label: "Crear Actividad",
                        icon: <Plus />,
                        onClick: () => setShowModalCreate(true),
                        color: "purple",
                    },
                ]}
            />

            {/* Filtros */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs w-full">
                    <Filter className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring focus:ring-indigo-200 appearance-none shadow-sm text-slate-700 font-medium"
                    >
                        <option value="all">Todas las actividades</option>
                        <option value="ACTIVO">Activas</option>
                        <option value="INACTIVO">Inactivas</option>
                    </select>
                </div>
            </div>

            {/* Tabla Reutilizable */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <Table
                    columns={[
                        {
                            label: "Actividad",
                            key: "nombre",
                            render: (a) => (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        {getActivityIcon(a.tipo)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{a.nombre}</p>
                                        <p className="text-slate-500 text-xs">ID: {a.id_actividad}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            label: "Descripción",
                            key: "descripcion",
                            render: (a) => (
                                <p className="text-slate-600 text-sm max-w-xs truncate" title={a.descripcion}>
                                    {a.descripcion}
                                </p>
                            )
                        },
                        {
                            label: "Tipo",
                            key: "tipo",
                            render: (a) => (
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
                                    {a.tipo}
                                </span>
                            )
                        },
                        {
                            label: "Fecha",
                            key: "fecha",
                            render: (a) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span>{a.fecha_programada ? a.fecha_programada.split("T")[0] : "-"}</span>
                                </div>
                            )
                        },
                        {
                            label: "Costo",
                            key: "costo",
                            render: (a) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    <span>{a.costo ? `Bs. ${a.costo}` : "Gratis"}</span>
                                </div>
                            )
                        },
                        {
                            label: "Estado",
                            key: "estado",
                            render: (a) => (
                                <span className={getEstadoBadge(a.estado)}>
                                    {getEstadoIcon(a.estado)}
                                    {a.estado}
                                </span>
                            )
                        }
                    ]}
                    data={filteredActividades}
                    pagination={{
                        total,
                        totalPage,
                        page,
                        onPageChange: setPage,
                    }}
                    emptyMessage="No se encontraron actividades institucionales"
                    actions={[
                        {
                            label: (a) => a.estado === "ACTIVO" ? "Pausar" : "Activar",
                            icon: (a) => a.estado === "ACTIVO" ? PowerOff : Power,
                            className: (a) => a.estado === "ACTIVO" ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50",
                            onClick: (a) => toggleEstado(a.id_actividad, a.estado)
                        },
                        {
                            label: "Editar",
                            icon: Edit3,
                            onClick: (a) => {
                                setSelectedId(a.id_actividad);
                                setShowModalEdit(true);
                            }
                        },
                        {
                            label: "Registrar",
                            icon: UserPlus,
                            onClick: (a) => {
                                setSelectedId(a.id_actividad);
                                setShowModalRegister(true);
                            }
                        },
                        {
                            label: "Asistencia",
                            icon: ClipboardList,
                            onClick: (a) => {
                                navigate(`/dashboard/asistencias/${a.id_actividad}`);
                            }
                        }
                    ]}
                />
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
                title="Generar Reporte de Actividades"
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