// Hooks de datos para la gestión (CRUD) de instituciones con **TanStack Query**
// (Req. 7.1, 7.4, 7.5, 7.6). Encapsulan el listado y las mutaciones contra el
// backend autónomo (`VITE_GDS_API_URL`) e invalidan la caché tras cada cambio
// para mantener la vista sincronizada.
import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

import {
    createInstitucion,
    deleteInstitucion,
    listInstituciones,
    updateInstitucion,
    type Institucion,
    type InstitucionFormValues,
} from '../api/institucionesApi';

/** Claves de caché de TanStack Query para la gestión de instituciones. */
export const institucionesKeys = {
    all: ['gds', 'instituciones'] as const,
    list: ['gds', 'instituciones', 'list'] as const,
};

export interface UseInstitucionesListOptions {
    /** Permite desactivar el fetching (p. ej. sin sesión válida). */
    habilitado?: boolean;
}

/** Lista las instituciones registradas (Req. 7.4). */
export function useInstitucionesList(
    opts: UseInstitucionesListOptions = {},
): UseQueryResult<Institucion[], Error> {
    const { habilitado = true } = opts;
    return useQuery<Institucion[], Error>({
        queryKey: institucionesKeys.list,
        queryFn: listInstituciones,
        enabled: habilitado,
    });
}

/** Crea una institución e invalida el listado (Req. 7.1). */
export function useCrearInstitucion(): UseMutationResult<
    Institucion,
    Error,
    InstitucionFormValues
> {
    const queryClient = useQueryClient();
    return useMutation<Institucion, Error, InstitucionFormValues>({
        mutationFn: (form) => createInstitucion(form),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: institucionesKeys.all });
        },
    });
}

export interface ActualizarInstitucionArgs {
    id: string;
    form: InstitucionFormValues;
}

/** Actualiza una institución e invalida el listado (Req. 7.5). */
export function useActualizarInstitucion(): UseMutationResult<
    Institucion,
    Error,
    ActualizarInstitucionArgs
> {
    const queryClient = useQueryClient();
    return useMutation<Institucion, Error, ActualizarInstitucionArgs>({
        mutationFn: ({ id, form }) => updateInstitucion(id, form),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: institucionesKeys.all });
        },
    });
}

/**
 * Elimina una institución e invalida el listado (Req. 7.6). El backend puede
 * rechazar la operación si la institución está referenciada por un análisis; el
 * error se propaga para que la vista lo muestre.
 */
export function useEliminarInstitucion(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => deleteInstitucion(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: institucionesKeys.all });
        },
    });
}
