// Cliente de la API de análisis del feature `gds` (Gestor_Analisis, Req. 8).
//
// Consume el backend autónomo de la Plataforma_GDS (`ServidorGDS/`) a través
// del cliente axios compartido `gdsApiClient`, cuya `baseURL` ya apunta a
// `${VITE_GDS_API_URL}/api/gds`. El endpoint `/analisis` (POST/GET) lo
// implementa el backend en tareas posteriores; mientras tanto la lógica pura
// de validación y construcción de payload vive aquí para poder probarla sin
// red ni DOM, y el listado degrada con elegancia.
import gdsApiClient from './client.js';
import { normalizeAnalisis } from './dashboard.js';

// Configuración temporal del ciclo del `Analisis` (Req. 12.1: hasta 24 semanas).
export const SEMANAS_MIN = 1;
export const SEMANAS_MAX = 24;
export const SEMANAS_DEFECTO = 24;

// Radio de análisis por defecto en metros (anclaje de la `Zona_Geografica`).
export const RADIO_ANALISIS_DEFECTO = 1000;

// Tipo de origen del `Escenario` elegido al crear el `Analisis` (Req. 8.2, 29.2):
// desde la `Biblioteca_Escenarios` (predefinido/reutilizable) o personalizado.
export const TIPO_ESCENARIO = Object.freeze({
  BIBLIOTECA: 'biblioteca',
  PERSONALIZADO: 'personalizado',
});

// Estado inicial del formulario de creación de un `Analisis`.
export const ANALISIS_ESTADO_INICIAL = Object.freeze({
  nombre: '',
  descripcion: '',
  institucionIds: [],
  radio_metros: RADIO_ANALISIS_DEFECTO,
  total_semanas: SEMANAS_DEFECTO,
  tipo_escenario: TIPO_ESCENARIO.BIBLIOTECA,
  escenario_id: '',
  escenario_texto: '',
  escenario_nombre: '',
  guardar_en_biblioteca: false,
});

/**
 * Construye el payload de creación de un `Analisis` a partir del estado del
 * formulario (Req. 8.1, 8.2, 8.3). Convierte numéricos, recorta texto y arma el
 * sub-objeto `escenario` según el tipo (biblioteca o personalizado).
 *
 * @param {object} form
 * @returns {object}
 */
export function analisisToPayload(form) {
  const f = form || {};
  const ids = Array.isArray(f.institucionIds) ? f.institucionIds.filter(Boolean) : [];
  const semanas = clampSemanas(f.total_semanas);

  const payload = {
    nombre: (f.nombre ?? '').trim(),
    institucionIds: ids,
    radioAnalisis: Number(f.radio_metros ?? RADIO_ANALISIS_DEFECTO),
    semanasTotales: semanas,
  };

  if (f.tipo_escenario === TIPO_ESCENARIO.PERSONALIZADO) {
    const texto = (f.escenario_texto ?? '').trim();
    if (texto) payload.personalizado = texto;
    payload.guardarEnBiblioteca = Boolean(f.guardar_en_biblioteca);
  } else {
    const escId = (f.escenario_id ?? '').trim();
    if (escId) payload.escenarioId = escId;
  }

  return payload;
}

/**
 * Acota el número de semanas al rango válido [SEMANAS_MIN, SEMANAS_MAX].
 * Valores no numéricos caen al valor por defecto.
 * @param {unknown} valor
 * @returns {number}
 */
export function clampSemanas(valor) {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n)) return SEMANAS_DEFECTO;
  if (n < SEMANAS_MIN) return SEMANAS_MIN;
  if (n > SEMANAS_MAX) return SEMANAS_MAX;
  return n;
}

/**
 * Valida los campos del formulario de creación de un `Analisis`.
 * Devuelve un objeto de errores por campo; vacío si es válido.
 *
 * Reglas (Req. 8.1, 8.2, 8.3, 8.4, 12.1, 29.2):
 * - `nombre` obligatorio.
 * - al menos una `Institucion` seleccionada (Req. 8.4).
 * - `radio_metros` > 0.
 * - `total_semanas` entero dentro de [1, 24].
 * - escenario: si es de biblioteca, exige `escenario_id`; si es personalizado,
 *   exige `escenario_texto` no vacío (y nombre si se desea guardar).
 *
 * @param {object} form
 * @returns {Record<string,string>}
 */
export function validarAnalisis(form) {
  const f = form || {};
  const errores = {};

  if (!f.nombre || !String(f.nombre).trim()) {
    errores.nombre = 'El nombre del análisis es obligatorio.';
  }

  const ids = Array.isArray(f.institucionIds) ? f.institucionIds.filter(Boolean) : [];
  if (ids.length === 0) {
    errores.institucionIds = 'Selecciona al menos una institución.';
  }

  const radio = Number(f.radio_metros);
  if (!Number.isFinite(radio) || radio <= 0) {
    errores.radio_metros = 'El radio de análisis debe ser mayor a 0.';
  }

  const semanas = Number(f.total_semanas);
  if (!Number.isInteger(semanas) || semanas < SEMANAS_MIN || semanas > SEMANAS_MAX) {
    errores.total_semanas = `Las semanas deben ser un entero entre ${SEMANAS_MIN} y ${SEMANAS_MAX}.`;
  }

  if (f.tipo_escenario === TIPO_ESCENARIO.PERSONALIZADO) {
    if (!f.escenario_texto || !String(f.escenario_texto).trim()) {
      errores.escenario = 'Describe el escenario personalizado.';
    } else if (f.guardar_en_biblioteca && !String(f.escenario_nombre ?? '').trim()) {
      errores.escenario_nombre = 'Indica un nombre para guardar el escenario en la biblioteca.';
    }
  } else if (!f.escenario_id) {
    errores.escenario = 'Selecciona un escenario de la biblioteca.';
  }

  return errores;
}

// Extrae una lista de análisis de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.analisis)) return data.analisis;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Lista los análisis existentes. Devuelve siempre un array; ante un error del
 * backend (endpoint aún no implementado) re-lanza para que la vista muestre un
 * estado informativo sin romperse.
 *
 * @returns {Promise<Array>}
 */
export async function listAnalisis() {
  const { data } = await gdsApiClient.get('/analisis');
  return extraerLista(data).map(normalizeAnalisis);
}

/**
 * Crea un `Analisis` (Req. 8.1). El backend persiste el análisis, fija el
 * escenario como contexto inmutable y dispara el ciclo inicial (semana 1).
 *
 * @param {object} form Estado del formulario.
 * @returns {Promise<object>}
 */
export async function createAnalisis(form) {
  const { data } = await gdsApiClient.post('/analisis', analisisToPayload(form));
  return normalizeAnalisis(data?.data ?? data);
}

export default {
  SEMANAS_MIN,
  SEMANAS_MAX,
  SEMANAS_DEFECTO,
  RADIO_ANALISIS_DEFECTO,
  TIPO_ESCENARIO,
  ANALISIS_ESTADO_INICIAL,
  analisisToPayload,
  clampSemanas,
  validarAnalisis,
  listAnalisis,
  createAnalisis,
};
