// Cliente de la API de control de ejecución del feature `gds` (Gestor de
// Ejecución, Req. 32).
//
// Consume el backend autónomo de la Plataforma_GDS (`ServidorGDS/`) a través
// del cliente axios compartido `gdsApiClient`, cuya `baseURL` ya apunta a
// `${VITE_GDS_API_URL}/api/gds`. Los tres `Modo_Ejecucion`
// (Automatico/Manual/Tiempo_Real) y los controles de avanzar/pausar/reanudar
// se mapean a las acciones del diseño (todas bajo `/api/gds`, autenticadas):
//   - PUT  /analisis/:id/modo      → seleccionar modo (+ intervalo en tiempo real)
//   - POST /analisis/:id/avanzar   → avanzar una semana en modo manual
//   - POST /analisis/:id/pausar    → pausar AUTOMATICO/TIEMPO_REAL
//   - POST /analisis/:id/reanudar  → reanudar desde la siguiente semana pendiente
//
// El `GestorEjecucion` del backend se implementa en tareas posteriores; por eso
// la lógica pura (modos, estados, acotado de intervalo, payload y reglas de
// habilitación) vive aquí para poder probarla sin red ni DOM, y las funciones
// de red DEGRADAN CON ELEGANCIA: si un endpoint aún no existe (404/501/501) o la
// red falla, devuelven un resultado estructurado `{ ok:false, noDisponible }`
// en lugar de romper la UI.
import gdsApiClient from './client.js';

// Valores de `Modo_Ejecucion` (Req. 32.1). Coinciden con el enum del backend
// (`gestorEjecucion.ts`): AUTOMATICO / MANUAL / TIEMPO_REAL.
export const MODOS_EJECUCION = Object.freeze({
  AUTOMATICO: 'AUTOMATICO',
  MANUAL: 'MANUAL',
  TIEMPO_REAL: 'TIEMPO_REAL',
});

// Metadatos de presentación por modo (etiqueta legible + descripción corta).
export const MODO_META = Object.freeze({
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
});

// Estados de ejecución del análisis (coinciden con el enum del backend).
export const ESTADOS_EJECUCION = Object.freeze({
  DETENIDO: 'DETENIDO',
  EN_EJECUCION: 'EN_EJECUCION',
  PAUSADO: 'PAUSADO',
  COMPLETADO: 'COMPLETADO',
});

// Intervalo del modo Tiempo_Real, en milisegundos (Req. 32.5: duración de una
// `Semana_Simulada`, independiente de una semana calendario real). El valor por
// defecto es configurable; aquí se elige un valor de desarrollo razonable.
export const INTERVALO_MIN_MS = 100; // 0.1 s
export const INTERVALO_MAX_MS = 24 * 60 * 60 * 1000; // 24 h
export const INTERVALO_DEFECTO_MS = 5000; // 5 s por semana simulada

/**
 * Indica si un valor pertenece al dominio de `Modo_Ejecucion`.
 * @param {unknown} modo
 * @returns {boolean}
 */
export function esModoValido(modo) {
  return Object.values(MODOS_EJECUCION).includes(normalizeModo(modo));
}

/**
 * Normaliza un valor crudo de modo a uno del dominio conocido.
 * Tolera minúsculas, espacios y los sinónimos en español del glosario.
 * Ante un valor desconocido devuelve `MANUAL` (el más seguro: no auto-avanza).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeModo(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (s === 'AUTOMATICO' || s === 'AUTOMÁTICO' || s === 'AUTO') return MODOS_EJECUCION.AUTOMATICO;
  if (s === 'MANUAL') return MODOS_EJECUCION.MANUAL;
  if (s === 'TIEMPO_REAL' || s === 'TIEMPOREAL' || s === 'REALTIME' || s === 'REAL_TIME') {
    return MODOS_EJECUCION.TIEMPO_REAL;
  }
  if (Object.values(MODOS_EJECUCION).includes(s)) return s;
  return MODOS_EJECUCION.MANUAL;
}

/**
 * Acota el intervalo de tiempo real (ms) al rango válido. Valores no numéricos
 * caen al valor por defecto.
 * @param {unknown} valor
 * @returns {number}
 */
export function clampIntervalo(valor) {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n)) return INTERVALO_DEFECTO_MS;
  if (n < INTERVALO_MIN_MS) return INTERVALO_MIN_MS;
  if (n > INTERVALO_MAX_MS) return INTERVALO_MAX_MS;
  return n;
}

/**
 * Construye el payload de `PUT /analisis/:id/modo` (Req. 32.1, 32.5).
 * El intervalo solo se incluye en modo Tiempo_Real (acotado al rango válido).
 * @param {string} modo
 * @param {number} [intervaloMs]
 * @returns {{ modo: string, intervaloMs?: number }}
 */
export function modoPayload(modo, intervaloMs) {
  const m = normalizeModo(modo);
  const payload = { modo: m };
  if (m === MODOS_EJECUCION.TIEMPO_REAL) {
    payload.intervaloMs = clampIntervalo(intervaloMs);
  }
  return payload;
}

/**
 * ¿Puede avanzarse manualmente? Solo en modo MANUAL y mientras el análisis no
 * esté completado (Req. 32.2).
 * @param {string} modo
 * @param {string} estado
 * @returns {boolean}
 */
export function puedeAvanzarManual(modo, estado) {
  return (
    normalizeModo(modo) === MODOS_EJECUCION.MANUAL &&
    normalizeEstado(estado) !== ESTADOS_EJECUCION.COMPLETADO
  );
}

/**
 * ¿Puede pausarse? Solo modos AUTOMATICO/TIEMPO_REAL y estando en ejecución
 * (Req. 32.6).
 * @param {string} modo
 * @param {string} estado
 * @returns {boolean}
 */
export function puedePausar(modo, estado) {
  const m = normalizeModo(modo);
  const esModoContinuo = m === MODOS_EJECUCION.AUTOMATICO || m === MODOS_EJECUCION.TIEMPO_REAL;
  return esModoContinuo && normalizeEstado(estado) === ESTADOS_EJECUCION.EN_EJECUCION;
}

/**
 * ¿Puede reanudarse? Solo modos AUTOMATICO/TIEMPO_REAL y estando pausado
 * (Req. 32.6, 32.8).
 * @param {string} modo
 * @param {string} estado
 * @returns {boolean}
 */
export function puedeReanudar(modo, estado) {
  const m = normalizeModo(modo);
  const esModoContinuo = m === MODOS_EJECUCION.AUTOMATICO || m === MODOS_EJECUCION.TIEMPO_REAL;
  return esModoContinuo && normalizeEstado(estado) === ESTADOS_EJECUCION.PAUSADO;
}

/**
 * Normaliza un estado de ejecución crudo del backend a uno del dominio.
 * Ante un valor desconocido devuelve `DETENIDO`.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeEstado(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (Object.values(ESTADOS_EJECUCION).includes(s)) return s;
  if (s === 'EN_CURSO' || s === 'EJECUTANDO' || s === 'RUNNING') return ESTADOS_EJECUCION.EN_EJECUCION;
  if (s === 'PAUSA' || s === 'PAUSED') return ESTADOS_EJECUCION.PAUSADO;
  if (s === 'COMPLETO' || s === 'FINALIZADO' || s === 'DONE') return ESTADOS_EJECUCION.COMPLETADO;
  return ESTADOS_EJECUCION.DETENIDO;
}

// Códigos HTTP que indican "endpoint aún no disponible" en el backend en
// construcción (no implementado / no encontrado).
const CODIGOS_NO_DISPONIBLE = new Set([404, 501]);

/**
 * Determina si un error de axios corresponde a un endpoint no disponible
 * todavía o a un fallo de red (backend caído / sin desplegar).
 * @param {any} error
 * @returns {boolean}
 */
export function esNoDisponible(error) {
  const status = error?.response?.status;
  if (status != null) return CODIGOS_NO_DISPONIBLE.has(status);
  // Sin respuesta del servidor (red caída, backend no arrancado) → tolerar.
  return Boolean(error?.request) || error?.code === 'ERR_NETWORK';
}

/**
 * Ejecuta una acción de red tolerando con elegancia los endpoints aún no
 * disponibles. Devuelve `{ ok:true, data }` en éxito; `{ ok:false,
 * noDisponible:true }` cuando el endpoint no existe o la red falla; y re-lanza
 * cualquier otro error (p. ej. 401/403/422) para que la vista lo gestione.
 * @template T
 * @param {() => Promise<{data:T}>} fn
 * @returns {Promise<{ok:true,data:T}|{ok:false,noDisponible:true,error:any}>}
 */
async function ejecutarTolerante(fn) {
  try {
    const respuesta = await fn();
    return { ok: true, data: respuesta?.data ?? null };
  } catch (error) {
    if (esNoDisponible(error)) {
      return { ok: false, noDisponible: true, error };
    }
    throw error;
  }
}

/**
 * Selecciona el `Modo_Ejecucion` del análisis (Req. 32.1, 32.5).
 * @param {string} analisisId
 * @param {string} modo
 * @param {number} [intervaloMs] solo relevante en Tiempo_Real.
 */
export function seleccionarModo(analisisId, modo, intervaloMs) {
  return ejecutarTolerante(() =>
    gdsApiClient.put(`/analisis/${analisisId}/modo`, modoPayload(modo, intervaloMs))
  );
}

/**
 * Avanza exactamente una `Semana_Simulada` pendiente en modo MANUAL (Req. 32.2).
 * @param {string} analisisId
 */
export function avanzarManual(analisisId) {
  return ejecutarTolerante(() => gdsApiClient.post(`/analisis/${analisisId}/avanzar`));
}

/**
 * Pausa la ejecución AUTOMATICO/TIEMPO_REAL conservando el estado (Req. 32.6).
 * @param {string} analisisId
 */
export function pausar(analisisId) {
  return ejecutarTolerante(() => gdsApiClient.post(`/analisis/${analisisId}/pausar`));
}

/**
 * Reanuda desde la siguiente `Semana_Simulada` pendiente (Req. 32.6, 32.8).
 * @param {string} analisisId
 */
export function reanudar(analisisId) {
  return ejecutarTolerante(() => gdsApiClient.post(`/analisis/${analisisId}/reanudar`));
}

export default {
  MODOS_EJECUCION,
  MODO_META,
  ESTADOS_EJECUCION,
  INTERVALO_MIN_MS,
  INTERVALO_MAX_MS,
  INTERVALO_DEFECTO_MS,
  esModoValido,
  normalizeModo,
  clampIntervalo,
  modoPayload,
  puedeAvanzarManual,
  puedePausar,
  puedeReanudar,
  normalizeEstado,
  esNoDisponible,
  seleccionarModo,
  avanzarManual,
  pausar,
  reanudar,
};
