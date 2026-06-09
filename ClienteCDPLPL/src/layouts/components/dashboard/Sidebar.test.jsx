// Pruebas del punto de acceso a la Plataforma_GDS y del retiro del módulo IREC
// en el `Sidebar` del dashboard del colegio (tarea 26.13).
//
// Verifican, de forma estructural y determinista (sin red ni interacción):
//  - el dashboard del colegio expone el punto de acceso a `/gds` para usuarios
//    autenticados con un rol definido (Req. 1.1);
//  - el `Sidebar` ya no muestra ninguna entrada de navegación del módulo IREC
//    anterior ni un enlace a `/dashboard/modelo` (Req. 1.3, 1.4);
//  - un usuario sin rol definido (`NO_DEFINIDO`) no recibe el acceso a `/gds`.
//
// El `Sidebar` lee el rol desde el JWT almacenado en `localStorage`
// (`parseToken(token).rol.rol`), por lo que cada prueba siembra un token de
// prueba con la forma esperada por el componente.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Sidebar from './Sidebar';

// Construye un JWT de prueba (header.payload.signature) cuyo payload se puede
// decodificar con `atob`. No es un token firmado real; solo alimenta al
// componente con el rol. El `Sidebar` espera `payload.rol.rol`.
function makeToken(rol) {
    const enc = (obj) => btoa(JSON.stringify(obj));
    return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ rol: { rol } })}.firma`;
}

function renderSidebar(rol) {
    if (rol) {
        localStorage.setItem('token', makeToken(rol));
    }
    return render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Sidebar collapsed={false} />
        </MemoryRouter>
    );
}

describe('Sidebar del colegio: acceso a la Plataforma_GDS y retiro de IREC', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        localStorage.clear();
    });

    it('expone el punto de acceso a /gds para un usuario autenticado (Req. 1.1)', () => {
        renderSidebar('PRESIDENTE');

        const enlaceGds = screen.getByRole('link', { name: /Plataforma GDS/i });
        expect(enlaceGds).toBeInTheDocument();
        expect(enlaceGds).toHaveAttribute('href', '/gds');
    });

    it('ofrece el acceso a /gds para distintos roles autenticados', () => {
        for (const rol of ['SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']) {
            const { unmount } = renderSidebar(rol);
            const enlaceGds = screen.getByRole('link', { name: /Plataforma GDS/i });
            expect(enlaceGds).toHaveAttribute('href', '/gds');
            unmount();
            localStorage.clear();
        }
    });

    it('no expone el módulo IREC anterior en la navegación (Req. 1.3, 1.4)', () => {
        renderSidebar('PRESIDENTE');

        // Ningún texto de la navegación menciona el módulo IREC anterior.
        expect(screen.queryByText(/IREC/i)).toBeNull();
        expect(screen.queryByRole('link', { name: /IREC/i })).toBeNull();

        // Ningún enlace apunta a la antigua ruta `/dashboard/modelo`.
        const enlacesAModelo = screen
            .getAllByRole('link')
            .filter((a) => (a.getAttribute('href') || '').includes('/dashboard/modelo'));
        expect(enlacesAModelo).toHaveLength(0);
    });

    it('no entrega el acceso a /gds cuando el rol no está definido', () => {
        renderSidebar('NO_DEFINIDO');

        expect(screen.queryByRole('link', { name: /Plataforma GDS/i })).toBeNull();
    });
});
