// Cliente de la API de escenarios reutilizables del feature `gds`
// (Biblioteca_Escenarios, Req. 29). Consume el backend autónomo de la
// Plataforma_GDS (`ServidorGDS/`) a través del cliente axios compartido
// `gdsApiClient`, cuya `baseURL` ya apunta a `${VITE_GDS_API_URL}/api/gds`.
//
// El endpoint `/escenarios` lo implementa el backend en la tarea 7.x; mientras
// tanto, el listado DEGRADA CON ELEGANCIA devolviendo un conjunto de escenarios
// predefinidos (Req. 8.2) para que el formulario de creación de análisis nunca
// quede vacío ni roto.
import gdsApiClient from './client.js';

// Escenarios predefinidos sugeridos por el dominio (Req. 8.2 y diseño 7.1).
// Sirven como respaldo cuando el backend aún no expone la biblioteca.
export const ESCENARIOS_PREDEFINIDOS = Object.freeze([
  {
    id: 'pred:guerra-del-gas',
    nombre: 'Guerra del Gas',
    descripcion: 'Crisis sociopolítica con protestas y conflicto social.',
    categoria: 'crisis sociopolítica',
    es_predefinido: true,
  },
  {
    id: 'pred:conflicto-universitario',
    nombre: 'Conflicto Universitario',
    descripcion: 'Conflictos estudiantiles y tensiones internas en la universidad.',
    categoria: 'conflicto universitario',
    es_predefinido: true,
  },
  {
    id: 'pred:periodo-electoral',
    nombre: 'Periodo Electoral',
    descripcion: 'Campaña y elecciones con alta polarización.',
    categoria: 'periodo electoral',
    es_predefinido: true,
  },
  {
    id: 'pred:pandemia',
    nombre: 'Pandemia',
    descripcion: 'Emergencia sanitaria con cuarentenas y clases virtuales.',
    categoria: 'pandemia',
    es_predefinido: true,
  },
  {
    id: 'pred:conflictos-estudiantiles',
    nombre: 'Conflictos Estudiantiles',
    descripcion: 'Tensiones y disputas entre grupos estudiantiles.',
    categoria: 'conflictos estudiantiles',
    es_predefinido: true,
  },
  {
    id: 'pred:protestas',
    nombre: 'Protestas',
    descripcion: 'Movilizaciones y bloqueos en el entorno de la comunidad.',
    categoria: 'protestas',
    es_predefinido: true,
  },
  {
    id: 'pred:transporte',
    nombre: 'Problemas de Transporte',
    descripcion: 'Paros del transporte y dificultades de movilidad.',
    categoria: 'transporte',
    es_predefinido: true,
  },
  {
    id: 'pred:inseguridad',
    nombre: 'Inseguridad',
    descripcion: 'Percepción de inseguridad y hechos delictivos en la zona.',
    categoria: 'inseguridad',
    es_predefinido: true,
  },
]);

/**
 * Normaliza un escenario crudo del backend a la forma que usa la UI.
 * Tolera snake_case y camelCase y distintos nombres de campo.
 * @param {any} raw
 * @returns {{
 *   id: string|null,
 *   nombre: string,
 *   descripcion: string,
 *   categoria: string,
 *   version: number|null,
 *   es_predefinido: boolean,
 * }}
 */
export function normalizeEscenario(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    id: o.id ?? o._id ?? null,
    nombre: o.nombre ?? o.name ?? '',
    descripcion: o.descripcion ?? o.description ?? '',
    categoria: o.categoria ?? o.category ?? '',
    version: num(o.version ?? o.version_actual ?? o.versionActual),
    es_predefinido: Boolean(o.es_predefinido ?? o.esPredefinido ?? o.predefinido ?? false),
  };
}

// Extrae una lista de escenarios de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.escenarios)) return data.escenarios;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Lista los escenarios de la `Biblioteca_Escenarios`.
 *
 * DEGRADA CON ELEGANCIA: si el endpoint aún no está disponible (404 / error de
 * red), devuelve los `ESCENARIOS_PREDEFINIDOS` para que la UI siga siendo
 * utilizable. Devuelve un objeto con la lista y un flag `disponible` que indica
 * si los datos provienen realmente del backend.
 *
 * @returns {Promise<{ escenarios: Array, disponible: boolean }>}
 */
export async function listEscenarios() {
  try {
    const { data } = await gdsApiClient.get('/escenarios');
    const lista = extraerLista(data).map(normalizeEscenario);
    if (lista.length === 0) {
      return { escenarios: ESCENARIOS_PREDEFINIDOS.map(normalizeEscenario), disponible: true };
    }
    return { escenarios: lista, disponible: true };
  } catch {
    return { escenarios: ESCENARIOS_PREDEFINIDOS.map(normalizeEscenario), disponible: false };
  }
}

export default {
  ESCENARIOS_PREDEFINIDOS,
  normalizeEscenario,
  listEscenarios,
};
