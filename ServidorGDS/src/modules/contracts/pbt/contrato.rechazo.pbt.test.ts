/**
 * PBT de rechazo de contratos no conformes (frontera entre capas).
 *
 * Property 3: Rechazo de contratos no conformes con identificacion de campo.
 * Para todo candidato que omita un campo requerido o use un tipo incorrecto, el
 * `Validador_Contrato` lo rechaza, registra un error descriptivo, identifica el
 * campo no conforme e impide que llegue a la `Capa_Analisis`.
 *
 * Se reutiliza el `Validador_Contrato` existente (`validadorContrato.ts`) sin
 * mocks: se parte de un `Contrato_Normalizado` valido generado con `fast-check`
 * y se corrompe **exactamente un** campo (por omision o por tipo incorrecto),
 * conociendo de antemano el campo no conforme esperado. La "Capa_Analisis" se
 * modela con un doble (espia) que la frontera solo invoca cuando la validacion
 * es exitosa; al rechazarse, nunca debe ser invocada.
 *
 * Validates: Requirements 2.5, 2.6, 3.3, 27.4
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { CONTRATO_VERSION } from "../contratoNormalizado";
import type { ContratoNormalizado } from "../contratoNormalizado";
import { ValidadorContratoZod } from "../validadorContrato";

/** Texto con casos limite ASCII / no-ASCII coherentes con `es-BO`. */
const textoArb = (): fc.Arbitrary<string> =>
    fc.oneof(
        fc.constant(""),
        fc.string(),
        fc.constantFrom(
            "que paro mas largo che",
            "¡no aguanto mas el bloqueo!",
            "ñandú con tildes áéíóú",
            "examenes 😤 otra vez"
        )
    );

/** Comentario valido atribuido a un identificador sintetico. */
const comentarioArb = (): fc.Arbitrary<ContratoNormalizado["comments"][number]> =>
    fc.record({
        autorId: fc.string({ minLength: 1 }),
        texto: textoArb(),
        enRespuestaA: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    });

/** Metadata valida con version, idioma `es-BO`, semana [1,24] y `generadoEn` ISO. */
const metadataArb = (): fc.Arbitrary<ContratoNormalizado["metadata"]> =>
    fc.record({
        version: fc.constantFrom(CONTRATO_VERSION, "1.0.0", "1.1.0"),
        fuente: fc.string(),
        generadoEn: fc
            .date({ min: new Date("2000-01-01T00:00:00.000Z"), max: new Date("2100-01-01T00:00:00.000Z") })
            .map((d) => d.toISOString()),
        semana: fc.integer({ min: 1, max: 24 }),
        idioma: fc.constantFrom("es-BO", "es", "qu-BO"),
    });

/**
 * Genera un `Contrato_Normalizado` **valido**. Se garantiza al menos un
 * comentario y un hashtag para poder ejercitar corrupciones en elementos de
 * arreglo con una ruta de campo deterministica.
 */
const contratoValidoArb = (): fc.Arbitrary<ContratoNormalizado> =>
    fc.record({
        post: fc.record({
            autorId: fc.string({ minLength: 1 }),
            texto: textoArb(),
        }),
        comments: fc.array(comentarioArb(), { minLength: 1, maxLength: 5 }),
        image_description: textoArb(),
        hashtags: fc.array(fc.constantFrom("#paro", "#u", "#crisis"), { minLength: 1, maxLength: 5 }),
        metadata: metadataArb(),
    });

/** Resultado de una corrupcion: candidato no conforme + campo esperado en el error. */
interface Corrupcion {
    candidato: unknown;
    campoEsperado: string;
}

/** Clona en profundidad un contrato (es JSON puro) para no mutar el original. */
function clonar(contrato: ContratoNormalizado): Record<string, any> {
    return JSON.parse(JSON.stringify(contrato));
}

/**
 * Catalogo de corruptores. Cada uno parte de un contrato valido y produce un
 * candidato no conforme por **omision de un campo requerido** o por **tipo de
 * dato incorrecto**, devolviendo el campo no conforme esperado (Req. 3.3).
 * Se evitan los campos con valor por defecto (`metadata.idioma`,
 * `comments[].enRespuestaA`), cuya omision no produce rechazo.
 */
const corruptores: Array<(base: ContratoNormalizado) => Corrupcion> = [
    // --- Omision de campo requerido (nivel superior) ---
    (b) => { const c = clonar(b); delete c.post; return { candidato: c, campoEsperado: "post" }; },
    (b) => { const c = clonar(b); delete c.comments; return { candidato: c, campoEsperado: "comments" }; },
    (b) => { const c = clonar(b); delete c.image_description; return { candidato: c, campoEsperado: "image_description" }; },
    (b) => { const c = clonar(b); delete c.hashtags; return { candidato: c, campoEsperado: "hashtags" }; },
    (b) => { const c = clonar(b); delete c.metadata; return { candidato: c, campoEsperado: "metadata" }; },
    // --- Omision de campo requerido (anidado) ---
    (b) => { const c = clonar(b); delete c.post.texto; return { candidato: c, campoEsperado: "post.texto" }; },
    (b) => { const c = clonar(b); delete c.post.autorId; return { candidato: c, campoEsperado: "post.autorId" }; },
    (b) => { const c = clonar(b); delete c.metadata.version; return { candidato: c, campoEsperado: "metadata.version" }; },
    (b) => { const c = clonar(b); delete c.metadata.fuente; return { candidato: c, campoEsperado: "metadata.fuente" }; },
    (b) => { const c = clonar(b); delete c.metadata.generadoEn; return { candidato: c, campoEsperado: "metadata.generadoEn" }; },
    (b) => { const c = clonar(b); delete c.metadata.semana; return { candidato: c, campoEsperado: "metadata.semana" }; },
    (b) => { const c = clonar(b); delete c.comments[0].autorId; return { candidato: c, campoEsperado: "comments[0].autorId" }; },
    // --- Tipo de dato incorrecto (nivel superior) ---
    (b) => { const c = clonar(b); c.post = 123; return { candidato: c, campoEsperado: "post" }; },
    (b) => { const c = clonar(b); c.comments = "no-es-arreglo"; return { candidato: c, campoEsperado: "comments" }; },
    (b) => { const c = clonar(b); c.image_description = 42; return { candidato: c, campoEsperado: "image_description" }; },
    (b) => { const c = clonar(b); c.hashtags = { x: 1 }; return { candidato: c, campoEsperado: "hashtags" }; },
    (b) => { const c = clonar(b); c.metadata = null; return { candidato: c, campoEsperado: "metadata" }; },
    // --- Tipo de dato incorrecto (anidado) ---
    (b) => { const c = clonar(b); c.post.texto = 7; return { candidato: c, campoEsperado: "post.texto" }; },
    (b) => { const c = clonar(b); c.metadata.semana = "tres"; return { candidato: c, campoEsperado: "metadata.semana" }; },
    (b) => { const c = clonar(b); c.metadata.version = 100; return { candidato: c, campoEsperado: "metadata.version" }; },
    (b) => { const c = clonar(b); c.hashtags[0] = 5; return { candidato: c, campoEsperado: "hashtags[0]" }; },
    (b) => { const c = clonar(b); c.comments[0].texto = false; return { candidato: c, campoEsperado: "comments[0].texto" }; },
];

/**
 * Genera un candidato no conforme corrompiendo exactamente un campo de un
 * contrato valido, junto con el campo no conforme esperado.
 */
const contratoInvalidoArb = (): fc.Arbitrary<Corrupcion> =>
    fc
        .tuple(contratoValidoArb(), fc.integer({ min: 0, max: corruptores.length - 1 }))
        .map(([base, i]) => corruptores[i](base));

describe("Property 3: Rechazo de contratos no conformes con identificacion de campo", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 3: Rechazo de contratos no conformes con identificación de campo
    it("rechaza, registra el error, identifica el campo y no llega a la Capa_Analisis (Req. 2.5, 2.6, 3.3, 27.4)", () => {
        fc.assert(
            fc.property(contratoInvalidoArb(), ({ candidato, campoEsperado }) => {
                // Espia de error descriptivo (Req. 2.5) y espia de la Capa_Analisis.
                const erroresRegistrados: string[] = [];
                const registrar = (mensaje: string) => {
                    erroresRegistrados.push(mensaje);
                };
                let recibidosEnCapaAnalisis = 0;
                const capaAnalisis = (_contrato: ContratoNormalizado) => {
                    recibidosEnCapaAnalisis += 1;
                };

                const validador = new ValidadorContratoZod(registrar);

                // Frontera: solo se entrega a la Capa_Analisis lo que valida (Req. 2.6).
                const resultado = validador.validar(candidato);
                if (resultado.ok && resultado.contrato) {
                    capaAnalisis(resultado.contrato);
                }

                // (1) Rechazo (Req. 2.5, 3.3).
                expect(resultado.ok).toBe(false);
                expect(resultado.errores).toBeDefined();
                expect(resultado.errores!.length).toBeGreaterThan(0);

                // (2) El mensaje identifica el campo no conforme (Req. 3.3).
                expect(resultado.errores!.some((e) => e.campo === campoEsperado)).toBe(true);

                // (3) Se registro un error descriptivo antes de la Capa_Analisis (Req. 2.5, 27.4).
                expect(erroresRegistrados.length).toBeGreaterThan(0);

                // (4) Los datos no conformes nunca llegan a la Capa_Analisis (Req. 2.6).
                expect(recibidosEnCapaAnalisis).toBe(0);
            }),
            { numRuns: 100 }
        );
    });
});
