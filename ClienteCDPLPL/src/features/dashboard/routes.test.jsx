// Pruebas estructurales del retiro de la ruta del módulo IREC anterior del
// dashboard del colegio (tarea 26.13).
//
// Verifican que la configuración de rutas del dashboard del colegio
// (`dashboardRoutes`) ya no declara la ruta `modelo` (`IRECDashboard`) ni
// ninguna ruta del módulo IREC anterior (Req. 1.3, 1.4), conservando intactas
// las demás rutas del dashboard.
import { describe, it, expect } from 'vitest';

import { dashboardRoutes } from './routes';

// Recorre el árbol de rutas y devuelve todos los `path` declarados (en
// minúsculas) para inspeccionarlos de forma estable.
function recolectarPaths(rutas) {
    const paths = [];
    const visitar = (nodo) => {
        if (!nodo) return;
        if (Array.isArray(nodo)) {
            nodo.forEach(visitar);
            return;
        }
        if (typeof nodo.path === 'string') {
            paths.push(nodo.path.toLowerCase());
        }
        if (Array.isArray(nodo.children)) {
            nodo.children.forEach(visitar);
        }
    };
    visitar(rutas);
    return paths;
}

describe('dashboardRoutes del colegio: retiro de la ruta IREC', () => {
    it('monta el dashboard del colegio bajo /dashboard', () => {
        expect(dashboardRoutes.path).toBe('/dashboard');
        expect(Array.isArray(dashboardRoutes.children)).toBe(true);
    });

    it('ya no declara la ruta "modelo" del módulo IREC anterior (Req. 1.3, 1.4)', () => {
        const paths = recolectarPaths(dashboardRoutes);
        expect(paths).not.toContain('modelo');
        // Ningún path del dashboard contiene rastros del módulo IREC.
        expect(paths.some((p) => p.includes('modelo') || p.includes('irec'))).toBe(false);
    });

    it('conserva intactas otras rutas del dashboard del colegio', () => {
        const paths = recolectarPaths(dashboardRoutes);
        // Una muestra representativa de rutas que deben seguir presentes.
        for (const esperado of ['usuarios', 'colegiados', 'tesoreria', 'correspondencia']) {
            expect(paths).toContain(esperado);
        }
    });
});
