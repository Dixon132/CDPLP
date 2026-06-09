// Pruebas de los hooks de datos del panel (Tarea 26.3).
//
// Verifican el contrato de `useResumenPanel` y `useInstituciones` (TanStack
// Query): respetan `habilitado` (no hacen fetch sin sesión), devuelven los
// datos del backend cuando están disponibles y DEGRADAN CON ELEGANCIA
// (`useInstituciones` cae a `[]` si su endpoint falla). La red se mockea para
// que las pruebas sean deterministas y no toquen endpoints reales.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useResumenPanel, useInstituciones } from './usePanelData';
import { getResumenPanel } from '../api/dashboard.js';
import { listInstituciones } from '../api/instituciones.js';

vi.mock('../api/dashboard.js', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, getResumenPanel: vi.fn() };
});

vi.mock('../api/instituciones.js', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, listInstituciones: vi.fn() };
});

const getResumenPanelMock = vi.mocked(getResumenPanel);
const listInstitucionesMock = vi.mocked(listInstituciones);

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('usePanelData hooks (TanStack Query)', () => {
    beforeEach(() => {
        getResumenPanelMock.mockReset();
        listInstitucionesMock.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('useResumenPanel no hace fetch cuando está deshabilitado (Req. 21.6)', () => {
        renderHook(() => useResumenPanel({ habilitado: false }), {
            wrapper: makeWrapper(),
        });

        expect(getResumenPanelMock).not.toHaveBeenCalled();
    });

    it('useResumenPanel devuelve el resumen del backend cuando está habilitado', async () => {
        const resumen = {
            indicadores: [{ nombre: 'Ansiedad', valor: 0.4 }],
            historicos: [],
            analisis: [],
            disponible: { indicadores: true, historicos: false, analisis: false },
        };
        getResumenPanelMock.mockResolvedValue(resumen);

        const { result } = renderHook(() => useResumenPanel({ habilitado: true }), {
            wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(resumen);
        expect(getResumenPanelMock).toHaveBeenCalledTimes(1);
    });

    it('useInstituciones no hace fetch cuando está deshabilitado', () => {
        renderHook(() => useInstituciones({ habilitado: false }), {
            wrapper: makeWrapper(),
        });

        expect(listInstitucionesMock).not.toHaveBeenCalled();
    });

    it('useInstituciones devuelve la lista cuando el endpoint responde', async () => {
        const lista = [{ id: 'i1', nombre: 'Universidad Andina', categoria: 'universidad' }];
        listInstitucionesMock.mockResolvedValue(lista);

        const { result } = renderHook(() => useInstituciones({ habilitado: true }), {
            wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(lista);
    });

    it('useInstituciones degrada a [] cuando el endpoint falla', async () => {
        listInstitucionesMock.mockRejectedValue(new Error('endpoint no disponible'));

        const { result } = renderHook(() => useInstituciones({ habilitado: true }), {
            wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
