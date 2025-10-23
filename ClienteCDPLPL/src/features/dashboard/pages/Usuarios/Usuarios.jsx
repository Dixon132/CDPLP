import { useEffect, useState } from 'react';
import { ActivarUsuarios, desactivarUsuarios, getAllActiveUsuarios } from "../../services/usuarios";
import Modal from "../../../../components/Modal";
import CreateUser from "./Components/CreateUser";
import ModificarUser from "./Components/ModificarUser";
import Table from "../../components/Table";
import { Users, UserPlus, Edit3, UserCheck, UserX, Mail, Phone, MapPin, Search } from 'lucide-react';
import { getEstadoBadge, getEstadoIcon } from '../../hooks/estados';

const Usuarios = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalModificar, setMostrarModalModificar] = useState(false);
    const [usuarioModificando, setUsuarioModificando] = useState(null);

    const fetchUsuarios = async () => {
        const { data, total, page: currentPage, totalPages } = await getAllActiveUsuarios({
            page,
            search,
            inactivos: mostrarInactivos,
        });
        setUsers(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchUsuarios();
    }, [page, search, mostrarInactivos]);

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 min-h-screen">
            {/* HEADER */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
                            <p className="text-slate-600 text-sm">
                                {total} usuarios {mostrarInactivos ? "inactivos" : "activos"} registrados
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setMostrarModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium shadow-lg"
                    >
                        <UserPlus className="w-4 h-4" /> Crear Usuario
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido, correo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/70 border rounded-xl focus:outline-none focus:ring-2"
                    />
                </div>
            </div>

            {/* ✅ TABLE USANDO COMPONENTE REUTILIZABLE */}
            <Table
                columns={[
                    {
                        label: "Usuario",
                        key: "nombre",
                        render: (item) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {item.nombre[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {item.nombre} {item.apellido}
                                    </p>
                                    <p className="text-xs text-slate-500">ID: {item.id_usuario}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        label: "Contacto",
                        key: "correo",
                        render: (item) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{item.correo}</div>
                                <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{item.telefono}</div>
                            </div>
                        ),
                    },
                    {
                        label: "Dirección",
                        key: "direccion",
                        render: (item) => (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-purple-500" /> {item.direccion}
                            </div>
                        ),
                    },
                    {
                        label: "Estado",
                        key: "estado",
                        render: (item) => (
                            <span className={getEstadoBadge(item.estado)}>
                                {getEstadoIcon(item.estado)} {item.estado}
                            </span>
                        ),
                    },
                ]}
                data={users}
                actions={[
                    {
                        label: "Editar",
                        icon: Edit3,
                        className: "px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200",
                        onClick: (item) => {
                            setMostrarModalModificar(true);
                            setUsuarioModificando(item.id_usuario);
                        },
                    },
                    {
                        label: mostrarInactivos ? "Activar" : "Desactivar",
                        icon: mostrarInactivos ? UserCheck : UserX,
                        className: mostrarInactivos
                            ? "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            : "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200",
                        onClick: async (item) => {
                            if (mostrarInactivos) await ActivarUsuarios(item.id_usuario);
                            else await desactivarUsuarios(item.id_usuario);
                            fetchUsuarios();
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
            <Modal isOpen={mostrarModal} title="Crear Usuario" onClose={() => setMostrarModal(false)}>
                <CreateUser />
            </Modal>

            <Modal isOpen={mostrarModalModificar} title="Modificar Usuario" onClose={() => setMostrarModalModificar(false)}>
                <ModificarUser id={usuarioModificando} onClose={() => setMostrarModalModificar(false)} />
            </Modal>
        </div>
    );
};

export default Usuarios;
