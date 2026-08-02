import { useState } from "react";
import { UserCheck, UserX, Search } from "lucide-react";

const claveDe = (r) => (r.id_colegiado ? `c-${r.id_colegiado}` : `i-${r.id_invitado}`);

/**
 * Checklist rápido de asistencia: marcar varias personas a la vez y
 * confirmar de una sola vez con "Listo", en vez de un diálogo de
 * confirmación por cada persona.
 */
const MarcarAsistenciaInst = ({ registros, asistencias, onClose, onGuardar }) => {
    const [seleccionados, setSeleccionados] = useState(() => {
        const set = new Set();
        registros.forEach((r) => {
            const asistio = r.id_colegiado
                ? asistencias.some((a) => a.id_colegiado === r.id_colegiado)
                : asistencias.some((a) => a.id_invitado === r.id_invitado);
            if (asistio) set.add(claveDe(r));
        });
        return set;
    });
    const [busqueda, setBusqueda] = useState("");
    const [guardando, setGuardando] = useState(false);

    const toggle = (r) => {
        const clave = claveDe(r);
        setSeleccionados((prev) => {
            const next = new Set(prev);
            next.has(clave) ? next.delete(clave) : next.add(clave);
            return next;
        });
    };

    const registrosFiltrados = registros.filter((r) => {
        const persona = r.colegiados || r.invitados;
        const nombre = `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.toLowerCase();
        return nombre.includes(busqueda.toLowerCase());
    });

    const handleGuardar = async () => {
        setGuardando(true);
        try {
            await onGuardar(seleccionados);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300"
                />
            </div>

            <p className="text-sm text-slate-500">
                Marca a quienes asistieron y dale a <strong>Listo</strong> para guardar todo de una vez.
            </p>

            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {registrosFiltrados.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">No hay inscritos que coincidan.</p>
                ) : (
                    registrosFiltrados.map((r) => {
                        const persona = r.colegiados || r.invitados;
                        const marcado = seleccionados.has(claveDe(r));
                        return (
                            <button
                                key={claveDe(r)}
                                type="button"
                                onClick={() => toggle(r)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${marcado
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-white border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 ${marcado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {persona?.nombre?.charAt(0)?.toUpperCase() || "N"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{persona?.nombre} {persona?.apellido}</p>
                                    <p className="text-xs text-slate-500">{r.id_colegiado ? "Colegiado" : "Invitado"}</p>
                                </div>
                                {marcado ? (
                                    <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                                ) : (
                                    <UserX className="w-5 h-5 text-slate-300 shrink-0" />
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                    <strong className="text-slate-700">{seleccionados.size}</strong> de {registros.length} marcados
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={guardando}
                        className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                        {guardando ? "Guardando..." : "Listo"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MarcarAsistenciaInst;
