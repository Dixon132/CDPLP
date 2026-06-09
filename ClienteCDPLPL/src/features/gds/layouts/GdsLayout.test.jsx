// Pruebas de componente del layout propio de la Plataforma_GDS (Tarea 26.9).
//
// Verifican que `GdsLayout` renderiza SU PROPIO layout enterprise — distinto
// del `DashboardLayout` del colegio — y que no comparte ni referencia el módulo
// IREC anterior (Req. 1.1, 1.4). El layout renderiza las rutas hijas en su
// <Outlet /> y ofrece su propia navegación.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import GdsLayout from './GdsLayout';
import { DashboardLayout } from '../../../layouts/DashboardLayout';

// Renderiza el layout con una ruta hija marcada para comprobar el <Outlet />.
function renderLayout(initialEntries = ['/gds']) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/gds" element={<GdsLayout />}>
                    <Route index element={<div data-testid="contenido-hijo">contenido</div>} />
                </Route>
                <Route path="/auth/login" element={<div data-testid="login">login</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('GdsLayout (layout propio de la Plataforma_GDS)', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('renderiza su propio chrome enterprise (sidebar/topbar/footer GDS)', () => {
        renderLayout();

        // Navegación propia de la sección (aria-label exclusivo de GDS).
        // El <aside> con `aria-label` expone el rol `complementary`.
        expect(
            screen.getByRole('complementary', { name: /Navegación de la Plataforma GDS/i })
        ).toBeInTheDocument();

        // Marca y título propios de la plataforma.
        expect(screen.getByText('Plataforma GDS')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Análisis de Tendencias de Riesgo Emocional/i })
        ).toBeInTheDocument();

        // Pie de página que declara su independencia del dashboard del colegio.
        expect(
            screen.getByText(/Sección independiente del dashboard del colegio/i)
        ).toBeInTheDocument();
    });

    it('es un componente distinto del DashboardLayout del colegio', () => {
        // Distinción a nivel de referencia: son componentes diferentes.
        expect(GdsLayout).not.toBe(DashboardLayout);

        renderLayout();
        // El pie del colegio ("© 2025 dashboard") NO aparece en el layout GDS.
        expect(screen.queryByText(/©\s*2025\s*dashboard\b/i)).toBeNull();
        // El pie propio de GDS sí aparece.
        expect(screen.getByText(/©\s*2025\s*Plataforma GDS/i)).toBeInTheDocument();
    });

    it('renderiza la ruta hija en su <Outlet />', () => {
        renderLayout();
        expect(screen.getByTestId('contenido-hijo')).toBeInTheDocument();
    });

    it('expone su propia navegación de sección (Panel, Instituciones, Análisis, Trazabilidad, Reportes)', () => {
        renderLayout();
        const nav = screen.getByRole('complementary', { name: /Navegación de la Plataforma GDS/i });

        expect(within(nav).getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/gds');
        expect(within(nav).getByRole('link', { name: 'Instituciones' })).toHaveAttribute(
            'href',
            '/gds/instituciones'
        );
        expect(within(nav).getByRole('link', { name: 'Análisis' })).toHaveAttribute(
            'href',
            '/gds/analisis/nuevo'
        );
        expect(within(nav).getByRole('link', { name: 'Trazabilidad' })).toHaveAttribute(
            'href',
            '/gds/trazabilidad'
        );
        expect(within(nav).getByRole('link', { name: 'Reportes' })).toHaveAttribute(
            'href',
            '/gds/reportes'
        );
    });

    it('no comparte ni referencia el módulo IREC anterior (Req. 1.4)', () => {
        const { container } = renderLayout();
        // Ningún texto/enlace de la navegación o del chrome menciona IREC.
        expect(container.textContent).not.toMatch(/irec/i);
        expect(screen.queryByRole('link', { name: /irec/i })).toBeNull();
    });

    it('cierra sesión limpiando el token y redirige al flujo de autenticación', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'token-de-prueba');
        renderLayout();

        await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }));

        expect(localStorage.getItem('token')).toBeNull();
        expect(screen.getByTestId('login')).toBeInTheDocument();
    });
});
