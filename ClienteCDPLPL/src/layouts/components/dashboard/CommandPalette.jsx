import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, CornerDownLeft, Loader2, X } from 'lucide-react';
import { getFlatNavForRole, getIcon, formatTitle } from '../../navigation';
import { useSession } from '../../../context/SessionProvider';

/**
 * Buscador global (Ctrl/Cmd + K).
 *
 * Dos fuentes:
 *  - Módulos: se filtran contra `getNavForRole`, así que nunca ofrece un módulo
 *    que el rol no puede abrir.
 *  - Personas: colegiados, invitados y pasantes, contra los endpoints que ya
 *    aceptan `search`. Con debounce y descartando respuestas obsoletas, porque
 *    son tres peticiones en paralelo por pulsación.
 */

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

// Quita acentos para que "Tesoreria" encuentre "Tesorería".
const normalizar = (s = '') =>
    s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function CommandPalette({ abierto, onClose }) {
    const navigate = useNavigate();
    const { rol } = useSession();
    const [consulta, setConsulta] = useState('');
    const [personas, setPersonas] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [indice, setIndice] = useState(0);
    const inputRef = useRef(null);
    const peticionRef = useRef(0);

    const modulos = useMemo(() => {
        const todos = getFlatNavForRole(rol);
        const q = normalizar(consulta.trim());
        if (!q) return todos;
        return todos.filter(
            (m) => normalizar(formatTitle(m.title)).includes(q) || normalizar(m.grupo).includes(q)
        );
    }, [rol, consulta]);

    // Búsqueda de personas con debounce
    useEffect(() => {
        const q = consulta.trim();
        if (q.length < MIN_CHARS) {
            setPersonas([]);
            setBuscando(false);
            return undefined;
        }

        setBuscando(true);
        const idPeticion = ++peticionRef.current;

        const t = setTimeout(async () => {
            const pedir = (url, tipo) =>
                axios
                    .get(url, { params: { search: q, limit: 4 } })
                    .then((r) => (r.data?.data ?? []).map((x) => ({ ...x, tipo })))
                    .catch(() => []);

            const [cols, invs, pass] = await Promise.all([
                pedir('/api/colegiados/colegiado', 'colegiado'),
                pedir('/api/colegiados/invitados', 'invitado'),
                pedir('/api/colegiados/pasantes', 'pasante'),
            ]);

            // Descarta el resultado si ya se escribió algo más.
            if (idPeticion !== peticionRef.current) return;

            setPersonas([...cols, ...invs, ...pass].slice(0, 12));
            setBuscando(false);
        }, DEBOUNCE_MS);

        return () => clearTimeout(t);
    }, [consulta]);

    const rutaDePersona = (p) => {
        if (p.tipo === 'colegiado') return `/dashboard/colegiados/pagos/${p.id_colegiado}`;
        if (p.tipo === 'invitado') return `/dashboard/invitados/pagos/${p.id_invitado}`;
        return '/dashboard/pasantes';
    };

    const resultados = useMemo(
        () => [
            ...modulos.map((m) => ({
                clave: `mod:${m.path}`,
                grupo: 'Módulos',
                etiqueta: formatTitle(m.title),
                detalle: m.grupo,
                icono: getIcon(m.icon),
                ir: () => navigate(m.path),
            })),
            ...personas.map((p) => ({
                clave: `per:${p.tipo}:${p.id_colegiado ?? p.id_invitado ?? p.id_pasante}`,
                grupo: 'Personas',
                etiqueta: `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim(),
                detalle: p.carnet_identidad ? `CI ${p.carnet_identidad} · ${p.tipo}` : p.tipo,
                icono: null,
                ir: () => navigate(rutaDePersona(p)),
            })),
        ],
        [modulos, personas, navigate]
    );

    useEffect(() => setIndice(0), [consulta]);

    useEffect(() => {
        if (abierto) {
            setConsulta('');
            setPersonas([]);
            setIndice(0);
            // El input se monta con el diálogo; enfocar en el siguiente frame.
            const t = setTimeout(() => inputRef.current?.focus(), 30);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [abierto]);

    const elegir = useCallback(
        (r) => {
            if (!r) return;
            r.ir();
            onClose();
        },
        [onClose]
    );

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndice((i) => Math.min(i + 1, resultados.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndice((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            elegir(resultados[indice]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    if (!abierto) return null;

    let grupoPrevio = null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm p-4 sm:pt-[12vh] flex items-start justify-center"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Buscador global"
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Entrada */}
                <div className="flex items-center gap-3 px-4 border-b border-slate-200">
                    <Search size={18} className="shrink-0 text-slate-400" />
                    <input
                        ref={inputRef}
                        value={consulta}
                        onChange={(e) => setConsulta(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Buscar módulos o personas por nombre o CI…"
                        className="flex-1 py-4 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                    {buscando && <Loader2 size={16} className="shrink-0 animate-spin text-slate-400" />}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar buscador"
                        className="shrink-0 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Resultados */}
                <div className="max-h-[52vh] overflow-y-auto py-2">
                    {resultados.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-slate-400">
                            {consulta.trim().length > 0 && consulta.trim().length < MIN_CHARS
                                ? `Escribe ${MIN_CHARS} caracteres para buscar personas`
                                : 'Sin resultados'}
                        </p>
                    ) : (
                        resultados.map((r, i) => {
                            const nuevoGrupo = r.grupo !== grupoPrevio;
                            grupoPrevio = r.grupo;
                            const Icono = r.icono;
                            const activo = i === indice;
                            return (
                                <div key={r.clave}>
                                    {nuevoGrupo && (
                                        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {r.grupo}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onMouseEnter={() => setIndice(i)}
                                        onClick={() => elegir(r)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${activo ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                    >
                                        <span className="shrink-0 h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                                            {Icono ? (
                                                <Icono size={15} />
                                            ) : (
                                                <span className="text-[11px] font-bold">
                                                    {(r.etiqueta[0] ?? '?').toUpperCase()}
                                                </span>
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-slate-800">
                                                {r.etiqueta || 'Sin nombre'}
                                            </span>
                                            <span className="block truncate text-[11px] text-slate-400 capitalize">
                                                {r.detalle}
                                            </span>
                                        </span>
                                        {activo && (
                                            <CornerDownLeft size={14} className="shrink-0 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Ayuda */}
                <div className="hidden sm:flex items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-medium text-slate-400">
                    <span><kbd className="font-sans font-bold text-slate-500">↑↓</kbd> navegar</span>
                    <span><kbd className="font-sans font-bold text-slate-500">↵</kbd> abrir</span>
                    <span><kbd className="font-sans font-bold text-slate-500">Esc</kbd> cerrar</span>
                </div>
            </div>
        </div>
    );
}
