// Cliente de la API de instituciones del feature `gds`.
//
// Consume el backend autónomo de la Plataforma_GDS (carpeta `ServidorGDS/`) a
// través del cliente axios compartido `gdsApiClient`, cuya `baseURL` ya apunta
// a `${VITE_GDS_API_URL}/api/gds`. Estos endpoints (`/instituciones`) los
// implementa el backend en la tarea 21.x; mientras tanto, las funciones del
// listado degradan de forma controlada para que la UI nunca quede rota.
import gdsApiClient from './client.js';

// Categorías admitidas para una `Institucion` (Req. 7.2).
export const CATEGORIAS_INSTITUCION = Object.freeze([
  'universidad',
  'colegio',
  'instituto',
  'escuela',
]);

// Centro por defecto del mapa (La Paz, Bolivia) y radio inicial sugerido.
export const MAPA_CENTRO_DEFECTO = Object.freeze([-16.5, -68.15]);
export const RADIO_METROS_DEFECTO = 500;

/**
 * Normaliza una institución cruda del backend a la forma que usa la UI.
 * Tolera distintas convenciones de nombres (snake_case y camelCase) para no
 * acoplarse a una forma exacta del backend aún por implementar.
 *
 * @param {any} raw
 * @returns {{
 *   id: string|null,
 *   nombre: string,
 *   categoria: string,
 *   latitud: number|null,
 *   longitud: number|null,
 *   radio_metros: number,
 *   logo_url: string,
 *   descripcion: string,
 * }}
 */
export function normalizeInstitucion(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    id: obj.id ?? obj._id ?? null,
    nombre: obj.nombre ?? '',
    categoria: obj.categoria ?? '',
    latitud: num(obj.latitud ?? obj.lat),
    longitud: num(obj.longitud ?? obj.lng ?? obj.lon),
    radio_metros: Number(obj.radio_metros ?? obj.radioMetros ?? RADIO_METROS_DEFECTO),
    logo_url: obj.logo_url ?? obj.logoUrl ?? '',
    descripcion: obj.descripcion ?? '',
  };
}

/**
 * Construye el payload que se envía al backend a partir del estado del
 * formulario, convirtiendo los campos numéricos y omitiendo cadenas vacías
 * opcionales.
 *
 * @param {object} form
 * @returns {object}
 */
export function institucionToPayload(form) {
  const f = form || {};
  const payload = {
    nombre: (f.nombre ?? '').trim(),
    categoria: f.categoria ?? '',
    latitud: f.latitud === null || f.latitud === '' ? null : Number(f.latitud),
    longitud: f.longitud === null || f.longitud === '' ? null : Number(f.longitud),
    radioMetros: Number(f.radio_metros ?? f.radioMetros ?? RADIO_METROS_DEFECTO),
    descripcion: (f.descripcion ?? '').trim(),
  };
  const logo = (f.logo_url ?? f.logoUrl ?? '').trim();
  if (logo) payload.logoUrl = logo;
  return payload;
}

/**
 * Valida los campos mínimos de una institución antes de enviarla.
 * Devuelve un objeto de errores por campo; vacío si es válida (Req. 7.1, 7.3).
 *
 * @param {object} form
 * @returns {Record<string,string>}
 */
export function validarInstitucion(form) {
  const f = form || {};
  const errores = {};
  if (!f.nombre || !String(f.nombre).trim()) {
    errores.nombre = 'El nombre es obligatorio.';
  }
  if (!CATEGORIAS_INSTITUCION.includes(f.categoria)) {
    errores.categoria = 'Selecciona una categoría válida.';
  }
  if (f.latitud === null || f.latitud === '' || f.longitud === null || f.longitud === '') {
    errores.ubicacion = 'Selecciona la ubicación en el mapa.';
  }
  const radio = Number(f.radio_metros);
  if (!Number.isFinite(radio) || radio <= 0) {
    errores.radio_metros = 'El radio de influencia debe ser mayor a 0.';
  }
  return errores;
}

// Extrae una lista de instituciones de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.instituciones)) return data.instituciones;
  return [];
}

/**
 * Lista las instituciones. Devuelve siempre un array; ante un error del backend
 * (p. ej. endpoint aún no implementado) re-lanza para que la vista muestre un
 * estado informativo sin romperse.
 *
 * @returns {Promise<Array>}
 */
export async function listInstituciones() {
  const { data } = await gdsApiClient.get('/instituciones');
  return extraerLista(data).map(normalizeInstitucion);
}

/**
 * Crea una institución.
 * @param {object} form Estado del formulario.
 * @returns {Promise<object>}
 */
export async function createInstitucion(form) {
  const { data } = await gdsApiClient.post('/instituciones', institucionToPayload(form));
  return normalizeInstitucion(data?.data ?? data);
}

/**
 * Actualiza una institución existente (Req. 7.5).
 * @param {string} id
 * @param {object} form
 * @returns {Promise<object>}
 */
export async function updateInstitucion(id, form) {
  const { data } = await gdsApiClient.put(`/instituciones/${id}`, institucionToPayload(form));
  return normalizeInstitucion(data?.data ?? data);
}

/**
 * Elimina una institución. El backend puede rechazar la eliminación si está
 * referenciada por un análisis (Req. 7.6); ese error se propaga a la vista.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteInstitucion(id) {
  await gdsApiClient.delete(`/instituciones/${id}`);
}

export default {
  CATEGORIAS_INSTITUCION,
  listInstituciones,
  createInstitucion,
  updateInstitucion,
  deleteInstitucion,
  normalizeInstitucion,
  institucionToPayload,
  validarInstitucion,
};
