// Pruebas de los hooks CRUD de instituciones (TanStack Query, tarea 26.4).
//
// Verifican que el listado consume la API y que las mutaciones invalidan la
// caché para refrescar la vista (Req. 7.1, 7.4, 7.5, 7.6). La capa de API se
// mockea para aislar la red.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
    useInstitucionesList,
    useCrearInstitucion,
    useEliminarInstitucion,
} from './useInstitucionesAdmin';
import {
    listInstituciones,
    createInstitucion,
    deleteInstitucion,
} from '../api/institucionesApi';

vi.mock('../api/institucionesApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return {
        ...actual,
        listInstituciones: vi.fn(),
        createInstitucion: vi.fn(),
        updateInstitucion: vi.fn(),
        deleteInstitucion: vi.fn(),
    };
});

const listMock = vi.mocked(listInstituciones);
const createMock = vi.mocked(createInstitucion);
const deleteMock = vi.mocked(deleteInstitucion);

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { Wrapper, client };
}

describe('useInstitucionesAdmin (TanStack Query)', () => {
    beforeEach(() => {
        listMock.mockReset();
        createMock.mockReset();
        deleteMock.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('useInstitucionesList no hace fetch cuando está deshabilitado', () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useInstitucionesList({ habilitado: false }), { wrapper: Wrapper });
        expect(listMock).not.toHaveBeenCalled();
    });

    it('useInstitucionesList devuelve la lista del backend', async () => {
        const lista = [
            {
                id: 'i1',
                nombre: 'Universidad Andina',
                categoria: 'universidad' as const,
                latitud: -16.5,
                longitud: -68.1,
                radio_metros: 500,
                logo_url: '',
                descripcion: '',
            },
        ];
        listMock.mockResolvedValue(lista);

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useInstitucionesList(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(lista);
    });

    it('useCrearInstitucion invalida la caché del listado tras crear', async () => {
        listMock.mockResolvedValue([]);
        createMock.mockResolvedValue({
            id: 'nuevo',
            nombre: 'X',
            categoria: 'colegio',
            latitud: 1,
            longitud: 2,
            radio_metros: 100,
            logo_url: '',
            descripcion: '',
        });

        const { Wrapper, client } = makeWrapper();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useCrearInstitucion(), { wrapper: Wrapper });

        await result.current.mutateAsync({
            nombre: 'X',
            categoria: 'colegio',
            latitud: 1,
            longitud: 2,
            radio_metros: 100,
            logo_url: '',
            descripcion: '',
        });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
        expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('useEliminarInstitucion propaga el error del backend (Req. 7.6)', async () => {
        deleteMock.mockRejectedValue(new Error('referenciada por un análisis'));

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useEliminarInstitucion(), { wrapper: Wrapper });

        await expect(result.current.mutateAsync('i1')).rejects.toThrow(
            /referenciada por un análisis/,
        );
    });
});
