/**
 * Pruebas unitarias del `Score_Asociacion` migrado al modulo `communities`
 * (tarea 14.1).
 *
 * Cubren:
 * - El nucleo PURO `calcularScoreAsociacion`: invariante de rango [0, 1] y
 *   clamp ante entradas degeneradas (Req. 11.1), combinacion de los ocho
 *   factores (Req. 11.2) y ausencia de certeza absoluta (Req. 11.3).
 * - El provider `ScoreAsociacionService`: recalculo y persistencia por semana
 *   (Req. 11.5), idempotente por `(usuario, comunidad, semana)`, sobre un doble
 *   en memoria que ejerce la MISMA logica real de persistencia (sin red).
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.5_
 */
import type { PrismaService } from '../../prisma/prisma.service';
import {
    FACTORES_ASOCIACION,
    PESOS_POR_DEFECTO,
    ScoreAsociacionService,
    calcularScoreAsociacion,
    clamp01,
    type EntradaScoreSemana,
    type FactoresAsociacion,
} from './scoreAsociacion';

/** Construye un set de factores con el mismo valor en los ocho campos. */
function factores(valor: number): FactoresAsociacion {
    return {
        interacciones: valor,
        frecuencia: valor,
        temas: valor,
        contexto: valor,
        participacion: valor,
        recurrencia: valor,
        ubicacion: valor,
        historial: valor,
    };
}

// ---------------------------------------------------------------------------
// Doble en memoria del delegate `scoreAsociacion` de Prisma (solo lo que usa el
// servicio). Se inyecta como `PrismaService` para ejercer la logica real
// (findFirst/create/update) sin tocar la base de datos.
// ---------------------------------------------------------------------------
interface FilaScore {
    id: string;
    usuarioId: string;
    comunidadId: string;
    numeroSemana: number;
    score: number;
}

function crearPrismaEnMemoria(): { prisma: PrismaService; filas: FilaScore[] } {
    const filas: FilaScore[] = [];
    let secuencia = 0;

    const scoreAsociacion = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        findFirst: async ({ where }: { where: any }) => {
            const f = filas.find(
                (r) =>
                    r.usuarioId === where.usuarioId &&
                    r.comunidadId === where.comunidadId &&
                    r.numeroSemana === where.numeroSemana,
            );
            return f ? { id: f.id } : null;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }) => {
            const fila: FilaScore = { id: `score-${++secuencia}`, ...data };
            filas.push(fila);
            return { id: fila.id, score: fila.score };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: async ({ where, data }: { where: any; data: any }) => {
            const fila = filas.find((r) => r.id === where.id);
            if (!fila) throw new Error(`Fila no encontrada: ${where.id}`);
            fila.score = data.score;
            return { id: fila.id, score: fila.score };
        },
    };

    return { prisma: { scoreAsociacion } as unknown as PrismaService, filas };
}

describe('clamp01', () => {
    it('acota por debajo y por encima a [0, 1] (Req. 11.1)', () => {
        expect(clamp01(-5)).toBe(0);
        expect(clamp01(5)).toBe(1);
        expect(clamp01(0.42)).toBeCloseTo(0.42, 12);
    });

    it('trata los valores no finitos como 0 (Req. 11.1)', () => {
        expect(clamp01(Number.NaN)).toBe(0);
        expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
        expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
    });
});

describe('calcularScoreAsociacion', () => {
    it('devuelve 0 cuando todos los factores son 0 (Req. 11.1)', () => {
        expect(calcularScoreAsociacion(factores(0))).toBe(0);
    });

    it('devuelve 1 cuando todos los factores son 1 (Req. 11.1)', () => {
        expect(calcularScoreAsociacion(factores(1))).toBe(1);
    });

    it('mantiene el resultado dentro de [0, 1] aunque las entradas excedan el rango (Req. 11.1)', () => {
        expect(calcularScoreAsociacion(factores(5))).toBe(1);
        expect(calcularScoreAsociacion(factores(-5))).toBe(0);
    });

    it('nunca afirma certeza: con factores parciales el score queda en (0, 1) (Req. 11.3)', () => {
        const score = calcularScoreAsociacion(factores(0.3));
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(1);
    });

    it('pondera los ocho factores (Req. 11.2): aislar un factor en 1 rinde su peso', () => {
        const base = factores(0);
        for (const clave of FACTORES_ASOCIACION) {
            const variante = { ...base, [clave]: 1 };
            const score = calcularScoreAsociacion(variante);
            expect(score).toBeCloseTo(PESOS_POR_DEFECTO[clave], 12);
        }
    });

    it('se mantiene en rango ante entradas no finitas (Req. 11.1)', () => {
        const mezcla = factores(0.5);
        mezcla.interacciones = Number.NaN;
        mezcla.frecuencia = Number.POSITIVE_INFINITY;
        const score = calcularScoreAsociacion(mezcla);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
    });
});

describe('ScoreAsociacionService.recalcularSemana', () => {
    function entrada(
        numeroSemana: number,
        valor: number,
        overrides: Partial<EntradaScoreSemana> = {},
    ): EntradaScoreSemana {
        return {
            usuarioId: 'u-1',
            comunidadId: 'c-1',
            numeroSemana,
            factores: factores(valor),
            ...overrides,
        };
    }

    it('persiste un score dentro de [0, 1] al cerrar la semana (Req. 11.1, 11.5)', async () => {
        const { prisma } = crearPrismaEnMemoria();
        const servicio = new ScoreAsociacionService(prisma);

        const r = await servicio.recalcularSemana(entrada(1, 0.6));

        expect(r.id).toMatch(/^score-\d+$/);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
        expect(r.score).toBeCloseTo(0.6, 12);
    });

    it('acota a [0, 1] al persistir aunque los factores excedan el rango (Req. 11.1)', async () => {
        const { prisma } = crearPrismaEnMemoria();
        const servicio = new ScoreAsociacionService(prisma);

        const alto = await servicio.recalcularSemana(entrada(1, 9));
        const bajo = await servicio.recalcularSemana(entrada(2, -9));

        expect(alto.score).toBe(1);
        expect(bajo.score).toBe(0);
    });

    it('crea un registro por cada semana cerrada (recalculo semanal, Req. 11.5)', async () => {
        const { prisma, filas } = crearPrismaEnMemoria();
        const servicio = new ScoreAsociacionService(prisma);

        await servicio.recalcularSemana(entrada(1, 0.2));
        await servicio.recalcularSemana(entrada(2, 0.4));
        await servicio.recalcularSemana(entrada(3, 0.6));

        expect(filas).toHaveLength(3);
        expect(filas.map((f) => f.numeroSemana)).toEqual([1, 2, 3]);
        expect(filas[0].score).toBeCloseTo(0.2, 12);
        expect(filas[1].score).toBeCloseTo(0.4, 12);
        expect(filas[2].score).toBeCloseTo(0.6, 12);
        for (const f of filas) {
            expect(f.score).toBeGreaterThanOrEqual(0);
            expect(f.score).toBeLessThanOrEqual(1);
        }
    });

    it('recalcula de forma idempotente la misma semana: actualiza sin duplicar (Req. 11.5)', async () => {
        const { prisma, filas } = crearPrismaEnMemoria();
        const servicio = new ScoreAsociacionService(prisma);

        const primero = await servicio.recalcularSemana(entrada(1, 0.3));
        const segundo = await servicio.recalcularSemana(entrada(1, 0.9));

        expect(filas).toHaveLength(1);
        expect(segundo.id).toBe(primero.id);
        expect(filas[0].score).toBeCloseTo(0.9, 12);
    });

    it('aisla los scores por par (usuario, comunidad) en la misma semana', async () => {
        const { prisma, filas } = crearPrismaEnMemoria();
        const servicio = new ScoreAsociacionService(prisma);

        await servicio.recalcularSemana(entrada(1, 0.5, { usuarioId: 'u-1', comunidadId: 'c-1' }));
        await servicio.recalcularSemana(entrada(1, 0.5, { usuarioId: 'u-1', comunidadId: 'c-2' }));
        await servicio.recalcularSemana(entrada(1, 0.5, { usuarioId: 'u-2', comunidadId: 'c-1' }));

        expect(filas).toHaveLength(3);
    });
});
