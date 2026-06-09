// Cliente de la API de reportes del feature `gds` (Req. 19.5).
//
// Consume el backend autónomo de la Plataforma_GDS (carpeta `ServidorGDS/`) a
// través del cliente axios compartido `gdsApiClient`, cuya `baseURL` ya apunta
// a `${VITE_GDS_API_URL}/api/gds`. Lista los `Reporte` por horizonte y dispara
// la exportación descargable (Req. 19.5: el reporte se entrega en un formato
// descargable conservando explicaciones y evidencias).
//
// El `Generador_Reportes` del backend se implementa en tareas posteriores; las
// funciones de red DEGRADAN CON ELEGANCIA: el listado re-lanza para que la
// vista muestre un estado informativo y la exportación detecta el caso
// "endpoint aún no disponible" para avisar sin romper la UI.
import gdsApiClient from './client.js';

// Horizontes temporales de reporte (Req. 19.1).
export const HORIZONTES = Object.freeze([
  'semanal',
  'mensual',
  'trimestral',
  'semestral',
  'final',
]);

// Metadatos de presentación por horizonte (etiqueta legible + acento de color).
export const HORIZONTE_META = Object.freeze({
  semanal: { label: 'Semanal', color: '#0ea5e9' },
  mensual: { label: 'Mensual', color: '#22c55e' },
  trimestral: { label: 'Trimestral', color: '#a855f7' },
  semestral: { label: 'Semestral', color: '#f59e0b' },
  final: { label: 'Informe final', color: '#ef4444' },
});

/**
 * Indica si un horizonte pertenece al dominio conocido (Req. 19.1).
 * @param {unknown} h
 * @returns {boolean}
 */
export function esHorizonteValido(h) {
  return HORIZONTES.includes(String(h ?? '').trim().toLowerCase());
}

/**
 * Normaliza un horizonte crudo del backend a uno del dominio conocido.
 * Tolera sinónimos comunes; ante un valor desconocido devuelve `'semanal'`.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeHorizonte(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (HORIZONTES.includes(s)) return s;
  if (s === 'semana' || s === 'weekly' || s === 'week') return 'semanal';
  if (s === 'mes' || s === 'mensualmente' || s === 'monthly' || s === 'month') return 'mensual';
  if (s === 'trimestre' || s === 'quarterly' || s === 'quarter') return 'trimestral';
  if (s === 'semestre' || s === 'biannual' || s === 'half-year') return 'semestral';
  if (s === 'informe_final' || s === 'informe-final' || s === 'global' || s === 'completo') {
    return 'final';
  }
  return 'semanal';
}

// Extrae una lista de reportes de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.reportes)) return data.reportes;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Normaliza un reporte crudo del backend a la forma que usa la UI.
 * Tolera snake_case y camelCase para no acoplarse a una forma exacta del
 * backend aún por implementar.
 *
 * @param {any} raw
 * @returns {{
 *   id: string|null,
 *   horizonte: string,
 *   titulo: string,
 *   analisisId: string|null,
 *   institucionId: string|null,
 *   institucionNombre: string,
 *   periodo: string,
 *   generadoEn: string|null,
 * }}
 */
export function normalizeReporte(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: o.id ?? o._id ?? null,
    horizonte: normalizeHorizonte(o.horizonte ?? o.horizon ?? o.tipo ?? o.nivel),
    titulo: o.titulo ?? o.nombre ?? o.title ?? 'Reporte',
    analisisId: o.analisisId ?? o.analisis_id ?? o.analisisID ?? null,
    institucionId: o.institucionId ?? o.institucion_id ?? null,
    institucionNombre: o.institucionNombre ?? o.institucion_nombre ?? o.institucion ?? '',
    periodo: String(o.periodo ?? o.rango ?? o.label ?? ''),
    generadoEn: o.generadoEn ?? o.generado_en ?? o.createdAt ?? o.created_at ?? null,
  };
}

/**
 * Agrupa una lista de reportes por horizonte, preservando el orden canónico de
 * `HORIZONTES`. Devuelve siempre todas las claves (lista vacía si no hay).
 *
 * @param {Array<{horizonte:string}>} reportes
 * @returns {Record<string, Array<object>>}
 */
export function agruparPorHorizonte(reportes) {
  const grupos = HORIZONTES.reduce((acc, h) => ({ ...acc, [h]: [] }), {});
  for (const r of reportes ?? []) {
    const h = normalizeHorizonte(r?.horizonte);
    grupos[h].push(r);
  }
  return grupos;
}

/**
 * Extrae el nombre de archivo de una cabecera `Content-Disposition`.
 * Soporta `filename="..."` y `filename*=UTF-8''...` (RFC 5987).
 *
 * @param {string|undefined|null} headerValue
 * @returns {string|null}
 */
export function nombreArchivoDesdeContentDisposition(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  // Preferir la forma extendida RFC 5987 (filename*), que admite UTF-8.
  const extendido = headerValue.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (extendido && extendido[1]) {
    const valor = extendido[1].trim().replace(/^["']|["']$/g, '');
    try {
      return decodeURIComponent(valor) || null;
    } catch {
      return valor || null;
    }
  }
  const simple = headerValue.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (simple && simple[1]) {
    return simple[1].trim() || null;
  }
  return null;
}

/**
 * Deriva un nombre de archivo de respaldo para un reporte exportado cuando el
 * backend no envía `Content-Disposition`. Resultado seguro para el sistema de
 * archivos.
 *
 * @param {{horizonte?:string, titulo?:string, id?:string|null}} reporte
 * @param {string} [extension='pdf']
 * @returns {string}
 */
export function nombreArchivoReporte(reporte, extension = 'pdf') {
  const r = reporte || {};
  const base =
    (r.titulo && String(r.titulo)) ||
    `reporte-${normalizeHorizonte(r.horizonte)}${r.id ? `-${r.id}` : ''}`;
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'reporte';
  const ext = String(extension || 'pdf').replace(/^\./, '');
  return `${slug}.${ext}`;
}

/**
 * Lista los reportes, opcionalmente filtrando por horizonte y/o análisis.
 * Devuelve siempre un array de reportes normalizados; ante un error de red o
 * endpoint inexistente re-lanza para que la vista muestre un aviso.
 *
 * @param {{horizonte?:string, analisisId?:string}} [filtros]
 * @returns {Promise<Array<object>>}
 */
export async function listReportes(filtros = {}) {
  const params = {};
  if (filtros && esHorizonteValido(filtros.horizonte)) {
    params.horizonte = normalizeHorizonte(filtros.horizonte);
  }
  if (filtros && filtros.analisisId) {
    params.analisisId = filtros.analisisId;
  }
  const { data } = await gdsApiClient.get('/reportes', { params });
  return extraerLista(data).map(normalizeReporte);
}

/**
 * Solicita la exportación descargable de un reporte (Req. 19.5).
 * Pide la respuesta como `blob` y devuelve el blob junto al nombre de archivo
 * sugerido por el backend (si lo envía). La descarga efectiva (crear el enlace
 * y disparar el click) la realiza el llamador en el navegador.
 *
 * @param {string} id
 * @returns {Promise<{ blob: Blob, filename: string|null }>}
 */
export async function exportReporte(id) {
  const respuesta = await gdsApiClient.get(`/reportes/${id}/exportar`, {
    responseType: 'blob',
  });
  const filename = nombreArchivoDesdeContentDisposition(
    respuesta?.headers?.['content-disposition']
  );
  return { blob: respuesta.data, filename };
}

export default {
  HORIZONTES,
  HORIZONTE_META,
  esHorizonteValido,
  normalizeHorizonte,
  normalizeReporte,
  agruparPorHorizonte,
  nombreArchivoDesdeContentDisposition,
  nombreArchivoReporte,
  listReportes,
  exportReporte,
};
