// Cliente HTTP tipado de la API de Instituciones de la Plataforma_GDS (Req. 7).
//
// Consume el backend autónomo (`ServidorGDS/`, tarea 20.1) a través del cliente
// axios compartido `gdsApiClient`, cuya `baseURL` apunta a
// `${VITE_GDS_API_URL}/api/gds`. Expone:
//   - el contrato de tipos (`Institucion`, `CategoriaInstitucion`),
//   - el esquema de validación del formulario con **Zod** (`institucionSchema`),
//   - utilidades puras (`normalizeInstitucion`, `institucionToPayload`) probables
//     sin red ni DOM,
//   - y las funciones CRUD (`listInstituciones`, `createInstitucion`,
//     `updateInstitucion`, `deleteInstitucion`).
//
// Esta variante TypeScript reemplaza al cliente JS heredado (`instituciones.js`)
// dentro de la migración del feature `gds` a TS + Shadcn/UI.
import { z } from 'zod';
import gdsApiClient from './client.js';

/** Categorías admitidas para una `Institucion` (Req. 7.2). */
export const CATEGORIAS_INSTITUCION = [
    'universidad',
    'colegio',
    'instituto',
    'escuela',
] as const;

/** Tipo de la categoría de una institución. */
export type CategoriaInstitucion = (typeof CATEGORIAS_INSTITUCION)[number];

/** Centro por defecto del mapa (La Paz, Bolivia). */
export const MAPA_CENTRO_DEFECTO: readonly [number, number] = [-16.5, -68.15];

/** Radio de influencia (en metros) por defecto y límites del control. */
export const RADIO_METROS_DEFECTO = 500;
export const RADIO_METROS_MIN = 50;
export const RADIO_METROS_MAX = 5000;

/** Institución educativa tal como la consume la UI (Req. 7.1, 7.2). */
export interface Institucion {
    id: string | null;
    nombre: string;
    categoria: CategoriaInstitucion | '';
    latitud: number | null;
    longitud: number | null;
    radio_metros: number;
    logo_url: string;
    descripcion: string;
}

/**
 * Esquema **Zod** del formulario de institución (validación con React Hook Form).
 * La ubicación es obligatoria (debe fijarse en el mapa) y el radio debe ser > 0
 * (Req. 7.1, 7.3, 7.7).
 */
export const institucionSchema = z.object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
    categoria: z.enum(CATEGORIAS_INSTITUCION, {
        message: 'Selecciona una categoría válida.',
    }),
    // La ubicación es obligatoria: el `refine` a nivel de campo se evalúa de
    // forma independiente de los demás campos, de modo que el error aparece
    // aunque el resto del formulario también sea inválido.
    latitud: z
        .number()
        .nullable()
        .refine((v) => v !== null, { message: 'Selecciona la ubicación en el mapa.' }),
    longitud: z
        .number()
        .nullable()
        .refine((v) => v !== null, { message: 'Selecciona la ubicación en el mapa.' }),
    radio_metros: z
        .number({ message: 'El radio de influencia debe ser mayor a 0.' })
        .positive('El radio de influencia debe ser mayor a 0.'),
    logo_url: z
        .string()
        .trim()
        .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), {
            message: 'La URL del logo debe comenzar con http(s)://',
        })
        .optional()
        .default(''),
    descripcion: z.string().trim().optional().default(''),
});

/** Valores del formulario derivados del esquema Zod. */
export type InstitucionFormValues = z.input<typeof institucionSchema>;
/** Valores del formulario ya validados/normalizados por Zod. */
export type InstitucionFormParsed = z.output<typeof institucionSchema>;

/** Payload que se envía al backend (snake_case, sin campos vacíos opcionales). */
export interface InstitucionPayload {
    nombre: string;
    categoria: string;
    latitud: number | null;
    longitud: number | null;
    radio_metros: number;
    descripcion: string;
    logo_url?: string;
}

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza una institución cruda del backend a la forma que usa la UI,
 * tolerando convenciones snake_case y camelCase para no acoplarse a una forma
 * exacta del backend.
 */
export function normalizeInstitucion(raw: unknown): Institucion {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const radio = Number(obj.radio_metros ?? obj.radioMetros ?? RADIO_METROS_DEFECTO);
    return {
        id: (obj.id ?? obj._id ?? null) as string | null,
        nombre: (obj.nombre as string) ?? '',
        categoria: ((obj.categoria as CategoriaInstitucion) ?? '') as CategoriaInstitucion | '',
        latitud: toNumberOrNull(obj.latitud ?? obj.lat),
        longitud: toNumberOrNull(obj.longitud ?? obj.lng ?? obj.lon),
        radio_metros: Number.isFinite(radio) ? radio : RADIO_METROS_DEFECTO,
        logo_url: (obj.logo_url as string) ?? (obj.logoUrl as string) ?? '',
        descripcion: (obj.descripcion as string) ?? '',
    };
}

/**
 * Construye el payload que se envía al backend a partir de los valores del
 * formulario, convirtiendo numéricos y omitiendo el logo vacío.
 */
export function institucionToPayload(form: InstitucionFormValues): InstitucionPayload {
    const payload: InstitucionPayload = {
        nombre: (form.nombre ?? '').trim(),
        categoria: form.categoria ?? '',
        latitud: toNumberOrNull(form.latitud),
        longitud: toNumberOrNull(form.longitud),
        radio_metros: Number(form.radio_metros ?? RADIO_METROS_DEFECTO),
        descripcion: (form.descripcion ?? '').trim(),
    };
    const logo = (form.logo_url ?? '').trim();
    if (logo) payload.logo_url = logo;
    return payload;
}

/** Extrae una lista de instituciones de distintas formas de respuesta posibles. */
function extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.instituciones)) return obj.instituciones;
    }
    return [];
}

function extraerObjeto(data: unknown): unknown {
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (obj.data && typeof obj.data === 'object') return obj.data;
    }
    return data;
}

/** Lista todas las instituciones registradas (Req. 7.4). */
export async function listInstituciones(): Promise<Institucion[]> {
    const { data } = await gdsApiClient.get('/instituciones');
    return extraerLista(data).map(normalizeInstitucion);
}

/** Crea una institución (Req. 7.1). */
export async function createInstitucion(form: InstitucionFormValues): Promise<Institucion> {
    const { data } = await gdsApiClient.post('/instituciones', institucionToPayload(form));
    return normalizeInstitucion(extraerObjeto(data));
}

/** Actualiza una institución existente (Req. 7.5). */
export async function updateInstitucion(
    id: string,
    form: InstitucionFormValues,
): Promise<Institucion> {
    const { data } = await gdsApiClient.put(`/instituciones/${id}`, institucionToPayload(form));
    return normalizeInstitucion(extraerObjeto(data));
}

/**
 * Elimina una institución. El backend puede rechazar la eliminación si está
 * referenciada por un análisis (Req. 7.6); ese error se propaga a la vista.
 */
export async function deleteInstitucion(id: string): Promise<void> {
    await gdsApiClient.delete(`/instituciones/${id}`);
}
