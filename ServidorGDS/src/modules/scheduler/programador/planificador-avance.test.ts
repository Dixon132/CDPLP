/**
 * Pruebas del `planificarAvance` - planificador puro de semanas a encolar
 * (tarea 16.3).
 *
 * Verifican, de forma sincrona y determinista, que la planificacion del avance:
 *  - solo selecciona `Semana_Simulada` PENDIENTES (desde la ultima completada+1);
 *  - produce una secuencia ESTRICTAMENTE CRECIENTE y CONTIGUA por institucion,
 *    sin saltos ni reprocesos (Req. 12.4, 18.3);
 *  - acota el avance con `cantidadSemanas` (una semana / un mes / hasta el final)
 *    (Req. 18.2);
 *  - emite los trabajos por semana ascendente (orden global creciente).
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import {
    SEMANAS_POR_MES,
    planificarAvance,
    type EstadoInstitucion,
} from './planificador-avance';
import type { DatosTrabajoSemana } from '../cola/trabajo-semana';

const inst = (
    institucionId: string,
    ultimaSemanaCompletada = 0,
): EstadoInstitucion => ({ institucionId, ultimaSemanaCompletada });

/** Atajo: lista de `numeroSemana` en el orden producido. */
const semanas = (t: DatosTrabajoSemana[]): number[] =>
    t.map((x) => x.numeroSemana);

describe('planificarAvance (planificacion del avance del Analisis)', () => {
    it('avanza UNA semana: encola solo la siguiente pendiente por institucion', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 24,
            instituciones: [inst('i1', 0)],
            cantidadSemanas: 1,
        });
        expect(trabajos).toEqual([
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 1 },
        ]);
    });

    it('avanza UN MES: encola hasta 4 semanas pendientes contiguas', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 24,
            instituciones: [inst('i1', 5)],
            cantidadSemanas: SEMANAS_POR_MES,
        });
        expect(semanas(trabajos)).toEqual([6, 7, 8, 9]);
    });

    it('avanza HASTA EL FINAL: encola todas las pendientes en orden creciente', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 6,
            instituciones: [inst('i1', 2)],
            cantidadSemanas: Number.POSITIVE_INFINITY,
        });
        expect(semanas(trabajos)).toEqual([3, 4, 5, 6]);
    });

    it('NO reprocesa semanas completadas ni excede el total (acota al tope)', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 4,
            instituciones: [inst('i1', 3)],
            cantidadSemanas: SEMANAS_POR_MES, // pediria 4..7, pero el total es 4
        });
        expect(semanas(trabajos)).toEqual([4]);
    });

    it('analisis ya completo: no encola nada (lista vacia)', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 10,
            instituciones: [inst('i1', 10)],
            cantidadSemanas: Number.POSITIVE_INFINITY,
        });
        expect(trabajos).toEqual([]);
    });

    it('sin instituciones: no encola nada', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 10,
            instituciones: [],
            cantidadSemanas: 1,
        });
        expect(trabajos).toEqual([]);
    });

    it('multi-institucion: emite por semana ASCENDENTE (orden global creciente)', () => {
        // i1 va por la semana 1; i2 ya completo 1 y va por la 2.
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 24,
            instituciones: [inst('i1', 0), inst('i2', 1)],
            cantidadSemanas: SEMANAS_POR_MES,
        });
        // semana-externo, institucion-interno: 1(i1) | 2(i1,i2) | 3(i1,i2) | 4(i1,i2) | 5(i2)
        expect(trabajos).toEqual([
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 1 },
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 2 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 2 },
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 3 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 3 },
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 4 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 4 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 5 },
        ]);
        // La secuencia de numeroSemana es no decreciente globalmente.
        const ns = semanas(trabajos);
        for (let k = 1; k < ns.length; k++) {
            expect(ns[k]).toBeGreaterThanOrEqual(ns[k - 1]!);
        }
    });

    it('por institucion, las semanas son estrictamente crecientes y CONTIGUAS', () => {
        const trabajos = planificarAvance({
            analisisId: 'a1',
            totalSemanas: 24,
            instituciones: [inst('i1', 7), inst('i2', 2)],
            cantidadSemanas: Number.POSITIVE_INFINITY,
        });
        for (const institucionId of ['i1', 'i2']) {
            const ns = trabajos
                .filter((t) => t.institucionId === institucionId)
                .map((t) => t.numeroSemana);
            for (let k = 1; k < ns.length; k++) {
                expect(ns[k]).toBe(ns[k - 1]! + 1); // contiguo, +1
            }
        }
    });

    it('rechaza totalSemanas invalido', () => {
        expect(() =>
            planificarAvance({
                analisisId: 'a1',
                totalSemanas: 0,
                instituciones: [inst('i1', 0)],
                cantidadSemanas: 1,
            }),
        ).toThrow(/totalSemanas invalido/);
    });

    it('rechaza cantidadSemanas invalida', () => {
        expect(() =>
            planificarAvance({
                analisisId: 'a1',
                totalSemanas: 10,
                instituciones: [inst('i1', 0)],
                cantidadSemanas: 0,
            }),
        ).toThrow(/cantidadSemanas invalida/);
    });

    it('rechaza ultimaSemanaCompletada fuera de rango', () => {
        expect(() =>
            planificarAvance({
                analisisId: 'a1',
                totalSemanas: 10,
                instituciones: [inst('i1', 11)],
                cantidadSemanas: 1,
            }),
        ).toThrow(/ultimaSemanaCompletada invalida/);
    });
});
