/**
 * PBT round-trip del `Contrato_Normalizado` (frontera entre capas).
 *
 * Property 1: Round-trip del Contrato Normalizado.
 * Para toda instancia valida de `Contrato_Normalizado`, `deserializar(serializar(c))`
 * produce una instancia equivalente a la original (propiedad de ida y vuelta).
 *
 * Se reutiliza el `Validador_Contrato` existente (`validadorContrato.ts`) sin
 * mocks, ejecutando la serializacion canonica y la deserializacion validante
 * reales sobre contratos generados con `fast-check`.
 *
 * Validates: Requirements 3.4, 3.2
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { CONTRATO_VERSION } from "../contratoNormalizado";
import type { ContratoNormalizado } from "../contratoNormalizado";
import { validadorContrato } from "../validadorContrato";

/**
 * Cadenas que ejercitan casos limite: texto vacio, ASCII corriente y contenido
 * no-ASCII (acentos, enie, simbolos y emojis), coherente con el idioma `es-BO`.
 */
const textoArb = (): fc.Arbitrary<string> =>
    fc.oneof(
        fc.constant(""),
        fc.string(),
        fc.fullUnicodeString(),
        fc.constantFrom(
            "que paro mas largo che",
            "¡no aguanto mas el bloqueo!",
            "ñandú con tildes áéíóú",
            "examenes 😤 otra vez",
            "jaja típico de la u 🤡"
        )
    );

/** Hashtag generado con posible contenido no-ASCII. */
const hashtagArb = (): fc.Arbitrary<string> =>
    fc.oneof(
        fc.constantFrom("#paro", "#universidad", "#crisis", "#bloqueo", "#exámenes"),
        fc.fullUnicodeString().map((s) => `#${s}`)
    );

/** Comentario atribuido a un identificador sintetico (se anonimiza mas adelante). */
const comentarioArb = (): fc.Arbitrary<ContratoNormalizado["comments"][number]> =>
    fc.record({
        autorId: fc.string({ minLength: 1 }),
        texto: textoArb(),
        // Incluye explicitamente null y un id de respuesta para evitar defaults.
        enRespuestaA: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    });

/**
 * Metadata con version del esquema, idioma `es-BO`, semana en rango [1,24] y un
 * `generadoEn` ISO 8601 valido. Incluye opcionalmente campos extra (claves
 * `x_*`) para ejercitar la tolerancia `passthrough` del esquema sin colisionar
 * con los campos definidos.
 */
const metadataArb = (): fc.Arbitrary<ContratoNormalizado["metadata"]> =>
    fc
        .record({
            version: fc.constantFrom(CONTRATO_VERSION, "1.0.0", "1.1.0", "2.0.0"),
            fuente: fc.string(),
            generadoEn: fc
                .date({ min: new Date("2000-01-01T00:00:00.000Z"), max: new Date("2100-01-01T00:00:00.000Z") })
                .map((d) => d.toISOString()),
            semana: fc.integer({ min: 1, max: 24 }),
            idioma: fc.constantFrom("es-BO", "es", "qu-BO"),
            extra: fc.dictionary(
                fc.string({ minLength: 1 }).map((s) => `x_${s}`),
                fc.string(),
                { maxKeys: 3 }
            ),
        })
        .map(({ extra, ...base }) => ({ ...base, ...extra }));

/**
 * Generador del `Contrato_Normalizado` completo: posts, comentarios, hashtags y
 * metadata versionada. Cubre listas vacias y contenido no-ASCII.
 */
const contratoNormalizadoArb = (): fc.Arbitrary<ContratoNormalizado> =>
    fc.record({
        post: fc.record({
            autorId: fc.string({ minLength: 1 }),
            texto: textoArb(),
        }),
        comments: fc.array(comentarioArb(), { maxLength: 6 }),
        image_description: textoArb(),
        hashtags: fc.array(hashtagArb(), { maxLength: 6 }),
        metadata: metadataArb(),
    });

describe("Property 1: Round-trip del Contrato Normalizado", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 1: Round-trip del Contrato Normalizado
    it("deserializar(serializar(c)) produce una instancia equivalente a la original (Req. 3.4, 3.2)", () => {
        fc.assert(
            fc.property(contratoNormalizadoArb(), (contrato) => {
                const json = validadorContrato.serializar(contrato);
                const resultado = validadorContrato.deserializar(json);
                // El round-trip acepta la instancia (Req. 3.2) y la preserva (Req. 3.4).
                expect(resultado.ok).toBe(true);
                expect(resultado.contrato).toEqual(contrato);
            }),
            { numRuns: 100 }
        );
    });
});
