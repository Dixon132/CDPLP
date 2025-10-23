import { useEffect, useState } from "react";
import { getAllConvenios } from "../../services/convenios";
import Modal from "../../../../components/Modal";
import CreateConvenio from "./Components/CreateConvenio";
import ModificarConvenio from "./Components/ModificarConvenio";
import Table from "../../components/Table";

import {
    Handshake,
    Plus,
    Search,
    Calendar,
    Edit3,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";

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
        const { data, total, totalPages, page: currentPage } = await getAllConvenios({
            page,
            search,
        });
        setConvenios(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const getEstadoIcon = (estado) => {
        switch (estado?.toUpperCase()) {
            case "ACTIVO":
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "INACTIVO":
                return <XCircle className="w-4 h-4 text-red-500" />;
            case "PENDIENTE":
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEstadoBadge = (estado) => {
        const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado?.toUpperCase()) {
            case "ACTIVO":
                return `${base} bg-green-100 text-green-800 border border-green-200`;
            case "INACTIVO":
                return `${base} bg-red-100 text-red-800 border border-red-200`;
            case "PENDIENTE":
                return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default:
                return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* ✅ HEADER */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                            <Handshake className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">Gestión de Convenios</h1>
                            <p className="text-slate-600 text-sm">{total} convenios registrados</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:scale-105 transition"
                    >
                        <Plus className="w-4 h-4" /> Crear Convenio
                    </button>
                </div>

                {/* ✅ BÚSQUEDA */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                </div>
            </div>

            {/* ✅ TABLA REUTILIZABLE */}
            <Table
                columns={[
                    {
                        label: "Convenio",
                        key: "nombre",
                        render: (c) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {c.nombre.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{c.nombre}</p>
                                    <p className="text-xs text-slate-500">ID: {c.id_convenio}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Descripción",
                        key: "descripcion",
                        render: (c) => (
                            <p className="text-sm text-slate-700 max-w-xs truncate" title={c.descripcion}>
                                {c.descripcion}
                            </p>
                        ),
                    },
                    {
                        label: "Fechas",
                        key: "fecha_inicio",
                        render: (c) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-slate-500">Inicio:</span>
                                    {new Date(c.fecha_inicio).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-slate-500">Fin:</span>
                                    {c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString() : "—"}
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (c) => (
                            <span className={getEstadoBadge(c.estado)}>
                                {getEstadoIcon(c.estado)} {c.estado}
                            </span>
                        ),
                    },
                ]}
                data={convenios}
                actions={[
                    {
                        label: "Modificar",
                        icon: Edit3,
                        className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                        onClick: (c) => {
                            setCurrentId(c.id_convenio);
                            setShowEdit(true);
                        },
                    },
                ]}
                pagination={{
                    total,
                    totalPage,
                    page,
                    onPageChange: setPage,
                }}
            />

            {/* ✅ MODALES */}
            <Modal isOpen={showCreate} title="Crear Convenio" onClose={() => setShowCreate(false)}>
                <CreateConvenio
                    onClose={() => {
                        setShowCreate(false);
                        fetchData();
                    }}
                />
            </Modal>

            <Modal isOpen={showEdit} title="Modificar Convenio" onClose={() => setShowEdit(false)}>
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
