// Cliente de la API de trazabilidad del feature `gds` (Req. 22).
//
// La vista de trazabilidad permite recorrer la evolución completa de un
// `Analisis`: semanas/meses, resultados, publicaciones, evidencias,
// indicadores, explicaciones y reportes (Req. 22.1); mostrar la evolución
// temporal de cada dimensión del `Indice_Riesgo` por `Comunidad_Digital`
// (Req. 22.2); abrir explicación + evidencia al seleccionar un resultado o
// indicador (Req. 22.3); comparar varias `Institucion` y por `Zona_Geografica`
// (Req. 22.4, 33.5); y mostrar la trazabilidad conclusión → semana → institución
// → evidencia (Req. 22.5). Si la explicación o evidencia no carga, la vista
// muestra información parcial (Req. 22.6). Todo identificador se presenta como
// seudónimo anonimizado (Req. 23.5).
//
// Consume el backend autónomo de la Plataforma_GDS (`ServidorGDS/`) vía el
// cliente axios compartido `gdsApiClient` (`baseURL` = `${VITE_GDS_API_URL}
// /api/gds`). Los endpoints los implementa el backend en tareas posteriores;
// mientras tanto la lógica de red DEGRADA CON ELEGANCIA y la lógica pura
// (normalización, series por dimensión, comparación, meses, seudónimos) vive
// aquí para poder probarla sin red ni DOM.
import gdsApiClient from './client.js';

// Número de semanas que componen un "mes" simulado del análisis (Req. 12.1:
// hasta 24 semanas ≈ 6 meses → 4 semanas por mes).
export const SEMANAS_POR_MES = 4;

// Dimensiones por defecto del `Indice_Riesgo` (design.md, Req. 17). El backend
// puede añadir dimensiones configurables sin alterar las existentes; esta lista
// solo aporta etiqueta/color de presentación cuando está disponible.
export const DIMENSIONES_META = Object.freeze({
  estres_academico: { label: 'Estrés académico', color: '#ef4444' },
  ansiedad_colectiva: { label: 'Ansiedad colectiva', color: '#f59e0b' },
  conflicto_social: { label: 'Conflicto social', color: '#a855f7' },
  agotamiento: { label: 'Agotamiento', color: '#0ea5e9' },
  violencia_verbal: { label: 'Violencia verbal', color: '#db2777' },
  aislamiento: { label: 'Aislamiento', color: '#14b8a6' },
  desmotivacion: { label: 'Desmotivación', color: '#64748b' },
});

// Paleta de respaldo para dimensiones/instituciones sin color asignado.
const PALETA = Object.freeze([
  '#0ea5e9', '#ef4444', '#22c55e', '#a855f7', '#f59e0b',
  '#14b8a6', '#db2777', '#64748b', '#6366f1', '#84cc16',
]);

/**
 * Asigna de forma estable un color de la paleta a partir de un índice.
 * @param {number} indice
 * @returns {string}
 */
export function colorPorIndice(indice) {
  const i = Number.isFinite(indice) && indice >= 0 ? Math.trunc(indice) : 0;
  return PALETA[i % PALETA.length];
}

/**
 * Metadatos de presentación de una dimensión (etiqueta legible + color),
 * tolerando claves desconocidas (dimensiones configurables, Req. 17.5).
 * @param {string} clave
 * @param {number} [indice]
 * @returns {{label:string, color:string}}
 */
export function dimensionMeta(clave, indice = 0) {
  const k = String(clave ?? '').trim();
  const meta = DIMENSIONES_META[k];
  if (meta) return meta;
  const label = k
    ? k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Dimensión';
  return { label, color: colorPorIndice(indice) };
}

/**
 * Convierte un número de `Semana_Simulada` en su mes simulado (1-indexado).
 * Semanas 1–4 → mes 1, 5–8 → mes 2, etc. Valores inválidos caen a mes 1.
 * @param {unknown} semana
 * @returns {number}
 */
export function mesDeSemana(semana) {
  const n = Math.trunc(Number(semana));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.ceil(n / SEMANAS_POR_MES);
}

/**
 * Agrupa una lista de números de semana en sus meses simulados, preservando el
 * orden creciente y sin duplicar semanas dentro de un mes.
 * @param {Array<number>} semanas
 * @returns {Array<{mes:number, semanas:number[]}>}
 */
export function agruparSemanasPorMes(semanas) {
  const limpias = Array.from(
    new Set(
      (semanas ?? [])
        .map((s) => Math.trunc(Number(s)))
        .filter((n) => Number.isFinite(n) && n >= 1)
    )
  ).sort((a, b) => a - b);

  const porMes = new Map();
  for (const s of limpias) {
    const mes = mesDeSemana(s);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(s);
  }
  return Array.from(porMes.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([mes, sems]) => ({ mes, semanas: sems }));
}

// ----------------------------------------------------------------------------
// Seudónimos (Req. 23.5): toda vista expone seudónimos, nunca identificadores
// crudos. El backend anonimiza con SHA-256 (hex de 64). El frontend, además,
// presenta cualquier referencia de forma compacta y enmascara identificadores
// que no luzcan ya anonimizados, como defensa en profundidad.
// ----------------------------------------------------------------------------

const SHA256_HEX = /^[0-9a-f]{64}$/i;

/**
 * Indica si un valor ya tiene la forma de un seudónimo SHA-256 (hex de 64).
 * @param {unknown} valor
 * @returns {boolean}
 */
export function esSeudonimoHash(valor) {
  return typeof valor === 'string' && SHA256_HEX.test(valor.trim());
}

/**
 * Presenta un identificador como seudónimo anonimizado para la UI (Req. 23.5).
 * - Un hash SHA-256 se muestra compacto: `anon-<8 primeros>`.
 * - Un valor que ya empiece por `anon` se respeta tal cual.
 * - Cualquier otro identificador crudo se enmascara con un prefijo `anon-` y
 *   solo su porción final, evitando exponer el id completo.
 * @param {unknown} valor
 * @returns {string}
 */
export function mostrarSeudonimo(valor) {
  const s = String(valor ?? '').trim();
  if (!s) return 'anónimo';
  if (esSeudonimoHash(s)) return `anon-${s.slice(0, 8)}`;
  if (/^anon[-_:]/i.test(s)) return s;
  if (s.length <= 6) return `anon-${s}`;
  return `anon-${s.slice(-6)}`;
}

// ----------------------------------------------------------------------------
// Normalizadores (toleran snake_case y camelCase del backend aún por definir).
// ----------------------------------------------------------------------------

/**
 * Normaliza un punto de evolución de una dimensión del índice (Req. 22.2).
 * @param {any} raw
 * @returns {{dimension:string, semana:number, mes:number, valor:number, comunidadId:(string|null)}}
 */
export function normalizeEvolucionPunto(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const semana = Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || 0;
  return {
    dimension: String(o.dimension ?? o.nombre ?? o.clave ?? o.key ?? '').trim(),
    semana,
    mes: semana >= 1 ? mesDeSemana(semana) : 0,
    valor: Number(o.valor ?? o.value ?? o.score ?? 0) || 0,
    comunidadId: o.comunidadId ?? o.comunidad_id ?? null,
  };
}

/**
 * Normaliza una evidencia trazable (Req. 22.5, 30). Conserva la referencia al
 * contenido ya anonimizado y la cadena de trazabilidad (análisis/institución/
 * semana).
 * @param {any} raw
 */
export function normalizeEvidencia(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: o.id ?? o._id ?? null,
    tipo: String(o.tipo ?? o.type ?? 'dato').trim(),
    descripcion: String(o.descripcion ?? o.description ?? o.detalle ?? '').trim(),
    refContenido: o.refContenido ?? o.ref_contenido ?? o.ref ?? null,
    semana: Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || null,
    institucionId: o.institucionId ?? o.institucion_id ?? null,
    analisisId: o.analisisId ?? o.analisis_id ?? null,
    contributiva: o.contributiva ?? o.contributivo ?? o.es_contributivo ?? null,
    metrica: o.metrica ?? o.metric ?? o.valor ?? null,
  };
}

/**
 * Normaliza una explicación causal (Req. 22.3, 20).
 * @param {any} raw
 */
export function normalizeExplicacion(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const evidencias = Array.isArray(o.evidencias)
    ? o.evidencias
    : Array.isArray(o.evidence)
      ? o.evidence
      : [];
  return {
    id: o.id ?? o._id ?? null,
    dimension: String(o.dimension ?? o.nombre ?? '').trim(),
    texto: String(o.texto ?? o.explicacion ?? o.text ?? o.descripcion ?? '').trim(),
    cuando: String(o.cuando ?? o.cuandoEmpezo ?? o.cuando_empezo ?? o.inicio ?? '').trim(),
    comoEvoluciono: String(o.comoEvoluciono ?? o.como_evoluciono ?? o.evolucion ?? '').trim(),
    evidencias: evidencias.map(normalizeEvidencia),
  };
}

// Extrae una lista de distintas formas de respuesta posibles.
function extraerLista(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.resultados)) return data.resultados;
  if (Array.isArray(data.evolucion)) return data.evolucion;
  if (Array.isArray(data.puntos)) return data.puntos;
  return [];
}

// ----------------------------------------------------------------------------
// Transformaciones para gráficos (Recharts).
// ----------------------------------------------------------------------------

/**
 * Agrupa puntos de evolución en una serie por dimensión, lista para graficar
 * la evolución temporal de cada dimensión del `Indice_Riesgo` (Req. 22.2).
 * Cada serie ordena sus datos por semana creciente.
 *
 * @param {Array<object>} puntos Puntos crudos o ya normalizados.
 * @returns {Array<{dimension:string, label:string, color:string, datos:Array<{semana:number, mes:number, valor:number}>}>}
 */
export function buildSeriesPorDimension(puntos) {
  const normalizados = (puntos ?? []).map((p) =>
    'dimension' in (p ?? {}) && 'valor' in (p ?? {}) && typeof p.valor === 'number'
      ? p
      : normalizeEvolucionPunto(p)
  );

  const porDimension = new Map();
  for (const p of normalizados) {
    const clave = p.dimension || 'dimension';
    if (!porDimension.has(clave)) porDimension.set(clave, []);
    porDimension.get(clave).push({ semana: p.semana, mes: p.mes, valor: p.valor });
  }

  return Array.from(porDimension.entries()).map(([dimension, datos], i) => {
    const meta = dimensionMeta(dimension, i);
    return {
      dimension,
      label: meta.label,
      color: meta.color,
      datos: datos.sort((a, b) => a.semana - b.semana),
    };
  });
}

/**
 * Combina la evolución de una misma dimensión a través de varias instituciones
 * en filas aptas para un `LineChart` comparativo (Req. 22.4). Cada fila se
 * indexa por semana y contiene una columna `valor` por institución.
 *
 * @param {Array<{institucionId:string, institucionNombre?:string, puntos:Array<object>}>} porInstitucion
 * @param {string} dimension Dimensión a comparar.
 * @returns {{
 *   filas: Array<Record<string, number>>,
 *   series: Array<{clave:string, label:string, color:string}>,
 * }}
 */
export function combinarComparacionInstituciones(porInstitucion, dimension) {
  const dim = String(dimension ?? '').trim();
  const series = [];
  const filasPorSemana = new Map();

  (porInstitucion ?? []).forEach((inst, i) => {
    const o = inst && typeof inst === 'object' ? inst : {};
    const clave = String(o.institucionId ?? o.institucion_id ?? `inst-${i}`);
    const label = String(o.institucionNombre ?? o.institucion_nombre ?? o.nombre ?? clave);
    series.push({ clave, label, color: colorPorIndice(i) });

    const puntos = (o.puntos ?? o.evolucion ?? []).map((p) =>
      'dimension' in (p ?? {}) ? p : normalizeEvolucionPunto(p)
    );
    for (const p of puntos) {
      const punto = 'mes' in (p ?? {}) ? p : normalizeEvolucionPunto(p);
      if (dim && punto.dimension && punto.dimension !== dim) continue;
      const semana = punto.semana;
      if (!Number.isFinite(semana) || semana < 1) continue;
      if (!filasPorSemana.has(semana)) {
        filasPorSemana.set(semana, { semana, mes: mesDeSemana(semana) });
      }
      filasPorSemana.get(semana)[clave] = punto.valor;
    }
  });

  const filas = Array.from(filasPorSemana.values()).sort((a, b) => a.semana - b.semana);
  return { filas, series };
}

/**
 * Evalúa qué partes de soporte de un resultado seleccionado están disponibles,
 * para que la vista muestre información parcial cuando falte algo (Req. 22.6).
 *
 * @param {{explicacion?:object|null, evidencias?:Array|null}} soporte
 * @returns {{
 *   tieneExplicacion:boolean,
 *   tieneEvidencia:boolean,
 *   completo:boolean,
 *   faltantes:string[],
 * }}
 */
export function evaluarDisponibilidadSoporte(soporte) {
  const s = soporte && typeof soporte === 'object' ? soporte : {};
  const tieneExplicacion = Boolean(s.explicacion && String(s.explicacion.texto ?? '').trim());
  const tieneEvidencia = Array.isArray(s.evidencias) && s.evidencias.length > 0;
  const faltantes = [];
  if (!tieneExplicacion) faltantes.push('explicación');
  if (!tieneEvidencia) faltantes.push('evidencia');
  return {
    tieneExplicacion,
    tieneEvidencia,
    completo: tieneExplicacion && tieneEvidencia,
    faltantes,
  };
}

// ----------------------------------------------------------------------------
// Funciones de red (degradan con elegancia ante endpoints aún inexistentes).
// ----------------------------------------------------------------------------

/**
 * Lista las instituciones (comunidades) de un análisis, para poder comparar su
 * evolución (Req. 22.4). Devuelve `[]` ante un endpoint inexistente.
 * @param {string} analisisId
 * @returns {Promise<Array<{institucionId:string, institucionNombre:string}>>}
 */
export async function listComunidades(analisisId) {
  try {
    const { data } = await gdsApiClient.get(`/analisis/${analisisId}/comunidades`);
    return extraerLista(data).map((raw) => {
      const o = raw && typeof raw === 'object' ? raw : {};
      return {
        institucionId: String(o.institucionId ?? o.institucion_id ?? o.id ?? ''),
        institucionNombre: String(
          o.institucionNombre ?? o.institucion_nombre ?? o.nombre ?? o.institucion ?? ''
        ),
        zona: o.zona ?? o.zonaGeografica ?? o.zona_geografica ?? null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Obtiene la evolución temporal por dimensión de una comunidad (Req. 22.2).
 * Devuelve series listas para graficar; `[]` si el endpoint no existe aún.
 * @param {string} analisisId
 * @param {string} institucionId
 * @returns {Promise<ReturnType<typeof buildSeriesPorDimension>>}
 */
export async function getEvolucionDimensiones(analisisId, institucionId) {
  try {
    const { data } = await gdsApiClient.get(
      `/analisis/${analisisId}/instituciones/${institucionId}/evolucion`
    );
    return buildSeriesPorDimension(extraerLista(data));
  } catch {
    return [];
  }
}

/**
 * Obtiene los resultados semanales navegables de una comunidad (Req. 22.1).
 * @param {string} analisisId
 * @param {string} institucionId
 * @returns {Promise<Array<object>>}
 */
export async function listResultadosSemanales(analisisId, institucionId) {
  try {
    const { data } = await gdsApiClient.get(
      `/analisis/${analisisId}/instituciones/${institucionId}/resultados`
    );
    return extraerLista(data).map((raw) => {
      const o = raw && typeof raw === 'object' ? raw : {};
      const semana = Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || 0;
      return {
        semana,
        mes: semana >= 1 ? mesDeSemana(semana) : 0,
        resumen: String(o.resumen ?? o.summary ?? '').trim(),
        dimensiones: Array.isArray(o.dimensiones) ? o.dimensiones.map(normalizeEvolucionPunto) : [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * Obtiene la explicación + evidencia que sustenta un resultado/indicador
 * seleccionado (Req. 22.3, 22.5). Si una parte no carga, devuelve la otra para
 * permitir una vista parcial (Req. 22.6).
 *
 * @param {{analisisId:string, institucionId:string, semana:number, dimension?:string}} sel
 * @returns {Promise<{explicacion:(object|null), evidencias:Array<object>, parcial:boolean, faltantes:string[]}>}
 */
export async function getSoporteResultado(sel) {
  const { analisisId, institucionId, semana, dimension } = sel || {};
  const base = `/analisis/${analisisId}/instituciones/${institucionId}/semanas/${semana}`;
  const params = dimension ? { dimension } : undefined;

  let explicacion = null;
  let evidencias = [];

  // Explicación y evidencia se piden por separado para tolerar que una falle
  // sin tumbar la otra (Req. 22.6).
  const [resExpl, resEvid] = await Promise.allSettled([
    gdsApiClient.get(`${base}/explicacion`, { params }),
    gdsApiClient.get(`${base}/evidencias`, { params }),
  ]);

  if (resExpl.status === 'fulfilled') {
    const d = resExpl.value?.data;
    explicacion = normalizeExplicacion(d?.data ?? d);
  }
  if (resEvid.status === 'fulfilled') {
    evidencias = extraerLista(resEvid.value?.data).map(normalizeEvidencia);
  }

  const disponibilidad = evaluarDisponibilidadSoporte({ explicacion, evidencias });
  return {
    explicacion: disponibilidad.tieneExplicacion ? explicacion : null,
    evidencias,
    parcial: !disponibilidad.completo,
    faltantes: disponibilidad.faltantes,
  };
}

export default {
  SEMANAS_POR_MES,
  DIMENSIONES_META,
  colorPorIndice,
  dimensionMeta,
  mesDeSemana,
  agruparSemanasPorMes,
  esSeudonimoHash,
  mostrarSeudonimo,
  normalizeEvolucionPunto,
  normalizeEvidencia,
  normalizeExplicacion,
  buildSeriesPorDimension,
  combinarComparacionInstituciones,
  evaluarDisponibilidadSoporte,
  listComunidades,
  getEvolucionDimensiones,
  listResultadosSemanales,
  getSoporteResultado,
};
