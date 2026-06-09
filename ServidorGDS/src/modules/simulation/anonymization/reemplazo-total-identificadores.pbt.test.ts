// Feature: analisis-tendencias-riesgo-emocional, Property 6: Reemplazo total de identificadores antes del análisis
/**
 * PBT - Property 6: Reemplazo total de identificadores antes del analisis.
 *
 * Verifica que `ServicioAnonimizacionSha256.anonimizar(contrato, salt)` reemplaza
 * TODOS los identificadores de `Usuario_Sintetico` por seudonimos antes de que el
 * contrato llegue a cualquier etapa de analisis: ningun identificador sintetico
 * original sobrevive en `post.autorId`, en ningun `comments[].autorId`, ni en las
 * referencias `enRespuestaA` resueltas a un autor conocido del contrato.
 *
 * Estrategia de generacion (generador local, sin acoplar a otras PBT):
 * - Los ids de autor sinteticos usan el patron `AUT_<n>_FIN` (mayusculas y con
 *   delimitadores), de modo que NO puedan aparecer como subcadena de los
 *   seudonimos (hex de 64 caracteres en minusculas) ni del texto/hashtags
 *   (alfabeto en minusculas). Esto hace que la verificacion "no aparece en
 *   ninguna parte" sea solida (sin falsos positivos por subcadena).
 * - `enRespuestaA` se genera como `null`, una referencia a un autor conocido
 *   (ruta de seudonimizacion) o una referencia externa en minusculas (se conserva).
 *
 * Framework: Jest + fast-check (numRuns: 100). Reconocida por `jest pbt` gracias
 * al segmento `pbt` en el nombre del archivo (ver jest.config.js).
 *
 * Validates: Requirements 23.1, 13.5
 */
import fc from "fast-check";

import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import { ServicioAnonimizacionSha256 } from "./servicioAnonimizacion";

const servicio = new ServicioAnonimizacionSha256();

/** Texto en minusculas + espacios; nunca contiene los ids de autor (mayusculas). */
const ALFABETO_SEGURO = "abcdefghijklmnopqrstuvwxyz ".split("");
const textoSeguroArb = fc
    .array(fc.constantFrom(...ALFABETO_SEGURO), { maxLength: 24 })
    .map((cs) => cs.join(""));

/** Referencia externa (no-autor) en minusculas; se conserva tal cual. */
const externoArb = fc
    .array(fc.constantFrom(...ALFABETO_SEGURO), { minLength: 1, maxLength: 10 })
    .map((cs) => `ext-${cs.join("")}`);

/** Metadata valida segun el esquema del Contrato_Normalizado. */
const metadataArb = fc.record({
    version: fc.constant(CONTRATO_VERSION),
    fuente: fc.constantFrom("simulacion", "real", "opaca"),
    generadoEn: fc
        .date({ min: new Date("2020-01-01T00:00:00.000Z"), max: new Date("2030-01-01T00:00:00.000Z") })
        .map((d) => d.toISOString()),
    semana: fc.integer({ min: 1, max: 24 }),
    idioma: fc.constant("es-BO"),
});

/**
 * Genera un `ContratoNormalizado` valido con ids de autor sinteticos unicos y
 * distinguibles. `enRespuestaA` cubre las tres rutas: null, autor conocido y
 * referencia externa.
 */
const contratoArb: fc.Arbitrary<ContratoNormalizado> = fc
    .integer({ min: 1, max: 6 })
    .chain((numAutores) => {
        const idsAutor = Array.from({ length: numAutores }, (_, i) => `AUT_${i}_FIN`);
        const idAutorArb = fc.constantFrom(...idsAutor);
        const enRespuestaAArb = fc.oneof(
            fc.constant<string | null>(null),
            idAutorArb, // referencia a un autor conocido -> debe seudonimizarse
            externoArb, // referencia externa -> se conserva
        );
        const comentarioArb = fc.record({
            autorId: idAutorArb,
            texto: textoSeguroArb,
            enRespuestaA: enRespuestaAArb,
        });
        return fc.record({
            post: fc.record({ autorId: idAutorArb, texto: textoSeguroArb }),
            comments: fc.array(comentarioArb, { maxLength: 8 }),
            image_description: textoSeguroArb,
            hashtags: fc.array(textoSeguroArb.map((t) => `#${t.trim()}`), { maxLength: 4 }),
            metadata: metadataArb,
        });
    });

describe("PBT Property 6 - Reemplazo total de identificadores antes del analisis (Req. 23.1, 13.5)", () => {
    it("ningun identificador sintetico original sobrevive tras anonimizar (numRuns: 100)", () => {
        fc.assert(
            fc.property(contratoArb, fc.string({ minLength: 1, maxLength: 16 }), (contrato, salt) => {
                const out = servicio.anonimizar(contrato, salt);

                // Conjunto de ids de autor originales (post + todos los comentarios).
                const idsAutorOriginales = new Set<string>();
                idsAutorOriginales.add(contrato.post.autorId);
                for (const c of contrato.comments) {
                    idsAutorOriginales.add(c.autorId);
                }

                // (1) post.autorId reemplazado por su seudonimo hex(64).
                expect(out.post.autorId).toBe(servicio.seudonimo(contrato.post.autorId, salt));
                expect(out.post.autorId).toMatch(/^[0-9a-f]{64}$/);

                // (2) Cada comentario: autorId es seudonimo; enRespuestaA a autor
                //     conocido se seudonimiza, lo demas (null/externo) se conserva.
                contrato.comments.forEach((c, i) => {
                    expect(out.comments[i].autorId).toBe(servicio.seudonimo(c.autorId, salt));
                    expect(out.comments[i].autorId).toMatch(/^[0-9a-f]{64}$/);

                    const refOriginal = c.enRespuestaA;
                    if (refOriginal !== null && idsAutorOriginales.has(refOriginal)) {
                        expect(out.comments[i].enRespuestaA).toBe(servicio.seudonimo(refOriginal, salt));
                    } else {
                        expect(out.comments[i].enRespuestaA).toBe(refOriginal);
                    }
                });

                // (3) Reemplazo TOTAL: ningun id de autor original aparece en
                //     NINGUNA parte del contrato anonimizado serializado.
                const serializado = JSON.stringify(out);
                for (const id of idsAutorOriginales) {
                    expect(serializado.includes(id)).toBe(false);
                }
            }),
            { numRuns: 100 },
        );
    });
});
