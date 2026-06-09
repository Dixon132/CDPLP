// Feature: analisis-tendencias-riesgo-emocional, Property 6: Reemplazo total de identificadores antes del análisis
/**
 * Prueba basada en propiedades (PBT) de la **Property 6: Reemplazo total de
 * identificadores antes del análisis**.
 *
 * Verifica que, tras aplicar `Servicio_Anonimizacion.anonimizar`, ningún
 * identificador sintético original de `Usuario_Sintetico` permanece en los
 * campos portadores de identidad del `Contrato_Normalizado`
 * (`post.autorId`, `comments[].autorId` y las `enRespuestaA` que referencian a
 * un autor conocido), quedando todos seudonimizados. Esta sustitución total
 * ocurre **antes** de cualquier etapa de análisis o almacenamiento de la
 * `Capa_Analisis` (la anonimización es la precondición del pipeline).
 *
 * Se reconoce por el patrón `pbt` en su ruta, de modo que `vitest run pbt`
 * ejecute la suite PBT. Se ejecuta con el mínimo de 100 iteraciones
 * (`{ numRuns: 100 }`) exigido por las reglas transversales del plan.
 *
 * **Validates: Requirements 23.1, 13.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ServicioAnonimizacionSha256 } from "../servicioAnonimizacion";

const servicio = new ServicioAnonimizacionSha256();

/** Salt arbitrario no vacío. */
const saltArb = fc.string({ minLength: 1, maxLength: 24 });

/**
 * Generador inteligente de un `ContratoNormalizado` válido junto con el conjunto
 * de identificadores de autor **presentes** en el contrato (post + comentarios).
 *
 * - Construye un grupo de autores con ids reconocibles (`autor-N`) y distintos
 *   de las referencias externas (`externo-N`), de modo que ninguna referencia
 *   externa colisione con un id de autor.
 * - El generador procede en dos fases para respetar el contrato del servicio:
 *   primero fija el autor del post y los autores de cada comentario, y solo
 *   entonces construye cada `enRespuestaA`. Así, una referencia a un autor solo
 *   apunta a un autor **realmente presente** en el contrato (que el servicio
 *   debe seudonimizar), mientras que `null` y las referencias externas no-autor
 *   se conservan tal cual.
 */
function contratoConAutoresArb(): fc.Arbitrary<{
    contrato: ContratoNormalizado;
    autoresPresentes: string[];
}> {
    return fc.integer({ min: 1, max: 6 }).chain((nAutores) => {
        const idsAutores = Array.from({ length: nAutores }, (_, i) => `autor-${i}`);
        const autorIdArb = fc.constantFrom(...idsAutores);

        const metadataArb = fc.record({
            version: fc.constant(CONTRATO_VERSION),
            fuente: fc.constantFrom("simulacion", "api", "scraping"),
            generadoEn: fc.constant("2024-01-01T00:00:00.000Z"),
            semana: fc.integer({ min: 1, max: 24 }),
            idioma: fc.constant("es-BO"),
        });

        // Fase 1: autor del post y "esqueleto" de comentarios (autor + texto), sin
        // resolver todavía `enRespuestaA`.
        return fc
            .record({
                postAutor: autorIdArb,
                comentariosBase: fc.array(
                    fc.record({ autorId: autorIdArb, texto: fc.string() }),
                    { maxLength: 8 },
                ),
                image_description: fc.string(),
                hashtags: fc.array(fc.string(), { maxLength: 5 }),
                metadata: metadataArb,
            })
            .chain((base) => {
                const presentes = [base.postAutor, ...base.comentariosBase.map((c) => c.autorId)];
                // Referencia: null | autor presente (→ se seudonimiza) | externo no-autor (→ se conserva)
                const enRespuestaArb = fc.oneof(
                    fc.constant<string | null>(null),
                    fc.constantFrom(...presentes),
                    fc.integer({ min: 0, max: 20 }).map((n) => `externo-${n}`),
                );

                return fc
                    .array(enRespuestaArb, {
                        minLength: base.comentariosBase.length,
                        maxLength: base.comentariosBase.length,
                    })
                    .map((referencias) => {
                        const contrato: ContratoNormalizado = {
                            post: { autorId: base.postAutor, texto: "publicación" },
                            comments: base.comentariosBase.map((c, i) => ({
                                autorId: c.autorId,
                                texto: c.texto,
                                enRespuestaA: referencias[i],
                            })),
                            image_description: base.image_description,
                            hashtags: base.hashtags,
                            metadata: base.metadata,
                        };
                        return { contrato, autoresPresentes: Array.from(new Set(presentes)) };
                    });
            });
    });
}

describe("Property 6: reemplazo total de identificadores antes del análisis", () => {
    it("tras anonimizar, ningún id de autor original permanece y todos quedan seudonimizados (Req. 23.1, 13.5)", () => {
        fc.assert(
            fc.property(contratoConAutoresArb(), saltArb, ({ contrato, autoresPresentes }, salt) => {
                const out = servicio.anonimizar(contrato, salt);
                const originales = new Set(autoresPresentes);

                // post.autorId queda seudonimizado y ya no es un id original.
                expect(out.post.autorId).toBe(servicio.seudonimo(contrato.post.autorId, salt));
                expect(originales.has(out.post.autorId)).toBe(false);

                out.comments.forEach((comentario, i) => {
                    const original = contrato.comments[i];

                    // comments[].autorId queda seudonimizado y ya no es un id original.
                    expect(comentario.autorId).toBe(servicio.seudonimo(original.autorId, salt));
                    expect(originales.has(comentario.autorId)).toBe(false);

                    // enRespuestaA que referencia a un autor conocido también se seudonimiza;
                    // referencias externas (no-autor) o null se conservan tal cual.
                    if (original.enRespuestaA !== null && originales.has(original.enRespuestaA)) {
                        expect(comentario.enRespuestaA).toBe(
                            servicio.seudonimo(original.enRespuestaA, salt),
                        );
                        expect(originales.has(comentario.enRespuestaA as string)).toBe(false);
                    } else {
                        expect(comentario.enRespuestaA).toBe(original.enRespuestaA);
                    }
                });

                // Ningún id original aparece en los campos portadores de identidad de la salida.
                const camposIdentidad = [
                    out.post.autorId,
                    ...out.comments.map((c) => c.autorId),
                    ...out.comments.map((c) => c.enRespuestaA ?? ""),
                ].join("|");
                for (const id of originales) {
                    expect(camposIdentidad.includes(id)).toBe(false);
                }
            }),
            { numRuns: 100 },
        );
    });
});
