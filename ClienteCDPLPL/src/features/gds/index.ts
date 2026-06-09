/**
 * Punto de entrada (barrel) de la feature `gds` — Plataforma_GDS (Frontend_GDS).
 *
 * Reúne la base de la feature: cliente HTTP (Axios → `VITE_GDS_API_URL`),
 * cliente de datos (TanStack Query) y estado de UI (Zustand), más los tipos
 * base. El layout, las rutas y las pantallas viven en sus propios módulos.
 */
export { gdsApiClient, GDS_API_URL, GDS_API_PREFIX } from './api/client.js';
export { gdsQueryClient } from './lib/queryClient';
export { useGdsUiStore } from './store/uiStore';
export type { GdsUiState } from './store/uiStore';
export type { ModoEjecucion, EstadoEjecucion, Coordenada } from './types';
