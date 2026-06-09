// Pruebas del formulario de institución (React Hook Form + Zod, tarea 26.4).
//
// Verifican la validación (nombre, categoría, ubicación obligatoria, radio > 0)
// y el envío con valores válidos (Req. 7.1, 7.3, 7.7). El selector de mapa
// (Leaflet) se mockea para no inicializar el mapa en jsdom: expone un botón que
// simula la selección de coordenadas.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InstitucionFormulario } from './InstitucionFormulario';

vi.mock('./InstitucionMapaSelector', () => ({
    InstitucionMapaSelector: ({
        onSelect,
    }: {
        onSelect: (lat: number, lng: number) => void;
    }) => (
        <button type="button" onClick={() => onSelect(-16.5, -68.15)}>
            simular-seleccion-mapa
        </button>
    ),
    default: () => null,
}));

describe('InstitucionFormulario (RHF + Zod)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('muestra errores de validación y no envía cuando el formulario está vacío', async () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();
        render(<InstitucionFormulario onSubmit={onSubmit} onCancel={onCancel} />);

        await userEvent.click(screen.getByRole('button', { name: /Crear institución/i }));

        expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
        expect(screen.getByText('Selecciona una categoría válida.')).toBeInTheDocument();
        expect(screen.getByText('Selecciona la ubicación en el mapa.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('envía los valores cuando el formulario es válido', async () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();
        render(<InstitucionFormulario onSubmit={onSubmit} onCancel={onCancel} />);

        await userEvent.type(screen.getByLabelText('Nombre'), 'Universidad Andina');
        await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'universidad');
        // Simula fijar la ubicación en el mapa.
        await userEvent.click(screen.getByRole('button', { name: /simular-seleccion-mapa/i }));

        await userEvent.click(screen.getByRole('button', { name: /Crear institución/i }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                nombre: 'Universidad Andina',
                categoria: 'universidad',
                latitud: -16.5,
                longitud: -68.15,
            }),
        );
    });

    it('precarga los valores en modo edición', () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();
        render(
            <InstitucionFormulario
                institucion={{
                    id: 'i1',
                    nombre: 'Colegio San Andrés',
                    categoria: 'colegio',
                    latitud: -16.4,
                    longitud: -68.1,
                    radio_metros: 800,
                    logo_url: '',
                    descripcion: 'desc',
                }}
                onSubmit={onSubmit}
                onCancel={onCancel}
            />,
        );

        expect(screen.getByLabelText('Nombre')).toHaveValue('Colegio San Andrés');
        expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
    });

    it('invoca onCancel al cancelar', async () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();
        render(<InstitucionFormulario onSubmit={onSubmit} onCancel={onCancel} />);

        await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
