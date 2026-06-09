// Pruebas de los hooks de trazabilidad (TanStack Query, tarea 26.7).
//
// Verifican que cada hook consume su función de API, respeta el `enabled`
// (no hace fetch sin análisis/institución), que el soporte solo corre con una
// selección, que la comparación combina por institución y por zona, y que el
// listado de análisis degrada a [] ante error (Req. 22.1–22.5, 33.5). La capa
// de API se mockea para aislar la red.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
    useAnalisisTrazabilidad,
    useComunidades,
    useEvolucionDimensiones,
    useResultadosSemanales,
    useSoporteResultado,
    useComparacionInstituciones,
} from './useTrazabilidad';
import {
    listComunidades,
    getEvolucionDimensiones,
    getEvolucionPuntos,
    listResultadosSemanales,
    getSoporteResultado,
} from '../api/trazabilidadApi';
import { listAnalisis } from '../api/analisis.js';
import type { Comunidad } from '../api/trazabilidadApi';

vi.mock('../api/trazabilidadApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return {
        ...actual,
        listComunidades: vi.fn(),
        getEvolucionDimensiones: vi.fn(),
        getEvolucionPuntos: vi.fn(),
        listResultadosSemanales: vi.fn(),
        getSoporteResultado: vi.fn(),
    };
});

vi.mock('../api/analisis.js', () => ({
    listAnalisis: vi.fn(),
}));

const comunidadesMock = vi.mocked(listComunidades);
const evolucionMock = vi.mocked(getEvolucionDimensiones);
const puntosMock = vi.mocked(getEvolucionPuntos);
const resultadosMock = vi.mocked(listResultadosSemanales);
const soporteMock = vi.mocked(getSoporteResultado);
const listAnalisisMock = vi.mocked(listAnalisis);

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { Wrapper, client };
}

const comunidades: Comunidad[] = [
    {
        institucionId: 'i1',
        institucionNombre: 'U Mayor',
        zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radioMetros: 800 },
    },
    { institucionId: 'i2', institucionNombre: 'Colegio X', zona: null },
];

describe('useTrazabilidad (TanStack Query)', () => {
    beforeEach(() => {
        comunidadesMock.mockReset();
        evolucionMock.mockReset();
        puntosMock.mockReset();
        resultadosMock.mockReset();
        soporteMock.mockReset();
        listAnalisisMock.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('useAnalisisTrazabilidad degrada a [] cuando el endpoint falla', async () => {
        listAnalisisMock.mockRejectedValue(new Error('no disponible'));
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useAnalisisTrazabilidad(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('useComunidades no hace fetch sin análisis', () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useComunidades(''), { wrapper: Wrapper });
        expect(comunidadesMock).not.toHaveBeenCalled();
    });

    it('useComunidades devuelve las comunidades del análisis (Req. 22.4)', async () => {
        comunidadesMock.mockResolvedValue(comunidades);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useComunidades('a1'), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(comunidadesMock).toHaveBeenCalledWith('a1');
        expect(result.current.data).toEqual(comunidades);
    });

    it('useEvolucionDimensiones requiere análisis e institución', async () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useEvolucionDimensiones('a1', ''), { wrapper: Wrapper });
        expect(evolucionMock).not.toHaveBeenCalled();

        evolucionMock.mockResolvedValue([
            { dimension: 'estres_academico', label: 'Estrés académico', color: '#ef4444', datos: [] },
        ]);
        const { result } = renderHook(() => useEvolucionDimensiones('a1', 'i1'), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(evolucionMock).toHaveBeenCalledWith('a1', 'i1');
    });

    it('useResultadosSemanales consume la API por institución (Req. 22.1)', async () => {
        resultadosMock.mockResolvedValue([{ semana: 1, mes: 1, resumen: 'r', dimensiones: [] }]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useResultadosSemanales('a1', 'i1'), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(resultadosMock).toHaveBeenCalledWith('a1', 'i1');
        expect(result.current.data).toHaveLength(1);
    });

    it('useSoporteResultado no corre sin selección y corre con ella (Req. 22.3)', async () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useSoporteResultado(null), { wrapper: Wrapper });
        expect(soporteMock).not.toHaveBeenCalled();

        soporteMock.mockResolvedValue({
            explicacion: { id: null, dimension: '', texto: 'x', cuando: '', comoEvoluciono: '', evidencias: [] },
            evidencias: [],
            parcial: true,
            faltantes: ['evidencia'],
        });
        const sel = { analisisId: 'a1', institucionId: 'i1', semana: 2 };
        const { result } = renderHook(() => useSoporteResultado(sel), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(soporteMock).toHaveBeenCalledWith(sel);
        expect(result.current.data?.parcial).toBe(true);
    });

    it('useComparacionInstituciones combina por institución y por zona (Req. 22.4, 33.5)', async () => {
        puntosMock.mockImplementation(async (_aId: string, institucionId: string) =>
            institucionId === 'i1'
                ? [
                      { dimension: 'estres_academico', semana: 1, mes: 1, valor: 40, comunidadId: 'i1' },
                      { dimension: 'estres_academico', semana: 2, mes: 1, valor: 60, comunidadId: 'i1' },
                  ]
                : [{ dimension: 'estres_academico', semana: 1, mes: 1, valor: 30, comunidadId: 'i2' }],
        );

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useComparacionInstituciones('a1', comunidades, 'estres_academico', { habilitado: true }),
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(puntosMock).toHaveBeenCalledTimes(2);
        const data = result.current.data!;
        expect(data.porInstitucion.series.map((s) => s.clave)).toEqual(['i1', 'i2']);
        expect(data.porInstitucion.filas).toEqual([
            { semana: 1, mes: 1, i1: 40, i2: 30 },
            { semana: 2, mes: 1, i1: 60 },
        ]);
        const zonaI1 = data.porZona.find((p) => p.institucionId === 'i1')!;
        expect(zonaI1.tieneCoordenadas).toBe(true);
        expect(zonaI1.valorUltimo).toBe(60);
        expect(zonaI1.valorPromedio).toBe(50);
        const zonaI2 = data.porZona.find((p) => p.institucionId === 'i2')!;
        expect(zonaI2.tieneCoordenadas).toBe(false);
    });

    it('useComparacionInstituciones no corre si está deshabilitada', () => {
        const { Wrapper } = makeWrapper();
        renderHook(
            () => useComparacionInstituciones('a1', comunidades, 'estres_academico', { habilitado: false }),
            { wrapper: Wrapper },
        );
        expect(puntosMock).not.toHaveBeenCalled();
    });
});
