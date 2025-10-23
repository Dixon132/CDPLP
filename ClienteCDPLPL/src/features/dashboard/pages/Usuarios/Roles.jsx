import { useEffect, useState } from 'react';
import { getAllRoles, estadoRol } from "../../services/roles";
import Modal from "../../../../components/Modal";
import AsignarRol from "./Components/AsignarRol";
import Table from "../../components/Table";

import {
    Shield,
    Eye,
    EyeOff,
    Edit3,
    ShieldCheck,
    ShieldX,
    Search,
    Calendar,
    User,
    Crown,
    CheckCircle,
    XCircle,
    Settings,
} from 'lucide-react';

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const fetchRoles = async () => {
        const { data, total, totalPages, page: currentPage } = await getAllRoles({
            page,
            search,
            inactivos: mostrarInactivos,
        });
        setRoles(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchRoles();
    }, [page, search, mostrarInactivos]);

    const getEstadoBadge = (activo) =>
        activo
            ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
            : "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200";

    const getEstadoIcon = (activo) =>
        activo ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;

    const getRolIcon = (rol) => {
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return <Crown className="w-4 h-4 text-yellow-500" />;
            case "moderador":
                return <Shield className="w-4 h-4 text-blue-500" />;
            case "usuario":
                return <User className="w-4 h-4 text-gray-500" />;
            default:
                return <Settings className="w-4 h-4 text-indigo-500" />;
        }
    };

    const getRolBadge = (rol) => {
        const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (rol?.toLowerCase()) {
            case "admin":
            case "administrador":
                return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            case "moderador":
                return `${base} bg-blue-100 text-blue-800 border border-blue-200`;
            default:
                return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-cyan-50/20 min-h-screen">
            {/* HEADER */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Gestión de Roles</h1>
                            <p className="text-slate-600 text-sm">
                                {total} roles {mostrarInactivos ? "inactivos" : "activos"} registrados
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setMostrarInactivos(!mostrarInactivos)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${mostrarInactivos
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                            : "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                            }`}
                    >
                        {mostrarInactivos ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {mostrarInactivos ? "Ver Activos" : "Ver Inactivos"}
                    </button>
                </div>

                {/* BUSCADOR */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar roles o usuarios..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {/* ✅ TABLA REUTILIZANDO <Table /> */}
            <Table
                columns={[
                    {
                        label: "Usuario",
                        key: "usuario",
                        render: (r) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {r.usuarios?.nombre?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <p className="font-semibold">{r.usuarios?.nombre} {r.usuarios?.apellido}</p>
                                    <p className="text-xs text-slate-500">ID: {r.id_rol}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Rol",
                        key: "rol",
                        render: (r) => (
                            <span className={getRolBadge(r.rol)}>
                                {getRolIcon(r.rol)} {r.rol}
                            </span>
                        ),
                    },
                    {
                        label: "Período",
                        key: "fecha",
                        render: (r) => (
                            <div className="text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> {new Date(r.fecha_inicio).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> {r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString() : "—"}
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (r) => (
                            <span className={getEstadoBadge(r.activo)}>
                                {getEstadoIcon(r.activo)} {r.activo ? "Activo" : "Inactivo"}
                            </span>
                        ),
                    },
                ]}
                data={roles}
                actions={[
                    {
                        label: "Editar",
                        icon: Edit3,
                        className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200",
                        onClick: (r) => {
                            setCurrentId(r.id_rol);
                            setMostrarModal(true);
                        },
                    },
                    {
                        label: mostrarInactivos ? "Activar" : "Desactivar",
                        icon: mostrarInactivos ? ShieldCheck : ShieldX,
                        className: mostrarInactivos
                            ? "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            : "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200",
                        onClick: async (r) => {
                            await estadoRol(r.id_rol, mostrarInactivos ? "ACTIVO" : "INACTIVO");
                            fetchRoles();
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

            {/* MODAL Editar */}
            <Modal
                isOpen={mostrarModal}
                title="Asignar / Modificar Rol"
                onClose={() => setMostrarModal(false)}
            >
                <AsignarRol id={currentId} onClose={() => setMostrarModal(false)} />
            </Modal>
        </div>
    );
};

export default Roles;
