// Cliente HTTP tipado del control de `Modo_Ejecucion` de un `Analisis`
// (Gestor_Ejecucion, Req. 32). Variante **TypeScript** que acompaña la
// migración del feature `gds` a TS + Shadcn/UI; convive con el cliente JS
// heredado (`ejecucion.js`).
//
// Consume el backend autónomo de la Plataforma_GDS (`ServidorGDS/`) a través
// del cliente axios compartido `gdsApiClient`, cuya `baseURL` ya apunta a
// `${VITE_GDS_API_URL}/api/gds`. Mapea las acciones del `GestorEjecucion`
// (tarea 17.1), todas bajo `/api/gds` y autenticadas:
//   - PUT  /analisis/:id/modo      → seleccionar modo (+ intervalo en tiempo real) → 204
//   - POST /analisis/:id/avanzar   → avanzar según el modo                         → ResultadoEjecucion
//   - POST /analisis/:id/pausar    → pausar AUTOMATICO/TIEMPO_REAL                  → 204
//   - POST /analisis/:id/reanudar  → reanudar desde la siguiente semana pendiente  → ResultadoEjecucion
//
// Expone:
//   - el dominio de `Modo_Ejecucion`/`Estado_Ejecucion` y sus metadatos,
//   - utilidades puras (`normalizeModo`, `normalizeEstado`, `clampIntervalo`,
//     `modoPayload`, reglas de habilitación) probables sin red ni DOM,
//   - y funciones de red que DEGRADAN CON ELEGANCIA: si un endpoint aún no
//     existe (404/501) o la red falla, devuelven `{ ok:false, noDisponible }`
//     en lugar de romper la UI; el resto de errores se re-lanzan.
import gdsApiClient from './client.js';
import type { ModoEjecucion } from '../types';

/** Valores de `Modo_Ejecucion` (Req. 32.1). Coinciden con el enum del backend. */
export const MODOS_EJECUCION = {
    AUTOMATICO: 'AUTOMATICO',
    MANUAL: 'MANUAL',
    TIEMPO_REAL: 'TIEMPO_REAL',
} as const satisfies Record<string, ModoEjecucion>;

/** `Estado_Ejecucion` consultable del `Analisis` (Req. 32.6). */
export const ESTADOS_EJECUCION = {
    DETENIDO: 'DETENIDO',
    EN_EJECUCION: 'EN_EJECUCION',
    PAUSADO: 'PAUSADO',
    COMPLETADO: 'COMPLETADO',
} as const;

/** Tipo del `Estado_Ejecucion` del `GestorEjecucion`. */
export type EstadoEjecucionGestor =
    (typeof ESTADOS_EJECUCION)[keyof typeof ESTADOS_EJECUCION];

/** Metadatos de presentación por modo (etiqueta legible + descripción corta). */
export const MODO_META: Record<ModoEjecucion, { label: string; descripcion: string }> = {
    AUTOMATICO: {
        label: 'Automático',
        descripcion: 'Procesa de corrido todas las semanas pendientes.',
    },
    MANUAL: {
        label: 'Manual',
        descripcion: 'Avanza una semana por cada solicitud explícita.',
    },
    TIEMPO_REAL: {
        label: 'Tiempo real',
        descripcion: 'Avanza una semana cada vez que vence el intervalo configurado.',
    },
};

/** Etiquetas legibles del `Estado_Ejecucion`. */
export const ESTADO_LABEL: Record<EstadoEjecucionGestor, string> = {
    DETENIDO: 'Detenido',
    EN_EJECUCION: 'En ejecución',
    PAUSADO: 'Pausado',
    COMPLETADO: 'Completado',
};

/**
 * Intervalo del modo Tiempo_Real, en milisegundos (Req. 32.5: duración de una
 * `Semana_Simulada`, independiente de una semana calendario real). El valor por
 * defecto es configurable; aquí se elige un valor de desarrollo razonable.
 */
export const INTERVALO_MIN_MS = 100; // 0.1 s
export const INTERVALO_MAX_MS = 24 * 60 * 60 * 1000; // 24 h
export const INTERVALO_DEFECTO_MS = 5000; // 5 s por semana simulada

/** Indica si un valor pertenece al dominio de `Modo_Ejecucion`. */
export function esModoValido(modo: unknown): boolean {
    return (Object.values(MODOS_EJECUCION) as string[]).includes(normalizeModo(modo));
}

/**
 * Normaliza un valor crudo de modo a uno del dominio conocido. Tolera
 * minúsculas, espacios y los sinónimos en español del glosario. Ante un valor
 * desconocido devuelve `MANUAL` (el más seguro: no auto-avanza).
 */
export function normalizeModo(raw: unknown): ModoEjecucion {
    const s = String(raw ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    if (s === 'AUTOMATICO' || s === 'AUTOMÁTICO' || s === 'AUTO') return MODOS_EJECUCION.AUTOMATICO;
    if (s === 'MANUAL') return MODOS_EJECUCION.MANUAL;
    if (s === 'TIEMPO_REAL' || s === 'TIEMPOREAL' || s === 'REALTIME' || s === 'REAL_TIME') {
        return MODOS_EJECUCION.TIEMPO_REAL;
    }
    if ((Object.values(MODOS_EJECUCION) as string[]).includes(s)) return s as ModoEjecucion;
    return MODOS_EJECUCION.MANUAL;
}

/**
 * Normaliza un `Estado_Ejecucion` crudo del backend a uno del dominio.
 * Ante un valor desconocido devuelve `DETENIDO`.
 */
export function normalizeEstado(raw: unknown): EstadoEjecucionGestor {
    const s = String(raw ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    if ((Object.values(ESTADOS_EJECUCION) as string[]).includes(s)) {
        return s as EstadoEjecucionGestor;
    }
    if (s === 'EN_CURSO' || s === 'EJECUTANDO' || s === 'RUNNING') return ESTADOS_EJECUCION.EN_EJECUCION;
    if (s === 'PAUSA' || s === 'PAUSED') return ESTADOS_EJECUCION.PAUSADO;
    if (s === 'COMPLETO' || s === 'FINALIZADO' || s === 'DONE') return ESTADOS_EJECUCION.COMPLETADO;
    return ESTADOS_EJECUCION.DETENIDO;
}

/**
 * Acota el intervalo de tiempo real (ms) al rango válido. Valores no numéricos
 * caen al valor por defecto.
 */
export function clampIntervalo(valor: unknown): number {
    const n = Math.trunc(Number(valor));
    if (!Number.isFinite(n)) return INTERVALO_DEFECTO_MS;
    if (n < INTERVALO_MIN_MS) return INTERVALO_MIN_MS;
    if (n > INTERVALO_MAX_MS) return INTERVALO_MAX_MS;
    return n;
}

/** Payload de `PUT /analisis/:id/modo` (DTO `SeleccionarModoDto` del backend). */
export interface ModoPayload {
    modo: ModoEjecucion;
    /** Solo presente en Tiempo_Real; nombre exacto del DTO del backend. */
    intervaloTiempoRealMs?: number;
}

/**
 * Construye el payload de `PUT /analisis/:id/modo` (Req. 32.1, 32.5). El
 * intervalo solo se incluye en modo Tiempo_Real (acotado al rango válido).
 */
export function modoPayload(modo: unknown, intervaloMs?: unknown): ModoPayload {
    const m = normalizeModo(modo);
    if (m === MODOS_EJECUCION.TIEMPO_REAL) {
        return { modo: m, intervaloTiempoRealMs: clampIntervalo(intervaloMs) };
    }
    return { modo: m };
}

/**
 * ¿Puede avanzarse? Mientras el análisis no esté completado ni ya ejecutándose
 * (en modos continuos se pausa, no se avanza). En Manual avanza una semana
 * (Req. 32.2); en Automatico/Tiempo_Real arranca la ejecución (Req. 32.3, 32.4).
 */
export function puedeAvanzar(_modo: unknown, estado: unknown): boolean {
    const e = normalizeEstado(estado);
    return e !== ESTADOS_EJECUCION.COMPLETADO && e !== ESTADOS_EJECUCION.EN_EJECUCION;
}

/** ¿Puede avanzarse manualmente? Solo en modo MANUAL y sin completar (Req. 32.2). */
export function puedeAvanzarManual(modo: unknown, estado: unknown): boolean {
    return normalizeModo(modo) === MODOS_EJECUCION.MANUAL && puedeAvanzar(modo, estado);
}

/** ¿Puede pausarse? Solo modos AUTOMATICO/TIEMPO_REAL en ejecución (Req. 32.6). */
export function puedePausar(modo: unknown, estado: unknown): boolean {
    const m = normalizeModo(modo);
    const esContinuo = m === MODOS_EJECUCION.AUTOMATICO || m === MODOS_EJECUCION.TIEMPO_REAL;
    return esContinuo && normalizeEstado(estado) === ESTADOS_EJECUCION.EN_EJECUCION;
}

/** ¿Puede reanudarse? Solo modos AUTOMATICO/TIEMPO_REAL pausados (Req. 32.6, 32.8). */
export function puedeReanudar(modo: unknown, estado: unknown): boolean {
    const m = normalizeModo(modo);
    const esContinuo = m === MODOS_EJECUCION.AUTOMATICO || m === MODOS_EJECUCION.TIEMPO_REAL;
    return esContinuo && normalizeEstado(estado) === ESTADOS_EJECUCION.PAUSADO;
}

/** Trabajo `(A,I,N)` encolado, tal como lo reporta el backend en `avance`. */
export interface TrabajoEncolado {
    analisisId: string;
    institucionId: string;
    numeroSemana: number;
}

/** Resultado de avance/reanudación del `GestorEjecucion` (espejo del backend). */
export interface ResultadoEjecucion {
    analisisId: string;
    modoEjecucion: ModoEjecucion;
    estadoEjecucion: EstadoEjecucionGestor;
    encolados: TrabajoEncolado[];
}

/** Resultado tolerante de una acción de ejecución (degradación con elegancia). */
export type EjecucionResult<T> =
    | { ok: true; data: T }
    | { ok: false; noDisponible: true };

/** Normaliza un `ResultadoEjecucion` crudo tolerando snake_case/camelCase. */
export function normalizeResultado(raw: unknown): ResultadoEjecucion {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const avance = (o.avance && typeof o.avance === 'object' ? o.avance : {}) as Record<string, unknown>;
    const crudos = Array.isArray(o.encolados)
        ? o.encolados
        : Array.isArray(avance.encolados)
            ? avance.encolados
            : [];
    const encolados: TrabajoEncolado[] = crudos.map((t) => {
        const e = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
        return {
            analisisId: String(e.analisisId ?? e.analisis_id ?? ''),
            institucionId: String(e.institucionId ?? e.institucion_id ?? ''),
            numeroSemana: Number(e.numeroSemana ?? e.numero_semana ?? 0),
        };
    });
    return {
        analisisId: String(o.analisisId ?? o.analisis_id ?? ''),
        modoEjecucion: normalizeModo(o.modoEjecucion ?? o.modo_ejecucion ?? o.modo),
        estadoEjecucion: normalizeEstado(o.estadoEjecucion ?? o.estado_ejecucion ?? o.estado),
        encolados,
    };
}

// Códigos HTTP que indican "endpoint aún no disponible" en el backend en
// construcción (no implementado / no encontrado).
const CODIGOS_NO_DISPONIBLE = new Set([404, 501]);

/**
 * Determina si un error de axios corresponde a un endpoint no disponible
 * todavía o a un fallo de red (backend caído / sin desplegar).
 */
export function esNoDisponible(error: unknown): boolean {
    const e = (error ?? {}) as { response?: { status?: number }; request?: unknown; code?: string };
    const status = e.response?.status;
    if (status != null) return CODIGOS_NO_DISPONIBLE.has(status);
    // Sin respuesta del servidor (red caída, backend no arrancado) → tolerar.
    return Boolean(e.request) || e.code === 'ERR_NETWORK';
}

/**
 * Ejecuta una acción de red tolerando con elegancia los endpoints aún no
 * disponibles. Devuelve `{ ok:true, data }` en éxito; `{ ok:false,
 * noDisponible:true }` cuando el endpoint no existe o la red falla; y re-lanza
 * cualquier otro error (p. ej. 401/403/422) para que la vista lo gestione.
 */
async function ejecutarTolerante<T>(
    fn: () => Promise<T>,
): Promise<EjecucionResult<T>> {
    try {
        return { ok: true, data: await fn() };
    } catch (error) {
        if (esNoDisponible(error)) {
            return { ok: false, noDisponible: true };
        }
        throw error;
    }
}

/**
 * Selecciona el `Modo_Ejecucion` del análisis (Req. 32.1, 32.5).
 * El backend responde `204 No Content`.
 */
export function seleccionarModo(
    analisisId: string,
    modo: ModoEjecucion,
    intervaloMs?: number,
): Promise<EjecucionResult<null>> {
    return ejecutarTolerante(async () => {
        await gdsApiClient.put(`/analisis/${analisisId}/modo`, modoPayload(modo, intervaloMs));
        return null;
    });
}

/**
 * Avanza la simulación según el modo (Req. 32.2, 32.3, 32.4): una semana
 * (Manual), hasta el final (Automatico) o arranca el contador (Tiempo_Real).
 * Devuelve el `ResultadoEjecucion` normalizado.
 */
export function avanzar(analisisId: string): Promise<EjecucionResult<ResultadoEjecucion>> {
    return ejecutarTolerante(async () => {
        const { data } = await gdsApiClient.post(`/analisis/${analisisId}/avanzar`);
        return normalizeResultado(data);
    });
}

/**
 * Pausa la ejecución AUTOMATICO/TIEMPO_REAL conservando el estado (Req. 32.6).
 * El backend responde `204 No Content`.
 */
export function pausar(analisisId: string): Promise<EjecucionResult<null>> {
    return ejecutarTolerante(async () => {
        await gdsApiClient.post(`/analisis/${analisisId}/pausar`);
        return null;
    });
}

/**
 * Reanuda desde la siguiente `Semana_Simulada` pendiente (Req. 32.6, 32.8).
 * Devuelve el `ResultadoEjecucion` normalizado.
 */
export function reanudar(analisisId: string): Promise<EjecucionResult<ResultadoEjecucion>> {
    return ejecutarTolerante(async () => {
        const { data } = await gdsApiClient.post(`/analisis/${analisisId}/reanudar`);
        return normalizeResultado(data);
    });
}
