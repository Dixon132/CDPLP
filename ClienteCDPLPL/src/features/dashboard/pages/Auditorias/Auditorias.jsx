import React, { useEffect, useState } from 'react';
import {
    Shield, Lock, Plus, Pencil, Trash2, FileText, CheckCircle2, XCircle, Ban,
    Users, Wallet, HeartHandshake, Building2, GraduationCap, Mail, UserPlus, Landmark, Archive, Settings, Calendar,
} from 'lucide-react';
import Header from '../../components/Header';
import ResponsiveTable from '../../components/ResponsiveTable';
import { getAuditorias } from '../../services/auditorias';
import { MODULOS, ACCIONES } from './constants';

// Los ~6 registros escritos antes de que se agregaran tildes a los enums
// (p. ej. "Modifico" en vez de "Modificó") deben verse tan bien como los
// nuevos: se compara sin tildes y en minúsculas por palabra clave, nunca por
// igualdad exacta.
const normalizar = (texto) =>
    (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const getActionStyle = (accion) => {
    const a = normalizar(accion);
    if (a.includes('inicio') || a.includes('sesion')) return { color: 'bg-blue-100 text-blue-800 border-blue-200', Icon: Lock };
    if (a.includes('cre')) return { color: 'bg-green-100 text-green-800 border-green-200', Icon: Plus };
    if (a.includes('registr')) return { color: 'bg-green-100 text-green-800 border-green-200', Icon: FileText };
    if (a.includes('desactiv')) return { color: 'bg-rose-100 text-rose-800 border-rose-200', Icon: Ban };
    if (a.includes('activ')) return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', Icon: CheckCircle2 };
    if (a.includes('modific')) return { color: 'bg-amber-100 text-amber-800 border-amber-200', Icon: Pencil };
    if (a.includes('elimin')) return { color: 'bg-red-100 text-red-800 border-red-200', Icon: Trash2 };
    if (a.includes('rechaz')) return { color: 'bg-orange-100 text-orange-800 border-orange-200', Icon: XCircle };
    return { color: 'bg-gray-100 text-gray-800 border-gray-200', Icon: FileText };
};

const getModuleIcon = (modulo) => {
    const m = normalizar(modulo);
    if (m.includes('usuario')) return Users;
    if (m.includes('financ')) return Wallet;
    if (m.includes('social')) return HeartHandshake;
    if (m.includes('institucional')) return Building2;
    if (m.includes('colegiado')) return GraduationCap;
    if (m.includes('correspondencia')) return Mail;
    if (m.includes('postulacion')) return UserPlus;
    if (m.includes('instituc')) return Landmark;
    if (m.includes('memoria')) return Archive;
    if (m.includes('configuracion')) return Settings;
    return FileText;
};

const Auditorias = () => {
    const [auditorias, setAuditorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [modulo, setModulo] = useState('');
    const [accion, setAccion] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    useEffect(() => {
        let activo = true;
        setLoading(true);
        getAuditorias({ page, search, modulo, accion, fechaDesde, fechaHasta })
            .then(({ data, total, totalPages }) => {
                if (!activo) return;
                setAuditorias(data);
                setTotal(total);
                setTotalPage(totalPages);
                setError(null);
            })
            .catch((err) => {
                if (!activo) return;
                console.error(err);
                setError('Error al cargar auditorías');
            })
            .finally(() => activo && setLoading(false));
        return () => { activo = false; };
    }, [page, search, modulo, accion, fechaDesde, fechaHasta]);

    // Cualquier cambio de filtro vuelve a la página 1 — si no, se puede quedar
    // pidiendo una página que ya no existe con el nuevo filtro.
    useEffect(() => { setPage(1); }, [search, modulo, accion, fechaDesde, fechaHasta]);

    return (
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            <Header
                title="Centro de Auditorías"
                icon={<Shield className="w-8 h-8" />}
                stats={[{ value: total, label: "Total Registros" }]}
                searchPlaceholder="Buscar por descripción o usuario..."
                onSearch={setSearch}
            />

            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={modulo}
                    onChange={(e) => setModulo(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring focus:ring-indigo-200"
                >
                    <option value="">Todos los módulos</option>
                    {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>

                <select
                    value={accion}
                    onChange={(e) => setAccion(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring focus:ring-indigo-200"
                >
                    <option value="">Todas las acciones</option>
                    {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>

                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="outline-none" />
                    <span>–</span>
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="outline-none" />
                </div>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 font-medium px-6 py-4">
                    {error}
                </div>
            )}

            <div className={`bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <ResponsiveTable
                    storageKey="auditorias"
                    pagination={{ total, totalPage, page, onPageChange: setPage }}
                    columns={[
                        {
                            label: "Usuario",
                            key: "usuario",
                            render: (a) => a.usuario ? `${a.usuario.nombre} ${a.usuario.apellido}` : 'Sistema'
                        },
                        {
                            label: "Acción",
                            key: "accion",
                            render: (a) => {
                                const { color, Icon } = getActionStyle(a.accion);
                                return (
                                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold inline-flex items-center gap-2 ${color}`}>
                                        <Icon size={13} /> {a.accion}
                                    </span>
                                );
                            }
                        },
                        {
                            label: "Módulo",
                            key: "modulo",
                            render: (a) => {
                                const Icon = getModuleIcon(a.modulo);
                                return (
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <Icon size={14} /> {a.modulo}
                                    </span>
                                );
                            }
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
                    data={auditorias}
                    emptyMessage="No se encontraron auditorías"
                />
            </div>
        </div>
    );
};

export default Auditorias;
