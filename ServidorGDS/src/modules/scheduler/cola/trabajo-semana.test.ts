/**
 * Pruebas de la identidad determinista de los trabajos de la cola (tarea 16.2).
 *
 * Verifican que `jobId` y `clave` son DETERMINISTAS y unicos por `(A,I,N)`
 * (base de la idempotencia y del bloqueo de concurrencia, Req. 27.2, 27.3,
 * 38.2, 38.3), y que la triada se valida para evitar identidades ambiguas.
 * _Requirements: 9.1, 27.2, 27.3, 38.2, 38.3_
 */
import {
    PREFIJO_TRABAJO_SEMANA,
    claveTrabajo,
    jobIdSemana,
    type DatosTrabajoSemana,
} from './trabajo-semana';

const datos = (over: Partial<DatosTrabajoSemana> = {}): DatosTrabajoSemana => ({
    analisisId: 'a1',
    institucionId: 'i1',
    numeroSemana: 1,
    ...over,
});

describe('Identidad determinista del trabajo (A,I,N)', () => {
    it('jobId es determinista: misma triada -> mismo jobId', () => {
        expect(jobIdSemana(datos())).toBe(jobIdSemana(datos()));
        expect(jobIdSemana(datos())).toBe(`${PREFIJO_TRABAJO_SEMANA}:a1:i1:1`);
    });

    it('clave es determinista: misma triada -> misma clave', () => {
        expect(claveTrabajo(datos())).toBe(claveTrabajo(datos()));
        expect(claveTrabajo(datos())).toBe('a1::i1::1');
    });

    it('triadas distintas producen jobId/clave distintos', () => {
        const base = datos();
        expect(jobIdSemana(base)).not.toBe(jobIdSemana(datos({ institucionId: 'i2' })));
        expect(jobIdSemana(base)).not.toBe(jobIdSemana(datos({ numeroSemana: 2 })));
        expect(jobIdSemana(base)).not.toBe(jobIdSemana(datos({ analisisId: 'a2' })));
    });

    it('el separador de clave evita colisiones entre ids ambiguos', () => {
        // ("a:b","c",1) vs ("a","b:c",1) NO deben colisionar.
        const clave1 = claveTrabajo(datos({ analisisId: 'a:b', institucionId: 'c' }));
        const clave2 = claveTrabajo(datos({ analisisId: 'a', institucionId: 'b:c' }));
        expect(clave1).not.toBe(clave2);
    });

    it('valida la triada: rechaza ids vacios y semanas invalidas', () => {
        expect(() => jobIdSemana(datos({ analisisId: '' }))).toThrow(/analisisId/);
        expect(() => jobIdSemana(datos({ institucionId: '' }))).toThrow(/institucionId/);
        expect(() => jobIdSemana(datos({ numeroSemana: 0 }))).toThrow(/numeroSemana/);
        expect(() => jobIdSemana(datos({ numeroSemana: 1.5 }))).toThrow(/numeroSemana/);
        expect(() => claveTrabajo(datos({ numeroSemana: -1 }))).toThrow(/numeroSemana/);
    });
});
