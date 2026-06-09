/**
 * Prueba basada en propiedades (PBT) del `scoreRiesgoCalibrado` de la `Capa_ML`.
 *
 * Property 33: Score calibrado del Indice por la Capa_ML dentro de rango
 * (Req. 31.2, 31.7).
 *
 * Verifica, sobre la implementacion base/heuristica ({@link CapaMLBase}) y sobre
 * el envoltorio de degradacion segura ({@link CapaMLConDegradacion}, sin
 * primaria), las siguientes invariantes para *toda* `EntradaIndice` del
 * `Indice_Riesgo` —incluso con senales degeneradas (no finitas, negativas o
 * fuera de rango)—:
 *
 * - **Rango cerrado [0, 1] (Req. 31.2):** el `score` producido es siempre un
 *   numero finito dentro del intervalo cerrado [0, 1].
 * - **Evidencia referenciada por id (Req. 31.7):** el resultado viene
 *   acompanado de las evidencias trazables por identificador (`evidenciaIds`),
 *   conservando exactamente los ids de la entrada que respaldan el resultado.
 * - **Solo resultados colectivos (Req. 31.7):** la salida expone unicamente el
 *   par `{ score, evidenciaIds }` (resultado agregado de la `Comunidad_Digital`)
 *   y nunca filtra el identificador de comunidad ni ningun dato individual.
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que `jest pbt`
 * ejecute esta suite (Req. 26.1, 26.2). Se ejecuta con un minimo de 100
 * iteraciones (`{ numRuns: 100 }`), conforme al criterio de evidencia del
 * Req. 26.5.
 *
 * **Validates: Requirements 31.2, 31.7**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 33: Score calibrado del Índice por la Capa_ML dentro de rango
import fc from "fast-check";

import { CapaMLBase } from "../capaMLBase";
import { CapaMLConDegradacion } from "../capaMLConDegradacion";
import type { CapaML, EntradaIndice } from "../capaML";

/**
 * Generador de una senal numerica agregada del `Indice_Riesgo`.
 *
 * Mezcla deliberadamente valores "bien formados" en [0, 1] con casos limite y
 * degenerados (fuera de rango, negativos y no finitos) para ejercitar el clamp
 * y garantizar el invariante de rango incluso ante entradas adversas.
 */
const senalArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.double({ min: -1000, max: 1000 }), // incluye negativos y > 1
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/** Generador de un identificador de evidencia trazable (Req. 30.1, 31.7). */
const evidenciaIdArb: fc.Arbitrary<string> = fc
    .uuid()
    .map((u) => `ev-${u}`);

/**
 * Generador `entradaIndiceArb`: una `EntradaIndice` agregada por
 * `Comunidad_Digital`/`Semana_Simulada`, con senales (posiblemente vacias o
 * degeneradas) y evidencias trazables por id que respaldan el resultado
 * colectivo (Req. 30.1, 31.7).
 */
const entradaIndiceArb: fc.Arbitrary<EntradaIndice> = fc.record({
    comunidadId: fc.uuid().map((u) => `com-${u}`),
    numeroSemana: fc.integer({ min: 1, max: 520 }),
    senales: fc.array(senalArb, { minLength: 0, maxLength: 24 }),
    evidenciaIds: fc.array(evidenciaIdArb, { minLength: 0, maxLength: 12 }),
});

/** Verdadero solo si `n` es un numero finito dentro del intervalo cerrado [0, 1]. */
function enRango01(n: number): boolean {
    return Number.isFinite(n) && n >= 0 && n <= 1;
}

/**
 * Implementaciones de la `Capa_ML` bajo prueba: la base heuristica y el
 * envoltorio de degradacion segura sin primaria (que opera sobre el calculo
 * base). Ambas deben respetar la garantia de rango y evidencia (Req. 31.2, 31.7,
 * 31.5, 31.6).
 */
const implementaciones: Array<[string, CapaML]> = [
    ["CapaMLBase", new CapaMLBase()],
    ["CapaMLConDegradacion (sin primaria)", new CapaMLConDegradacion()],
];

describe.each(implementaciones)(
    "PBT Property 33: Score calibrado del Indice por la Capa_ML dentro de rango (Req. 31.2, 31.7) [%s]",
    (_nombre, capa) => {
        it("para toda entrada del indice, el score esta en el intervalo cerrado [0, 1]", async () => {
            await fc.assert(
                fc.asyncProperty(entradaIndiceArb, async (entrada) => {
                    const { score } = await capa.scoreRiesgoCalibrado(entrada);
                    expect(enRango01(score)).toBe(true);
                }),
                { numRuns: 100 },
            );
        });

        it("el resultado viene acompanado de la evidencia referenciada por id de la entrada", async () => {
            await fc.assert(
                fc.asyncProperty(entradaIndiceArb, async (entrada) => {
                    const { evidenciaIds } = await capa.scoreRiesgoCalibrado(entrada);
                    // La evidencia que respalda el resultado se referencia por id
                    // y coincide exactamente con la evidencia trazable de la entrada.
                    expect(evidenciaIds).toEqual(entrada.evidenciaIds);
                    expect(evidenciaIds.every((id) => typeof id === "string")).toBe(true);
                }),
                { numRuns: 100 },
            );
        });

        it("expone unicamente resultados colectivos: solo { score, evidenciaIds } y sin identificadores individuales/comunidad", async () => {
            await fc.assert(
                fc.asyncProperty(entradaIndiceArb, async (entrada) => {
                    const resultado = await capa.scoreRiesgoCalibrado(entrada);
                    // La salida expone exclusivamente el agregado colectivo.
                    expect(Object.keys(resultado).sort()).toEqual(["evidenciaIds", "score"]);
                    // No filtra el identificador de comunidad ni el numero de
                    // semana crudo como dato expuesto fuera de la evidencia.
                    expect(Object.prototype.hasOwnProperty.call(resultado, "comunidadId")).toBe(false);
                    expect(resultado.evidenciaIds).not.toContain(entrada.comunidadId);
                }),
                { numRuns: 100 },
            );
        });
    },
);
