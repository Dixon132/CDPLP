// Feature: analisis-tendencias-riesgo-emocional, Property 15: Score de asociación en rango válido y recalculado por semana
/**
 * Prueba basada en propiedades (PBT) del `Score_Asociacion` (Req. 11).
 *
 * Property 15: Score de asociacion en rango valido y recalculado por semana.
 *
 * *Para todo* par (`Usuario_Sintetico`, `Comunidad_Digital`) y toda entrada de
 * calculo, el `Score_Asociacion` resultante esta en el intervalo cerrado
 * [0, 1], y al cerrar cada `Semana_Simulada` existe un score recalculado para
 * esa semana dentro del mismo rango.
 *
 * Se ejercitan dos invariantes complementarias:
 *
 * - **Rango cerrado [0, 1] del nucleo puro (Req. 11.1, 11.3):** para cualquier
 *   combinacion de factores (incluidos valores degenerados: no finitos,
 *   negativos o fuera de rango) y cualquier conjunto de pesos, el resultado de
 *   `calcularScoreAsociacion` es un numero finito en [0, 1] (probabilidad,
 *   nunca certeza fuera de rango).
 * - **Recalculo persistido por semana (Req. 11.5):** al cerrar una secuencia de
 *   `Semana_Simulada` para un par (usuario, comunidad), por cada semana cerrada
 *   existe exactamente un score recalculado y persistido, y todos esos scores
 *   permanecen dentro del intervalo cerrado [0, 1].
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `jest pbt` ejecute
 * esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100 iteraciones
 * (`{ numRuns: 100 }`), conforme al criterio de evidencia del Req. 26.5.
 *
 * **Validates: Requirements 11.1, 11.3, 11.5, 26.5**
 */
import fc from "fast-check";

import type { PrismaService } from "../../../prisma/prisma.service";
import {
    FACTORES_ASOCIACION,
    ScoreAsociacionService,
    calcularScoreAsociacion,
    type EntradaScoreSemana,
    type FactoresAsociacion,
    type PesosAsociacion,
} from "../scoreAsociacion";

/**
 * Generador de una senal de factor conductual.
 *
 * Mezcla valores bien formados en [0, 1] con casos limite y degenerados (fuera
 * de rango, negativos y no finitos) para ejercer el saneamiento/clamp y
 * garantizar el invariante de rango incluso ante entradas adversas.
 */
const senalArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.double({ min: -1000, max: 1000 }),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/** Construye un generador de registro con los ocho factores canonicos. */
function factoresArbFrom(arb: fc.Arbitrary<number>): fc.Arbitrary<FactoresAsociacion> {
    return fc.record(
        Object.fromEntries(FACTORES_ASOCIACION.map((clave) => [clave, arb])) as Record<
            keyof FactoresAsociacion,
            fc.Arbitrary<number>
        >,
    ) as fc.Arbitrary<FactoresAsociacion>;
}

/** Generador de los ocho factores conductuales (Req. 11.2). */
const factoresArb: fc.Arbitrary<FactoresAsociacion> = factoresArbFrom(senalArb);

/**
 * Generador opcional de pesos (calibracion futura por la `Capa_ML`): incluye
 * pesos validos, degenerados y la ausencia de pesos (equiponderacion).
 */
const pesosArb: fc.Arbitrary<Partial<PesosAsociacion> | undefined> = fc.option(
    factoresArbFrom(
        fc.oneof(
            fc.double({ min: 0, max: 10, noNaN: true }),
            fc.double({ min: -10, max: 10 }),
            fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, 0),
        ),
    ),
    { nil: undefined },
);

/** Verdadero solo si `n` es un numero finito dentro del intervalo cerrado [0, 1]. */
function enRango01(n: number): boolean {
    return Number.isFinite(n) && n >= 0 && n <= 1;
}

// ---------------------------------------------------------------------------
// Doble en memoria del delegate `scoreAsociacion` de Prisma (la misma logica
// real de persistencia idempotente por (usuario, comunidad, semana), sin red).
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

describe("Property 15: Score de asociacion en rango valido y recalculado por semana (Req. 11.1, 11.3, 11.5, 26.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 15: Score de asociación en rango válido y recalculado por semana
    it("para todo par (usuario, comunidad) y toda entrada de calculo, el score esta en el intervalo cerrado [0, 1]", () => {
        fc.assert(
            fc.property(factoresArb, pesosArb, (factores, pesos) => {
                const score = calcularScoreAsociacion(factores, pesos);
                expect(enRango01(score)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it("al cerrar cada Semana_Simulada existe un score recalculado por semana dentro de [0, 1]", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid().map((u) => `usr-${u}`),
                fc.uuid().map((u) => `com-${u}`),
                // Una secuencia de semanas a cerrar, con sus factores por semana.
                fc.array(factoresArb, { minLength: 1, maxLength: 12 }),
                async (usuarioId, comunidadId, factoresPorSemana) => {
                    const { prisma, filas } = crearPrismaEnMemoria();
                    const servicio = new ScoreAsociacionService(prisma);

                    for (let i = 0; i < factoresPorSemana.length; i++) {
                        const entrada: EntradaScoreSemana = {
                            usuarioId,
                            comunidadId,
                            numeroSemana: i + 1,
                            factores: factoresPorSemana[i],
                        };
                        const resultado = await servicio.recalcularSemana(entrada);
                        expect(enRango01(resultado.score)).toBe(true);
                    }

                    // Existe exactamente un score recalculado por cada semana cerrada,
                    // cubriendo la secuencia contigua [1..N], todos en rango.
                    expect(filas).toHaveLength(factoresPorSemana.length);
                    const semanas = filas.map((f) => f.numeroSemana).sort((a, b) => a - b);
                    expect(semanas).toEqual(
                        factoresPorSemana.map((_, i) => i + 1),
                    );
                    for (const f of filas) {
                        expect(enRango01(f.score)).toBe(true);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
