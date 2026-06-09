import { create } from 'zustand';

/**
 * Estado de UI global de la feature `gds` (Zustand).
 *
 * Mantiene únicamente estado de interfaz (no datos del servidor, que viven en
 * TanStack Query). Se ampliará en tareas posteriores (selección de institución,
 * panel activo, etc.).
 */
export interface GdsUiState {
    /** Institución seleccionada actualmente en el slider/listado, si aplica. */
    selectedInstitutionId: string | null;
    /** Estado del panel lateral de navegación del `GdsLayout`. */
    sidebarCollapsed: boolean;
    setSelectedInstitution: (id: string | null) => void;
    toggleSidebar: () => void;
}

export const useGdsUiStore = create<GdsUiState>((set) => ({
    selectedInstitutionId: null,
    sidebarCollapsed: false,
    setSelectedInstitution: (id) => set({ selectedInstitutionId: id }),
    toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
