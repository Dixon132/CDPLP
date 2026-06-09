import { QueryClient } from '@tanstack/react-query';

/**
 * Instancia de TanStack Query para la feature `gds`.
 *
 * Centraliza la caché y la configuración de fetching contra el `ServidorGDS`.
 * Los reintentos quedan acotados para no enmascarar la degradación del backend.
 */
export const gdsQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
