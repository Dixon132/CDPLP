// Hooks de datos de la vista de trazabilidad con **TanStack Query** (Req. 22, 33.5).
//
// Encapsulan el fetching del recorrido completo de un `Analisis`: análisis
// disponibles, comunidades (instituciones) con su zona, evolución por dimensión
// del `Indice_Riesgo`, resultados semanales navegables, explicación + evidencia
// de un resultado seleccionado y la comparación por institución/zona, todo
// contra el backend autónomo (`VITE_GDS_API_URL`). Las funciones de
// `../api/trazabilidadApi` ya DEGRADAN CON ELEGANCIA (devuelven formas vacías
// ante endpoints inexistentes), por lo que se desactivan los reintentos para
// mantener la UI receptiva.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
    listComunidades,
    getEvolucionDimensiones,
    getEvolucionPuntos,
    listResultadosSemanales,
    getSoporteResultado,
    getCronologia,
    combinarComparacionInstituciones,
    combinarComparacionPorZona,
    type Comunidad,
    type SerieDimension,
    type ResultadoSemanal,
    type SoporteResultado,
    type Seleccion,
    type ComparacionInstituciones,
    type ComparacionZonaPunto,
    type EntradaComparacion,
    type MetricaSemanaContenido,
} from '../api/trazabilidadApi';
// `analisis.js` es JS heredado (sin tipos): lo consumimos solo para poblar el
// selector de análisis, degradando a `[]` ante error.
import { listAnalisis } from '../api/analisis.js';

/** Análisis disponible (forma mínima que necesita el selector). */
export interface AnalisisOpcion {
    id: string | null;
    nombre: string;
}

/** Claves de caché de TanStack Query para la trazabilidad. */
export const trazabilidadKeys = {
    all: ['gds', 'trazabilidad'] as const,
    analisis: ['gds', 'trazabilidad', 'analisis'] as const,
    comunidades: (analisisId: string) =>
        ['gds', 'trazabilidad', 'comunidades', analisisId] as const,
    evolucion: (analisisId: string, institucionId: string) =>
        ['gds', 'trazabilidad', 'evolucion', analisisId, institucionId] as const,
    resultados: (analisisId: string, institucionId: string) =>
        ['gds', 'trazabilidad', 'resultados', analisisId, institucionId] as const,
    cronologia: (analisisId: string, institucionId: string) =>
        ['gds', 'trazabilidad', 'cronologia', analisisId, institucionId] as const,
    soporte: (sel: Seleccion | null) =>
        [
            'gds',
            'trazabilidad',
            'soporte',
            sel?.analisisId ?? '',
            sel?.institucionId ?? '',
            sel?.semana ?? '',
            sel?.dimension ?? '',
        ] as const,
    comparacion: (analisisId: string, dimension: string, ids: string[]) =>
        ['gds', 'trazabilidad', 'comparacion', analisisId, dimension, ids.join(',')] as const,
};

/**
 * Lista los análisis disponibles. Degrada con elegancia: ante un endpoint
 * inexistente o error de red devuelve `[]` (la vista informa la indisponibilidad).
 */
export function useAnalisisTrazabilidad(
    opts: { habilitado?: boolean } = {},
): UseQueryResult<AnalisisOpcion[], Error> {
    const { habilitado = true } = opts;
    return useQuery<AnalisisOpcion[], Error>({
        queryKey: trazabilidadKeys.analisis,
        queryFn: async (): Promise<AnalisisOpcion[]> => {
            try {
                const lista = (await listAnalisis()) as AnalisisOpcion[] | null | undefined;
                return Array.isArray(lista) ? lista : [];
            } catch {
                return [];
            }
        },
        enabled: habilitado,
        retry: false,
    });
}

/** Lista las comunidades (instituciones) de un análisis con su zona (Req. 22.4). */
export function useComunidades(
    analisisId: string | null | undefined,
): UseQueryResult<Comunidad[], Error> {
    const id = analisisId ?? '';
    return useQuery<Comunidad[], Error>({
        queryKey: trazabilidadKeys.comunidades(id),
        queryFn: () => listComunidades(id),
        enabled: Boolean(id),
        retry: false,
    });
}

/** Evolución temporal por dimensión de una comunidad (Req. 22.2). */
export function useEvolucionDimensiones(
    analisisId: string | null | undefined,
    institucionId: string | null | undefined,
): UseQueryResult<SerieDimension[], Error> {
    const aId = analisisId ?? '';
    const iId = institucionId ?? '';
    return useQuery<SerieDimension[], Error>({
        queryKey: trazabilidadKeys.evolucion(aId, iId),
        queryFn: () => getEvolucionDimensiones(aId, iId),
        enabled: Boolean(aId && iId),
        retry: false,
    });
}

/** Resultados semanales navegables de una comunidad (Req. 22.1). */
export function useResultadosSemanales(
    analisisId: string | null | undefined,
    institucionId: string | null | undefined,
): UseQueryResult<ResultadoSemanal[], Error> {
    const aId = analisisId ?? '';
    const iId = institucionId ?? '';
    return useQuery<ResultadoSemanal[], Error>({
        queryKey: trazabilidadKeys.resultados(aId, iId),
        queryFn: () => listResultadosSemanales(aId, iId),
        enabled: Boolean(aId && iId),
        retry: false,
    });
}

/** Cronología de contenido por semana de una institución (Req. 22, 34). */
export function useCronologia(
    analisisId: string | null | undefined,
    institucionId: string | null | undefined,
): UseQueryResult<MetricaSemanaContenido[], Error> {
    const aId = analisisId ?? '';
    const iId = institucionId ?? '';
    return useQuery<MetricaSemanaContenido[], Error>({
        queryKey: trazabilidadKeys.cronologia(aId, iId),
        queryFn: () => getCronologia(aId, iId),
        enabled: Boolean(aId && iId),
        retry: false,
    });
}

/**
 * Explicación + evidencia que sustenta un resultado/indicador seleccionado
 * (Req. 22.3, 22.5). La consulta solo corre cuando hay una selección.
 */
export function useSoporteResultado(
    seleccion: Seleccion | null,
): UseQueryResult<SoporteResultado, Error> {
    return useQuery<SoporteResultado, Error>({
        queryKey: trazabilidadKeys.soporte(seleccion),
        queryFn: () => getSoporteResultado(seleccion as Seleccion),
        enabled: Boolean(seleccion?.analisisId && seleccion?.institucionId && seleccion?.semana),
        retry: false,
    });
}

/** Resultado combinado de la comparación: gráfico por institución + mapa por zona. */
export interface ComparacionResultado {
    porInstitucion: ComparacionInstituciones;
    porZona: ComparacionZonaPunto[];
}

/**
 * Compara la evolución de una dimensión entre las comunidades de un análisis
 * (Req. 22.4) y resume cada una por su `Zona_Geografica` para el mapa
 * (Req. 33.5). Obtiene la evolución de cada comunidad en paralelo y la combina
 * en filas/series para Recharts y en puntos georreferenciados para Leaflet.
 */
export function useComparacionInstituciones(
    analisisId: string | null | undefined,
    comunidades: ReadonlyArray<Comunidad>,
    dimension: string,
    opts: { habilitado?: boolean } = {},
): UseQueryResult<ComparacionResultado, Error> {
    const { habilitado = true } = opts;
    const aId = analisisId ?? '';
    const dim = dimension ?? '';
    const ids = comunidades.map((c) => c.institucionId);
    return useQuery<ComparacionResultado, Error>({
        queryKey: trazabilidadKeys.comparacion(aId, dim, ids),
        queryFn: async (): Promise<ComparacionResultado> => {
            const entradas: EntradaComparacion[] = await Promise.all(
                comunidades.map(async (c) => ({
                    institucionId: c.institucionId,
                    institucionNombre: c.institucionNombre,
                    zona: c.zona,
                    puntos: await getEvolucionPuntos(aId, c.institucionId),
                })),
            );
            return {
                porInstitucion: combinarComparacionInstituciones(entradas, dim),
                porZona: combinarComparacionPorZona(entradas, dim),
            };
        },
        enabled: habilitado && Boolean(aId) && comunidades.length > 0 && Boolean(dim),
        retry: false,
    });
}
