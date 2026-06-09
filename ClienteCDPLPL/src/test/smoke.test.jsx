// Prueba smoke para confirmar que la cadena de herramientas de pruebas
// (vitest + @testing-library/react + jsdom + jest-dom) funciona correctamente.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function Hello({ name }) {
    return <h1>Hola, {name}</h1>;
}

describe('toolchain de pruebas (smoke)', () => {
    it('ejecuta aserciones básicas de JavaScript', () => {
        expect(1 + 1).toBe(2);
    });

    it('renderiza un componente React y consulta el DOM con jest-dom', () => {
        render(<Hello name="GDS" />);
        expect(screen.getByRole('heading', { name: 'Hola, GDS' })).toBeInTheDocument();
    });
});
