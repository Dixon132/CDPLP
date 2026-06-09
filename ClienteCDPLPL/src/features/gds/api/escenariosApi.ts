// Cliente HTTP tipado de la API de escenarios reutilizables de la Plataforma_GDS
// (Biblioteca_Escenarios, Req. 29). Variante TypeScript que reemplaza al cliente
// JS heredado (`escenarios.js`) dentro de la migración del feature `gds` a
// TS + Shadcn/UI.
//
// Consume el backend autónomo (`ServidorGDS/`, tareas 21.1/21.2) a través del
// cliente axios compartido `gdsApiClient`, cuya `baseURL` apunta a
// `${VITE_GDS_API_URL}/api/gds`. El listado DEGRADA CON ELEGANCIA: si el
// endpoint `/escenarios` aún no está disponible (404 / error de red), devuelve
// un conjunto de escenarios predefinidos (Req. 8.2) para que el formulario de
// creación de análisis nunca quede vacío ni roto.
import gdsApiClient from './client.js';

/** Escenario reutilizable tal como lo consume la UI (Req. 29.1, 29.6). */
export interface Escenario {
    id: string | null;
    nombre: string;
    descripcion: string;
    categoria: string;
    version: number | null;
    es_predefinido: boolean;
}

/** Resultado del listado de la `Biblioteca_Escenarios`. */
export interface EscenariosResultado {
    /** Escenarios disponibles (del backend o predefinidos de respaldo). */
    escenarios: Escenario[];
    /** `true` si los datos provienen realmente del backend. */
    disponible: boolean;
}

/**
 * Escenarios predefinidos sugeridos por el dominio (Req. 8.2 y diseño 7.1).
 * Sirven como respaldo cuando el backend aún no expone la biblioteca.
 */
export const ESCENARIOS_PREDEFINIDOS: readonly Escenario[] = Object.freeze([
    {
        id: 'pred:guerra-del-gas',
        nombre: 'Guerra del Gas',
        descripcion: 'Crisis sociopolítica con protestas y conflicto social.',
        categoria: 'crisis sociopolítica',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:conflicto-universitario',
        nombre: 'Conflicto Universitario',
        descripcion: 'Conflictos estudiantiles y tensiones internas en la universidad.',
        categoria: 'conflicto universitario',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:periodo-electoral',
        nombre: 'Periodo Electoral',
        descripcion: 'Campaña y elecciones con alta polarización.',
        categoria: 'periodo electoral',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:pandemia',
        nombre: 'Pandemia',
        descripcion: 'Emergencia sanitaria con cuarentenas y clases virtuales.',
        categoria: 'pandemia',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:conflictos-estudiantiles',
        nombre: 'Conflictos Estudiantiles',
        descripcion: 'Tensiones y disputas entre grupos estudiantiles.',
        categoria: 'conflictos estudiantiles',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:protestas',
        nombre: 'Protestas',
        descripcion: 'Movilizaciones y bloqueos en el entorno de la comunidad.',
        categoria: 'protestas',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:transporte',
        nombre: 'Problemas de Transporte',
        descripcion: 'Paros del transporte y dificultades de movilidad.',
        categoria: 'transporte',
        version: null,
        es_predefinido: true,
    },
    {
        id: 'pred:inseguridad',
        nombre: 'Inseguridad',
        descripcion: 'Percepción de inseguridad y hechos delictivos en la zona.',
        categoria: 'inseguridad',
        version: null,
        es_predefinido: true,
    },
]);

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza un escenario crudo del backend a la forma que usa la UI, tolerando
 * convenciones snake_case y camelCase y distintos nombres de campo.
 */
export function normalizeEscenario(raw: unknown): Escenario {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        id: (o.id ?? o._id ?? null) as string | null,
        nombre: (o.nombre as string) ?? (o.name as string) ?? '',
        descripcion: (o.descripcion as string) ?? (o.description as string) ?? '',
        categoria: (o.categoria as string) ?? (o.category as string) ?? '',
        version: toNumberOrNull(o.version ?? o.version_actual ?? o.versionActual),
        es_predefinido: Boolean(
            o.es_predefinido ?? o.esPredefinido ?? o.predefinido ?? false,
        ),
    };
}

/** Extrae una lista de escenarios de distintas formas de respuesta posibles. */
function extraerLista(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.escenarios)) return obj.escenarios;
        if (Array.isArray(obj.items)) return obj.items;
    }
    return [];
}

/**
 * Lista los escenarios de la `Biblioteca_Escenarios` (Req. 29.2).
 *
 * DEGRADA CON ELEGANCIA: ante 404 / error de red devuelve los
 * `ESCENARIOS_PREDEFINIDOS` con `disponible: false`, para que la UI siga siendo
 * utilizable. Si el backend responde con una lista vacía, también cae a los
 * predefinidos pero marca `disponible: true`.
 */
export async function listEscenarios(): Promise<EscenariosResultado> {
    try {
        const { data } = await gdsApiClient.get('/escenarios');
        const lista = extraerLista(data).map(normalizeEscenario);
        if (lista.length === 0) {
            return {
                escenarios: ESCENARIOS_PREDEFINIDOS.map(normalizeEscenario),
                disponible: true,
            };
        }
        return { escenarios: lista, disponible: true };
    } catch {
        return {
            escenarios: ESCENARIOS_PREDEFINIDOS.map(normalizeEscenario),
            disponible: false,
        };
    }
}
