// Cliente HTTP tipado de la API de Reportes de la Plataforma_GDS (Req. 19).
//
// Consume el backend autónomo (`ServidorGDS/`, módulo `reports`, tareas 23.1 y
// 23.2) a través del cliente axios compartido `gdsApiClient`, cuya `baseURL`
// apunta a `${VITE_GDS_API_URL}/api/gds`. Expone:
//   - el contrato de tipos (`Reporte`, `HorizonteReporte`, `FormatoExportacion`),
//   - utilidades puras (`normalizeReporte`, `agruparPorHorizonte`,
//     `nombreArchivoReporte`, `nombreArchivoDesdeContentDisposition`) probables
//     sin red ni DOM,
//   - y las funciones de red:
//       · `listReportesAnalisis(analisisId)`  → GET  /analisis/:id/reportes
//       · `generarReporte(analisisId, body)`  → POST /analisis/:id/reportes
//       · `getReporte(id)`                    → GET  /reportes/:id
//       · `exportReporte(id, formato)`        → GET  /reportes/:id/export/(pdf|excel)
//
// Esta variante TypeScript reemplaza al cliente JS heredado (`reportes.js`)
// dentro de la migración del feature `gds` a TS + Shadcn/UI + TanStack Query.
import gdsApiClient from './client.js';

/** Horizontes temporales de reporte (Req. 19.1). */
export const HORIZONTES = [
    'semanal',
    'mensual',
    'trimestral',
    'semestral',
    'final',
] as const;

/** Tipo del horizonte temporal de un `Reporte`. */
export type HorizonteReporte = (typeof HORIZONTES)[number];

/** Formatos de exportación descargable soportados (Req. 19.5, tarea 23.2). */
export const FORMATOS_EXPORTACION = ['pdf', 'excel'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

/** Metadatos de presentación por horizonte (etiqueta legible + acento de color). */
export const HORIZONTE_META: Record<HorizonteReporte, { label: string; color: string }> = {
    semanal: { label: 'Semanal', color: '#0ea5e9' },
    mensual: { label: 'Mensual', color: '#22c55e' },
    trimestral: { label: 'Trimestral', color: '#a855f7' },
    semestral: { label: 'Semestral', color: '#f59e0b' },
    final: { label: 'Informe final', color: '#ef4444' },
};

/** Extensión de archivo asociada a cada formato de exportación. */
export const EXTENSION_FORMATO: Record<FormatoExportacion, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
};

/** Reporte tal como lo consume la UI (Req. 19.1, 19.4). */
export interface Reporte {
    id: string | null;
    horizonte: HorizonteReporte;
    titulo: string;
    analisisId: string | null;
    institucionId: string | null;
    institucionNombre: string;
    periodo: string;
    generadoEn: string | null;
}

/** Cuerpo de la solicitud de generación de un reporte (Req. 19.3, 19.4). */
export interface GenerarReporteBody {
    horizonte: HorizonteReporte;
    /** Institución específica; si se omite, el reporte cubre todo el análisis. */
    institucionId?: string;
}

/** Indica si un horizonte pertenece al dominio conocido (Req. 19.1). */
export function esHorizonteValido(h: unknown): h is HorizonteReporte {
    return (HORIZONTES as readonly string[]).includes(String(h ?? '').trim().toLowerCase());
}

/**
 * Normaliza un horizonte crudo del backend a uno del dominio conocido.
 * Tolera sinónimos comunes; ante un valor desconocido devuelve `'semanal'`.
 */
export function normalizeHorizonte(raw: unknown): HorizonteReporte {
    const s = String(raw ?? '').trim().toLowerCase();
    if ((HORIZONTES as readonly string[]).includes(s)) return s as HorizonteReporte;
    if (s === 'semana' || s === 'weekly' || s === 'week') return 'semanal';
    if (s === 'mes' || s === 'mensualmente' || s === 'monthly' || s === 'month') return 'mensual';
    if (s === 'trimestre' || s === 'quarterly' || s === 'quarter') return 'trimestral';
    if (s === 'semestre' || s === 'biannual' || s === 'half-year') return 'semestral';
    if (s === 'informe_final' || s === 'informe-final' || s === 'global' || s === 'completo') {
        return 'final';
    }
    return 'semanal';
}

/** Normaliza el formato de exportación; ante un valor desconocido cae a `pdf`. */
export function normalizeFormato(raw: unknown): FormatoExportacion {
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'excel' || s === 'xlsx' || s === 'xls') return 'excel';
    return 'pdf';
}

/** Extrae una lista de reportes de distintas formas de respuesta posibles. */
function extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.reportes)) return obj.reportes;
        if (Array.isArray(obj.items)) return obj.items;
    }
    return [];
}

/** Desenvuelve `{ data: {...} }` cuando el backend envuelve el recurso. */
function extraerObjeto(data: unknown): unknown {
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) return obj.data;
    }
    return data;
}

/**
 * Normaliza un reporte crudo del backend a la forma que usa la UI, tolerando
 * snake_case y camelCase para no acoplarse a una forma exacta del backend.
 */
export function normalizeReporte(raw: unknown): Reporte {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        id: (o.id ?? o._id ?? null) as string | null,
        horizonte: normalizeHorizonte(o.horizonte ?? o.horizon ?? o.tipo ?? o.nivel),
        titulo: (o.titulo ?? o.nombre ?? o.title ?? 'Reporte') as string,
        analisisId: (o.analisisId ?? o.analisis_id ?? o.analisisID ?? null) as string | null,
        institucionId: (o.institucionId ?? o.institucion_id ?? null) as string | null,
        institucionNombre: (o.institucionNombre ??
            o.institucion_nombre ??
            o.institucion ??
            '') as string,
        periodo: String(o.periodo ?? o.rango ?? o.label ?? ''),
        generadoEn: (o.generadoEn ??
            o.generado_en ??
            o.createdAt ??
            o.created_at ??
            null) as string | null,
    };
}

/**
 * Agrupa una lista de reportes por horizonte, preservando el orden canónico de
 * `HORIZONTES`. Devuelve siempre todas las claves (lista vacía si no hay).
 */
export function agruparPorHorizonte(
    reportes: ReadonlyArray<{ horizonte?: unknown }> | null | undefined,
): Record<HorizonteReporte, Reporte[]> {
    const grupos = HORIZONTES.reduce(
        (acc, h) => ({ ...acc, [h]: [] as Reporte[] }),
        {} as Record<HorizonteReporte, Reporte[]>,
    );
    for (const r of reportes ?? []) {
        const h = normalizeHorizonte(r?.horizonte);
        grupos[h].push(r as Reporte);
    }
    return grupos;
}

/**
 * Extrae el nombre de archivo de una cabecera `Content-Disposition`.
 * Soporta `filename="..."` y `filename*=UTF-8''...` (RFC 5987).
 */
export function nombreArchivoDesdeContentDisposition(
    headerValue: string | null | undefined,
): string | null {
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
 * archivos, con la extensión correspondiente al formato.
 */
export function nombreArchivoReporte(
    reporte: Partial<Reporte> | null | undefined,
    formato: FormatoExportacion = 'pdf',
): string {
    const r = reporte ?? {};
    const base =
        (r.titulo && String(r.titulo)) ||
        `reporte-${normalizeHorizonte(r.horizonte)}${r.id ? `-${r.id}` : ''}`;
    const slug =
        base
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase()
            .slice(0, 80) || 'reporte';
    const ext = EXTENSION_FORMATO[normalizeFormato(formato)];
    return `${slug}.${ext}`;
}

/**
 * Lista los reportes asociados a un `Analisis` (Req. 19.4).
 * GET /analisis/:id/reportes. Devuelve siempre un array de reportes
 * normalizados; ante un error de red o endpoint inexistente re-lanza para que
 * la vista muestre un aviso.
 */
export async function listReportesAnalisis(
    analisisId: string,
    filtros: { horizonte?: HorizonteReporte } = {},
): Promise<Reporte[]> {
    const params: Record<string, string> = {};
    if (esHorizonteValido(filtros.horizonte)) {
        params.horizonte = normalizeHorizonte(filtros.horizonte);
    }
    const { data } = await gdsApiClient.get(`/analisis/${analisisId}/reportes`, { params });
    return extraerLista(data).map(normalizeReporte);
}

/**
 * Genera (solicita la creación de) un reporte de un horizonte para un análisis
 * (Req. 19.3, 19.4). POST /analisis/:id/reportes.
 */
export async function generarReporte(
    analisisId: string,
    body: GenerarReporteBody,
): Promise<Reporte> {
    const payload: Record<string, unknown> = {
        horizonte: normalizeHorizonte(body.horizonte),
    };
    if (body.institucionId) payload.institucionId = body.institucionId;
    const { data } = await gdsApiClient.post(`/analisis/${analisisId}/reportes`, payload);
    return normalizeReporte(extraerObjeto(data));
}

/** Obtiene un reporte por id (Req. 19.2). GET /reportes/:id. */
export async function getReporte(id: string): Promise<Reporte> {
    const { data } = await gdsApiClient.get(`/reportes/${id}`);
    return normalizeReporte(extraerObjeto(data));
}

/**
 * Solicita la exportación descargable de un reporte en el formato indicado
 * (Req. 19.5). GET /reportes/:id/export/(pdf|excel). Pide la respuesta como
 * `blob` y devuelve el blob junto al nombre de archivo sugerido por el backend
 * (si lo envía). La descarga efectiva (crear el enlace y disparar el click) la
 * realiza el llamador en el navegador.
 */
export async function exportReporte(
    id: string,
    formato: FormatoExportacion = 'pdf',
): Promise<{ blob: Blob; filename: string | null }> {
    const fmt = normalizeFormato(formato);
    const respuesta = await gdsApiClient.get(`/reportes/${id}/export/${fmt}`, {
        responseType: 'blob',
    });
    const headers = (respuesta?.headers ?? {}) as Record<string, string>;
    const filename = nombreArchivoDesdeContentDisposition(headers['content-disposition']);
    return { blob: respuesta.data as Blob, filename };
}
