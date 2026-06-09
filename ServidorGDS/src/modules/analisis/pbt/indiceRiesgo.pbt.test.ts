/**
 * Prueba basada en propiedades (PBT) del `Indice_Riesgo` multidimensional.
 *
 * Property 16: Rango e independencia de las dimensiones del indice de riesgo
 * (Req. 17.1, 17.2, 17.5, 26.5).
 *
 * Verifica, sobre la funcion pura {@link calcularDimensiones}, las tres
 * invariantes universales de la propiedad para *toda* `EntradaIndice` y *toda*
 * configuracion de dimensiones —incluso con senales degeneradas (no finitas,
 * negativas o fuera de rango) y rangos arbitrarios—:
 *
 * - **Rango (Req. 17.1, 17.2):** cada dimension calculada queda dentro de su
 *   propio intervalo cerrado `[minimo, maximo]` (con `minimo`/`maximo`
 *   normalizados al orden `min <= max`).
 * - **Independencia (Req. 17.2):** perturbar la senal de UNA sola dimension no
 *   altera el `valor` (ni el `scoreCalibradoMl`) de las demas dimensiones.
 * - **Configurabilidad (Req. 17.5):** agregar una dimension configurable
 *   adicional solo anade su fila al resultado; no modifica los valores de las
 *   dimensiones ya existentes.
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que el runner de PBT
 * ejecute esta suite (Req. 26.1, 26.2). Cada propiedad se ejecuta con un minimo
 * de 100 iteraciones (`{ numRuns: 100 }`), conforme al criterio de evidencia
 * del Req. 26.5.
 *
 * **Validates: Requirements 17.1, 17.2, 17.5, 26.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 16: Rango e independencia de las dimensiones del índice de riesgo
// Ejecutado bajo Jest + ts-jest: `describe`, `it` y `expect` son globales (sin import).
import fc from "fast-check";

import {
    calcularDimensiones,
    type DefinicionDimension,
    type EntradaIndice,
} from "../indiceRiesgo";

/**
 * Generador de un valor de senal agregada para una dimension.
 *
 * Mezcla deliberadamente valores bien formados con casos limite y degenerados
 * (fuera de rango, negativos y no finitos) para ejercitar el clamp de rango y
 * garantizar el invariante incluso ante entradas adversas.
 */
const valorSenalArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: -1000, max: 1000, noNaN: true }),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/** Generador de un score calibrado de la `Capa_ML` (incluye valores fuera de [0,1]). */
const scoreMlArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.double({ min: -10, max: 10 }),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/** Generador de un rango `[minimo, maximo]` arbitrario (puede llegar invertido). */
const rangoArb: fc.Arbitrary<{ minimo: number; maximo: number }> = fc
    .tuple(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
    )
    .map(([a, b]) => ({ minimo: a, maximo: b }));

/**
 * Generador `definicionDimensionArb`: una {@link DefinicionDimension}
 * configurable autonoma, con `clave` unica (uuid), `nombre` legible y un rango
 * `[minimo, maximo]` arbitrario. No define `extraer`, de modo que cada dimension
 * lea UNICAMENTE su propia senal (`senales[clave]`), base de la independencia
 * (Req. 17.2).
 */
const definicionDimensionArb: fc.Arbitrary<DefinicionDimension> = fc
    .tuple(fc.uuid(), fc.string(), rangoArb)
    .map(([id, nombre, rango]) => ({
        clave: `dim-${id}`,
        nombre,
        minimo: rango.minimo,
        maximo: rango.maximo,
    }));

/** Conjunto de dimensiones con claves unicas (1..8), todas configurables. */
const dimensionesArb: fc.Arbitrary<DefinicionDimension[]> = fc.uniqueArray(
    definicionDimensionArb,
    { minLength: 1, maxLength: 8, selector: (d) => d.clave },
);

/**
 * Generador `entradaIndiceArb`: produce un par coordinado
 * `{ dimensiones, entrada }` donde la `EntradaIndice` es AGREGADA Y COLECTIVA
 * por `(Comunidad_Digital, Semana_Simulada)` y aporta una senal y un score ML
 * por cada `clave` de dimension (mas evidencias trazables por id). Mantener las
 * senales alineadas con las claves permite ejercitar el calculo real con datos
 * consistentes (Req. 17.2, 17.4).
 */
const entradaIndiceArb: fc.Arbitrary<{
    dimensiones: DefinicionDimension[];
    entrada: EntradaIndice;
}> = dimensionesArb.chain((dimensiones) => {
    const claves = dimensiones.map((d) => d.clave);
    const senalesArb = fc.record(
        Object.fromEntries(claves.map((c) => [c, valorSenalArb])),
    ) as fc.Arbitrary<Record<string, number>>;
    const scoresArb = fc.record(
        Object.fromEntries(claves.map((c) => [c, scoreMlArb])),
    ) as fc.Arbitrary<Record<string, number>>;

    return fc
        .record({
            comunidadId: fc.uuid().map((u) => `com-${u}`),
            numeroSemana: fc.integer({ min: 1, max: 520 }),
            senales: senalesArb,
            scoresCalibradosMl: scoresArb,
            evidenciaIds: fc.array(fc.uuid().map((u) => `ev-${u}`), { maxLength: 6 }),
        })
        .map((entrada) => ({ dimensiones, entrada: entrada as EntradaIndice }));
});

/** Verdadero solo si `valor` es finito y queda dentro de `[lo, hi]` (extremos incluidos). */
function dentroDeRango(valor: number, lo: number, hi: number): boolean {
    return Number.isFinite(valor) && valor >= lo && valor <= hi;
}

describe("PBT Property 16: Rango e independencia de las dimensiones del indice de riesgo (Req. 17.1, 17.2, 17.5, 26.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 16: Rango e independencia de las dimensiones del índice de riesgo
    it("cada dimension calculada queda dentro de su propio rango [minimo, maximo] (Req. 17.1, 17.2)", () => {
        fc.assert(
            fc.property(entradaIndiceArb, ({ dimensiones, entrada }) => {
                const filas = calcularDimensiones(entrada, dimensiones);
                expect(filas).toHaveLength(dimensiones.length);
                for (const fila of filas) {
                    // El rango efectivo se normaliza al orden min <= max.
                    expect(fila.minimo).toBeLessThanOrEqual(fila.maximo);
                    expect(dentroDeRango(fila.valor, fila.minimo, fila.maximo)).toBe(true);
                    // El score ML integrado queda acotado a [0, 1] (Req. 31.2).
                    expect(dentroDeRango(fila.scoreCalibradoMl, 0, 1)).toBe(true);
                }
            }),
            { numRuns: 100 },
        );
    });

    it("perturbar la senal de UNA dimension no altera el valor de las demas (Req. 17.2)", () => {
        fc.assert(
            fc.property(
                entradaIndiceArb,
                fc.integer({ min: 0, max: 1000 }),
                valorSenalArb,
                ({ dimensiones, entrada }, indiceCrudo, nuevaSenal) => {
                    const objetivo = dimensiones[indiceCrudo % dimensiones.length];

                    const base = calcularDimensiones(entrada, dimensiones);
                    // Perturbamos EXCLUSIVAMENTE la senal de la dimension objetivo.
                    const entradaPerturbada: EntradaIndice = {
                        ...entrada,
                        senales: { ...entrada.senales, [objetivo.clave]: nuevaSenal },
                    };
                    const perturbado = calcularDimensiones(entradaPerturbada, dimensiones);

                    for (let i = 0; i < dimensiones.length; i++) {
                        if (dimensiones[i].clave === objetivo.clave) {
                            continue;
                        }
                        // Las demas dimensiones permanecen identicas (independencia).
                        expect(perturbado[i].valor).toBe(base[i].valor);
                        expect(perturbado[i].scoreCalibradoMl).toBe(base[i].scoreCalibradoMl);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it("agregar una dimension configurable adicional no modifica las dimensiones existentes (Req. 17.5)", () => {
        fc.assert(
            fc.property(
                entradaIndiceArb,
                definicionDimensionArb,
                ({ dimensiones, entrada }, extraBruta) => {
                    // Garantizamos que la dimension anadida tenga una clave nueva
                    // (no presente entre las existentes) para que sea realmente
                    // una dimension adicional.
                    const clavesExistentes = new Set(dimensiones.map((d) => d.clave));
                    const extra: DefinicionDimension = clavesExistentes.has(extraBruta.clave)
                        ? { ...extraBruta, clave: `extra-${extraBruta.clave}` }
                        : extraBruta;

                    const base = calcularDimensiones(entrada, dimensiones);
                    const conMas = calcularDimensiones(entrada, [...dimensiones, extra]);

                    // Se anade exactamente una fila al final...
                    expect(conMas).toHaveLength(base.length + 1);
                    expect(conMas[conMas.length - 1].clave).toBe(extra.clave);

                    // ...y los valores de las dimensiones preexistentes no cambian.
                    for (let i = 0; i < base.length; i++) {
                        expect(conMas[i].clave).toBe(base[i].clave);
                        expect(conMas[i].valor).toBe(base[i].valor);
                        expect(conMas[i].scoreCalibradoMl).toBe(base[i].scoreCalibradoMl);
                        expect(conMas[i].minimo).toBe(base[i].minimo);
                        expect(conMas[i].maximo).toBe(base[i].maximo);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
