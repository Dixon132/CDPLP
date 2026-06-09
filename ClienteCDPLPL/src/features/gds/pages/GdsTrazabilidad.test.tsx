// Pruebas de la pantalla de trazabilidad (tarea 26.7).
//
// Verifican: carga y selección de análisis/institución, evolución por dimensión
// con sus accesos, navegación por semanas/meses, que seleccionar un resultado o
// una dimensión muestra su explicación + evidencia, la comparación por
// institución/zona y la degradación elegante ante un backend no disponible
// (Req. 22.1–22.6, 33.5, 23.5). La capa de API se mockea (red aislada) y los
// componentes de gráfico/mapa (Recharts/Leaflet) se sustituyen por stubs para
// no inicializarlos en jsdom.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GdsTrazabilidad from './GdsTrazabilidad';
import { gdsQueryClient } from '../lib/queryClient';
import {
    listComunidades,
    getEvolucionDimensiones,
    getEvolucionPuntos,
    listResultadosSemanales,
    getSoporteResultado,
} from '../api/trazabilidadApi';
import { listAnalisis } from '../api/analisis.js';

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

// Los gráficos (Recharts) y el mapa (Leaflet) se sustituyen por stubs: no
// aportan a la orquestación de la página y no se inicializan bien en jsdom.
vi.mock('../components/TrazabilidadEvolucionChart', () => ({
    TrazabilidadEvolucionChart: () => <div data-testid="evolucion-chart" />,
    default: () => <div data-testid="evolucion-chart" />,
}));
vi.mock('../components/TrazabilidadComparacionChart', () => ({
    TrazabilidadComparacionChart: () => <div data-testid="comparacion-chart" />,
    default: () => <div data-testid="comparacion-chart" />,
}));
vi.mock('../components/TrazabilidadZonaMapa', () => ({
    TrazabilidadZonaMapa: () => <div data-testid="zona-mapa" />,
    default: () => <div data-testid="zona-mapa" />,
}));

const comunidadesMock = vi.mocked(listComunidades);
const evolucionMock = vi.mocked(getEvolucionDimensiones);
const puntosMock = vi.mocked(getEvolucionPuntos);
const resultadosMock = vi.mocked(listResultadosSemanales);
const soporteMock = vi.mocked(getSoporteResultado);
const listAnalisisMock = vi.mocked(listAnalisis);

const series = [
    {
        dimension: 'estres_academico',
        label: 'Estrés académico',
        color: '#ef4444',
        datos: [
            { semana: 1, mes: 1, valor: 40 },
            { semana: 2, mes: 1, valor: 55 },
        ],
    },
];

const soporte = {
    explicacion: {
        id: 'x1',
        dimension: 'estres_academico',
        texto: 'Subió por el evento del escenario',
        cuando: 'semana 2',
        comoEvoluciono: 'creciente',
        evidencias: [],
    },
    evidencias: [
        {
            id: 'e1',
            tipo: 'publicacion',
            descripcion: 'Mensaje colectivo',
            refContenido: 'a'.repeat(64),
            semana: 2,
            institucionId: 'i1',
            analisisId: 'a1',
            contributiva: true,
            metrica: null,
        },
    ],
    parcial: false,
    faltantes: [] as string[],
};

beforeEach(() => {
    gdsQueryClient.clear();
    comunidadesMock.mockReset();
    evolucionMock.mockReset();
    puntosMock.mockReset();
    resultadosMock.mockReset();
    soporteMock.mockReset();
    listAnalisisMock.mockReset();

    listAnalisisMock.mockResolvedValue([{ id: 'a1', nombre: 'Análisis Andino' }]);
    comunidadesMock.mockResolvedValue([
        {
            institucionId: 'i1',
            institucionNombre: 'U Mayor',
            zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        },
    ]);
    evolucionMock.mockResolvedValue(series);
    puntosMock.mockResolvedValue([]);
    resultadosMock.mockResolvedValue([
        { semana: 1, mes: 1, resumen: '', dimensiones: [] },
        { semana: 2, mes: 1, resumen: '', dimensiones: [] },
    ]);
    soporteMock.mockResolvedValue(soporte);
});

afterEach(() => {
    vi.clearAllMocks();
    gdsQueryClient.clear();
});

describe('GdsTrazabilidad (vista de trazabilidad)', () => {
    it('carga y selecciona el primer análisis e institución (Req. 22.1)', async () => {
        render(<GdsTrazabilidad />);

        expect(
            screen.getByRole('heading', { name: /Trazabilidad del análisis/i }),
        ).toBeInTheDocument();

        expect(await screen.findByRole('option', { name: 'Análisis Andino' })).toBeInTheDocument();
        await screen.findByRole('option', { name: 'U Mayor' });
        await vi.waitFor(() => expect(comunidadesMock).toHaveBeenCalledWith('a1'));
        await vi.waitFor(() => expect(evolucionMock).toHaveBeenCalledWith('a1', 'i1'));
    });

    it('muestra la explicación y evidencia al seleccionar una dimensión (Req. 22.2, 22.3, 22.5)', async () => {
        render(<GdsTrazabilidad />);

        const accesoDimension = await screen.findByRole('button', { name: 'Estrés académico' });
        await userEvent.click(accesoDimension);

        expect(await screen.findByText('Subió por el evento del escenario')).toBeInTheDocument();
        expect(screen.getByText(/Evidencia \(1\)/i)).toBeInTheDocument();
        await vi.waitFor(() =>
            expect(soporteMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    analisisId: 'a1',
                    institucionId: 'i1',
                    semana: 2,
                    dimension: 'estres_academico',
                }),
            ),
        );
    });

    it('navega por semanas y abre el soporte de una semana (Req. 22.1, 22.3)', async () => {
        render(<GdsTrazabilidad />);

        const semana1 = await screen.findByRole('button', { name: 'Semana 1' });
        await userEvent.click(semana1);

        await vi.waitFor(() =>
            expect(soporteMock).toHaveBeenCalledWith(
                expect.objectContaining({ analisisId: 'a1', institucionId: 'i1', semana: 1 }),
            ),
        );
        expect(await screen.findByText('Subió por el evento del escenario')).toBeInTheDocument();
    });

    it('muestra la comparación por institución y por zona al activarla (Req. 22.4, 33.5)', async () => {
        render(<GdsTrazabilidad />);

        await screen.findByRole('option', { name: 'U Mayor' });
        await userEvent.click(screen.getByLabelText(/Comparar instituciones \/ zonas/i));

        expect(
            await screen.findByText(/Comparación entre instituciones y por zona/i),
        ).toBeInTheDocument();
        expect(screen.getByTestId('comparacion-chart')).toBeInTheDocument();
        expect(screen.getByTestId('zona-mapa')).toBeInTheDocument();
    });

    it('presenta seudónimos, nunca el identificador crudo de origen (Req. 23.5)', async () => {
        render(<GdsTrazabilidad />);

        await userEvent.click(await screen.findByRole('button', { name: 'Estrés académico' }));
        await screen.findByText('Subió por el evento del escenario');

        // El hash de origen se muestra compacto como seudónimo.
        expect(screen.getByText(`anon-${'a'.repeat(8)}`)).toBeInTheDocument();
        expect(screen.queryByText('a'.repeat(64))).not.toBeInTheDocument();
    });

    it('degrada con elegancia cuando no hay análisis disponibles (Req. 22.6)', async () => {
        listAnalisisMock.mockResolvedValue([]);
        render(<GdsTrazabilidad />);

        expect(
            await screen.findByText(/El servicio de análisis aún no está disponible/i),
        ).toBeInTheDocument();
    });
});
