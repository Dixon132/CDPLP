// Hook de control de `Modo_Ejecucion` de un `Analisis` (Gestor_Ejecucion,
// Req. 32) con **TanStack Query**.
//
// Encapsula las cuatro acciones del `GestorEjecucion` (tarea 17.1) como
// mutaciones sobre el cliente HTTP del backend autónomo (`VITE_GDS_API_URL`):
// seleccionar modo, avanzar (Manual)/iniciar (continuo), pausar y reanudar.
// Las funciones de `../api/ejecucionApi` ya DEGRADAN CON ELEGANCIA (devuelven
// `{ ok:false, noDisponible }` si el endpoint aún no existe), así que aquí los
// reintentos quedan desactivados: no tiene sentido reintentar una llamada que
// ya gestiona su propia degradación.
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import {
    avanzar as apiAvanzar,
    pausar as apiPausar,
    reanudar as apiReanudar,
    seleccionarModo as apiSeleccionarModo,
    type EjecucionResult,
    type ResultadoEjecucion,
} from '../api/ejecucionApi';
import type { ModoEjecucion } from '../types';

/** Variables de la mutación de selección de modo. */
export interface SeleccionarModoVars {
    modo: ModoEjecucion;
    /** Solo relevante en Tiempo_Real (Req. 32.5). */
    intervaloMs?: number;
}

/** Conjunto de mutaciones y estado agregado del control de ejecución. */
export interface UseEjecucionResult {
    /** Aplica el `Modo_Ejecucion` elegido (`PUT /analisis/:id/modo`). */
    seleccionarModo: UseMutationResult<EjecucionResult<null>, Error, SeleccionarModoVars>;
    /** Avanza/inicia la simulación (`POST /analisis/:id/avanzar`). */
    avanzar: UseMutationResult<EjecucionResult<ResultadoEjecucion>, Error, void>;
    /** Pausa la ejecución continua (`POST /analisis/:id/pausar`). */
    pausar: UseMutationResult<EjecucionResult<null>, Error, void>;
    /** Reanuda la ejecución pausada (`POST /analisis/:id/reanudar`). */
    reanudar: UseMutationResult<EjecucionResult<ResultadoEjecucion>, Error, void>;
    /** `true` mientras cualquiera de las acciones está en curso. */
    ocupado: boolean;
}

/**
 * Hook de control de ejecución de un `Analisis`. Cuando `analisisId` es nulo,
 * las mutaciones rechazan para no llamar a la red sin un objetivo válido.
 */
export function useEjecucion(analisisId: string | null | undefined): UseEjecucionResult {
    const id = analisisId != null ? String(analisisId) : '';

    const seleccionarModo = useMutation<EjecucionResult<null>, Error, SeleccionarModoVars>({
        mutationFn: ({ modo, intervaloMs }) => {
            if (!id) return Promise.reject(new Error('Selecciona un análisis válido.'));
            return apiSeleccionarModo(id, modo, intervaloMs);
        },
        retry: 0,
    });

    const avanzar = useMutation<EjecucionResult<ResultadoEjecucion>, Error, void>({
        mutationFn: () => {
            if (!id) return Promise.reject(new Error('Selecciona un análisis válido.'));
            return apiAvanzar(id);
        },
        retry: 0,
    });

    const pausar = useMutation<EjecucionResult<null>, Error, void>({
        mutationFn: () => {
            if (!id) return Promise.reject(new Error('Selecciona un análisis válido.'));
            return apiPausar(id);
        },
        retry: 0,
    });

    const reanudar = useMutation<EjecucionResult<ResultadoEjecucion>, Error, void>({
        mutationFn: () => {
            if (!id) return Promise.reject(new Error('Selecciona un análisis válido.'));
            return apiReanudar(id);
        },
        retry: 0,
    });

    const ocupado =
        seleccionarModo.isPending ||
        avanzar.isPending ||
        pausar.isPending ||
        reanudar.isPending;

    return { seleccionarModo, avanzar, pausar, reanudar, ocupado };
}
