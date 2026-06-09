// Pruebas de la vista de acceso no autorizado de la Plataforma_GDS (26.11).
//
// Es el destino al que el guard `RequireGdsAuth` redirige a una sesión válida
// sin rol GDS autorizado (Req. 1.5). Verifican que informa el bloqueo, ofrece
// un enlace de regreso al panel y no referencia el módulo IREC (Req. 1.4).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import GdsNoAutorizado from './GdsNoAutorizado';

function renderPage() {
    return render(
        <MemoryRouter>
            <GdsNoAutorizado />
        </MemoryRouter>,
    );
}

describe('GdsNoAutorizado (vista de acceso no autorizado GDS)', () => {
    it('informa que la cuenta no tiene un rol autorizado', () => {
        renderPage();
        expect(
            screen.getByRole('heading', { name: /Acceso no autorizado/i }),
        ).toBeInTheDocument();
        expect(screen.getByText(/no cuenta con un rol con permisos/i)).toBeInTheDocument();
    });

    it('ofrece un enlace de regreso al panel GDS (/gds)', () => {
        renderPage();
        expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
            'href',
            '/gds',
        );
    });

    it('no referencia el módulo IREC anterior (Req. 1.4)', () => {
        const { container } = renderPage();
        expect(container.textContent).not.toMatch(/irec/i);
    });
});
