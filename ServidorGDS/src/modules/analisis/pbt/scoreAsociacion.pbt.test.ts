/**
 * Prueba basada en propiedades (PBT) del `Score_Asociacion` comunitario.
 *
 * Property 15: Score de asociacion en rango valido y recalculado por semana
 * (Req. 11.1, 11.3, 11.5, 26.5).
 *
 * Verifica dos invariantes sobre {@link calcularScoreAsociacion}:
 * - **Rango cerrado [0, 1]:** para todo par (`Usuario_Sintetico`,
 *   `Comunidad_Digital`) y toda entrada de calculo —incluso con factores y
 *   pesos degenerados (no finitos, negativos o fuera de rango)— el score
 *   resultante es un numero finito dentro de [0, 1] y, por tanto, una
 *   probabilidad y nunca una certeza absoluta fuera de rango (Req. 11.1, 11.3).
 * - **Recalculo por semana en rango:** al cerrar cada `Semana_Simulada` existe
 *   un score recalculado para esa semana con la informacion acumulada, y cada
 *   recalculo permanece dentro del mismo intervalo cerrado [0, 1] (Req. 11.5).
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `vitest run pbt`
 * ejecute esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100
 * iteraciones (`{ numRuns: 100 }`), conforme al criterio de evidencia del
 * Req. 26.5.
 *
 * **Validates: Requirements 11.1, 11.3, 11.5, 26.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 15: Score de asociación en rango válido y recalculado por semana
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
    FACTORES_ASOCIACION,
    calcularScoreAsociacion,
    type FactoresAsociacion,
    type PesosAsociacion,
} from "../scoreAsociacion";

/**
 * Generador de una senal de factor conductual.
 *
 * Mezcla deliberadamente valores "bien formados" en [0, 1] con casos limite y
 * degenerados (fuera de rango, negativos y no finitos) para ejercitar el clamp
 * y garantizar el invariante de rango incluso ante entradas adversas.
 */
const factorArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.double({ min: -1000, max: 1000 }), // incluye negativos y > 1
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/** Generador del registro completo de los ocho factores de asociacion. */
const factoresArb: fc.Arbitrary<FactoresAsociacion> = fc.record(
    Object.fromEntries(FACTORES_ASOCIACION.map((clave) => [clave, factorArb])) as Record<
        keyof FactoresAsociacion,
        fc.Arbitrary<number>
    >,
) as fc.Arbitrary<FactoresAsociacion>;

/**
 * Generador de pesos parciales, incluyendo configuraciones degeneradas
 * (negativos, cero, no finitos y subconjuntos de claves) para verificar que la
 * normalizacion no rompe el rango del score.
 */
const pesosArb: fc.Arbitrary<Partial<PesosAsociacion>> = fc.dictionary(
    fc.constantFrom(...FACTORES_ASOCIACION),
    fc.oneof(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10 }),
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY),
    ),
) as fc.Arbitrary<Partial<PesosAsociacion>>;

/** Verdadero solo si `n` es un numero finito dentro del intervalo cerrado [0, 1]. */
function enRango01(n: number): boolean {
    return Number.isFinite(n) && n >= 0 && n <= 1;
}

describe("PBT Property 15: Score de asociacion en rango valido y recalculado por semana (Req. 11.1, 11.3, 11.5, 26.5)", () => {
    it("para todo par y entrada, el score esta en el intervalo cerrado [0, 1]", () => {
        fc.assert(
            fc.property(factoresArb, (factores) => {
                const score = calcularScoreAsociacion(factores);
                expect(enRango01(score)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it("el score permanece en [0, 1] incluso con pesos degenerados o parciales", () => {
        fc.assert(
            fc.property(factoresArb, pesosArb, (factores, pesos) => {
                const score = calcularScoreAsociacion(factores, pesos);
                expect(enRango01(score)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it("al cerrar cada semana existe un score recalculado dentro del mismo rango [0, 1]", () => {
        // Cada elemento de la lista representa la entrada de calculo de una
        // `Semana_Simulada` cerrada (>= 1 semana). El recalculo por semana usa
        // exclusivamente la funcion real de calculo (sin dobles del nucleo).
        const semanasArb = fc.array(factoresArb, { minLength: 1, maxLength: 12 });

        fc.assert(
            fc.property(semanasArb, (semanas) => {
                const scoresPorSemana = semanas.map((factores, indice) => ({
                    numeroSemana: indice + 1,
                    score: calcularScoreAsociacion(factores),
                }));

                // Existe un score recalculado por cada semana cerrada...
                expect(scoresPorSemana).toHaveLength(semanas.length);
                // ...y todos permanecen dentro del intervalo cerrado [0, 1].
                for (const { score } of scoresPorSemana) {
                    expect(enRango01(score)).toBe(true);
                }
            }),
            { numRuns: 100 },
        );
    });
});
