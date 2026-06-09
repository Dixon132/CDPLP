/**
 * Prueba basada en propiedades (PBT) del `Motor_Explicativo`.
 *
 * Property 18: Toda conclusion tiene explicacion y evidencia cuantificable
 * (Req. 16.4, 17.3, 20.1, 20.2, 20.3, 20.4).
 *
 * Verifica, sobre la funcion pura {@link construirExplicacion} y el servicio
 * {@link ServicioMotorExplicativo}, las invariantes universales de la propiedad
 * para *toda* tendencia, variacion de dimension o nivel de riesgo reportado:
 *
 * - **Explicacion NL completa (Req. 20.1):** cada conclusion emitida posee los
 *   cuatro componentes en lenguaje natural —que, por que, cuando empezo y como
 *   evoluciono— no vacios, y un `textoNL` que los integra.
 * - **Evidencia cuantificable (Req. 20.2, 16.4, 17.3):** cada conclusion lleva
 *   conteos de publicaciones/comentarios finitos (>= 0) y una variacion
 *   absoluta (`delta`) y porcentual (`variacionPct`) finitas.
 * - **Referencia trazable (Req. 20.4):** cada conclusion referencia al menos un
 *   id de `Evidencia` (sin entradas en blanco ni duplicados).
 * - **No hay conclusion sin evidencia (Req. 20.3):** si no hay ningun id de
 *   evidencia referenciable, NO se emite conclusion alguna (se lanza
 *   `ConclusionSinEvidenciaError` en `explicar`, y `explicarVariaciones` la
 *   omite por completo).
 *
 * Se reconoce por el patron `pbt` en su ruta, de modo que el runner de PBT
 * ejecute esta suite (Req. 26.1, 26.2). Cada propiedad se ejecuta con un minimo
 * de 100 iteraciones (`{ numRuns: 100 }`), conforme al criterio de evidencia
 * del Req. 26.5.
 *
 * **Validates: Requirements 16.4, 17.3, 20.1, 20.2, 20.3, 20.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 18: Toda conclusión tiene explicación y evidencia cuantificable
// Ejecutado bajo Jest + ts-jest: `describe`, `it` y `expect` son globales (sin import).
import fc from "fast-check";

import type { DimensionRiesgo } from "../indiceRiesgo";
import {
    ConclusionSinEvidenciaError,
    type ContextoExplicacion,
    ServicioMotorExplicativo,
    construirExplicacion,
    normalizarEvidenciaIds,
    tieneEvidenciaReferenciable,
} from "../motorExplicativo";

const motor = new ServicioMotorExplicativo();

/** Genera un rango `[minimo, maximo]` arbitrario (puede llegar invertido). */
const rangoArb: fc.Arbitrary<{ minimo: number; maximo: number }> = fc
    .tuple(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
    )
    .map(([a, b]) => ({ minimo: a, maximo: b }));

/**
 * Generador de una {@link DimensionRiesgo} colectiva (la salida del
 * `Indice_Riesgo`), con `clave`/`nombre`, un `valor` finito y un rango
 * arbitrario.
 */
const dimensionArb: fc.Arbitrary<DimensionRiesgo> = fc
    .tuple(fc.uuid(), fc.string(), fc.double({ min: -500, max: 500, noNaN: true }), rangoArb)
    .map(([id, nombre, valor, rango]) => ({
        clave: `dim-${id}`,
        nombre,
        valor,
        minimo: Math.min(rango.minimo, rango.maximo),
        maximo: Math.max(rango.minimo, rango.maximo),
        scoreCalibradoMl: 0,
    }));

/** Dimension previa opcional (`null` = primera medicion). */
const anteriorArb: fc.Arbitrary<DimensionRiesgo | null> = fc.option(dimensionArb, { nil: null });

/** Id de evidencia "valido" (no vacio tras recortar espacios). */
const evidenciaIdValidoArb: fc.Arbitrary<string> = fc
    .uuid()
    .map((u) => `ev-${u}`);

/** Lista de ids de evidencia que SIEMPRE contiene al menos uno referenciable. */
const evidenciaIdsConAlgunoArb: fc.Arbitrary<string[]> = fc
    .tuple(
        evidenciaIdValidoArb,
        fc.array(fc.oneof(evidenciaIdValidoArb, fc.constantFrom("", "   ", "\t")), {
            maxLength: 6,
        }),
    )
    .map(([garantizado, resto]) => {
        const todos = [...resto, garantizado];
        // Mezcla determinista por longitud para no depender del orden.
        return todos;
    });

/** Lista de ids SIN ninguno referenciable (vacia o solo en blanco). */
const evidenciaIdsVaciaArb: fc.Arbitrary<string[]> = fc.array(
    fc.constantFrom("", "   ", "\t", "\n", "  \t "),
    { maxLength: 5 },
);

/** Contexto opcional con conteos/causas/serie temporal (todos opcionales). */
const contextoArb: fc.Arbitrary<ContextoExplicacion> = fc.record(
    {
        serie: fc.array(fc.double({ min: -500, max: 500, noNaN: true }), { maxLength: 8 }),
        semanaInicio: fc.integer({ min: 1, max: 520 }),
        semanaActual: fc.integer({ min: 1, max: 520 }),
        causas: fc.array(fc.string(), { maxLength: 4 }),
        conteoPublicaciones: fc.integer({ min: 0, max: 10000 }),
        conteoComentarios: fc.integer({ min: 0, max: 100000 }),
    },
    { requiredKeys: [] },
);

/** Verdadero si `s` es una cadena no vacia tras recortar espacios. */
function noVacio(s: string): boolean {
    return typeof s === "string" && s.trim().length > 0;
}

describe("PBT Property 18: Toda conclusion tiene explicacion y evidencia cuantificable (Req. 16.4, 17.3, 20.1, 20.2, 20.3, 20.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 18: Toda conclusión tiene explicación y evidencia cuantificable

    it("toda conclusion emitida tiene explicacion NL completa y evidencia cuantificable trazable (Req. 20.1, 20.2, 20.4)", () => {
        fc.assert(
            fc.property(
                dimensionArb,
                anteriorArb,
                evidenciaIdsConAlgunoArb,
                contextoArb,
                (dim, anterior, evidenciaIds, contexto) => {
                    const exp = construirExplicacion(dim, anterior, evidenciaIds, contexto);

                    // Req. 20.1: explicacion NL con los cuatro componentes no vacios.
                    expect(noVacio(exp.que)).toBe(true);
                    expect(noVacio(exp.porQue)).toBe(true);
                    expect(noVacio(exp.cuandoEmpezo)).toBe(true);
                    expect(noVacio(exp.comoEvoluciono)).toBe(true);
                    expect(noVacio(exp.textoNL)).toBe(true);

                    // Req. 20.2 / 16.4 / 17.3: evidencia cuantificable finita.
                    expect(Number.isFinite(exp.evidencia.conteoPublicaciones)).toBe(true);
                    expect(Number.isFinite(exp.evidencia.conteoComentarios)).toBe(true);
                    expect(exp.evidencia.conteoPublicaciones).toBeGreaterThanOrEqual(0);
                    expect(exp.evidencia.conteoComentarios).toBeGreaterThanOrEqual(0);
                    expect(Number.isFinite(exp.evidencia.delta)).toBe(true);
                    expect(Number.isFinite(exp.evidencia.variacionPct)).toBe(true);

                    // Req. 20.4: al menos una evidencia trazable, sin blancos ni duplicados.
                    expect(exp.evidenciaIds.length).toBeGreaterThan(0);
                    expect(exp.evidenciaIds).toEqual(normalizarEvidenciaIds(evidenciaIds));
                    expect(exp.evidenciaIds.every(noVacio)).toBe(true);
                    expect(new Set(exp.evidenciaIds).size).toBe(exp.evidenciaIds.length);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("no existe conclusion sin evidencia referenciable: explicar lanza ConclusionSinEvidenciaError (Req. 20.3)", () => {
        fc.assert(
            fc.property(
                dimensionArb,
                anteriorArb,
                evidenciaIdsVaciaArb,
                contextoArb,
                (dim, anterior, evidenciaIds, contexto) => {
                    expect(tieneEvidenciaReferenciable(evidenciaIds)).toBe(false);
                    expect(() => construirExplicacion(dim, anterior, evidenciaIds, contexto)).toThrow(
                        ConclusionSinEvidenciaError,
                    );
                    expect(() => motor.explicar(dim, anterior, evidenciaIds, contexto)).toThrow(
                        ConclusionSinEvidenciaError,
                    );
                },
            ),
            { numRuns: 100 },
        );
    });

    it("explicarVariaciones solo emite conclusiones que varian Y tienen evidencia; cada una cumple la propiedad (Req. 17.3, 20.3, 20.x)", () => {
        // Conjunto de dimensiones con claves unicas para indexar anteriores/evidencia.
        const dimensionesUnicasArb = fc.uniqueArray(dimensionArb, {
            minLength: 1,
            maxLength: 6,
            selector: (d) => d.clave,
        });

        fc.assert(
            fc.property(
                dimensionesUnicasArb,
                // Para cada dimension: hay anterior?, varia?, tiene evidencia?
                fc.array(fc.tuple(fc.boolean(), fc.boolean(), fc.boolean()), {
                    minLength: 1,
                    maxLength: 6,
                }),
                (actuales, flagsRaw) => {
                    const anteriores: Record<string, DimensionRiesgo> = {};
                    const evidenciaPorDimension: Record<string, string[]> = {};

                    actuales.forEach((dim, i) => {
                        const [conAnterior, varia, conEvidencia] =
                            flagsRaw[i % flagsRaw.length];

                        if (conAnterior) {
                            // Si debe variar, desplazamos el valor anterior lo suficiente;
                            // si no, lo igualamos para que quede estable.
                            const anteriorValor = varia ? dim.valor + 25 : dim.valor;
                            anteriores[dim.clave] = {
                                ...dim,
                                valor: anteriorValor,
                            };
                        }
                        // Sin anterior la dimension SIEMPRE varia (primera medicion).
                        evidenciaPorDimension[dim.clave] = conEvidencia
                            ? [`ev-${dim.clave}`]
                            : [];
                    });

                    const explicaciones = motor.explicarVariaciones(
                        actuales,
                        anteriores,
                        evidenciaPorDimension,
                    );

                    // Toda explicacion emitida cumple la propiedad completa.
                    for (const exp of explicaciones) {
                        expect(noVacio(exp.textoNL)).toBe(true);
                        expect(noVacio(exp.que)).toBe(true);
                        expect(noVacio(exp.porQue)).toBe(true);
                        expect(noVacio(exp.cuandoEmpezo)).toBe(true);
                        expect(noVacio(exp.comoEvoluciono)).toBe(true);
                        expect(exp.evidenciaIds.length).toBeGreaterThan(0);
                        expect(Number.isFinite(exp.evidencia.delta)).toBe(true);
                        expect(Number.isFinite(exp.evidencia.variacionPct)).toBe(true);
                    }

                    // Ninguna dimension SIN evidencia aparece como conclusion (Req. 20.3).
                    const clavesExplicadas = new Set(explicaciones.map((e) => e.dimension));
                    for (const dim of actuales) {
                        if (!tieneEvidenciaReferenciable(evidenciaPorDimension[dim.clave])) {
                            expect(clavesExplicadas.has(dim.clave)).toBe(false);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
