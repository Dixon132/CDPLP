// Cliente de la API del panel principal del feature `gds`.
//
// Provee los datos de la pantalla principal (Req. 21.1, 21.3, 21.5):
// indicadores globales, históricos, resumen de análisis y estados de ejecución.
// Estos endpoints los implementa el backend autónomo (`ServidorGDS/`) en tareas
// posteriores (21.x/24.x). Mientras tanto, TODAS las funciones DEGRADAN CON
// ELEGANCIA: ante un endpoint inexistente o un error de red devuelven una forma
// vacía pero válida, de modo que la UI nunca quede rota.
import gdsApiClient from './client.js';

// Estados de ejecución posibles de un `Analisis`/ciclo (D. EstadoCiclo + UI).
// Incluye `EN_ACELERACION` como matiz de UI del avance por salto temporal.
export const ESTADOS_EJECUCION = Object.freeze([
  'PENDIENTE',
  'EN_PROCESO',
  'EN_ACELERACION',
  'COMPLETADO',
  'FALLIDO',
]);

// Metadatos de presentación por estado (etiqueta legible + color de acento).
export const ESTADO_META = Object.freeze({
  PENDIENTE: { label: 'Pendiente', color: '#94a3b8' },
  EN_PROCESO: { label: 'En curso', color: '#0ea5e9' },
  EN_ACELERACION: { label: 'En aceleración', color: '#a855f7' },
  COMPLETADO: { label: 'Completado', color: '#22c55e' },
  FALLIDO: { label: 'Fallido', color: '#ef4444' },
});

/**
 * Normaliza un estado crudo del backend a uno del dominio conocido.
 * Mapea los `Estado_Ejecucion` del backend (DETENIDO/EN_EJECUCION/PAUSADO/
 * COMPLETADO) a los estados de presentación del panel.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeEstado(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  if (ESTADOS_EJECUCION.includes(s)) return s;
  if (s === 'EN_EJECUCION' || s === 'EN_CURSO' || s === 'RUNNING' || s === 'IN_PROGRESS') return 'EN_PROCESO';
  if (s === 'ACELERANDO' || s === 'ACCELERATING') return 'EN_ACELERACION';
  if (s === 'DONE' || s === 'FINISHED') return 'COMPLETADO';
  if (s === 'ERROR' || s === 'FAILED') return 'FALLIDO';
  if (s === 'PAUSADO' || s === 'PAUSED') return 'EN_ACELERACION';
  // DETENIDO (listo para avanzar) se muestra como Pendiente.
  return 'PENDIENTE';
}

// Extrae una lista de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.analisis)) return data.analisis;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Normaliza un análisis crudo a la forma que usa la pantalla principal.
 * @param {any} raw
 */
export function normalizeAnalisis(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    id: o.id ?? o._id ?? null,
    nombre: o.nombre ?? o.titulo ?? 'Análisis',
    estado: normalizeEstado(o.estado ?? o.status),
    semanaActual: num(o.semanaActual ?? o.semana_actual ?? o.numeroSemana ?? o.numero_semana),
    totalSemanas: num(o.totalSemanas ?? o.total_semanas ?? o.semanas),
    instituciones: Number(o.instituciones ?? o.totalInstituciones ?? o.total_instituciones ?? 0),
    escenario: o.escenario ?? o.escenario_nombre ?? '',
    actualizadoEn: o.actualizadoEn ?? o.actualizado_en ?? o.updatedAt ?? null,
  };
}

/**
 * Normaliza un punto de indicador global a `{ nombre, valor }`.
 * @param {any} raw
 */
export function normalizeIndicador(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    nombre: o.nombre ?? o.dimension ?? o.label ?? o.name ?? 'Indicador',
    valor: Number(o.valor ?? o.value ?? o.score ?? 0) || 0,
  };
}

/**
 * Normaliza un punto histórico a `{ periodo, valor }`.
 * @param {any} raw
 */
export function normalizeHistorico(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    periodo: String(o.periodo ?? o.semana ?? o.fecha ?? o.label ?? ''),
    valor: Number(o.valor ?? o.value ?? o.score ?? 0) || 0,
  };
}

/**
 * Construye un resumen de conteos por estado a partir de la lista de análisis.
 * @param {Array<{estado:string}>} analisis
 * @returns {Record<string, number>}
 */
export function resumirEstados(analisis) {
  const base = ESTADOS_EJECUCION.reduce((acc, e) => ({ ...acc, [e]: 0 }), {});
  for (const a of analisis ?? []) {
    const e = normalizeEstado(a?.estado);
    base[e] = (base[e] ?? 0) + 1;
  }
  return base;
}

/**
 * Obtiene el resumen del panel principal (Req. 21.1).
 * Intenta un endpoint agregado y, si no existe, cae a peticiones por recurso.
 * Devuelve SIEMPRE una forma válida y un flag `disponible` por sección.
 *
 * @returns {Promise<{
 *   indicadores: Array<{nombre:string, valor:number}>,
 *   historicos: Array<{periodo:string, valor:number}>,
 *   analisis: Array<object>,
 *   disponible: { indicadores: boolean, historicos: boolean, analisis: boolean },
 * }>}
 */
export async function getResumenPanel() {
  const resultado = {
    indicadores: [],
    historicos: [],
    analisis: [],
    disponible: { indicadores: false, historicos: false, analisis: false },
  };

  // 1. Intento de endpoint agregado del panel.
  try {
    const { data } = await gdsApiClient.get('/dashboard/resumen');
    const d = data?.data ?? data ?? {};
    if (Array.isArray(d.indicadores)) {
      resultado.indicadores = d.indicadores.map(normalizeIndicador);
      resultado.disponible.indicadores = true;
    }
    if (Array.isArray(d.historicos)) {
      resultado.historicos = d.historicos.map(normalizeHistorico);
      resultado.disponible.historicos = true;
    }
    if (Array.isArray(d.analisis)) {
      resultado.analisis = d.analisis.map(normalizeAnalisis);
      resultado.disponible.analisis = true;
    }
    if (resultado.disponible.indicadores || resultado.disponible.analisis) {
      return resultado;
    }
  } catch {
    // Endpoint agregado no disponible aún → intentar por recurso.
  }

  // 2. Análisis (estados de ejecución, Req. 21.3).
  try {
    const { data } = await gdsApiClient.get('/analisis');
    resultado.analisis = extraerLista(data).map(normalizeAnalisis);
    resultado.disponible.analisis = true;
  } catch {
    resultado.disponible.analisis = false;
  }

  // 3. Indicadores globales (Req. 21.5).
  try {
    const { data } = await gdsApiClient.get('/indicadores/globales');
    const lista = Array.isArray(data) ? data : (data?.data ?? data?.indicadores ?? []);
    resultado.indicadores = (Array.isArray(lista) ? lista : []).map(normalizeIndicador);
    resultado.disponible.indicadores = true;
  } catch {
    resultado.disponible.indicadores = false;
  }

  // 4. Históricos.
  try {
    const { data } = await gdsApiClient.get('/indicadores/historicos');
    const lista = Array.isArray(data) ? data : (data?.data ?? data?.historicos ?? []);
    resultado.historicos = (Array.isArray(lista) ? lista : []).map(normalizeHistorico);
    resultado.disponible.historicos = true;
  } catch {
    resultado.disponible.historicos = false;
  }

  return resultado;
}

export default {
  ESTADOS_EJECUCION,
  ESTADO_META,
  normalizeEstado,
  normalizeAnalisis,
  normalizeIndicador,
  normalizeHistorico,
  resumirEstados,
  getResumenPanel,
};
