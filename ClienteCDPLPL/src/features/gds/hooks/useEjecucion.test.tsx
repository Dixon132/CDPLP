// Pruebas del hook `useEjecucion` (TanStack Query) del control de ejecución
// (Gestor_Ejecucion, Req. 32). Verifican que cada mutación llama a la función
// de API correcta con el `analisisId`, que el estado `ocupado` agrega los
// pendientes y que sin `analisisId` válido las mutaciones rechazan sin red.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useEjecucion } from './useEjecucion';
import * as ejecucionApi from '../api/ejecucionApi';

vi.mock('../api/ejecucionApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return {
        ...actual,
        seleccionarModo: vi.fn(),
        avanzar: vi.fn(),
        pausar: vi.fn(),
        reanudar: vi.fn(),
    };
});

const seleccionarModoMock = vi.mocked(ejecucionApi.seleccionarModo);
const avanzarMock = vi.mocked(ejecucionApi.avanzar);
const pausarMock = vi.mocked(ejecucionApi.pausar);
const reanudarMock = vi.mocked(ejecucionApi.reanudar);

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useEjecucion (TanStack Query)', () => {
    beforeEach(() => {
        seleccionarModoMock.mockReset();
        avanzarMock.mockReset();
        pausarMock.mockReset();
        reanudarMock.mockReset();
    });
    afterEach(() => vi.clearAllMocks());

    it('seleccionarModo llama a la API con id, modo e intervalo', async () => {
        seleccionarModoMock.mockResolvedValue({ ok: true, data: null });

        const { result } = renderHook(() => useEjecucion('a1'), { wrapper: makeWrapper() });

        await act(async () => {
            await result.current.seleccionarModo.mutateAsync({ modo: 'TIEMPO_REAL', intervaloMs: 60000 });
        });

        expect(seleccionarModoMock).toHaveBeenCalledWith('a1', 'TIEMPO_REAL', 60000);
    });

    it('avanzar/pausar/reanudar llaman a la API con el id', async () => {
        avanzarMock.mockResolvedValue({
            ok: true,
            data: { analisisId: 'a1', modoEjecucion: 'MANUAL', estadoEjecucion: 'DETENIDO', encolados: [] },
        });
        pausarMock.mockResolvedValue({ ok: true, data: null });
        reanudarMock.mockResolvedValue({
            ok: true,
            data: { analisisId: 'a1', modoEjecucion: 'AUTOMATICO', estadoEjecucion: 'EN_EJECUCION', encolados: [] },
        });

        const { result } = renderHook(() => useEjecucion('a1'), { wrapper: makeWrapper() });

        await act(async () => {
            await result.current.avanzar.mutateAsync();
            await result.current.pausar.mutateAsync();
            await result.current.reanudar.mutateAsync();
        });

        expect(avanzarMock).toHaveBeenCalledWith('a1');
        expect(pausarMock).toHaveBeenCalledWith('a1');
        expect(reanudarMock).toHaveBeenCalledWith('a1');
    });

    it('propaga el resultado tolerante (noDisponible) de la API', async () => {
        pausarMock.mockResolvedValue({ ok: false, noDisponible: true });

        const { result } = renderHook(() => useEjecucion('a1'), { wrapper: makeWrapper() });

        let res: ejecucionApi.EjecucionResult<null> | undefined;
        await act(async () => {
            res = await result.current.pausar.mutateAsync();
        });

        expect(res).toEqual({ ok: false, noDisponible: true });
    });

    it('rechaza sin llamar a la red cuando no hay analisisId válido', async () => {
        const { result } = renderHook(() => useEjecucion(null), { wrapper: makeWrapper() });

        await expect(result.current.avanzar.mutateAsync()).rejects.toThrow();
        expect(avanzarMock).not.toHaveBeenCalled();
    });

    it('refleja el estado ocupado mientras una mutación está en curso', async () => {
        let resolver: ((v: ejecucionApi.EjecucionResult<null>) => void) | undefined;
        pausarMock.mockReturnValue(
            new Promise<ejecucionApi.EjecucionResult<null>>((r) => {
                resolver = r;
            }),
        );

        const { result } = renderHook(() => useEjecucion('a1'), { wrapper: makeWrapper() });
        expect(result.current.ocupado).toBe(false);

        act(() => {
            void result.current.pausar.mutateAsync();
        });

        await waitFor(() => expect(result.current.ocupado).toBe(true));

        await act(async () => {
            resolver?.({ ok: true, data: null });
        });

        await waitFor(() => expect(result.current.ocupado).toBe(false));
    });
});
