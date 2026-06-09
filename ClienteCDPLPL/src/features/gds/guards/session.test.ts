// Pruebas unitarias de la lógica pura de sesión de la Plataforma_GDS (26.11).
//
// `session.ts` concentra la decisión fail-closed del guard `RequireGdsAuth`
// (Req. 1.5): determinar si una sesión es válida/vigente y extraer el rol GDS
// del payload del JWT. Aquí se valida de forma determinista, sin DOM ni router,
// y se comprueba que no depende del módulo IREC anterior (Req. 1.4).
import { describe, it, expect } from 'vitest';
import { GDS_ROLES, isSesionValida, rolDesdePayload } from './session';

describe('GDS_ROLES (catálogo de roles propios de la Plataforma_GDS)', () => {
    it('expone los tres roles GDS y es inmutable', () => {
        expect(GDS_ROLES).toEqual({
            ADMIN_PLATAFORMA: 'ADMIN_PLATAFORMA',
            ANALISTA: 'ANALISTA',
            OBSERVADOR: 'OBSERVADOR',
        });
        expect(Object.isFrozen(GDS_ROLES)).toBe(true);
    });

    it('no referencia el módulo IREC anterior (Req. 1.4)', () => {
        expect(JSON.stringify(GDS_ROLES)).not.toMatch(/irec/i);
    });
});

describe('rolDesdePayload (extracción tolerante del rol)', () => {
    it('devuelve null para payloads ausentes o no-objeto', () => {
        expect(rolDesdePayload(null)).toBeNull();
        expect(rolDesdePayload(undefined)).toBeNull();
        // @ts-expect-error: validación de robustez ante entradas no tipadas.
        expect(rolDesdePayload('cadena')).toBeNull();
    });

    it('prioriza gdsRol cuando el backend emite el rol GDS dedicado', () => {
        expect(
            rolDesdePayload({ gdsRol: GDS_ROLES.ANALISTA, rol: GDS_ROLES.OBSERVADOR }),
        ).toBe(GDS_ROLES.ANALISTA);
    });

    it('soporta rol como string plano del colegio', () => {
        expect(rolDesdePayload({ rol: GDS_ROLES.ADMIN_PLATAFORMA })).toBe(
            GDS_ROLES.ADMIN_PLATAFORMA,
        );
    });

    it('soporta rol como objeto anidado { rol } del colegio', () => {
        expect(rolDesdePayload({ rol: { rol: GDS_ROLES.OBSERVADOR } })).toBe(
            GDS_ROLES.OBSERVADOR,
        );
    });

    it('devuelve null cuando no hay un rol reconocible', () => {
        expect(rolDesdePayload({})).toBeNull();
        expect(rolDesdePayload({ rol: {} })).toBeNull();
        expect(rolDesdePayload({ rol: null })).toBeNull();
    });
});

describe('isSesionValida (vigencia fail-closed de la sesión, Req. 1.5)', () => {
    const AHORA = 1_700_000_000_000; // ms fijos para determinismo.

    it('rechaza payloads ausentes o no-objeto (fail-closed)', () => {
        expect(isSesionValida(null, AHORA)).toBe(false);
        expect(isSesionValida(undefined, AHORA)).toBe(false);
        // @ts-expect-error: validación de robustez ante entradas no tipadas.
        expect(isSesionValida('cadena', AHORA)).toBe(false);
    });

    it('acepta una sesión sin exp declarado (no expira)', () => {
        expect(isSesionValida({ rol: GDS_ROLES.ANALISTA }, AHORA)).toBe(true);
    });

    it('acepta una sesión cuyo exp aún no ha vencido', () => {
        const exp = Math.floor(AHORA / 1000) + 3600; // 1 hora en el futuro
        expect(isSesionValida({ exp }, AHORA)).toBe(true);
    });

    it('rechaza una sesión expirada', () => {
        const exp = Math.floor(AHORA / 1000) - 60; // hace 1 minuto
        expect(isSesionValida({ exp }, AHORA)).toBe(false);
    });

    it('trata exp exactamente igual a ahora como aún vigente (no estrictamente vencido)', () => {
        const exp = AHORA / 1000; // exp*1000 === ahora → no es < ahora
        expect(isSesionValida({ exp }, AHORA)).toBe(true);
    });
});
