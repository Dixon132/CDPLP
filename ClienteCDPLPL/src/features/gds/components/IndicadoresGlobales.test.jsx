// Pruebas de componente de los indicadores globales del panel GDS (26.11).
//
// Verifican que `IndicadoresGlobales` (Req. 21.1, 21.5) renderiza sus dos
// secciones propias (indicadores y evolución histórica) y que DEGRADA CON
// ELEGANCIA: muestra estados informativos cuando no hay datos o cuando la
// sección no está disponible, en lugar de romperse.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import IndicadoresGlobales from './IndicadoresGlobales';

describe('IndicadoresGlobales (panel principal GDS)', () => {
    it('muestra estados vacíos cuando no se proveen datos', () => {
        render(<IndicadoresGlobales />);

        // Ambas secciones propias siempre se renderizan.
        expect(
            screen.getByRole('region', { name: /Indicadores globales/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /Evolución histórica/i }),
        ).toBeInTheDocument();

        // Mensajes informativos de estado vacío (degradación elegante).
        expect(screen.getByText('Sin indicadores')).toBeInTheDocument();
        expect(screen.getByText('Sin históricos')).toBeInTheDocument();
    });

    it('muestra el estado vacío aunque la sección no esté disponible pese a tener datos', () => {
        render(
            <IndicadoresGlobales
                indicadores={[{ nombre: 'Ansiedad', valor: 5 }]}
                historicos={[{ periodo: '2025-01', valor: 3 }]}
                disponibleIndicadores={false}
                disponibleHistoricos={false}
            />,
        );

        expect(screen.getByText('Sin indicadores')).toBeInTheDocument();
        expect(screen.getByText('Sin históricos')).toBeInTheDocument();
    });

    it('no muestra los estados vacíos cuando hay datos disponibles', () => {
        render(
            <IndicadoresGlobales
                indicadores={[
                    { nombre: 'Ansiedad', valor: 5 },
                    { nombre: 'Aislamiento', valor: 2 },
                ]}
                historicos={[
                    { periodo: '2025-01', valor: 3 },
                    { periodo: '2025-02', valor: 4 },
                ]}
            />,
        );

        // Con datos, los paneles de "sin datos" no deben aparecer.
        expect(screen.queryByText('Sin indicadores')).toBeNull();
        expect(screen.queryByText('Sin históricos')).toBeNull();

        // Las secciones siguen presentes con sus encabezados.
        expect(
            screen.getByRole('region', { name: /Indicadores globales/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /Evolución histórica/i }),
        ).toBeInTheDocument();
    });
});
