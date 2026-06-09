// Feature: analisis-tendencias-riesgo-emocional, Property 2: Validez estructural y versionado del contrato producido
/**
 * PBT validez estructural y versionado de la salida del proveedor (tarea 11.7).
 *
 * Property 2: Validez estructural y versionado del contrato producido.
 * Para CUALQUIER salida de proveedor (usando dobles del cliente LLM), el
 * `IDataProvider` expone un `Contrato_Normalizado` valido: cumple la validez
 * estructural del esquema del `Validador_Contrato` (campos `post`,
 * `comments[]`, `image_description`, `hashtags[]`, `metadata`) y porta un campo
 * de **version** en `metadata` (`metadata.version`), versionando el esquema
 * (Req. 2.1 la Capa_Adquisicion entrega solo contratos validos; Req. 3.5
 * versionado del esquema en `metadata`; Req. 4.6 el `IDataProvider` expone la
 * salida ya transformada a `Contrato_Normalizado` valido, con la misma
 * estructura estandar independientemente de la implementacion concreta).
 *
 * Se ejercitan las dos implementaciones reales de `IDataProvider`
 * (`GeminiProvider` por defecto en la nube y `OllamaProvider` local) sin tocar
 * la red: el cliente LLM (`GeminiClient`/`OllamaClient`) se sustituye por un
 * doble que devuelve el texto crudo generado. NO se modifica ni el proveedor ni
 * el `Modulo_Simulacion`; solo se inyectan dobles del cliente y se valida la
 * salida con el `Validador_Contrato` y `CONTRATO_VERSION` reales.
 *
 * El generador `salidaProveedorArb` cubre casos limite tolerados por la
 * normalizacion del proveedor: campos omitidos (`comments`/`hashtags`/
 * `image_description`), tipos no-string que se normalizan a sus defaults,
 * hashtags mezclados con valores no-string (se filtran), contenido no-ASCII
 * (acentos, enie, emojis) y respuestas envueltas en vallas de codigo Markdown.
 *
 * Runner: Jest (`jest pbt --runInBand`), minimo 100 iteraciones
 * (`{ numRuns: 100 }`).
 *
 * Validates: Requirements 2.1, 3.5, 4.6
 */
import fc from "fast-check";

import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoService } from "../../contracts/validadorContrato";
import type { ContextoGeneracion, IDataProvider } from "../dataProvider";
import { GeminiProvider } from "../gemini/geminiProvider";
import type { GeminiClient } from "../gemini/geminiClient";
import { OllamaProvider } from "../ollama/ollamaProvider";
import type { OllamaClient } from "../ollama/ollamaClient";

/**
 * Texto que ejercita casos limite: vacio, ASCII corriente y contenido no-ASCII
 * (acentos, enie, simbolos y emojis), coherente con el idioma `es-BO`.
 */
const textoArb = (): fc.Arbitrary<string> =>
    fc.oneof(
        fc.constant(""),
        fc.string(),
        fc.fullUnicodeString(),
        fc.constantFrom(
            "hoy el examen estuvo durisimo, che",
            "¡no aguanto mas el bloqueo!",
            "ñandú con tildes áéíóú",
            "otra vez de examenes 😤",
            "jaja típico de la u 🤡",
        ),
    );

/** Identificador sintetico no vacio atribuible a un `Usuario_Sintetico`. */
const autorIdArb = (): fc.Arbitrary<string> => fc.string({ minLength: 1, maxLength: 12 });

/**
 * Valor que puede no ser string para ejercitar la normalizacion del proveedor
 * (campos no-string se transforman a su default antes de validar).
 */
const valorQuizaNoStringArb = (): fc.Arbitrary<unknown> =>
    fc.oneof(textoArb(), fc.integer(), fc.boolean(), fc.constant(null));

/** Comentario crudo: `autorId` valido, `texto` y `enRespuestaA` posiblemente irregulares. */
const comentarioCrudoArb = (): fc.Arbitrary<Record<string, unknown>> =>
    fc.record(
        {
            autorId: autorIdArb(),
            texto: valorQuizaNoStringArb(),
            enRespuestaA: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
        },
        { requiredKeys: ["autorId"] },
    );

/**
 * Salida cruda del proveedor (lo que el LLM devolveria, sin `metadata`). Cubre
 * campos opcionales omitidos, tipos no-string normalizables y hashtags mezclados
 * con valores no-string (que el proveedor filtra). `post.autorId` y los
 * `autorId` de comentarios se mantienen no vacios para que la salida sea
 * normalizable a un contrato valido.
 */
const salidaCrudaArb = (): fc.Arbitrary<Record<string, unknown>> =>
    fc.record(
        {
            post: fc.record(
                { autorId: autorIdArb(), texto: valorQuizaNoStringArb() },
                { requiredKeys: ["autorId"] },
            ),
            comments: fc.array(comentarioCrudoArb(), { maxLength: 6 }),
            image_description: valorQuizaNoStringArb(),
            hashtags: fc.array(
                fc.oneof(
                    fc.constantFrom("#paro", "#universidad", "#examenes", "#colegio"),
                    textoArb().map((s) => `#${s}`),
                    fc.integer(),
                    fc.constant(null),
                ),
                { maxLength: 6 },
            ),
        },
        // Campos opcionales: el proveedor los normaliza a sus defaults si faltan.
        { requiredKeys: ["post"] },
    );

/**
 * Texto que el cliente LLM doble devolvera: la salida cruda serializada como
 * JSON, opcionalmente envuelta en vallas de codigo Markdown (```json ... ```),
 * que el proveedor tolera al parsear.
 */
const salidaProveedorArb = (): fc.Arbitrary<string> =>
    fc.tuple(salidaCrudaArb(), fc.boolean()).map(([crudo, conVallas]) => {
        const json = JSON.stringify(crudo);
        return conVallas ? "```json\n" + json + "\n```" : json;
    });

/** Contexto de generacion con `semana` en rango [1,24]; el resto es estructural. */
const contextoArb = (): fc.Arbitrary<ContextoGeneracion> =>
    fc.integer({ min: 1, max: 24 }).map((semana) => ({
        escenario: "tension por epoca de examenes",
        contextoMemoria: "la semana previa subio el estres academico",
        contextoSemantico: ["frag-1"],
        patronesAcumulados: [],
        usuariosSinteticos: [
            {
                id: "u1",
                perfilConductual: "activo",
                frecuencia: 5,
                estiloEscritura: "informal",
                intereses: ["futbol"],
                nivelParticipacion: "alto",
            },
        ],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 500 },
        semana,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    }));

/** Construye un `GeminiProvider` real con un doble del `GeminiClient`. */
function geminiConDoble(texto: string): IDataProvider {
    const cliente: GeminiClient = { generar: async () => texto };
    return new GeminiProvider(cliente, new ValidadorContratoService());
}

/** Construye un `OllamaProvider` real con un doble del `OllamaClient`. */
function ollamaConDoble(texto: string): IDataProvider {
    const cliente: OllamaClient = { generar: async () => texto };
    return new OllamaProvider(cliente, new ValidadorContratoService());
}

/**
 * Validador independiente usado para comprobar la validez estructural de la
 * salida del proveedor contra el esquema del `Validador_Contrato`.
 */
const validador = new ValidadorContratoService();

/** Implementaciones de `IDataProvider` bajo prueba (Req. 4.6: misma estructura). */
const proveedores: ReadonlyArray<{
    nombre: string;
    crear: (texto: string) => IDataProvider;
}> = [
        { nombre: "GeminiProvider", crear: geminiConDoble },
        { nombre: "OllamaProvider", crear: ollamaConDoble },
    ];

describe("Property 2: Validez estructural y versionado del contrato producido", () => {
    for (const { nombre, crear } of proveedores) {
        it(`${nombre}: para cualquier salida, expone un Contrato_Normalizado estructuralmente valido y versionado (Req. 2.1, 3.5, 4.6)`, async () => {
            await fc.assert(
                fc.asyncProperty(
                    salidaProveedorArb(),
                    contextoArb(),
                    async (texto, ctx) => {
                        const proveedor = crear(texto);

                        const contrato = await proveedor.generar(ctx);

                        // Validez estructural per esquema del Validador_Contrato (Req. 2.1, 4.6).
                        const resultado = validador.validar(contrato);
                        expect(resultado.ok).toBe(true);

                        // Campos requeridos del esquema presentes con el tipo correcto.
                        expect(typeof contrato.post.autorId).toBe("string");
                        expect(contrato.post.autorId.length).toBeGreaterThan(0);
                        expect(typeof contrato.post.texto).toBe("string");
                        expect(Array.isArray(contrato.comments)).toBe(true);
                        expect(typeof contrato.image_description).toBe("string");
                        expect(Array.isArray(contrato.hashtags)).toBe(true);
                        expect(
                            contrato.hashtags.every((h) => typeof h === "string"),
                        ).toBe(true);

                        // Versionado del esquema en metadata (Req. 3.5).
                        expect(typeof contrato.metadata.version).toBe("string");
                        expect(contrato.metadata.version.length).toBeGreaterThan(0);
                        expect(contrato.metadata.version).toBe(CONTRATO_VERSION);

                        // Metadata coherente con la generacion solicitada.
                        expect(contrato.metadata.semana).toBe(ctx.semana);
                        expect(contrato.metadata.fuente).toBe(proveedor.nombre);
                        expect(
                            Number.isNaN(Date.parse(contrato.metadata.generadoEn)),
                        ).toBe(false);
                    },
                ),
                { numRuns: 100 },
            );
        });
    }
});
