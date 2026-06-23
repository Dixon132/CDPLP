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

/** Parsea el texto de explicación en factores por dimensión con su valor. */
function parsearFactores(texto: string): Array<{ dimension: string; valor: number }> {
    if (!texto) return [];
    // Formato: "Dimension: La dimension X se situa en 56.01 (rango 0-100).."
    const factores: Array<{ dimension: string; valor: number }> = [];
    const regex = /([\wáéíóúñ\s]+?):\s*La dimension .+?se situa en ([\d.]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(texto)) !== null) {
        factores.push({ dimension: m[1].trim(), valor: parseFloat(m[2]) });
    }
    return factores;
}

/** Color según el nivel de riesgo del valor (0-100). */
function colorRiesgo(valor: number): string {
    if (valor >= 66) return '#ef4444';
    if (valor >= 33) return '#f59e0b';
    return '#22c55e';
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
    const factores = explicacion ? parsearFactores(explicacion.texto) : [];

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">
                Trazabilidad: semana {seleccion.semana}
                {seleccion.dimension ? ` · ${dimensionMeta(seleccion.dimension).label}` : ''} ·
                institución{' '}
                <span className="font-mono">{mostrarSeudonimo(seleccion.institucionId)}</span>
            </p>

            {parcial && faltantes.length > 0 && (
                <Aviso tono="warn">
                    Vista parcial: falta {faltantes.join(' y ')}. Se muestra la información disponible.
                </Aviso>
            )}

            {explicacion ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-700">
                        Índice de riesgo por dimensión
                    </h4>
                    {factores.length > 0 ? (
                        <div className="space-y-2.5">
                            {factores.map((f) => (
                                <div key={f.dimension}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-medium text-slate-700">{f.dimension}</span>
                                        <span
                                            className="font-mono font-semibold"
                                            style={{ color: colorRiesgo(f.valor) }}
                                        >
                                            {f.valor.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${Math.min(100, f.valor)}%`,
                                                backgroundColor: colorRiesgo(f.valor),
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700">{explicacion.texto}</p>
                    )}
                    {explicacion.comoEvoluciono && (
                        <p className="mt-3 text-xs text-slate-500">
                            Evolución: {explicacion.comoEvoluciono}
                        </p>
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
                    <p className="mt-1 text-sm text-slate-400">
                        Sin evidencia para esta semana. Avanza el análisis para generar evidencia trazable.
                    </p>
                ) : (
                    <ul className="mt-2 space-y-2">
                        {evidencias.map((e, i) => (
                            <li
                                key={e.id ?? i}
                                className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                                        {e.tipo}
                                    </span>
                                    {e.semana != null && (
                                        <span className="text-xs text-slate-500">Semana {e.semana}</span>
                                    )}
                                </div>
                                {e.descripcion && (
                                    <p className="mt-2 text-slate-700">{e.descripcion}</p>
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
