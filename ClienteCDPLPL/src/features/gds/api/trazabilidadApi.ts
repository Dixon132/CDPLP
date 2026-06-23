// Cliente HTTP tipado de la API de Trazabilidad de la Plataforma_GDS (Req. 22, 33.5).
//
// La vista de trazabilidad permite recorrer la evolución completa de un
// `Analisis`: semanas/meses y resultados navegables (Req. 22.1); la evolución
// temporal de cada dimensión del `Indice_Riesgo` por `Comunidad_Digital`
// (Req. 22.2); abrir la explicación + evidencia que sustenta un resultado o
// indicador (Req. 22.3); comparar la evolución de varias `Institucion` y por
// `Zona_Geografica` con mapas (Req. 22.4, 33.5); y la cadena de trazabilidad
// conclusión → semana → institución → evidencia (Req. 22.5). Si la explicación
// o la evidencia no carga, la vista muestra información parcial (Req. 22.6).
// Todo identificador se presenta como seudónimo anonimizado (Req. 23.5).
//
// Consume el backend autónomo (`ServidorGDS/`, módulos `audit`/`analysis`) a
// través del cliente axios compartido `gdsApiClient`, cuya `baseURL` apunta a
// `${VITE_GDS_API_URL}/api/gds`. Esta variante TypeScript reemplaza al cliente
// JS heredado (`trazabilidad.js`) dentro de la migración del feature `gds` a
// TS + Shadcn/UI + TanStack Query. La lógica pura (normalización, series por
// dimensión, comparación por institución/zona, meses, seudónimos) vive aquí
// para poder probarla sin red ni DOM y la lógica de red DEGRADA CON ELEGANCIA.
import gdsApiClient from './client.js';
import type { MetricaSemanaContenido } from './reportesApi';
export type { MetricaSemanaContenido } from './reportesApi';

// Número de semanas que componen un "mes" simulado del análisis (Req. 12.1:
// hasta 24 semanas ≈ 6 meses → 4 semanas por mes).
export const SEMANAS_POR_MES = 4;

/** Metadatos de presentación de una dimensión del `Indice_Riesgo`. */
export interface DimensionMeta {
    label: string;
    color: string;
}

// Dimensiones por defecto del `Indice_Riesgo` (design.md, Req. 17). El backend
// puede añadir dimensiones configurables sin alterar las existentes; esta lista
// solo aporta etiqueta/color de presentación cuando está disponible.
export const DIMENSIONES_META: Readonly<Record<string, DimensionMeta>> = Object.freeze({
    estres_academico: { label: 'Estrés académico', color: '#ef4444' },
    ansiedad_colectiva: { label: 'Ansiedad colectiva', color: '#f59e0b' },
    conflicto_social: { label: 'Conflicto social', color: '#a855f7' },
    agotamiento: { label: 'Agotamiento', color: '#0ea5e9' },
    violencia_verbal: { label: 'Violencia verbal', color: '#db2777' },
    aislamiento: { label: 'Aislamiento', color: '#14b8a6' },
    desmotivacion: { label: 'Desmotivación', color: '#64748b' },
});

// Paleta de respaldo para dimensiones/instituciones sin color asignado.
const PALETA: readonly string[] = Object.freeze([
    '#0ea5e9', '#ef4444', '#22c55e', '#a855f7', '#f59e0b',
    '#14b8a6', '#db2777', '#64748b', '#6366f1', '#84cc16',
]);

/** Asigna de forma estable un color de la paleta a partir de un índice. */
export function colorPorIndice(indice: number): string {
    const i = Number.isFinite(indice) && indice >= 0 ? Math.trunc(indice) : 0;
    return PALETA[i % PALETA.length];
}

/**
 * Metadatos de presentación de una dimensión (etiqueta legible + color),
 * tolerando claves desconocidas (dimensiones configurables, Req. 17.5).
 */
export function dimensionMeta(clave: unknown, indice = 0): DimensionMeta {
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
 */
export function mesDeSemana(semana: unknown): number {
    const n = Math.trunc(Number(semana));
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.ceil(n / SEMANAS_POR_MES);
}

/** Mes simulado de una semana, o 0 si la semana no es válida (≥ 1). */
function mesDeSemanaOpcional(semana: number): number {
    return semana >= 1 ? mesDeSemana(semana) : 0;
}

/**
 * Agrupa una lista de números de semana en sus meses simulados, preservando el
 * orden creciente y sin duplicar semanas dentro de un mes.
 */
export function agruparSemanasPorMes(
    semanas: ReadonlyArray<number> | null | undefined,
): Array<{ mes: number; semanas: number[] }> {
    const limpias = Array.from(
        new Set(
            (semanas ?? [])
                .map((s) => Math.trunc(Number(s)))
                .filter((n) => Number.isFinite(n) && n >= 1),
        ),
    ).sort((a, b) => a - b);

    const porMes = new Map<number, number[]>();
    for (const s of limpias) {
        const mes = mesDeSemana(s);
        if (!porMes.has(mes)) porMes.set(mes, []);
        porMes.get(mes)!.push(s);
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

/** Indica si un valor ya tiene la forma de un seudónimo SHA-256 (hex de 64). */
export function esSeudonimoHash(valor: unknown): boolean {
    return typeof valor === 'string' && SHA256_HEX.test(valor.trim());
}

/**
 * Presenta un identificador como seudónimo anonimizado para la UI (Req. 23.5).
 * - Un hash SHA-256 se muestra compacto: `anon-<8 primeros>`.
 * - Un valor que ya empiece por `anon` se respeta tal cual.
 * - Cualquier otro identificador crudo se enmascara con un prefijo `anon-` y
 *   solo su porción final, evitando exponer el id completo.
 */
export function mostrarSeudonimo(valor: unknown): string {
    const s = String(valor ?? '').trim();
    if (!s) return 'anónimo';
    if (esSeudonimoHash(s)) return `anon-${s.slice(0, 8)}`;
    if (/^anon[-_:]/i.test(s)) return s;
    if (s.length <= 6) return `anon-${s}`;
    return `anon-${s.slice(-6)}`;
}

// ----------------------------------------------------------------------------
// Tipos del dominio de trazabilidad.
// ----------------------------------------------------------------------------

/** Punto de evolución de una dimensión del índice en una semana (Req. 22.2). */
export interface EvolucionPunto {
    dimension: string;
    semana: number;
    mes: number;
    valor: number;
    comunidadId: string | null;
}

/** Serie de una dimensión lista para graficar su evolución (Req. 22.2). */
export interface SerieDimension {
    dimension: string;
    label: string;
    color: string;
    datos: Array<{ semana: number; mes: number; valor: number }>;
}

/** Evidencia trazable que respalda una conclusión (Req. 22.5, 30). */
export interface Evidencia {
    id: string | null;
    tipo: string;
    descripcion: string;
    refContenido: string | null;
    semana: number | null;
    institucionId: string | null;
    analisisId: string | null;
    contributiva: boolean | null;
    metrica: number | string | null;
}

/** Explicación causal en lenguaje natural (Req. 22.3, 20). */
export interface Explicacion {
    id: string | null;
    dimension: string;
    texto: string;
    cuando: string;
    comoEvoluciono: string;
    evidencias: Evidencia[];
}

/** `Zona_Geografica` de una comunidad para comparación y mapas (Req. 33). */
export interface ZonaGeografica {
    nombre: string;
    latitud: number | null;
    longitud: number | null;
    radioMetros: number | null;
}

/** Comunidad (institución) de un análisis (Req. 22.4). */
export interface Comunidad {
    institucionId: string;
    institucionNombre: string;
    zona: ZonaGeografica | null;
}

/** Resultado semanal navegable de una comunidad (Req. 22.1). */
export interface ResultadoSemanal {
    semana: number;
    mes: number;
    resumen: string;
    dimensiones: EvolucionPunto[];
}

/** Selección de un resultado/indicador a explicar (Req. 22.3). */
export interface Seleccion {
    analisisId: string;
    institucionId: string;
    semana: number;
    dimension?: string;
}

/** Soporte (explicación + evidencia) de un resultado, con vista parcial (Req. 22.6). */
export interface SoporteResultado {
    explicacion: Explicacion | null;
    evidencias: Evidencia[];
    parcial: boolean;
    faltantes: string[];
}

/** Disponibilidad de las partes del soporte de un resultado (Req. 22.6). */
export interface DisponibilidadSoporte {
    tieneExplicacion: boolean;
    tieneEvidencia: boolean;
    completo: boolean;
    faltantes: string[];
}

/** Filas + series para un `LineChart` comparativo por institución (Req. 22.4). */
export interface ComparacionInstituciones {
    filas: Array<Record<string, number>>;
    series: Array<{ clave: string; label: string; color: string }>;
}

/** Punto de comparación por zona con datos para el mapa (Req. 33.5). */
export interface ComparacionZonaPunto {
    institucionId: string;
    institucionNombre: string;
    zonaNombre: string;
    latitud: number | null;
    longitud: number | null;
    radioMetros: number | null;
    tieneCoordenadas: boolean;
    valorUltimo: number | null;
    valorPromedio: number | null;
    valorMaximo: number | null;
    color: string;
}

// ----------------------------------------------------------------------------
// Normalizadores (toleran snake_case y camelCase del backend).
// ----------------------------------------------------------------------------

function asObjeto(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function aNumeroOpcional(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Normaliza un punto de evolución de una dimensión del índice (Req. 22.2). */
export function normalizeEvolucionPunto(raw: unknown): EvolucionPunto {
    const o = asObjeto(raw);
    const semana = Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || 0;
    return {
        dimension: String(o.dimension ?? o.nombre ?? o.clave ?? o.key ?? '').trim(),
        semana,
        mes: mesDeSemanaOpcional(semana),
        valor: Number(o.valor ?? o.value ?? o.score ?? 0) || 0,
        comunidadId: (o.comunidadId ?? o.comunidad_id ?? null) as string | null,
    };
}

/** Normaliza una `Zona_Geografica` cruda del backend (Req. 33). */
export function normalizeZona(raw: unknown): ZonaGeografica | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = asObjeto(raw);
    return {
        nombre: String(o.nombre ?? o.name ?? o.zona ?? '').trim(),
        latitud: aNumeroOpcional(o.latitud ?? o.lat),
        longitud: aNumeroOpcional(o.longitud ?? o.lng ?? o.lon),
        radioMetros: aNumeroOpcional(o.radioMetros ?? o.radio_metros ?? o.radio),
    };
}

/** Normaliza una comunidad (institución) del análisis (Req. 22.4). */
export function normalizeComunidad(raw: unknown): Comunidad {
    const o = asObjeto(raw);
    const zonaCruda =
        o.zona ?? o.zonaGeografica ?? o.zona_geografica ?? null;
    let zona = normalizeZona(zonaCruda);
    // Si el backend no envía un objeto `zona` pero sí coordenadas sueltas,
    // intentamos reconstruir la zona desde la propia institución.
    if (!zona) {
        const lat = aNumeroOpcional(o.latitud ?? o.lat);
        const lng = aNumeroOpcional(o.longitud ?? o.lng ?? o.lon);
        const radio = aNumeroOpcional(o.radioMetros ?? o.radio_metros ?? o.radio);
        if (lat !== null || lng !== null) {
            zona = { nombre: '', latitud: lat, longitud: lng, radioMetros: radio };
        }
    }
    return {
        institucionId: String(o.institucionId ?? o.institucion_id ?? o.id ?? ''),
        institucionNombre: String(
            o.institucionNombre ?? o.institucion_nombre ?? o.nombre ?? o.institucion ?? '',
        ),
        zona,
    };
}

/** Normaliza una evidencia trazable (Req. 22.5, 30). */
export function normalizeEvidencia(raw: unknown): Evidencia {
    const o = asObjeto(raw);
    return {
        id: (o.id ?? o._id ?? null) as string | null,
        tipo: String(o.tipo ?? o.type ?? 'dato').trim(),
        descripcion: String(o.descripcion ?? o.description ?? o.detalle ?? '').trim(),
        refContenido: (o.refContenido ?? o.ref_contenido ?? o.ref ?? null) as string | null,
        semana: Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || null,
        institucionId: (o.institucionId ?? o.institucion_id ?? null) as string | null,
        analisisId: (o.analisisId ?? o.analisis_id ?? null) as string | null,
        contributiva: (o.contributiva ?? o.contributivo ?? o.es_contributivo ?? null) as
            | boolean
            | null,
        metrica: (o.metrica ?? o.metric ?? o.valor ?? null) as number | string | null,
    };
}

/** Normaliza una explicación causal y sus evidencias (Req. 22.3, 20). */
export function normalizeExplicacion(raw: unknown): Explicacion {
    const o = asObjeto(raw);
    const evidencias = Array.isArray(o.evidencias)
        ? o.evidencias
        : Array.isArray(o.evidence)
            ? o.evidence
            : [];
    return {
        id: (o.id ?? o._id ?? null) as string | null,
        dimension: String(o.dimension ?? o.nombre ?? '').trim(),
        texto: String(o.texto ?? o.explicacion ?? o.text ?? o.descripcion ?? '').trim(),
        cuando: String(o.cuando ?? o.cuandoEmpezo ?? o.cuando_empezo ?? o.inicio ?? '').trim(),
        comoEvoluciono: String(
            o.comoEvoluciono ?? o.como_evoluciono ?? o.evolucion ?? '',
        ).trim(),
        evidencias: (evidencias as unknown[]).map(normalizeEvidencia),
    };
}

/** Extrae una lista de distintas formas de respuesta posibles. */
function extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.resultados)) return o.resultados;
    if (Array.isArray(o.evolucion)) return o.evolucion;
    if (Array.isArray(o.puntos)) return o.puntos;
    if (Array.isArray(o.comunidades)) return o.comunidades;
    return [];
}

// ----------------------------------------------------------------------------
// Transformaciones para gráficos (Recharts) y mapas (Leaflet).
// ----------------------------------------------------------------------------

function esEvolucionPunto(p: unknown): p is EvolucionPunto {
    return (
        !!p &&
        typeof p === 'object' &&
        'dimension' in p &&
        'valor' in p &&
        typeof (p as { valor: unknown }).valor === 'number' &&
        'mes' in p
    );
}

/**
 * Agrupa puntos de evolución en una serie por dimensión, lista para graficar
 * la evolución temporal de cada dimensión del `Indice_Riesgo` (Req. 22.2).
 * Cada serie ordena sus datos por semana creciente.
 */
export function buildSeriesPorDimension(
    puntos: ReadonlyArray<unknown> | null | undefined,
): SerieDimension[] {
    const normalizados = (puntos ?? []).map((p) =>
        esEvolucionPunto(p) ? p : normalizeEvolucionPunto(p),
    );

    const porDimension = new Map<string, Array<{ semana: number; mes: number; valor: number }>>();
    for (const p of normalizados) {
        const clave = p.dimension || 'dimension';
        if (!porDimension.has(clave)) porDimension.set(clave, []);
        porDimension.get(clave)!.push({ semana: p.semana, mes: p.mes, valor: p.valor });
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

/** Entrada de comparación: la evolución de una institución y su zona. */
export interface EntradaComparacion {
    institucionId?: string;
    institucionNombre?: string;
    zona?: ZonaGeografica | null;
    puntos: ReadonlyArray<unknown>;
}

/**
 * Combina la evolución de una misma dimensión a través de varias instituciones
 * en filas aptas para un `LineChart` comparativo (Req. 22.4). Cada fila se
 * indexa por semana y contiene una columna `valor` por institución.
 */
export function combinarComparacionInstituciones(
    porInstitucion: ReadonlyArray<EntradaComparacion> | null | undefined,
    dimension: string,
): ComparacionInstituciones {
    const dim = String(dimension ?? '').trim();
    const series: ComparacionInstituciones['series'] = [];
    const filasPorSemana = new Map<number, Record<string, number>>();

    (porInstitucion ?? []).forEach((inst, i) => {
        const o = (inst ?? {}) as EntradaComparacion;
        const clave = String(o.institucionId ?? `inst-${i}`);
        const label = String(o.institucionNombre ?? clave);
        series.push({ clave, label, color: colorPorIndice(i) });

        const puntos = (o.puntos ?? []).map((p) =>
            esEvolucionPunto(p) ? p : normalizeEvolucionPunto(p),
        );
        for (const punto of puntos) {
            if (dim && punto.dimension && punto.dimension !== dim) continue;
            const semana = punto.semana;
            if (!Number.isFinite(semana) || semana < 1) continue;
            if (!filasPorSemana.has(semana)) {
                filasPorSemana.set(semana, { semana, mes: mesDeSemana(semana) });
            }
            filasPorSemana.get(semana)![clave] = punto.valor;
        }
    });

    const filas = Array.from(filasPorSemana.values()).sort((a, b) => a.semana - b.semana);
    return { filas, series };
}

function promedio(valores: number[]): number | null {
    if (valores.length === 0) return null;
    const suma = valores.reduce((acc, v) => acc + v, 0);
    return suma / valores.length;
}

/**
 * Resume la evolución de una dimensión por `Zona_Geografica`, devolviendo, por
 * institución, su último valor, promedio y máximo junto con las coordenadas de
 * su zona para anclar el resultado en un mapa (Req. 33.4, 33.5). Permite
 * comparar patrones por zona entre las distintas comunidades de un análisis.
 */
export function combinarComparacionPorZona(
    porInstitucion: ReadonlyArray<EntradaComparacion> | null | undefined,
    dimension: string,
): ComparacionZonaPunto[] {
    const dim = String(dimension ?? '').trim();
    return (porInstitucion ?? []).map((inst, i) => {
        const o = (inst ?? {}) as EntradaComparacion;
        const zona = o.zona ?? null;
        const puntos = (o.puntos ?? [])
            .map((p) => (esEvolucionPunto(p) ? p : normalizeEvolucionPunto(p)))
            .filter((p) => (dim ? p.dimension === dim : true) && p.semana >= 1)
            .sort((a, b) => a.semana - b.semana);
        const valores = puntos.map((p) => p.valor);
        const latitud = zona?.latitud ?? null;
        const longitud = zona?.longitud ?? null;
        return {
            institucionId: String(o.institucionId ?? `inst-${i}`),
            institucionNombre: String(o.institucionNombre ?? mostrarSeudonimo(o.institucionId)),
            zonaNombre: zona?.nombre ?? '',
            latitud,
            longitud,
            radioMetros: zona?.radioMetros ?? null,
            tieneCoordenadas: latitud !== null && longitud !== null,
            valorUltimo: valores.length > 0 ? valores[valores.length - 1] : null,
            valorPromedio: promedio(valores),
            valorMaximo: valores.length > 0 ? Math.max(...valores) : null,
            color: colorPorIndice(i),
        };
    });
}

/**
 * Evalúa qué partes de soporte de un resultado seleccionado están disponibles,
 * para que la vista muestre información parcial cuando falte algo (Req. 22.6).
 */
export function evaluarDisponibilidadSoporte(soporte: {
    explicacion?: Explicacion | null;
    evidencias?: Evidencia[] | null;
}): DisponibilidadSoporte {
    const s = soporte ?? {};
    const tieneExplicacion = Boolean(s.explicacion && String(s.explicacion.texto ?? '').trim());
    const tieneEvidencia = Array.isArray(s.evidencias) && s.evidencias.length > 0;
    const faltantes: string[] = [];
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
 * Lista las comunidades (instituciones) de un análisis, con su zona, para
 * comparar su evolución y ubicarlas en el mapa (Req. 22.4, 33.5). Devuelve `[]`
 * ante un endpoint inexistente o error de red.
 */
export async function listComunidades(analisisId: string): Promise<Comunidad[]> {
    try {
        const { data } = await gdsApiClient.get(`/analisis/${analisisId}/comunidades`);
        return extraerLista(data).map(normalizeComunidad);
    } catch {
        return [];
    }
}

/**
 * Obtiene la evolución temporal por dimensión de una comunidad (Req. 22.2).
 * Devuelve series listas para graficar; `[]` si el endpoint no existe aún.
 */
export async function getEvolucionDimensiones(
    analisisId: string,
    institucionId: string,
): Promise<SerieDimension[]> {
    try {
        const { data } = await gdsApiClient.get(
            `/analisis/${analisisId}/instituciones/${institucionId}/evolucion`,
        );
        return buildSeriesPorDimension(extraerLista(data));
    } catch {
        return [];
    }
}

/**
 * Obtiene la evolución por dimensión ya aplanada en puntos (para alimentar las
 * comparaciones por institución/zona, Req. 22.4, 33.5). Degrada a `[]`.
 */
export async function getEvolucionPuntos(
    analisisId: string,
    institucionId: string,
): Promise<EvolucionPunto[]> {
    const series = await getEvolucionDimensiones(analisisId, institucionId);
    return series.flatMap((s) =>
        s.datos.map((d) => ({
            dimension: s.dimension,
            semana: d.semana,
            mes: d.mes,
            valor: d.valor,
            comunidadId: institucionId,
        })),
    );
}

/** Obtiene los resultados semanales navegables de una comunidad (Req. 22.1). */
export async function listResultadosSemanales(
    analisisId: string,
    institucionId: string,
): Promise<ResultadoSemanal[]> {
    try {
        const { data } = await gdsApiClient.get(
            `/analisis/${analisisId}/instituciones/${institucionId}/resultados`,
        );
        return extraerLista(data).map((raw) => {
            const o = asObjeto(raw);
            const semana = Math.trunc(Number(o.semana ?? o.numeroSemana ?? o.numero_semana ?? 0)) || 0;
            return {
                semana,
                mes: mesDeSemanaOpcional(semana),
                resumen: String(o.resumen ?? o.summary ?? '').trim(),
                dimensiones: Array.isArray(o.dimensiones)
                    ? (o.dimensiones as unknown[]).map(normalizeEvolucionPunto)
                    : [],
            };
        });
    } catch {
        return [];
    }
}

/**
 * Obtiene la cronología de contenido por semana de una institución: cuántas
 * publicaciones se generaron y se tomaron en cuenta, aportes de post/
 * comentarios/imagen y hashtags más concurrentes. Degrada a `[]`.
 */
export async function getCronologia(
    analisisId: string,
    institucionId: string,
): Promise<MetricaSemanaContenido[]> {
    try {
        const { data } = await gdsApiClient.get(
            `/analisis/${analisisId}/instituciones/${institucionId}/cronologia`,
        );
        const num = (v: unknown): number => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };
        return extraerLista(data).map((raw): MetricaSemanaContenido => {
            const o = asObjeto(raw);
            return {
                numeroSemana: num(o.numeroSemana),
                totalItems: num(o.totalItems),
                contributivos: num(o.contributivos),
                noContributivos: num(o.noContributivos),
                aportePost: num(o.aportePost),
                aporteComentarios: num(o.aporteComentarios),
                aporteImagen: num(o.aporteImagen),
                hashtags: Array.isArray(o.hashtags)
                    ? (o.hashtags as Record<string, unknown>[]).map((h) => ({
                        tag: String(h.tag ?? ''),
                        conteo: num(h.conteo),
                    }))
                    : [],
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
 */
export async function getSoporteResultado(sel: Seleccion): Promise<SoporteResultado> {
    const { analisisId, institucionId, semana, dimension } = sel ?? ({} as Seleccion);
    const base = `/analisis/${analisisId}/instituciones/${institucionId}/semanas/${semana}`;
    const params = dimension ? { dimension } : undefined;

    let explicacion: Explicacion | null = null;
    let evidencias: Evidencia[] = [];

    // Explicación y evidencia se piden por separado para tolerar que una falle
    // sin tumbar la otra (Req. 22.6).
    const [resExpl, resEvid] = await Promise.allSettled([
        gdsApiClient.get(`${base}/explicacion`, { params }),
        gdsApiClient.get(`${base}/evidencias`, { params }),
    ]);

    if (resExpl.status === 'fulfilled') {
        const d = resExpl.value?.data;
        const cuerpo = d && typeof d === 'object' && 'data' in d ? (d as { data: unknown }).data : d;
        explicacion = normalizeExplicacion(cuerpo);
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
