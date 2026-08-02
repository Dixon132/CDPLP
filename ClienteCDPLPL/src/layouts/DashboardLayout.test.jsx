// Pruebas del shell del dashboard tras el rediseño.
//
// Verifican de forma estructural (sin red real) que:
//  - el sidebar agrupa los módulos por sección y respeta el rol;
//  - el header muestra el usuario REAL devuelto por /me (antes estaba escrito
//    a mano) y su "Cerrar sesión" borra el token de localStorage;
//  - existe el disparador del buscador global;
//  - la navegación móvil se renderiza junto al sidebar (cada uno se muestra en
//    su breakpoint vía clases de Tailwind).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// El perfil se pide a POST /api/usuarios/auth/me; aquí se simula.
vi.mock('../features/dashboard/services/usuarios', () => ({
    getMe: vi.fn(() =>
        Promise.resolve({
            id_usuario: 7,
            nombre: 'Ana',
            apellido: 'Quispe',
            correo: 'ana.quispe@cdplp.bo',
        })
    ),
}));

// El mapa de permisos se pide a GET /api/permisos/mis-permisos; aquí se simula
// con la misma matriz "cero-regresión" sembrada en Servidor/prisma/seedPermisos.ts,
// leyendo el rol del token de la misma forma que lo haría el backend real.
vi.mock('../features/dashboard/services/permisos', () => {
    const TODOS_RECURSOS = [
        'dashboard', 'colegiados', 'colegiados.invitados', 'colegiados.pasantes', 'colegiados.postulaciones',
        'usuarios', 'usuarios.roles', 'usuarios.permisos', 'actividades_sociales', 'actividades_sociales.convenios',
        'actividades_institucionales', 'memorias', 'tesoreria', 'informes', 'correspondencia',
        'correspondencia.buzon', 'auditorias', 'ajustes', 'ajustes.especialidades', 'ajustes.instituciones',
        'ajustes.documentos_requeridos', 'ajustes.pagos', 'ajustes.financiero',
    ];
    const EDITOR_POR_ROL = {
        PRESIDENTE: TODOS_RECURSOS,
        TESORERO: [
            'usuarios.roles', 'actividades_sociales.convenios', 'tesoreria', 'informes', 'correspondencia.buzon',
            'ajustes', 'ajustes.especialidades', 'ajustes.instituciones', 'ajustes.documentos_requeridos',
            'ajustes.pagos', 'ajustes.financiero',
        ],
    };
    return {
        getMisPermisos: vi.fn(() => {
            const token = localStorage.getItem('token');
            const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
            const permitidos = EDITOR_POR_ROL[payload?.rol?.rol] ?? [];
            const mapa = Object.fromEntries(
                TODOS_RECURSOS.map((clave) => [clave, permitidos.includes(clave) ? 'EDITOR' : 'SIN_ACCESO'])
            );
            return Promise.resolve(mapa);
        }),
    };
});

import { DashboardLayout } from './DashboardLayout';
import { AppearanceProvider } from '../context/AppearanceProvider';

function makeToken(rol) {
    const enc = (obj) => btoa(JSON.stringify(obj));
    const ahora = Math.floor(Date.now() / 1000);
    return [
        enc({ alg: 'HS256', typ: 'JWT' }),
        enc({
            userId: 7,
            rol: {
                rol,
                fecha_inicio: '2020-01-01T00:00:00.000Z',
                fecha_fin: '2030-01-01T00:00:00.000Z',
                activo: true,
            },
            iat: ahora,
            exp: ahora + 3600,
        }),
        'firma',
    ].join('.');
}

const renderShell = (rol = 'PRESIDENTE') => {
    localStorage.setItem('token', makeToken(rol));
    return render(
        <AppearanceProvider>
            <MemoryRouter initialEntries={['/dashboard/colegiados']}>
                <Routes>
                    <Route path="/dashboard/*" element={<DashboardLayout />} />
                    <Route path="/auth/login" element={<div>pantalla de login</div>} />
                </Routes>
            </MemoryRouter>
        </AppearanceProvider>
    );
};

describe('Shell del dashboard', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('agrupa la navegación por secciones', async () => {
        renderShell('PRESIDENTE');
        const nav = await screen.findByRole('navigation', { name: /navegación principal/i, hidden: true });

        for (const seccion of ['Personas', 'Actividades', 'Finanzas', 'Sistema']) {
            expect(within(nav).getByText(seccion)).toBeInTheDocument();
        }
    });

    it('solo ofrece los módulos permitidos al rol', async () => {
        renderShell('TESORERO');
        const nav = await screen.findByRole('navigation', { name: /navegación principal/i, hidden: true });

        // TESORERO ve Tesorería y Buzón…
        expect(within(nav).getByRole('link', { hidden: true, name: /Tesoreria/i })).toBeInTheDocument();
        // …pero no Usuarios ni Auditorías.
        expect(within(nav).queryByRole('link', { hidden: true, name: /Usuarios/i })).toBeNull();
        expect(within(nav).queryByRole('link', { hidden: true, name: /Auditorias/i })).toBeNull();
    });

    it('el buzón del TESORERO apunta a la ruta en minúsculas', async () => {
        renderShell('TESORERO');
        const nav = await screen.findByRole('navigation', { name: /navegación principal/i, hidden: true });
        const buzon = within(nav).getByRole('link', { hidden: true, name: /Buzon/i });
        // Antes apuntaba a /dashboard/Buzon, que no existe como ruta.
        expect(buzon).toHaveAttribute('href', '/dashboard/buzon');
    });

    it('muestra el usuario real devuelto por /me, no uno escrito a mano', async () => {
        renderShell('PRESIDENTE');
        expect(await screen.findAllByText('Ana Quispe')).not.toHaveLength(0);
        expect(screen.queryByText(/Diego Alex/i)).toBeNull();
        expect(screen.queryByText(/diego\.alex@cdplp\.com/i)).toBeNull();
    });

    it('expone el disparador del buscador global', async () => {
        renderShell('PRESIDENTE');
        expect(
            await screen.findByRole('button', { name: /abrir buscador global/i })
        ).toBeInTheDocument();
    });

    it('cerrar sesión borra el token', async () => {
        const user = userEvent.setup();
        renderShell('PRESIDENTE');
        await screen.findAllByText('Ana Quispe');
        expect(localStorage.getItem('token')).toBeTruthy();

        // `hidden: true` porque en jsdom el sidebar queda display:none por la
        // clase `hidden` de Tailwind (vitest sí procesa el CSS).
        const [salir] = screen.getAllByRole('button', { hidden: true, name: /cerrar sesión/i });
        await user.click(salir);

        expect(localStorage.getItem('token')).toBeNull();
    });

    it('aplica el tema al contenedor del dashboard, no a <html>', async () => {
        localStorage.setItem('cdplp_apariencia', JSON.stringify({ tema: 'oscuro', fuente: 'tecnica' }));
        const { container } = renderShell('PRESIDENTE');
        await screen.findAllByText('Ana Quispe');

        // El shell lleva los data-* y la clase .dashboard-shell que acota el CSS.
        const shell = container.querySelector('.dashboard-shell');
        expect(shell).toBeTruthy();
        expect(shell.dataset.theme).toBe('oscuro');
        expect(shell.dataset.font).toBe('tecnica');

        // <html> queda intacto — el sitio público no debe recibir el tema.
        expect(document.documentElement.dataset.theme).toBeUndefined();
        expect(document.documentElement.dataset.font).toBeUndefined();
    });

    it('el switch del header alterna claro y oscuro', async () => {
        const user = userEvent.setup();
        const { container } = renderShell('PRESIDENTE');
        await screen.findAllByText('Ana Quispe');

        const shell = container.querySelector('.dashboard-shell');
        expect(shell.dataset.theme).toBe('claro');

        const switchTema = screen.getByRole('switch', { name: /cambiar a tema oscuro/i });
        await user.click(switchTema);
        expect(shell.dataset.theme).toBe('oscuro');

        // El aria-label se actualiza cuando cambia el tema.
        await user.click(screen.getByRole('switch', { name: /cambiar a tema claro/i }));
        expect(shell.dataset.theme).toBe('claro');
    });

    it('renderiza la navegación móvil con su propio nombre accesible', async () => {
        renderShell('PRESIDENTE');
        // Sidebar y barra inferior son landmarks distintos.
        expect(
            await screen.findByRole('navigation', { name: /navegación rápida/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('navigation', { name: /navegación principal/i, hidden: true })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ver más opciones/i })).toBeInTheDocument();
    });
});
