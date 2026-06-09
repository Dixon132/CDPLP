// Configuración de Playwright para las pruebas E2E de la Plataforma_GDS
// (Frontend_GDS, diseño D15; tarea 26.12).
//
// Objetivos de diseño:
//  - SELF-CONTAINED: `webServer` compila la app (Vite) y la sirve con `preview`
//    en un puerto fijo, de modo que `npx playwright test` no necesita que el
//    desarrollador arranque nada a mano ni deje servidores de larga ejecución.
//  - NO INTERACTIVO / DETERMINISTA: sin modo watch, reintentos acotados, un solo
//    worker para que el orden y el `webServer` sean estables; los flujos `/gds`
//    degradan con elegancia y los specs interceptan el backend (`/api/gds/**`),
//    así la suite corre sin `ServidorGDS` en vivo.
//  - CI: el workflow (tarea 27.3) detecta este archivo y ejecuta
//    `npx playwright install --with-deps && npx playwright test`.
import { defineConfig, devices } from '@playwright/test';

/** Puerto propio para `vite preview` durante las E2E (evita colisiones). */
const PORT = 4318;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './e2e',
    // No mezclar con las pruebas de Vitest (viven en `src/**/*.test.*`).
    testMatch: '**/*.e2e.ts',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    // Tiempo máximo razonable por test (la app degrada rápido sin backend).
    timeout: 30_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        // El backend autónomo apunta a otro origen; las llamadas se interceptan en
        // los specs. Mantener cabeceras limpias y sin estado compartido entre tests.
        actionTimeout: 10_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Compila y sirve la SPA de producción de forma autosuficiente. `preview`
    // sirve `dist/`, por lo que primero se ejecuta `build`. `--strictPort` evita
    // que Vite cambie de puerto en silencio. Apuntamos `VITE_GDS_API_URL` a un
    // host inexistente para que el backend quede claramente fuera de juego (los
    // specs además interceptan `/api/gds/**`).
    webServer: {
        command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            VITE_GDS_API_URL: 'http://127.0.0.1:59999',
        },
    },
});
