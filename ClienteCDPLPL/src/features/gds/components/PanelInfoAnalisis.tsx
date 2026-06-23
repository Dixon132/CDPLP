// Panel de información y gestión de un `Analisis` (Req. 8, 32).
//
// Muestra los datos clave del análisis seleccionado (escenario, modo, estado,
// semana actual/total con barra de progreso, nº de instituciones) y permite
// eliminarlo. En modo Tiempo_Real muestra un contador en vivo del intervalo de
// la siguiente semana simulada. Consume el estado del backend autónomo
// (`/api/gds/analisis/:id/estado`) con TanStack Query.
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getEstadoAnalisis, deleteAnalisis, type EstadoAnalisis } from '../api/analisisApi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export interface PanelInfoAnalisisProps {
    analisisId: string | null;
    /** Refresca con esta frecuencia (ms) mientras está en ejecución. */
    refrescoMs?: number;
    /** Notifica cuando se elimina el análisis. */
    onEliminado?: () => void;
}

const MODO_LABEL: Record<string, string> = {
    MANUAL: 'Manual',
    AUTOMATICO: 'Automático',
    TIEMPO_REAL: 'Tiempo real',
};

const ESTADO_COLOR: Record<string, string> = {
    DETENIDO: '#94a3b8',
    EN_EJECUCION: '#0ea5e9',
    PAUSADO: '#f59e0b',
    COMPLETADO: '#22c55e',
};

/** Contador regresivo visual para el modo Tiempo Real. */
function ContadorTiempoReal({ intervaloMs, activo }: { intervaloMs: number; activo: boolean }) {
    const [restante, setRestante] = useState(intervaloMs);
    const ref = useRef<number | null>(null);

    useEffect(() => {
        if (!activo) return;
        setRestante(intervaloMs);
        const inicio = Date.now();
        ref.current = window.setInterval(() => {
            const transcurrido = Date.now() - inicio;
            const queda = intervaloMs - (transcurrido % intervaloMs);
            setRestante(queda);
        }, 100);
        return () => {
            if (ref.current) window.clearInterval(ref.current);
        };
    }, [intervaloMs, activo]);

    if (!activo) return null;
    const segundos = (restante / 1000).toFixed(1);
    const pct = Math.max(0, Math.min(100, (restante / intervaloMs) * 100));

    return (
        <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-cyan-700">
                    ⏱ Próxima semana en
                </span>
                <span className="font-mono text-lg font-bold text-cyan-700">{segundos}s</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cyan-100">
                <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-100"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
    return (
        <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-400">{etiqueta}</p>
            <p className="text-sm font-medium text-slate-800">{valor}</p>
        </div>
    );
}

export default function PanelInfoAnalisis({
    analisisId,
    refrescoMs = 4000,
    onEliminado,
}: PanelInfoAnalisisProps) {
    const queryClient = useQueryClient();
    const [confirmar, setConfirmar] = useState(false);

    const estadoQuery = useQuery<EstadoAnalisis, Error>({
        queryKey: ['gds', 'analisis', 'estado', analisisId],
        queryFn: () => getEstadoAnalisis(analisisId as string),
        enabled: Boolean(analisisId),
        refetchInterval: (q) => {
            const d = q.state.data;
            // Refresca en vivo mientras está en ejecución.
            return d && d.estadoEjecucion === 'EN_EJECUCION' ? refrescoMs : false;
        },
    });

    const eliminar = useMutation({
        mutationFn: () => deleteAnalisis(analisisId as string),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['gds', 'analisis'] });
            setConfirmar(false);
            onEliminado?.();
        },
    });

    if (!analisisId) return null;
    const e = estadoQuery.data;

    if (estadoQuery.isLoading || !e) {
        return (
            <Card>
                <CardContent className="py-6 text-center text-sm text-slate-400">
                    Cargando información del análisis…
                </CardContent>
            </Card>
        );
    }

    const enTiempoReal = e.modoEjecucion === 'TIEMPO_REAL' && e.estadoEjecucion === 'EN_EJECUCION';

    return (
        <Card aria-label="Información del análisis">
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="text-base">{e.nombre}</CardTitle>
                    <span
                        className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: ESTADO_COLOR[e.estadoEjecucion] ?? '#94a3b8' }}
                    >
                        {e.estadoEjecucion}
                    </span>
                </div>
                <div className="flex gap-2">
                    {!confirmar ? (
                        <Button variant="outline" onClick={() => setConfirmar(true)}>
                            Eliminar
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmar(false)}
                                disabled={eliminar.isPending}
                            >
                                Cancelar
                            </Button>
                            <button
                                type="button"
                                onClick={() => eliminar.mutate()}
                                disabled={eliminar.isPending}
                                className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {eliminar.isPending ? 'Eliminando…' : 'Confirmar'}
                            </button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progreso semanal */}
                <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                            Semana {e.semanaActual} de {e.semanasTotales}
                        </span>
                        <span className="text-slate-400">{e.progreso}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-cyan-500 transition-all"
                            style={{ width: `${e.progreso}%` }}
                        />
                    </div>
                </div>

                {/* Datos clave */}
                <div className="grid gap-2 sm:grid-cols-3">
                    <Dato etiqueta="Modo de ejecución" valor={MODO_LABEL[e.modoEjecucion] ?? e.modoEjecucion} />
                    <Dato etiqueta="Instituciones" valor={e.instituciones} />
                    <Dato etiqueta="Radio de análisis" valor={`${e.radioAnalisis} m`} />
                </div>

                {/* Contador de tiempo real */}
                {enTiempoReal && e.intervaloTiempoRealMs && (
                    <ContadorTiempoReal intervaloMs={e.intervaloTiempoRealMs} activo />
                )}

                {/* Escenario */}
                <div>
                    <p className="text-xs text-slate-400">
                        Escenario {e.escenarioEsPersonalizado ? '(personalizado)' : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{e.escenario}</p>
                </div>

                {eliminar.isError && (
                    <p className="text-xs text-red-600">No se pudo eliminar el análisis.</p>
                )}
            </CardContent>
        </Card>
    );
}
