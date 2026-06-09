// Hooks de datos para la vista de reportes con **TanStack Query** (Req. 19).
//
// Encapsulan el listado de reportes de un `Analisis`, la generación de un
// reporte por horizonte y la exportación descargable (PDF/Excel) contra el
// backend autónomo (`VITE_GDS_API_URL`). Tras generar un reporte se invalida la
// caché del listado para mantener la vista sincronizada.
import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import {
    listReportesAnalisis,
    generarReporte,
    exportReporte,
    type Reporte,
    type GenerarReporteBody,
    type FormatoExportacion,
} from '../api/reportesApi';
// `analisis.js` es JS heredado (sin tipos): lo consumimos solo para poblar el
// selector de análisis de la vista de reportes, degradando a `[]` ante error.
import { listAnalisis } from '../api/analisis.js';

/** Análisis disponible (forma mínima que necesita el selector de reportes). */
export interface AnalisisOpcion {
    id: string | null;
    nombre: string;
}

/** Claves de caché de TanStack Query para los reportes. */
export const reportesKeys = {
    all: ['gds', 'reportes'] as const,
    list: (analisisId: string) => ['gds', 'reportes', 'list', analisisId] as const,
    analisis: ['gds', 'reportes', 'analisis'] as const,
};

/**
 * Lista los análisis disponibles para elegir en la vista de reportes.
 * Degrada con elegancia: ante un endpoint inexistente o error de red devuelve
 * `[]` para no romper la vista (la propia vista informa la indisponibilidad).
 */
export function useAnalisisDisponibles(
    opts: { habilitado?: boolean } = {},
): UseQueryResult<AnalisisOpcion[], Error> {
    const { habilitado = true } = opts;
    return useQuery<AnalisisOpcion[], Error>({
        queryKey: reportesKeys.analisis,
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

export interface UseReportesListOptions {
    /** Permite desactivar el fetching (p. ej. sin análisis seleccionado). */
    habilitado?: boolean;
}

/** Lista los reportes asociados a un `Analisis` (Req. 19.4). */
export function useReportesList(
    analisisId: string | null | undefined,
    opts: UseReportesListOptions = {},
): UseQueryResult<Reporte[], Error> {
    const { habilitado = true } = opts;
    const id = analisisId ?? '';
    return useQuery<Reporte[], Error>({
        queryKey: reportesKeys.list(id),
        queryFn: () => listReportesAnalisis(id),
        enabled: habilitado && Boolean(id),
    });
}

/** Genera un reporte de un horizonte e invalida el listado (Req. 19.3). */
export function useGenerarReporte(
    analisisId: string | null | undefined,
): UseMutationResult<Reporte, Error, GenerarReporteBody> {
    const queryClient = useQueryClient();
    const id = analisisId ?? '';
    return useMutation<Reporte, Error, GenerarReporteBody>({
        mutationFn: (body) => generarReporte(id, body),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: reportesKeys.list(id) });
        },
    });
}

export interface ExportarReporteArgs {
    id: string;
    formato: FormatoExportacion;
}

/**
 * Exporta un reporte (Req. 19.5). Devuelve el blob y el nombre de archivo
 * sugerido por el backend; la descarga efectiva la dispara el llamador (la
 * vista) en el navegador. El error se propaga para que la vista lo muestre.
 */
export function useExportarReporte(): UseMutationResult<
    { blob: Blob; filename: string | null },
    Error,
    ExportarReporteArgs
> {
    return useMutation<{ blob: Blob; filename: string | null }, Error, ExportarReporteArgs>({
        mutationFn: ({ id, formato }) => exportReporte(id, formato),
    });
}
