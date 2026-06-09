// Cliente HTTP tipado de la API de creación de análisis de la Plataforma_GDS
// (Gestor_Analisis, Req. 8). Variante TypeScript que acompaña la migración del
// feature `gds` a TS + Shadcn/UI; convive con el cliente JS heredado
// (`analisis.js`), aún consumido por la trazabilidad.
//
// Expone:
//   - el contrato de tipos del formulario (`AnalisisFormValues`),
//   - el esquema de validación con **Zod** (`analisisSchema`) que cubre el
//     número de instituciones, el rango temporal (1..24) y la elección de
//     escenario (biblioteca vs. personalizado, con guardado opcional),
//   - utilidades puras (`clampSemanas`, `analisisToPayload`, `normalizeAnalisis`)
//     probables sin red ni DOM,
//   - y las funciones de red (`listAnalisis`, `createAnalisis`) contra el
//     backend autónomo (`VITE_GDS_API_URL`).
import { z } from 'zod';
import gdsApiClient from './client.js';

/** Configuración temporal del ciclo del `Analisis` (Req. 12.1: hasta 24 semanas). */
export const SEMANAS_MIN = 1;
export const SEMANAS_MAX = 24;
export const SEMANAS_DEFECTO = 24;

/** Radio de análisis (anclaje de la `Zona_Geografica`) por defecto y límites. */
export const RADIO_ANALISIS_DEFECTO = 1000;
export const RADIO_ANALISIS_MIN = 100;
export const RADIO_ANALISIS_MAX = 10000;
export const RADIO_ANALISIS_PASO = 100;

/**
 * Origen del `Escenario` elegido al crear el `Analisis` (Req. 8.2, 29.2): desde
 * la `Biblioteca_Escenarios` (predefinido/reutilizable) o personalizado.
 */
export const TIPO_ESCENARIO = {
    BIBLIOTECA: 'biblioteca',
    PERSONALIZADO: 'personalizado',
} as const;

/** Tipo del origen del escenario. */
export type TipoEscenario = (typeof TIPO_ESCENARIO)[keyof typeof TIPO_ESCENARIO];

/**
 * Acota el número de semanas al rango válido [SEMANAS_MIN, SEMANAS_MAX].
 * Valores no numéricos caen al valor por defecto.
 */
export function clampSemanas(valor: unknown): number {
    const n = Math.trunc(Number(valor));
    if (!Number.isFinite(n)) return SEMANAS_DEFECTO;
    if (n < SEMANAS_MIN) return SEMANAS_MIN;
    if (n > SEMANAS_MAX) return SEMANAS_MAX;
    return n;
}

/**
 * Esquema **Zod** del formulario de creación de un `Analisis`
 * (React Hook Form + Zod). Reglas (Req. 8.1–8.4, 12.1, 29.2, 29.3):
 *  - `nombre` obligatorio;
 *  - al menos una `Institucion` seleccionada (Req. 8.4);
 *  - `radio_metros` > 0;
 *  - `total_semanas` entero dentro de [1, 24] (Req. 12.1);
 *  - escenario de biblioteca exige `escenario_id`; personalizado exige
 *    `escenario_texto` (y `escenario_nombre` si se desea guardar).
 */
export const analisisSchema = z
    .object({
        nombre: z.string().trim().min(1, 'El nombre del análisis es obligatorio.'),
        descripcion: z.string().trim().optional().default(''),
        institucionIds: z
            .array(z.string().min(1))
            .min(1, 'Selecciona al menos una institución.'),
        radio_metros: z
            .number({ message: 'El radio de análisis debe ser mayor a 0.' })
            .positive('El radio de análisis debe ser mayor a 0.'),
        total_semanas: z
            .number({ message: `Las semanas deben ser un entero entre ${SEMANAS_MIN} y ${SEMANAS_MAX}.` })
            .int(`Las semanas deben ser un entero entre ${SEMANAS_MIN} y ${SEMANAS_MAX}.`)
            .min(SEMANAS_MIN, `Las semanas deben ser un entero entre ${SEMANAS_MIN} y ${SEMANAS_MAX}.`)
            .max(SEMANAS_MAX, `Las semanas deben ser un entero entre ${SEMANAS_MIN} y ${SEMANAS_MAX}.`),
        tipo_escenario: z
            .enum([TIPO_ESCENARIO.BIBLIOTECA, TIPO_ESCENARIO.PERSONALIZADO])
            .default(TIPO_ESCENARIO.BIBLIOTECA),
        escenario_id: z.string().optional().default(''),
        escenario_texto: z.string().optional().default(''),
        escenario_nombre: z.string().optional().default(''),
        guardar_en_biblioteca: z.boolean().optional().default(false),
    })
    .superRefine((val, ctx) => {
        if (val.tipo_escenario === TIPO_ESCENARIO.PERSONALIZADO) {
            if (!val.escenario_texto || !val.escenario_texto.trim()) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['escenario_texto'],
                    message: 'Describe el escenario personalizado.',
                });
            } else if (val.guardar_en_biblioteca && !(val.escenario_nombre ?? '').trim()) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['escenario_nombre'],
                    message: 'Indica un nombre para guardar el escenario en la biblioteca.',
                });
            }
        } else if (!val.escenario_id) {
            ctx.addIssue({
                code: 'custom',
                path: ['escenario_id'],
                message: 'Selecciona un escenario de la biblioteca.',
            });
        }
    });

/** Valores del formulario derivados del esquema Zod (entrada de RHF). */
export type AnalisisFormValues = z.input<typeof analisisSchema>;
/** Valores del formulario ya validados/normalizados por Zod. */
export type AnalisisFormParsed = z.output<typeof analisisSchema>;

/** Sub-objeto `escenario` del payload de creación (biblioteca o personalizado). */
export type EscenarioPayload =
    | { tipo: typeof TIPO_ESCENARIO.BIBLIOTECA; escenario_id: string }
    | {
        tipo: typeof TIPO_ESCENARIO.PERSONALIZADO;
        texto: string;
        guardar_en_biblioteca: boolean;
        nombre?: string;
    };

/** Payload que se envía al backend para crear un `Analisis` (Req. 8.1). */
export interface AnalisisPayload {
    nombre: string;
    descripcion: string;
    institucion_ids: string[];
    radio_metros: number;
    total_semanas: number;
    escenario: EscenarioPayload;
}

/** `Analisis` normalizado tal como lo consume la UI tras crearlo. */
export interface Analisis {
    id: string | null;
    nombre: string;
    descripcion: string;
    estado: string;
    total_semanas: number | null;
    instituciones: number;
}

/**
 * Construye el payload de creación a partir de los valores del formulario
 * (Req. 8.1, 8.2, 8.3, 29.2, 29.3). Convierte numéricos, recorta texto y arma
 * el sub-objeto `escenario` según el tipo elegido.
 */
export function analisisToPayload(form: AnalisisFormValues): AnalisisPayload {
    const ids = Array.isArray(form.institucionIds)
        ? form.institucionIds.filter((id): id is string => Boolean(id))
        : [];

    const payload: AnalisisPayload = {
        nombre: (form.nombre ?? '').trim(),
        descripcion: (form.descripcion ?? '').trim(),
        institucion_ids: ids,
        radio_metros: Number(form.radio_metros ?? RADIO_ANALISIS_DEFECTO),
        total_semanas: clampSemanas(form.total_semanas),
        escenario:
            form.tipo_escenario === TIPO_ESCENARIO.PERSONALIZADO
                ? {
                    tipo: TIPO_ESCENARIO.PERSONALIZADO,
                    texto: (form.escenario_texto ?? '').trim(),
                    guardar_en_biblioteca: Boolean(form.guardar_en_biblioteca),
                }
                : {
                    tipo: TIPO_ESCENARIO.BIBLIOTECA,
                    escenario_id: form.escenario_id ?? '',
                },
    };

    if (payload.escenario.tipo === TIPO_ESCENARIO.PERSONALIZADO) {
        const nombre = (form.escenario_nombre ?? '').trim();
        if (nombre) payload.escenario.nombre = nombre;
    }

    return payload;
}

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Normaliza un `Analisis` crudo del backend tolerando snake_case/camelCase. */
export function normalizeAnalisis(raw: unknown): Analisis {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const instituciones =
        (Array.isArray(o.instituciones) ? o.instituciones.length : undefined) ??
        toNumberOrNull(o.total_instituciones ?? o.totalInstituciones) ??
        0;
    return {
        id: (o.id ?? o._id ?? null) as string | null,
        nombre: (o.nombre as string) ?? (o.name as string) ?? '',
        descripcion: (o.descripcion as string) ?? (o.description as string) ?? '',
        estado: (o.estado as string) ?? (o.status as string) ?? 'PENDIENTE',
        total_semanas: toNumberOrNull(o.total_semanas ?? o.totalSemanas),
        instituciones,
    };
}

function extraerObjeto(data: unknown): unknown {
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (obj.data && typeof obj.data === 'object') return obj.data;
    }
    return data;
}

function extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.analisis)) return obj.analisis;
        if (Array.isArray(obj.items)) return obj.items;
    }
    return [];
}

/** Lista los análisis existentes; re-lanza ante error para que la vista informe. */
export async function listAnalisis(): Promise<Analisis[]> {
    const { data } = await gdsApiClient.get('/analisis');
    return extraerLista(data).map(normalizeAnalisis);
}

/**
 * Crea un `Analisis` (Req. 8.1). El backend persiste el análisis, fija el
 * escenario como contexto inmutable (Req. 8.6, 29.4) y dispara el ciclo inicial
 * (semana 1) por cada `Institucion` seleccionada (Req. 8.5).
 */
export async function createAnalisis(form: AnalisisFormValues): Promise<Analisis> {
    const { data } = await gdsApiClient.post('/analisis', analisisToPayload(form));
    return normalizeAnalisis(extraerObjeto(data));
}
