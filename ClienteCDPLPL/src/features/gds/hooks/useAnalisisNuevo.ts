// Hooks de datos para la creación de un `Analisis` con **TanStack Query**
// (Req. 8, 29). Encapsulan el listado de escenarios de la `Biblioteca_Escenarios`
// y la mutación de alta contra el backend autónomo (`VITE_GDS_API_URL`),
// invalidando la caché del listado de análisis tras crear uno.
//
// El listado de instituciones se reutiliza desde `useInstitucionesAdmin`
// (`useInstitucionesList`) para no duplicar el fetching (Req. 8.3).
import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import {
    createAnalisis,
    type Analisis,
    type AnalisisFormValues,
} from '../api/analisisApi';
import { listEscenarios, type EscenariosResultado } from '../api/escenariosApi';

/** Claves de caché de TanStack Query para la creación de análisis. */
export const analisisKeys = {
    all: ['gds', 'analisis'] as const,
    list: ['gds', 'analisis', 'list'] as const,
    escenarios: ['gds', 'escenarios', 'list'] as const,
};

export interface UseEscenariosOptions {
    /** Permite desactivar el fetching (p. ej. sin sesión válida). */
    habilitado?: boolean;
}

/**
 * Lista los escenarios de la `Biblioteca_Escenarios` (Req. 29.2). `listEscenarios`
 * ya DEGRADA CON ELEGANCIA (nunca lanza), por eso se desactivan los reintentos.
 */
export function useEscenarios(
    opts: UseEscenariosOptions = {},
): UseQueryResult<EscenariosResultado, Error> {
    const { habilitado = true } = opts;
    return useQuery<EscenariosResultado, Error>({
        queryKey: analisisKeys.escenarios,
        queryFn: listEscenarios,
        enabled: habilitado,
        retry: false,
    });
}

/** Crea un `Analisis` e invalida el listado de análisis (Req. 8.1). */
export function useCrearAnalisis(): UseMutationResult<
    Analisis,
    Error,
    AnalisisFormValues
> {
    const queryClient = useQueryClient();
    return useMutation<Analisis, Error, AnalisisFormValues>({
        mutationFn: (form) => createAnalisis(form),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: analisisKeys.all });
        },
    });
}
