// Panel de control de `Modo_Ejecucion` de un `Analisis` (Req. 32.1, 32.6).
//
// Variante **TypeScript** del control de ejecución (migración del feature `gds`
// a TS + Shadcn/UI). Permite seleccionar el `Modo_Ejecucion`
// (Automático/Manual/Tiempo_Real), configurar el intervalo del modo Tiempo_Real
// (Req. 32.5) y disparar los controles de avanzar (Manual)/iniciar, pausar y
// reanudar, conectados al backend autónomo `ServidorGDS/` mediante el hook
// `useEjecucion` (TanStack Query) y `api/ejecucionApi`. Degrada con elegancia:
// si un endpoint aún no está disponible muestra un aviso informativo sin
// romperse.
//
// Es un componente REUTILIZABLE pensado para incrustarse en un contexto de
// detalle/estado de análisis: recibe el `analisis` (id, modo y estado actuales)
// y notifica los cambios hacia arriba con `onCambio` para que el contenedor
// refresque su estado.
import { useState } from 'react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    ESTADO_LABEL,
    INTERVALO_DEFECTO_MS,
    INTERVALO_MAX_MS,
    INTERVALO_MIN_MS,
    MODOS_EJECUCION,
    MODO_META,
    clampIntervalo,
    normalizeEstado,
    normalizeModo,
    puedeAvanzar,
    puedePausar,
    puedeReanudar,
    type EjecucionResult,
} from '../api/ejecucionApi';
import { useEjecucion } from '../hooks/useEjecucion';
import type { ModoEjecucion } from '../types';

/** Forma mínima del `Analisis` que consume el panel. */
export interface AnalisisEjecucion {
    id?: string | null;
    modo?: string | null;
    estado?: string | null;
    /** Intervalo actual del Tiempo_Real, si lo hubiera. */
    intervaloTiempoRealMs?: number | null;
}

/** Información notificada hacia el contenedor tras una acción exitosa. */
export interface CambioEjecucion {
    accion: 'modo' | 'avanzar' | 'pausar' | 'reanudar';
    data: unknown;
}

export interface PanelModoEjecucionProps {
    analisis?: AnalisisEjecucion;
    onCambio?: (info: CambioEjecucion) => void;
    disabled?: boolean;
}

type Mensaje = { tipo: 'ok' | 'aviso' | 'error'; texto: string } | null;

/** Panel de control de modos de ejecución de un `Analisis`. */
export default function PanelModoEjecucion({
    analisis = {},
    onCambio,
    disabled = false,
}: PanelModoEjecucionProps) {
    const analisisId = analisis?.id != null ? String(analisis.id) : null;

    const [modo, setModo] = useState<ModoEjecucion>(normalizeModo(analisis?.modo));
    const [intervaloMs, setIntervaloMs] = useState<number>(
        Number(analisis?.intervaloTiempoRealMs) > 0
            ? Number(analisis.intervaloTiempoRealMs)
            : INTERVALO_DEFECTO_MS,
    );
    const [mensaje, setMensaje] = useState<Mensaje>(null);

    const estado = normalizeEstado(analisis?.estado);
    const { seleccionarModo, avanzar, pausar, reanudar, ocupado } = useEjecucion(analisisId);

    const esTiempoReal = modo === MODOS_EJECUCION.TIEMPO_REAL;
    const sinId = !analisisId;
    const bloqueado = disabled || ocupado || sinId;

    /** Interpreta un resultado tolerante y actualiza mensaje + notifica. */
    function manejar(
        accion: CambioEjecucion['accion'],
        res: EjecucionResult<unknown>,
        exito: string,
    ) {
        if (res.ok) {
            setMensaje({ tipo: 'ok', texto: exito });
            onCambio?.({ accion, data: res.data });
        } else {
            setMensaje({
                tipo: 'aviso',
                texto: 'El control de ejecución aún no está disponible en el servidor.',
            });
        }
    }

    const onAplicarModo = async () => {
        if (bloqueado) return;
        setMensaje(null);
        try {
            const res = await seleccionarModo.mutateAsync({ modo, intervaloMs });
            manejar('modo', res, `Modo de ejecución actualizado a "${MODO_META[modo].label}".`);
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo actualizar el modo. Intenta de nuevo.' });
        }
    };

    const onAvanzar = async () => {
        if (bloqueado) return;
        setMensaje(null);
        try {
            const res = await avanzar.mutateAsync();
            manejar('avanzar', res, 'Avance disparado correctamente.');
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo avanzar. Intenta de nuevo.' });
        }
    };

    const onPausar = async () => {
        if (bloqueado) return;
        setMensaje(null);
        try {
            const res = await pausar.mutateAsync();
            manejar('pausar', res, 'Ejecución pausada.');
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo pausar. Intenta de nuevo.' });
        }
    };

    const onReanudar = async () => {
        if (bloqueado) return;
        setMensaje(null);
        try {
            const res = await reanudar.mutateAsync();
            manejar('reanudar', res, 'Ejecución reanudada.');
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo reanudar. Intenta de nuevo.' });
        }
    };

    const avanzarHabilitado = !bloqueado && puedeAvanzar(modo, estado);
    const pausarHabilitado = !bloqueado && puedePausar(modo, estado);
    const reanudarHabilitado = !bloqueado && puedeReanudar(modo, estado);
    const avanzarLabel = modo === MODOS_EJECUCION.MANUAL ? 'Avanzar semana' : 'Iniciar';

    return (
        <Card aria-label="Control de modo de ejecución del análisis">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm">Modo de ejecución</CardTitle>
                <span className="text-xs text-slate-400">Estado: {ESTADO_LABEL[estado]}</span>
            </CardHeader>
            <CardContent className="space-y-3">
                {sinId && (
                    <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                        Selecciona un análisis para controlar su ejecución.
                    </p>
                )}

                <fieldset disabled={bloqueado}>
                    <legend className="sr-only">Selecciona el modo de ejecución</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {(Object.values(MODOS_EJECUCION) as ModoEjecucion[]).map((m) => {
                            const activo = modo === m;
                            return (
                                <label
                                    key={m}
                                    className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${
                                        activo
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
                                    <span className="block font-medium">{MODO_META[m].label}</span>
                                    <span className="mt-0.5 block text-xs text-slate-400">
                                        {MODO_META[m].descripcion}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                {esTiempoReal && (
                    <div>
                        <Label htmlFor="intervalo-tiempo-real" className="text-xs">
                            Intervalo por semana simulada (ms)
                        </Label>
                        <Input
                            id="intervalo-tiempo-real"
                            type="number"
                            min={INTERVALO_MIN_MS}
                            max={INTERVALO_MAX_MS}
                            step={100}
                            value={intervaloMs}
                            disabled={bloqueado}
                            onChange={(e) => setIntervaloMs(Number(e.target.value))}
                            onBlur={() => setIntervaloMs((v) => clampIntervalo(v))}
                            className="mt-1 w-40"
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            Duración de una semana simulada, independiente de una semana real.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={onAplicarModo} disabled={bloqueado}>
                        Aplicar modo
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onAvanzar}
                        disabled={!avanzarHabilitado}
                        title="Disponible mientras el análisis no esté completado ni en ejecución"
                    >
                        {avanzarLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onPausar}
                        disabled={!pausarHabilitado}
                        title="Disponible en modos Automático/Tiempo real en ejecución"
                    >
                        Pausar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onReanudar}
                        disabled={!reanudarHabilitado}
                        title="Disponible cuando la ejecución está pausada"
                    >
                        Reanudar
                    </Button>
                </div>

                {mensaje && (
                    <p
                        role="status"
                        className={`text-xs ${
                            mensaje.tipo === 'ok'
                                ? 'text-emerald-600'
                                : mensaje.tipo === 'aviso'
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                        }`}
                    >
                        {mensaje.texto}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
