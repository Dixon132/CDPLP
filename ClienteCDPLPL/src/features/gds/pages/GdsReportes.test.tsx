// Pruebas de la pantalla de reportes (tarea 26.8).
//
// Verifican: selección de análisis, listado por horizonte, estado vacío,
// generación de un reporte, exportación PDF/Excel descargable y degradación
// elegante ante un backend no disponible (Req. 19.1, 19.3, 19.4, 19.5). La capa
// de API se mockea (red aislada).
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GdsReportes from './GdsReportes';
import { gdsQueryClient } from '../lib/queryClient';
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

const listReportesMock = vi.mocked(listReportesAnalisis);
const generarMock = vi.mocked(generarReporte);
const exportMock = vi.mocked(exportReporte);
const listAnalisisMock = vi.mocked(listAnalisis);

const reporteSemanal = {
    id: 'r1',
    horizonte: 'semanal' as const,
    titulo: 'Reporte semana 1',
    analisisId: 'a1',
    institucionId: null,
    institucionNombre: '',
    periodo: 'Semana 1',
    generadoEn: null,
};

beforeEach(() => {
    gdsQueryClient.clear();
    listReportesMock.mockReset();
    generarMock.mockReset();
    exportMock.mockReset();
    listAnalisisMock.mockReset();
    listAnalisisMock.mockResolvedValue([{ id: 'a1', nombre: 'Análisis Andino' }]);
});

afterEach(() => {
    vi.clearAllMocks();
    gdsQueryClient.clear();
});

describe('GdsReportes (vista de reportes)', () => {
    it('pide seleccionar un análisis antes de listar', async () => {
        listReportesMock.mockResolvedValue([]);
        render(<GdsReportes />);

        expect(screen.getByRole('heading', { name: /Reportes/i })).toBeInTheDocument();
        expect(
            await screen.findByText(/Selecciona un análisis para ver sus reportes/i),
        ).toBeInTheDocument();
        expect(listReportesMock).not.toHaveBeenCalled();
    });

    it('muestra el estado vacío al elegir un análisis sin reportes', async () => {
        listReportesMock.mockResolvedValue([]);
        render(<GdsReportes />);

        // Esperar a que cargue el selector de análisis.
        await screen.findByRole('option', { name: 'Análisis Andino' });
        await userEvent.selectOptions(screen.getByLabelText('Análisis'), 'a1');

        expect(
            await screen.findByText(/No hay reportes disponibles todavía/i),
        ).toBeInTheDocument();
    });

    it('lista los reportes agrupados por horizonte (Req. 19.1, 19.4)', async () => {
        listReportesMock.mockResolvedValue([reporteSemanal]);
        render(<GdsReportes />);

        await screen.findByRole('option', { name: 'Análisis Andino' });
        await userEvent.selectOptions(screen.getByLabelText('Análisis'), 'a1');

        expect(await screen.findByText('Reporte semana 1')).toBeInTheDocument();
        expect(listReportesMock).toHaveBeenCalledWith('a1');
    });

    it('genera un reporte del horizonte elegido (Req. 19.3)', async () => {
        listReportesMock.mockResolvedValue([]);
        generarMock.mockResolvedValue(reporteSemanal);
        render(<GdsReportes />);

        await screen.findByRole('option', { name: 'Análisis Andino' });
        await userEvent.selectOptions(screen.getByLabelText('Análisis'), 'a1');
        await screen.findByText(/No hay reportes disponibles todavía/i);

        await userEvent.click(screen.getByRole('button', { name: /Generar reporte/i }));

        await vi.waitFor(() =>
            expect(generarMock).toHaveBeenCalledWith('a1', { horizonte: 'semanal' }),
        );
    });

    it('exporta un reporte en PDF disparando la descarga (Req. 19.5)', async () => {
        listReportesMock.mockResolvedValue([reporteSemanal]);
        const blob = new Blob(['%PDF'], { type: 'application/pdf' });
        exportMock.mockResolvedValue({ blob, filename: 'reporte-semana-1.pdf' });

        // jsdom no implementa las URLs de objeto: las definimos como mocks para
        // verificar la descarga sin tocar disco.
        const createUrl = vi.fn().mockReturnValue('blob:fake');
        const revokeUrl = vi.fn();
        const originalCreate = (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
        const originalRevoke = (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
        (URL as unknown as { createObjectURL: unknown }).createObjectURL = createUrl;
        (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeUrl;
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        render(<GdsReportes />);
        await screen.findByRole('option', { name: 'Análisis Andino' });
        await userEvent.selectOptions(screen.getByLabelText('Análisis'), 'a1');

        const fila = (await screen.findByText('Reporte semana 1')).closest('tr')!;
        await userEvent.click(within(fila).getByRole('button', { name: /^PDF$/i }));

        await vi.waitFor(() => expect(exportMock).toHaveBeenCalledWith('r1', 'pdf'));
        await vi.waitFor(() => expect(clickSpy).toHaveBeenCalled());
        expect(createUrl).toHaveBeenCalledWith(blob);

        (URL as unknown as { createObjectURL: unknown }).createObjectURL = originalCreate;
        (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = originalRevoke;
        clickSpy.mockRestore();
    });

    it('degrada con elegancia cuando el listado de reportes falla', async () => {
        listReportesMock.mockRejectedValue(new Error('servicio no disponible'));
        render(<GdsReportes />);

        await screen.findByRole('option', { name: 'Análisis Andino' });
        await userEvent.selectOptions(screen.getByLabelText('Análisis'), 'a1');

        expect(
            await screen.findByText(/servicio no disponible/i, undefined, { timeout: 5000 }),
        ).toBeInTheDocument();
    });
});
