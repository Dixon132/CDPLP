// Control de modos de ejecución de un `Analisis` (Req. 32.1, 32.6).
//
// Permite seleccionar el `Modo_Ejecucion` (Automático/Manual/Tiempo_Real),
// configurar el intervalo del modo Tiempo_Real (Req. 32.5) y disparar los
// controles de avanzar (manual), pausar y reanudar, conectados al backend
// autónomo `ServidorGDS/` vía `api/ejecucion.js`. Degrada con elegancia: si el
// endpoint aún no está disponible muestra un aviso informativo sin romperse.
//
// Pensado para vivir dentro de un contexto de detalle de análisis: recibe el
// análisis (id, modo y estado actuales) y notifica los cambios hacia arriba con
// `onCambio` para que el contenedor refresque su estado.
import { useState } from 'react';
import {
    MODOS_EJECUCION,
    MODO_META,
    ESTADOS_EJECUCION,
    INTERVALO_DEFECTO_MS,
    INTERVALO_MIN_MS,
    INTERVALO_MAX_MS,
    normalizeModo,
    normalizeEstado,
    clampIntervalo,
    puedeAvanzarManual,
    puedePausar,
    puedeReanudar,
    seleccionarModo as apiSeleccionarModo,
    avanzarManual as apiAvanzarManual,
    pausar as apiPausar,
    reanudar as apiReanudar,
} from '../api/ejecucion.js';

const ESTADO_LABEL = {
    [ESTADOS_EJECUCION.DETENIDO]: 'Detenido',
    [ESTADOS_EJECUCION.EN_EJECUCION]: 'En ejecución',
    [ESTADOS_EJECUCION.PAUSADO]: 'Pausado',
    [ESTADOS_EJECUCION.COMPLETADO]: 'Completado',
};

/**
 * @param {object} props
 * @param {{id?:string, modo?:string, estado?:string, intervaloMs?:number}} props.analisis
 * @param {(info:{accion:string, data:any})=>void} [props.onCambio]
 * @param {boolean} [props.disabled]
 */
export default function ControlModoEjecucion({ analisis = {}, onCambio, disabled = false }) {
    const analisisId = analisis?.id != null ? String(analisis.id) : null;
    const [modo, setModo] = useState(normalizeModo(analisis?.modo));
    const [intervaloMs, setIntervaloMs] = useState(
        Number(analisis?.intervaloMs) > 0 ? Number(analisis.intervaloMs) : INTERVALO_DEFECTO_MS
    );
    const estado = normalizeEstado(analisis?.estado);

    const [ocupado, setOcupado] = useState(false);
    const [mensaje, setMensaje] = useState(null); // { tipo: 'ok'|'aviso'|'error', texto }

    const esTiempoReal = modo === MODOS_EJECUCION.TIEMPO_REAL;
    const sinId = !analisisId;
    const bloqueado = disabled || ocupado || sinId;

    /** Envuelve una acción de red gestionando ocupado/mensajes y notificación. */
    async function ejecutar(accion, fn, exito) {
        if (bloqueado) return;
        setOcupado(true);
        setMensaje(null);
        try {
            const res = await fn();
            if (res?.ok) {
                setMensaje({ tipo: 'ok', texto: exito });
                onCambio?.({ accion, data: res.data });
            } else if (res?.noDisponible) {
                setMensaje({
                    tipo: 'aviso',
                    texto: 'El control de ejecución aún no está disponible en el servidor.',
                });
            }
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo completar la acción. Intenta de nuevo.' });
        } finally {
            setOcupado(false);
        }
    }

    const onSeleccionarModo = () =>
        ejecutar(
            'modo',
            () => apiSeleccionarModo(analisisId, modo, intervaloMs),
            `Modo de ejecución actualizado a "${MODO_META[modo]?.label ?? modo}".`
        );

    const onAvanzar = () =>
        ejecutar('avanzar', () => apiAvanzarManual(analisisId), 'Avanzó a la siguiente semana.');
    const onPausar = () => ejecutar('pausar', () => apiPausar(analisisId), 'Ejecución pausada.');
    const onReanudar = () =>
        ejecutar('reanudar', () => apiReanudar(analisisId), 'Ejecución reanudada.');

    const avanzarHabilitado = !bloqueado && puedeAvanzarManual(modo, estado);
    const pausarHabilitado = !bloqueado && puedePausar(modo, estado);
    const reanudarHabilitado = !bloqueado && puedeReanudar(modo, estado);

    return (
        <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            aria-label="Control de modo de ejecución del análisis"
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Modo de ejecución</h3>
                <span className="text-xs text-slate-400">Estado: {ESTADO_LABEL[estado]}</span>
            </div>

            {sinId && (
                <p className="mb-3 rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                    Selecciona un análisis para controlar su ejecución.
                </p>
            )}

            <fieldset className="mb-3" disabled={bloqueado}>
                <legend className="sr-only">Selecciona el modo de ejecución</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                    {Object.values(MODOS_EJECUCION).map((m) => {
                        const activo = modo === m;
                        return (
                            <label
                                key={m}
                                className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${activo
                                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    } ${bloqueado ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="modo-ejecucion"
                                    value={m}
                                    checked={activo}
                                    onChange={() => setModo(m)}
                                    className="sr-only"
                                />
                                <span className="block font-medium">{MODO_META[m]?.label ?? m}</span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                    {MODO_META[m]?.descripcion}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {esTiempoReal && (
                <div className="mb-3">
                    <label htmlFor="intervalo-tiempo-real" className="block text-xs font-medium text-slate-600">
                        Intervalo por semana simulada (ms)
                    </label>
                    <input
                        id="intervalo-tiempo-real"
                        type="number"
                        min={INTERVALO_MIN_MS}
                        max={INTERVALO_MAX_MS}
                        step={100}
                        value={intervaloMs}
                        disabled={bloqueado}
                        onChange={(e) => setIntervaloMs(Number(e.target.value))}
                        onBlur={() => setIntervaloMs((v) => clampIntervalo(v))}
                        className="mt-1 w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        Duración de una semana simulada, independiente de una semana real.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onSeleccionarModo}
                    disabled={bloqueado}
                    className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Aplicar modo
                </button>
                <button
                    type="button"
                    onClick={onAvanzar}
                    disabled={!avanzarHabilitado}
                    title="Disponible en modo Manual"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Avanzar semana
                </button>
                <button
                    type="button"
                    onClick={onPausar}
                    disabled={!pausarHabilitado}
                    title="Disponible en modos Automático/Tiempo real en ejecución"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Pausar
                </button>
                <button
                    type="button"
                    onClick={onReanudar}
                    disabled={!reanudarHabilitado}
                    title="Disponible cuando la ejecución está pausada"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Reanudar
                </button>
            </div>

            {mensaje && (
                <p
                    role="status"
                    className={`mt-3 text-xs ${mensaje.tipo === 'ok'
                            ? 'text-emerald-600'
                            : mensaje.tipo === 'aviso'
                                ? 'text-amber-600'
                                : 'text-red-600'
                        }`}
                >
                    {mensaje.texto}
                </p>
            )}
        </section>
    );
}
