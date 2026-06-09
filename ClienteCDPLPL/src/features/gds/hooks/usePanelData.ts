// Hooks de datos de la pantalla principal de la Plataforma_GDS (Req. 21.1, 21.3, 21.5).
//
// Encapsulan el fetching del panel con **TanStack Query** (caché, reintentos
// acotados, estado de carga) sobre el cliente HTTP del backend autónomo
// (`VITE_GDS_API_URL`). Las funciones de `../api/*` ya DEGRADAN CON ELEGANCIA:
// `getResumenPanel` nunca lanza (devuelve una forma vacía válida) y aquí
// `listInstituciones` se envuelve para caer a `[]` si su endpoint aún no existe.
// Por eso desactivamos los reintentos: no tiene sentido reintentar una llamada
// que ya gestiona su propia degradación, y mantiene la UI receptiva.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getResumenPanel } from '../api/dashboard.js';
import { listInstituciones } from '../api/instituciones.js';
import type { EstadoEjecucion } from '../types';

/** Punto de indicador global agregado (`{ nombre, valor }`). */
export interface IndicadorGlobal {
    nombre: string;
    valor: number;
}

/** Punto de la serie histórica de un indicador (`{ periodo, valor }`). */
export interface PuntoHistorico {
    periodo: string;
    valor: number;
}

/** Estado de ejecución matizado para la UI (incluye `EN_ACELERACION`). */
export type EstadoEjecucionUi = EstadoEjecucion | 'EN_ACELERACION';

/** Resumen de un `Analisis` tal como lo consume el panel principal. */
export interface AnalisisResumen {
    id: string | null;
    nombre: string;
    estado: EstadoEjecucionUi;
    semanaActual: number | null;
    totalSemanas: number | null;
    instituciones: number;
    escenario: string;
    actualizadoEn: string | null;
}

/** Disponibilidad por sección del panel (degradación informativa). */
export interface DisponibilidadPanel {
    indicadores: boolean;
    historicos: boolean;
    analisis: boolean;
}

/** Forma completa del resumen del panel principal. */
export interface ResumenPanel {
    indicadores: IndicadorGlobal[];
    historicos: PuntoHistorico[];
    analisis: AnalisisResumen[];
    disponible: DisponibilidadPanel;
}

/** Institución registrada tal como la consume el slider (Req. 21.2). */
export interface InstitucionResumen {
    id: string | null;
    nombre: string;
    categoria: string;
    latitud: number | null;
    longitud: number | null;
    radio_metros: number;
    logo_url: string;
    descripcion: string;
}

/** Resumen vacío pero válido, para inicializar la UI sin romperse. */
export const RESUMEN_PANEL_VACIO: ResumenPanel = {
    indicadores: [],
    historicos: [],
    analisis: [],
    disponible: { indicadores: false, historicos: false, analisis: false },
};

/** Claves de caché de TanStack Query para el panel de la Plataforma_GDS. */
export const gdsPanelKeys = {
    resumen: ['gds', 'panel', 'resumen'] as const,
    instituciones: ['gds', 'instituciones'] as const,
};

export interface UsePanelDataOptions {
    /** Permite desactivar el fetching (p. ej. sin sesión válida, Req. 21.6). */
    habilitado?: boolean;
}

/**
 * Obtiene el resumen del panel principal (indicadores, históricos, análisis).
 * Degrada con elegancia: `getResumenPanel` nunca lanza, así que `data` siempre
 * tendrá una forma válida cuando la consulta esté habilitada.
 */
export function useResumenPanel(
    opts: UsePanelDataOptions = {},
): UseQueryResult<ResumenPanel, Error> {
    const { habilitado = true } = opts;
    return useQuery<ResumenPanel, Error>({
        queryKey: gdsPanelKeys.resumen,
        queryFn: async (): Promise<ResumenPanel> => {
            const resumen = (await getResumenPanel()) as ResumenPanel | null | undefined;
            return resumen ?? RESUMEN_PANEL_VACIO;
        },
        enabled: habilitado,
        retry: false,
    });
}

/**
 * Lista las instituciones registradas para el slider (Req. 21.2).
 * Si el endpoint aún no existe o falla, cae a `[]` para no romper la UI.
 */
export function useInstituciones(
    opts: UsePanelDataOptions = {},
): UseQueryResult<InstitucionResumen[], Error> {
    const { habilitado = true } = opts;
    return useQuery<InstitucionResumen[], Error>({
        queryKey: gdsPanelKeys.instituciones,
        queryFn: async (): Promise<InstitucionResumen[]> => {
            try {
                const lista = (await listInstituciones()) as InstitucionResumen[] | null | undefined;
                return Array.isArray(lista) ? lista : [];
            } catch {
                return [];
            }
        },
        enabled: habilitado,
        retry: false,
    });
}
