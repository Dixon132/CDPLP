// Panel de explicación + evidencia del resultado/dimensión seleccionado, con
// soporte para vista parcial (Req. 22.3, 22.5, 22.6) y seudónimos (Req. 23.5).
//
// Presenta la cadena de trazabilidad semana → institución → evidencia y, cuando
// falta la explicación o la evidencia, lo indica explícitamente mostrando la
// información disponible.
import { dimensionMeta, mostrarSeudonimo } from '../api/trazabilidadApi';
import type { Seleccion, SoporteResultado } from '../api/trazabilidadApi';

function Aviso({ children, tono = 'info' }: { children: React.ReactNode; tono?: 'info' | 'warn' }) {
    const estilos =
        tono === 'warn'
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-slate-200 bg-slate-50 text-slate-600';
    return (
        <div role="status" className={`rounded border px-4 py-3 text-sm ${estilos}`}>
            {children}
        </div>
    );
}

export interface TrazabilidadSoportePanelProps {
    seleccion: Seleccion | null;
    soporte: SoporteResultado | null | undefined;
    cargando: boolean;
}

export function TrazabilidadSoportePanel({
    seleccion,
    soporte,
    cargando,
}: TrazabilidadSoportePanelProps) {
    if (!seleccion) {
        return <Aviso>Selecciona una semana o una dimensión para ver su explicación y evidencia.</Aviso>;
    }
    if (cargando) {
        return <p className="text-sm text-slate-500">Cargando explicación y evidencia…</p>;
    }
    if (!soporte) {
        return <Aviso tono="warn">No se pudo cargar el soporte de este resultado.</Aviso>;
    }

    const { explicacion, evidencias, parcial, faltantes } = soporte;

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">
                Trazabilidad: semana {seleccion.semana}
                {seleccion.dimension ? ` · ${dimensionMeta(seleccion.dimension).label}` : ''} ·
                institución{' '}
                <span className="font-mono">{mostrarSeudonimo(seleccion.institucionId)}</span>
            </p>

            {parcial && (
                <Aviso tono="warn">
                    Vista parcial: falta {faltantes.join(' y ')}. Se muestra la información disponible.
                </Aviso>
            )}

            {explicacion ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-sm font-semibold text-slate-700">Explicación</h4>
                    <p className="mt-1 text-sm text-slate-700">{explicacion.texto}</p>
                    {explicacion.cuando && (
                        <p className="mt-1 text-xs text-slate-500">Inicio: {explicacion.cuando}</p>
                    )}
                    {explicacion.comoEvoluciono && (
                        <p className="text-xs text-slate-500">Evolución: {explicacion.comoEvoluciono}</p>
                    )}
                </div>
            ) : (
                <Aviso tono="warn">La explicación no está disponible para este resultado.</Aviso>
            )}

            <div>
                <h4 className="text-sm font-semibold text-slate-700">
                    Evidencia ({evidencias.length})
                </h4>
                {evidencias.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-400">Sin evidencia disponible todavía.</p>
                ) : (
                    <ul className="mt-2 space-y-2">
                        {evidencias.map((e, i) => (
                            <li
                                key={e.id ?? i}
                                className="rounded border border-slate-200 bg-white p-2 text-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-slate-700">{e.tipo}</span>
                                    {e.semana != null && (
                                        <span className="text-xs text-slate-500">Semana {e.semana}</span>
                                    )}
                                </div>
                                {e.descripcion && <p className="mt-1 text-slate-600">{e.descripcion}</p>}
                                {e.refContenido && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        Origen:{' '}
                                        <span className="font-mono">
                                            {mostrarSeudonimo(e.refContenido)}
                                        </span>
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default TrazabilidadSoportePanel;
