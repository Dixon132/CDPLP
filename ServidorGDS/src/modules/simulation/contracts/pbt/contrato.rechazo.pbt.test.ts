// Feature: analisis-tendencias-riesgo-emocional, Property 3: Rechazo de contratos no conformes con identificación de campo
/**
 * PBT del rechazo de contratos no conformes por el `Validador_Contrato`
 * (frontera entre la `Capa_Adquisicion` y la `Capa_Analisis`).
 *
 * Property 3: Rechazo de contratos no conformes con identificación de campo.
 * Para todo candidato a `Contrato_Normalizado` que viola el esquema versionado
 * (campo requerido ausente o de tipo incorrecto), el `Validador_Contrato`:
 *   1. lo RECHAZA (`ok === false`),
 *   2. IDENTIFICA el/los campo(s) no conforme(s) en `errores[{ campo, mensaje }]`
 *      (Req. 3.3), y
 *   3. impide que los datos invalidos lleguen a la `Capa_Analisis`, registrando
 *      antes un error descriptivo (Req. 2.5, 2.6, 27.4, 40.5).
 *
 * El punto 3 modela la frontera de entrada a la `Capa_Analisis`: la
 * `ValidationPipe` global de NestJS (configurada en `main.ts`, tarea 1.1) y el
 * `Validador_Contrato` solo dejan cruzar instancias conformes; cualquier
 * candidato rechazado nunca invoca la logica de analisis. Aqui se verifica esa
 * garantia de forma determinista mediante un doble (`capaAnalisisSpy`) que NO
 * debe ejecutarse ante datos no conformes.
 *
 * Se reutiliza el `Validador_Contrato` real (`ValidadorContratoZod`) sin mocks;
 * solo se inyecta un registrador espia para observar el registro del rechazo.
 *
 * Validates: Requirements 2.5, 2.6, 3.3, 27.4, 40.5
 */
import fc from "fast-check";

import { CONTRATO_VERSION } from "../contratoNormalizado";
import type { ContratoNormalizado } from "../contratoNormalizado";
import { ValidadorContratoZod } from "../validadorContrato";

/** Contrato base valido a partir del cual cada mutador introduce una violacion. */
const contratoBaseArb = (): fc.Arbitrary<ContratoNormalizado> =>
    fc.record({
        post: fc.record({
            autorId: fc.string({ minLength: 1 }),
            texto: fc.string(),
        }),
        comments: fc.array(
            fc.record({
                autorId: fc.string({ minLength: 1 }),
                texto: fc.string(),
                enRespuestaA: fc.option(fc.string({ minLength: 1 }), { nil: null }),
            }),
            { maxLength: 4 }
        ),
        image_description: fc.string(),
        hashtags: fc.array(fc.string(), { maxLength: 4 }),
        metadata: fc.record({
            version: fc.constantFrom(CONTRATO_VERSION, "1.0.0", "1.1.0"),
            fuente: fc.string(),
            generadoEn: fc
                .date({
                    min: new Date("2000-01-01T00:00:00.000Z"),
                    max: new Date("2100-01-01T00:00:00.000Z"),
                })
                .map((d) => d.toISOString()),
            semana: fc.integer({ min: 1, max: 24 }),
            idioma: fc.constantFrom("es-BO", "es"),
        }),
    });

/** Resultado de aplicar un mutador: el candidato invalido y el campo esperado. */
interface CandidatoInvalido {
    candidato: unknown;
    /** Etiqueta de campo que el validador debe reportar como no conforme. */
    campoEsperado: string;
}

/** Clon profundo (el contrato es serializable a JSON) para no compartir estado. */
function clonar(c: ContratoNormalizado): Record<string, any> {
    return JSON.parse(JSON.stringify(c));
}

/**
 * Catalogo de mutadores que producen una violacion del esquema: o un campo
 * requerido ausente o un campo con tipo/valor incorrecto. Cada uno anota el
 * `campoEsperado` que el `Validador_Contrato` debe identificar (Req. 3.3).
 */
const mutadores: ReadonlyArray<(c: ContratoNormalizado) => CandidatoInvalido> = [
    // --- Campos de primer nivel ausentes ---
    (c) => {
        const x = clonar(c);
        delete x.post;
        return { candidato: x, campoEsperado: "post" };
    },
    (c) => {
        const x = clonar(c);
        delete x.comments;
        return { candidato: x, campoEsperado: "comments" };
    },
    (c) => {
        const x = clonar(c);
        delete x.image_description;
        return { candidato: x, campoEsperado: "image_description" };
    },
    (c) => {
        const x = clonar(c);
        delete x.hashtags;
        return { candidato: x, campoEsperado: "hashtags" };
    },
    (c) => {
        const x = clonar(c);
        delete x.metadata;
        return { candidato: x, campoEsperado: "metadata" };
    },
    // --- Campos de primer nivel con tipo incorrecto ---
    (c) => {
        const x = clonar(c);
        x.post = "no-es-objeto";
        return { candidato: x, campoEsperado: "post" };
    },
    (c) => {
        const x = clonar(c);
        x.comments = 123;
        return { candidato: x, campoEsperado: "comments" };
    },
    (c) => {
        const x = clonar(c);
        x.image_description = 42;
        return { candidato: x, campoEsperado: "image_description" };
    },
    (c) => {
        const x = clonar(c);
        x.hashtags = "no-es-arreglo";
        return { candidato: x, campoEsperado: "hashtags" };
    },
    // --- Campos anidados ausentes o invalidos ---
    (c) => {
        const x = clonar(c);
        delete x.post.texto;
        return { candidato: x, campoEsperado: "post.texto" };
    },
    (c) => {
        const x = clonar(c);
        x.post.autorId = "";
        return { candidato: x, campoEsperado: "post.autorId" };
    },
    (c) => {
        const x = clonar(c);
        delete x.metadata.version;
        return { candidato: x, campoEsperado: "metadata.version" };
    },
    (c) => {
        const x = clonar(c);
        x.metadata.semana = "no-es-numero";
        return { candidato: x, campoEsperado: "metadata.semana" };
    },
    (c) => {
        const x = clonar(c);
        x.metadata.semana = 999; // fuera del rango [1,24]
        return { candidato: x, campoEsperado: "metadata.semana" };
    },
    (c) => {
        const x = clonar(c);
        x.metadata.generadoEn = "no-es-fecha-iso";
        return { candidato: x, campoEsperado: "metadata.generadoEn" };
    },
    // --- Elemento de arreglo invalido (ruta con indice) ---
    (c) => {
        const x = clonar(c);
        x.comments = [{ autorId: "", texto: "x", enRespuestaA: null }, ...x.comments];
        return { candidato: x, campoEsperado: "comments[0].autorId" };
    },
];

/** Generador `contratoInvalidoArb`: contrato base valido + una violacion. */
const contratoInvalidoArb = (): fc.Arbitrary<CandidatoInvalido> =>
    fc
        .record({ base: contratoBaseArb(), mutador: fc.constantFrom(...mutadores) })
        .map(({ base, mutador }) => mutador(base));

describe("Property 3: Rechazo de contratos no conformes con identificación de campo", () => {
    it("rechaza el contrato, identifica el campo no conforme y no llega a la Capa_Analisis (Req. 2.5, 2.6, 3.3, 27.4, 40.5)", () => {
        fc.assert(
            fc.property(contratoInvalidoArb(), ({ candidato, campoEsperado }) => {
                const registrar = jest.fn();
                const validador = new ValidadorContratoZod(registrar);

                // Doble de la frontera: la Capa_Analisis solo se invoca si el
                // candidato es conforme (modela la ValidationPipe global).
                const capaAnalisisSpy = jest.fn();
                const resultado = validador.validar(candidato);
                if (resultado.ok) {
                    capaAnalisisSpy(resultado.contrato);
                }

                // 1. Rechazo (Req. 2.6).
                expect(resultado.ok).toBe(false);
                expect(resultado.contrato).toBeUndefined();

                // 2. Identificacion del/los campo(s) no conforme(s) (Req. 3.3).
                expect(resultado.errores).toBeDefined();
                expect(resultado.errores?.length).toBeGreaterThan(0);
                expect(resultado.errores?.some((e) => e.campo === campoEsperado)).toBe(true);
                // Cada error trae un mensaje descriptivo no vacio.
                expect(resultado.errores?.every((e) => e.mensaje.length > 0)).toBe(true);

                // 3. Los datos invalidos no cruzan a la Capa_Analisis (Req. 2.5, 27.4, 40.5)
                //    y el rechazo se registra antes de hacerlo (error descriptivo).
                expect(capaAnalisisSpy).not.toHaveBeenCalled();
                expect(registrar).toHaveBeenCalledTimes(1);
            }),
            { numRuns: 100 }
        );
    });
});
