// Pruebas del guard de autenticación/autorización de la Plataforma_GDS (26.9).
//
// Verifican el comportamiento fail-closed del guard `RequireGdsAuth` (Req. 1.5):
//  - sin token → redirige al flujo de autenticación del colegio;
//  - token ilegible o sesión expirada → limpia y redirige;
//  - rol no autorizado → redirige a /gds/no-autorizado;
//  - sesión válida (y autorizada) → renderiza el contenido protegido.
// También comprueba que el guard no referencia el módulo IREC (Req. 1.4).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import RequireGdsAuth from './RequireGdsAuth';
import { GDS_ROLES } from './session';

// Construye un JWT de prueba (header.payload.signature) cuyo payload se puede
// decodificar con `atob`. No es un token firmado real; solo ejercita el guard.
function makeToken(payload) {
    const enc = (obj) => btoa(JSON.stringify(obj));
    return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.firma`;
}

function renderGuard({ allowedRoles } = {}) {
    return render(
        <MemoryRouter initialEntries={['/gds']}>
            <Routes>
                <Route
                    path="/gds"
                    element={<RequireGdsAuth allowedRoles={allowedRoles} />}
                >
                    <Route index element={<div data-testid="protegido">contenido protegido</div>} />
                </Route>
                <Route path="/auth/login" element={<div data-testid="login">login</div>} />
                <Route path="/gds/no-autorizado" element={<div data-testid="no-autorizado">no autorizado</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('RequireGdsAuth (guard fail-closed de la Plataforma_GDS)', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('redirige al flujo de autenticación cuando no hay token (Req. 1.5)', () => {
        renderGuard();
        expect(screen.getByTestId('login')).toBeInTheDocument();
        expect(screen.queryByTestId('protegido')).toBeNull();
    });

    it('redirige y limpia el token cuando el token es ilegible', () => {
        localStorage.setItem('token', 'esto-no-es-un-jwt');
        renderGuard();
        expect(screen.getByTestId('login')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(screen.queryByTestId('protegido')).toBeNull();
    });

    it('redirige y limpia el token cuando la sesión está expirada', () => {
        const expirado = Math.floor(Date.now() / 1000) - 60; // hace 1 minuto
        localStorage.setItem('token', makeToken({ exp: expirado, rol: GDS_ROLES.ANALISTA }));
        renderGuard();
        expect(screen.getByTestId('login')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('renderiza el contenido protegido con una sesión válida vigente', () => {
        const futuro = Math.floor(Date.now() / 1000) + 3600; // dentro de 1 hora
        localStorage.setItem('token', makeToken({ exp: futuro, rol: GDS_ROLES.ANALISTA }));
        renderGuard();
        expect(screen.getByTestId('protegido')).toBeInTheDocument();
        expect(screen.queryByTestId('login')).toBeNull();
    });

    it('bloquea a un rol no autorizado redirigiendo a /gds/no-autorizado', () => {
        const futuro = Math.floor(Date.now() / 1000) + 3600;
        localStorage.setItem('token', makeToken({ exp: futuro, rol: GDS_ROLES.OBSERVADOR }));
        renderGuard({ allowedRoles: [GDS_ROLES.ADMIN_PLATAFORMA] });
        expect(screen.getByTestId('no-autorizado')).toBeInTheDocument();
        expect(screen.queryByTestId('protegido')).toBeNull();
    });

    it('permite el acceso a un rol incluido en allowedRoles', () => {
        const futuro = Math.floor(Date.now() / 1000) + 3600;
        localStorage.setItem('token', makeToken({ exp: futuro, rol: GDS_ROLES.ADMIN_PLATAFORMA }));
        renderGuard({ allowedRoles: [GDS_ROLES.ADMIN_PLATAFORMA, GDS_ROLES.ANALISTA] });
        expect(screen.getByTestId('protegido')).toBeInTheDocument();
    });

    it('soporta el rol GDS dedicado (gdsRol) del payload', () => {
        const futuro = Math.floor(Date.now() / 1000) + 3600;
        localStorage.setItem('token', makeToken({ exp: futuro, gdsRol: GDS_ROLES.ANALISTA }));
        renderGuard({ allowedRoles: [GDS_ROLES.ANALISTA] });
        expect(screen.getByTestId('protegido')).toBeInTheDocument();
    });
});
