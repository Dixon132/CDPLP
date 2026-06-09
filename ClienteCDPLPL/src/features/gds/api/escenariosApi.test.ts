// Pruebas de la lógica pura del cliente TS de escenarios del feature `gds`
// (normalización y catálogo predefinido de respaldo). No tocan red ni DOM.
import { describe, it, expect } from 'vitest';
import { ESCENARIOS_PREDEFINIDOS, normalizeEscenario } from './escenariosApi';

describe('ESCENARIOS_PREDEFINIDOS (Req. 8.2)', () => {
    it('incluye los escenarios sugeridos del dominio con id y nombre', () => {
        expect(ESCENARIOS_PREDEFINIDOS.length).toBeGreaterThanOrEqual(6);
        for (const esc of ESCENARIOS_PREDEFINIDOS) {
            expect(esc.id).toBeTruthy();
            expect(esc.nombre).toBeTruthy();
            expect(esc.es_predefinido).toBe(true);
        }
    });

    it('tiene identificadores únicos', () => {
        const ids = ESCENARIOS_PREDEFINIDOS.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('normalizeEscenario', () => {
    it('normaliza un escenario crudo tolerando snake_case y camelCase', () => {
        expect(
            normalizeEscenario({
                _id: 'e1',
                name: 'Conflicto',
                description: 'desc',
                category: 'conflicto universitario',
                versionActual: '2',
                esPredefinido: true,
            }),
        ).toEqual({
            id: 'e1',
            nombre: 'Conflicto',
            descripcion: 'desc',
            categoria: 'conflicto universitario',
            version: 2,
            es_predefinido: true,
        });
    });

    it('usa valores por defecto seguros ante datos ausentes', () => {
        const n = normalizeEscenario(null);
        expect(n.id).toBeNull();
        expect(n.nombre).toBe('');
        expect(n.version).toBeNull();
        expect(n.es_predefinido).toBe(false);
    });
});
