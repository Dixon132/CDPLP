// Pruebas de la pantalla de gestión de instituciones (tarea 26.4).
//
// Verifican el listado, el estado vacío, la degradación elegante ante un
// backend no disponible y la apertura del formulario de alta (Req. 7.1, 7.4).
// La capa de API se mockea (red aislada) y el formulario se sustituye por un
// stub para no inicializar Leaflet en jsdom.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GdsInstitucionesAdmin from './GdsInstitucionesAdmin';
import { gdsQueryClient } from '../lib/queryClient';
import { listInstituciones } from '../api/institucionesApi';

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

// Stub del formulario: evita montar Leaflet/RHF en este test de integración.
vi.mock('../components/InstitucionFormulario', () => ({
    InstitucionFormulario: ({ onCancel }: { onCancel: () => void }) => (
        <div>
            <p>FORM_STUB</p>
            <button type="button" onClick={onCancel}>
                cancelar-stub
            </button>
        </div>
    ),
    default: () => null,
}));

const listMock = vi.mocked(listInstituciones);

describe('GdsInstitucionesAdmin (gestión de instituciones)', () => {
    beforeEach(() => {
        gdsQueryClient.clear();
        listMock.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
        gdsQueryClient.clear();
    });

    it('muestra el estado vacío cuando no hay instituciones', async () => {
        listMock.mockResolvedValue([]);
        render(<GdsInstitucionesAdmin />);

        expect(
            screen.getByRole('heading', { name: /Instituciones/i }),
        ).toBeInTheDocument();
        expect(
            await screen.findByText(/No hay instituciones registradas todavía\./i),
        ).toBeInTheDocument();
    });

    it('lista las instituciones cuando el backend responde (Req. 7.4)', async () => {
        listMock.mockResolvedValue([
            {
                id: 'i1',
                nombre: 'Universidad Andina',
                categoria: 'universidad',
                latitud: -16.5,
                longitud: -68.15,
                radio_metros: 500,
                logo_url: '',
                descripcion: '',
            },
        ]);

        render(<GdsInstitucionesAdmin />);

        expect(await screen.findByText('Universidad Andina')).toBeInTheDocument();
        expect(screen.getByText('-16.5000, -68.1500')).toBeInTheDocument();
    });

    it('degrada con elegancia cuando el listado falla', async () => {
        listMock.mockRejectedValue(new Error('endpoint no disponible'));

        render(<GdsInstitucionesAdmin />);

        expect(
            await screen.findByText(/endpoint no disponible/i, undefined, { timeout: 5000 }),
        ).toBeInTheDocument();
    });

    it('abre el formulario de alta al pulsar "Nueva institución"', async () => {
        listMock.mockResolvedValue([]);
        render(<GdsInstitucionesAdmin />);

        await screen.findByText(/No hay instituciones registradas todavía\./i);
        await userEvent.click(screen.getByRole('button', { name: /Nueva institución/i }));

        expect(screen.getByText('FORM_STUB')).toBeInTheDocument();
    });
});
