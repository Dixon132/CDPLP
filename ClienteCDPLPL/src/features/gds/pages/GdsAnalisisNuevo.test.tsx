// Pruebas de la pantalla de creación de análisis (tarea 26.5).
//
// Verifican: la carga de instituciones + escenarios, la degradación elegante
// cuando el backend de instituciones no está disponible, y el alta completa
// (selección de institución + escenario de biblioteca) con su mensaje de éxito
// y el inicio del ciclo (Req. 8.1, 8.2, 8.3, 8.4, 8.5, 29.2). La capa de API se
// mockea (red aislada) y `useNavigate` se sustituye para no requerir un Router.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GdsAnalisisNuevo from './GdsAnalisisNuevo';
import { gdsQueryClient } from '../lib/queryClient';
import { listInstituciones } from '../api/institucionesApi';
import { listEscenarios } from '../api/escenariosApi';
import { createAnalisis } from '../api/analisisApi';

vi.mock('react-router-dom', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../api/institucionesApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, listInstituciones: vi.fn() };
});

vi.mock('../api/escenariosApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, listEscenarios: vi.fn() };
});

vi.mock('../api/analisisApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, createAnalisis: vi.fn() };
});

const listInstMock = vi.mocked(listInstituciones);
const listEscMock = vi.mocked(listEscenarios);
const createMock = vi.mocked(createAnalisis);

const INSTITUCION = {
    id: 'i1',
    nombre: 'Universidad Andina',
    categoria: 'universidad' as const,
    latitud: -16.5,
    longitud: -68.15,
    radio_metros: 500,
    logo_url: '',
    descripcion: '',
};

const ESCENARIO = {
    id: 'esc-1',
    nombre: 'Conflicto Universitario',
    descripcion: 'desc',
    categoria: 'conflicto universitario',
    version: 1,
    es_predefinido: false,
};

describe('GdsAnalisisNuevo (creación de análisis)', () => {
    beforeEach(() => {
        gdsQueryClient.clear();
        listInstMock.mockReset();
        listEscMock.mockReset();
        createMock.mockReset();
        listEscMock.mockResolvedValue({ escenarios: [ESCENARIO], disponible: true });
    });
    afterEach(() => {
        vi.clearAllMocks();
        gdsQueryClient.clear();
    });

    it('muestra el formulario con instituciones y escenarios cargados', async () => {
        listInstMock.mockResolvedValue([INSTITUCION]);
        render(<GdsAnalisisNuevo />);

        expect(screen.getByRole('heading', { name: /Crear análisis/i })).toBeInTheDocument();
        expect(await screen.findByText('Universidad Andina')).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Conflicto Universitario' }),
        ).toBeInTheDocument();
    });

    it('degrada con elegancia cuando el listado de instituciones falla', async () => {
        listInstMock.mockRejectedValue(new Error('endpoint no disponible'));
        render(<GdsAnalisisNuevo />);

        expect(
            await screen.findByText(/No se pudieron cargar las instituciones/i, undefined, {
                timeout: 5000,
            }),
        ).toBeInTheDocument();
    });

    it('crea el análisis y anuncia el inicio del ciclo (Req. 8.1, 8.5)', async () => {
        listInstMock.mockResolvedValue([INSTITUCION]);
        createMock.mockResolvedValue({
            id: 'a1',
            nombre: 'Estudio',
            descripcion: '',
            estado: 'PENDIENTE',
            total_semanas: 24,
            instituciones: 1,
        });
        render(<GdsAnalisisNuevo />);

        await screen.findByText('Universidad Andina');

        await userEvent.type(
            screen.getByLabelText('Nombre del análisis'),
            'Estudio U Andina',
        );
        await userEvent.click(
            screen.getByRole('checkbox', { name: /Universidad Andina/i }),
        );
        await userEvent.selectOptions(
            screen.getByLabelText('Escenario de la biblioteca'),
            'esc-1',
        );
        await userEvent.click(screen.getByRole('button', { name: /Crear análisis/i }));

        await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
        expect(createMock.mock.calls[0][0]).toMatchObject({
            nombre: 'Estudio U Andina',
            institucionIds: ['i1'],
            escenario_id: 'esc-1',
        });
        expect(
            await screen.findByText(/Se inició el ciclo inicial de simulación/i),
        ).toBeInTheDocument();
    });

    it('bloquea el alta sin institución y muestra el error de validación (Req. 8.4)', async () => {
        listInstMock.mockResolvedValue([INSTITUCION]);
        render(<GdsAnalisisNuevo />);

        await screen.findByText('Universidad Andina');

        await userEvent.type(screen.getByLabelText('Nombre del análisis'), 'Sin instituciones');
        await userEvent.selectOptions(
            screen.getByLabelText('Escenario de la biblioteca'),
            'esc-1',
        );
        await userEvent.click(screen.getByRole('button', { name: /Crear análisis/i }));

        expect(
            await screen.findByText(/Selecciona al menos una institución/i),
        ).toBeInTheDocument();
        expect(createMock).not.toHaveBeenCalled();
    });
});
