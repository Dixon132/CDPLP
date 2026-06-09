// Pruebas de los hooks de reportes (TanStack Query, tarea 26.8).
//
// Verifican que el listado consume la API por análisis, que generar un reporte
// invalida la caché del listado, que la exportación devuelve el blob y que el
// listado de análisis degrada a [] ante error (Req. 19.3, 19.4, 19.5). La capa
// de API se mockea para aislar la red.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
    useReportesList,
    useGenerarReporte,
    useExportarReporte,
    useAnalisisDisponibles,
} from './useReportes';
import { listReportesAnalisis, generarReporte, exportReporte } from '../api/reportesApi';
import { listAnalisis } from '../api/analisis.js';

vi.mock('../api/reportesApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return {
        ...actual,
        listReportesAnalisis: vi.fn(),
        generarReporte: vi.fn(),
        exportReporte: vi.fn(),
    };
});

vi.mock('../api/analisis.js', () => ({
    listAnalisis: vi.fn(),
}));

const listMock = vi.mocked(listReportesAnalisis);
const generarMock = vi.mocked(generarReporte);
const exportMock = vi.mocked(exportReporte);
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

describe('useReportes (TanStack Query)', () => {
    beforeEach(() => {
        listMock.mockReset();
        generarMock.mockReset();
        exportMock.mockReset();
        listAnalisisMock.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('useReportesList no hace fetch sin análisis seleccionado', () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useReportesList(''), { wrapper: Wrapper });
        expect(listMock).not.toHaveBeenCalled();
    });

    it('useReportesList devuelve los reportes del análisis (Req. 19.4)', async () => {
        const reportes = [
            {
                id: 'r1',
                horizonte: 'semanal' as const,
                titulo: 'Semana 1',
                analisisId: 'a1',
                institucionId: null,
                institucionNombre: '',
                periodo: 'Semana 1',
                generadoEn: null,
            },
        ];
        listMock.mockResolvedValue(reportes);

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useReportesList('a1'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(listMock).toHaveBeenCalledWith('a1');
        expect(result.current.data).toEqual(reportes);
    });

    it('useGenerarReporte invalida la caché del listado tras generar (Req. 19.3)', async () => {
        generarMock.mockResolvedValue({
            id: 'r2',
            horizonte: 'final',
            titulo: 'Informe final',
            analisisId: 'a1',
            institucionId: null,
            institucionNombre: '',
            periodo: '',
            generadoEn: null,
        });

        const { Wrapper, client } = makeWrapper();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useGenerarReporte('a1'), { wrapper: Wrapper });

        await result.current.mutateAsync({ horizonte: 'final' });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
        expect(generarMock).toHaveBeenCalledWith('a1', { horizonte: 'final' });
    });

    it('useExportarReporte devuelve el blob y el filename (Req. 19.5)', async () => {
        const blob = new Blob(['%PDF'], { type: 'application/pdf' });
        exportMock.mockResolvedValue({ blob, filename: 'r1.pdf' });

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useExportarReporte(), { wrapper: Wrapper });

        const res = await result.current.mutateAsync({ id: 'r1', formato: 'pdf' });
        expect(exportMock).toHaveBeenCalledWith('r1', 'pdf');
        expect(res.blob).toBe(blob);
        expect(res.filename).toBe('r1.pdf');
    });

    it('useAnalisisDisponibles degrada a [] cuando el endpoint falla', async () => {
        listAnalisisMock.mockRejectedValue(new Error('endpoint no disponible'));

        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useAnalisisDisponibles(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
