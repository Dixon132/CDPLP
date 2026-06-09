// Pruebas E2E de la Plataforma_GDS (Playwright) — tarea 26.12, diseño D15.
//
// Cubren los flujos clave de `/gds` de forma determinista y sin `ServidorGDS`
// en vivo (las vistas degradan con elegancia y el backend se intercepta):
//   - Acceso sin sesión a una ruta `/gds` → redirección al flujo de auth
//     (fail-closed, Req. 1.5).
//   - Sesión expirada → también redirige (fail-closed).
//   - Usuario autenticado llega al panel de la Plataforma_GDS con su LAYOUT
//     PROPIO (no el dashboard del colegio) (Req. 1.1, 1.2).
//   - Navegación a las secciones principales: instituciones, análisis/nuevo,
//     reportes y trazabilidad (Req. 8.1, 19.5, 22.4, 32.1).
import { test, expect, type Page, type Locator } from '@playwright/test';
import { RUTA_LOGIN, seedGdsSession, stubGdsBackend } from './helpers';

// Cada test parte de un backend interceptado para no depender de la red.
test.beforeEach(async ({ page }) => {
    await stubGdsBackend(page);
});

/**
 * Marcador estable del layout PROPIO de la Plataforma GDS, intencionalmente
 * distinto del `DashboardLayout` del colegio (Req. 1.1, 1.2): el encabezado
 * (h1) de la topbar enterprise. Solo existe cuando se monta `GdsLayout`.
 */
function encabezadoLayoutGds(page: Page): Locator {
    return page.getByRole('heading', {
        name: /Análisis de Tendencias de Riesgo Emocional/i,
    });
}

test.describe('Guard de autenticación /gds (fail-closed, Req. 1.5)', () => {
    test('acceso sin sesión a /gds redirige al flujo de autenticación', async ({ page }) => {
        await page.goto('/gds');
        await expect(page).toHaveURL(new RegExp(`${RUTA_LOGIN}$`));
        // No se montó el layout propio de la Plataforma GDS.
        await expect(encabezadoLayoutGds(page)).toHaveCount(0);
    });

    test('acceso sin sesión a una subruta /gds también redirige', async ({ page }) => {
        await page.goto('/gds/reportes');
        await expect(page).toHaveURL(new RegExp(`${RUTA_LOGIN}$`));
        await expect(page.getByRole('button', { name: /Cerrar sesión/i })).toHaveCount(0);
    });

    test('sesión expirada redirige al flujo de autenticación', async ({ page }) => {
        await seedGdsSession(page, { expirada: true });
        await page.goto('/gds');
        await expect(page).toHaveURL(new RegExp(`${RUTA_LOGIN}$`));
    });
});

test.describe('Acceso autenticado y layout propio (Req. 1.1, 1.2)', () => {
    test.beforeEach(async ({ page }) => {
        await seedGdsSession(page);
    });

    test('el usuario autenticado llega al panel GDS con su layout propio', async ({ page }) => {
        await page.goto('/gds');

        // Permanece en /gds (no redirige a login).
        await expect(page).toHaveURL(/\/gds$/);

        // Layout propio de la Plataforma GDS (enterprise), distinto del dashboard.
        await expect(encabezadoLayoutGds(page)).toBeVisible();
        await expect(page.getByRole('button', { name: /Cerrar sesión/i })).toBeVisible();

        // Contenido propio del panel principal (Req. 21.1).
        await expect(
            page.getByRole('heading', { name: /Panel de la Plataforma GDS/i }),
        ).toBeVisible();
    });
});

test.describe('Navegación a secciones principales', () => {
    test.beforeEach(async ({ page }) => {
        await seedGdsSession(page);
    });

    /** Navega por el sidebar y verifica la URL y un encabezado de la vista. */
    async function navegarYVerificar(
        page: Page,
        enlace: RegExp,
        urlEsperada: RegExp,
        encabezado: RegExp,
    ): Promise<void> {
        await page.goto('/gds');
        await expect(encabezadoLayoutGds(page)).toBeVisible();
        await page.getByRole('link', { name: enlace }).click();
        await expect(page).toHaveURL(urlEsperada);
        await expect(page.getByRole('heading', { name: encabezado })).toBeVisible();
    }

    test('navega a Instituciones (Req. 7.7)', async ({ page }) => {
        await navegarYVerificar(page, /^Instituciones$/, /\/gds\/instituciones$/, /^Instituciones$/);
    });

    test('navega a Crear análisis (Req. 8.1)', async ({ page }) => {
        await navegarYVerificar(page, /^Análisis$/, /\/gds\/analisis\/nuevo$/, /Crear análisis/i);
    });

    test('navega a Trazabilidad (Req. 22.4)', async ({ page }) => {
        await navegarYVerificar(
            page,
            /^Trazabilidad$/,
            /\/gds\/trazabilidad$/,
            /Trazabilidad del análisis/i,
        );
    });

    test('navega a Reportes (Req. 19.5)', async ({ page }) => {
        await navegarYVerificar(page, /^Reportes$/, /\/gds\/reportes$/, /^Reportes$/);
    });

    test('acceso directo por URL a cada sección monta el layout GDS', async ({ page }) => {
        for (const ruta of [
            '/gds/instituciones',
            '/gds/analisis/nuevo',
            '/gds/trazabilidad',
            '/gds/reportes',
        ]) {
            await page.goto(ruta);
            await expect(page).toHaveURL(new RegExp(`${ruta.replace(/\//g, '\\/')}$`));
            await expect(encabezadoLayoutGds(page)).toBeVisible();
        }
    });
});
