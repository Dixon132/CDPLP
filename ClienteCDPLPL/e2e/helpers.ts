// Utilidades compartidas por las pruebas E2E de la Plataforma_GDS (tarea 26.12).
//
// Mantienen los specs deterministas y sin dependencia de `ServidorGDS` en vivo:
//  - `stubGdsBackend` intercepta todo el tráfico al backend autónomo
//    (`/api/gds/**`) y al hub de WebSockets (`/socket.io/**`), devolviendo
//    respuestas controladas. Las vistas `/gds` DEGRADAN CON ELEGANCIA, así que
//    con esto la UI se renderiza completa sin backend real.
//  - `seedGdsSession` siembra en `localStorage` un JWT sintético (con la misma
//    forma que valida el guard `RequireGdsAuth`) ANTES de que cargue la app, de
//    modo que el acceso autenticado sea reproducible.
import type { Page } from '@playwright/test';

/** Ruta del flujo de autenticación del colegio (destino del fail-closed). */
export const RUTA_LOGIN = '/auth/login';

/**
 * Construye un JWT sintético `header.<payloadB64>.sig`. El guard solo decodifica
 * el segmento de payload (`atob` + `JSON.parse`), por lo que la firma es ficticia.
 *
 * @param exp Expiración en segundos desde epoch. Por defecto, dentro de 1 hora.
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
    // Codificación base64 estándar del payload (compatible con `atob`).
    const json = JSON.stringify(payload);
    const b64 =
        typeof btoa === 'function'
            ? btoa(json)
            : Buffer.from(json, 'utf-8').toString('base64');
    return `eyJhbGciOiJIUzI1NiJ9.${b64}.firma-ficticia-e2e`;
}

export interface SeedSessionOptions {
    /** Rol GDS a incluir en el payload. */
    rol?: 'ADMIN_PLATAFORMA' | 'ANALISTA' | 'OBSERVADOR';
    /** Si es `true`, la sesión queda expirada (para probar el fail-closed). */
    expirada?: boolean;
}

/**
 * Siembra una sesión GDS válida (o expirada) en `localStorage` antes de que la
 * app se ejecute. Usa `addInitScript`, que corre en cada navegación del contexto
 * antes de los scripts de la página.
 */
export async function seedGdsSession(
    page: Page,
    opts: SeedSessionOptions = {},
): Promise<void> {
    const ahoraSeg = Math.floor(Date.now() / 1000);
    const exp = opts.expirada ? ahoraSeg - 3600 : ahoraSeg + 3600;
    const token = buildFakeJwt({
        exp,
        rol: opts.rol ?? 'ADMIN_PLATAFORMA',
        gdsRol: opts.rol ?? 'ADMIN_PLATAFORMA',
        sub: 'e2e-user',
    });
    await page.addInitScript((t) => {
        window.localStorage.setItem('token', t as string);
    }, token);
}

/**
 * Intercepta las llamadas al backend autónomo de la Plataforma_GDS para que la
 * suite sea determinista y no necesite `ServidorGDS`. Devuelve respuestas vacías
 * y bien formadas (404 dispara las rutas de degradación; el panel construye su
 * forma vacía internamente). Corta también el handshake de WebSockets.
 */
export async function stubGdsBackend(page: Page): Promise<void> {
    // Hub de progreso (socket.io): abortar el handshake para no esperar a la red.
    await page.route('**/socket.io/**', (route) => route.abort());

    // API REST del backend autónomo (`/api/gds/**`), en cualquier host/origen.
    await page.route('**/api/gds/**', (route) =>
        route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'E2E: backend GDS no disponible (stub)' }),
        }),
    );
}
