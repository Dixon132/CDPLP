// Pruebas de componente de los estados de ejecución del panel GDS (26.11).
//
// Verifican que `EstadosEjecucion` (Req. 21.3, 21.4) lista los análisis con su
// estado y progreso, refleja el indicador de conexión en vivo (WS Hub),
// fusiona el último progreso recibido por WS sobre el cargado por HTTP y
// degrada con elegancia cuando no hay datos o la sección no está disponible.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import EstadosEjecucion from './EstadosEjecucion';

describe('EstadosEjecucion (estados de ejecución del panel GDS)', () => {
    it('muestra un estado informativo cuando no hay análisis', () => {
        render(<EstadosEjecucion analisis={[]} />);
        expect(screen.getByText(/Aún no hay análisis registrados/i)).toBeInTheDocument();
    });

    it('muestra un mensaje distinto cuando la sección no está disponible', () => {
        render(<EstadosEjecucion analisis={[]} disponible={false} />);
        expect(
            screen.getByText(/El resumen de análisis no está disponible por el momento/i),
        ).toBeInTheDocument();
    });

    it('indica "Sin conexión en vivo" por defecto y "En vivo" cuando está conectado', () => {
        const { rerender } = render(<EstadosEjecucion analisis={[]} />);
        expect(screen.getByText(/Sin conexión en vivo/i)).toBeInTheDocument();

        rerender(<EstadosEjecucion analisis={[]} estadoConexion="conectado" />);
        expect(screen.getByText('En vivo')).toBeInTheDocument();
    });

    it('lista cada análisis con su nombre, estado y barra de progreso', () => {
        render(
            <EstadosEjecucion
                analisis={[
                    {
                        id: 'a1',
                        nombre: 'Análisis Norte',
                        estado: 'EN_PROCESO',
                        semanaActual: 5,
                        totalSemanas: 10,
                        instituciones: 3,
                        escenario: 'Base',
                    },
                ]}
            />,
        );

        const item = screen.getByText('Análisis Norte').closest('li');
        expect(item).not.toBeNull();
        const u = within(item);
        // Etiqueta legible del estado EN_PROCESO ("En curso").
        expect(u.getByText('En curso')).toBeInTheDocument();
        // Progreso semana 5 de 10 → 50%.
        expect(u.getByText(/Semana 5 de 10 \(50%\)/i)).toBeInTheDocument();
        expect(u.getByText(/Escenario: Base/i)).toBeInTheDocument();
    });

    it('fusiona el progreso recibido por WS por encima del valor HTTP', () => {
        render(
            <EstadosEjecucion
                estadoConexion="conectado"
                analisis={[
                    {
                        id: 'a1',
                        nombre: 'Análisis Sur',
                        estado: 'EN_PROCESO',
                        semanaActual: 2,
                        totalSemanas: 8,
                        instituciones: 1,
                    },
                ]}
                progresoPorAnalisis={{
                    a1: { estado: 'COMPLETADO', numeroSemana: 8 },
                }}
            />,
        );

        const item = screen.getByText('Análisis Sur').closest('li');
        const u = within(item);
        // El estado y la semana provienen del progreso en vivo, no del HTTP.
        expect(u.getByText('Completado')).toBeInTheDocument();
        expect(u.getByText(/Semana 8 de 8 \(100%\)/i)).toBeInTheDocument();
        expect(u.getByText(/actualización en vivo/i)).toBeInTheDocument();
    });

    it('omite la barra de progreso cuando no hay total de semanas', () => {
        render(
            <EstadosEjecucion
                analisis={[
                    { id: 'a1', nombre: 'Sin total', estado: 'PENDIENTE', instituciones: 0 },
                ]}
            />,
        );
        expect(screen.queryByText(/Semana/i)).toBeNull();
    });
});
