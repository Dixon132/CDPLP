// Estados de ejecución de los análisis (Req. 21.3) con progreso en vivo (21.4).
//
// Lista cada `Analisis` con su estado (en curso, completado, fallido, en
// aceleración) y su avance de semanas. Si el WS Hub envía progreso para un
// análisis, este componente refleja el último estado/semana recibidos por
// encima del valor cargado por HTTP. Degrada con elegancia: sin datos muestra
// un estado informativo; sin WS solo omite la actualización en vivo.
import { ESTADO_META, normalizeEstado } from '../api/dashboard.js';

function Badge({ estado }) {
    const meta = ESTADO_META[estado] ?? ESTADO_META.PENDIENTE;
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: meta.color }}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" />
            {meta.label}
        </span>
    );
}

function BarraProgreso({ actual, total }) {
    if (!total || total <= 0) return null;
    const pct = Math.max(0, Math.min(100, Math.round(((actual ?? 0) / total) * 100)));
    return (
        <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
                Semana {actual ?? 0} de {total} ({pct}%)
            </p>
        </div>
    );
}

/**
 * Combina el análisis cargado por HTTP con el último progreso recibido por WS.
 * @param {object} analisis
 * @param {Record<string, object>} progresoPorAnalisis
 */
function fusionarConProgreso(analisis, progresoPorAnalisis) {
    const clave = analisis?.id != null ? String(analisis.id) : null;
    const p = clave ? progresoPorAnalisis?.[clave] : null;
    if (!p) return analisis;
    return {
        ...analisis,
        estado: p.estado ? normalizeEstado(p.estado) : analisis.estado,
        semanaActual: p.numeroSemana != null ? Number(p.numeroSemana) : analisis.semanaActual,
        enVivo: true,
    };
}

/**
 * @param {object} props
 * @param {Array<object>} props.analisis
 * @param {Record<string, object>} [props.progresoPorAnalisis]
 * @param {string} [props.estadoConexion]
 * @param {boolean} [props.disponible]
 */
export default function EstadosEjecucion({
    analisis = [],
    progresoPorAnalisis = {},
    estadoConexion = 'inactivo',
    disponible = true,
}) {
    const enVivo = estadoConexion === 'conectado';

    return (
        <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            aria-label="Estados de ejecución de los análisis"
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Análisis y estados de ejecución</h3>
                <span
                    className={`inline-flex items-center gap-1.5 text-xs ${enVivo ? 'text-emerald-600' : 'text-slate-400'}`}
                    title={`Conexión de progreso: ${estadoConexion}`}
                >
                    <span
                        className={`h-2 w-2 rounded-full ${enVivo ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`}
                        aria-hidden="true"
                    />
                    {enVivo ? 'En vivo' : 'Sin conexión en vivo'}
                </span>
            </div>

            {!disponible || analisis.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                    {disponible
                        ? 'Aún no hay análisis registrados.'
                        : 'El resumen de análisis no está disponible por el momento.'}
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {analisis.map((aRaw, i) => {
                        const a = fusionarConProgreso(aRaw, progresoPorAnalisis);
                        return (
                            <li key={a.id ?? `analisis-${i}`} className="py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">{a.nombre}</p>
                                        <p className="text-xs text-slate-400">
                                            {a.escenario ? `Escenario: ${a.escenario} · ` : ''}
                                            {a.instituciones} institución(es)
                                            {a.enVivo ? ' · actualización en vivo' : ''}
                                        </p>
                                    </div>
                                    <Badge estado={a.estado} />
                                </div>
                                <BarraProgreso actual={a.semanaActual} total={a.totalSemanas} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
