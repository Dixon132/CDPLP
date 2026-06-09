/**
 * PBT del orden de etapas del `Pipeline_Analisis` con la anonimizacion como
 * precondicion de todo analisis y almacenamiento.
 *
 * Property 7: Orden de etapas del pipeline con anonimizacion como precondicion.
 * Para toda ejecucion del pipeline sobre un `Contrato_Normalizado`, las etapas
 * se ejecutan en el orden de `ORDEN_ETAPAS` y la etapa `ANONIMIZACION` precede
 * SIEMPRE a NLP, vision, temporal, patrones, indice, explicacion y a todo
 * almacenamiento de resultados (Req. 13.1, 13.5, 23.1).
 *
 * Se ejecuta el `OrquestadorPipeline` real con las etapas transformadoras reales
 * (limpieza -> normalizacion -> anonimizacion via `crearManejadoresEtapa`,
 * cableadas al `Servicio_Anonimizacion` real) y manejadores de analisis que
 * registran el orden de ejecucion y observan el contrato que reciben, sin mocks
 * del orden ni de la anonimizacion. Cada etapa de analisis y de almacenamiento
 * se ejecuta tras la anonimizacion, por lo que observa un contrato cuyos
 * identificadores originales ya fueron seudonimizados.
 *
 * **Validates: Requirements 13.1, 13.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 7: Orden de etapas del pipeline con anonimización como precondición
import fc from "fast-check";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { servicioAnonimizacion } from "../../analisis";
import { crearManejadoresEtapa } from "../etapas";
import {
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type ManejadoresEtapa,
} from "../pipeline";

/**
 * Etapas de analisis y de almacenamiento de resultados que la `ANONIMIZACION`
 * debe preceder (Req. 13.5). Son todas las etapas posteriores a la
 * anonimizacion; el indice y la explicacion modelan ademas el punto donde se
 * almacenan los resultados colectivos.
 */
const ETAPAS_POSTERIORES_A_ANONIMIZACION: readonly EtapaPipeline[] = [
    EtapaPipeline.FILTRO_RELEVANCIA,
    EtapaPipeline.NLP,
    EtapaPipeline.VISION,
    EtapaPipeline.TEMPORAL,
    EtapaPipeline.PATRONES,
    EtapaPipeline.INDICE,
    EtapaPipeline.EXPLICACION,
];

/**
 * Identificador sintetico original distintivo. El prefijo `usr-orig-` mas un
 * UUID garantiza que el valor no colisione con un seudonimo SHA-256 (hex de 64)
 * y permite verificar que desaparece del contenido tras la anonimizacion.
 */
const idOriginalArb: fc.Arbitrary<string> = fc.uuid().map((u) => `usr-orig-${u}`);

/** Texto que NO contiene identificadores (los ids viven solo en campos de id). */
const textoArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant(""),
    fc.constantFrom(
        "que paro mas largo",
        "no aguanto el bloqueo",
        "examenes otra vez",
        "tipico de la u",
        "ñandú áéíóú",
    ),
);

/** Salt arbitrario para la anonimizacion (incluye vacio y no-ASCII). */
const saltArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant(""),
    fc.string({ minLength: 1, maxLength: 24 }),
);

/** Contrato generado junto con la lista de identificadores originales usados. */
interface ContratoConIds {
    contrato: ContratoNormalizado;
    idsOriginales: string[];
}

/**
 * Genera un `Contrato_Normalizado` cuyos identificadores de autor (post y
 * comentarios) y referencias `enRespuestaA` provienen de un conjunto distintivo
 * de ids originales, devueltos junto al contrato para verificar su ausencia
 * tras la anonimizacion.
 */
const contratoConIdsArb: fc.Arbitrary<ContratoConIds> = fc
    .uniqueArray(idOriginalArb, { minLength: 1, maxLength: 5 })
    .chain((idsOriginales) =>
        fc
            .record({
                postAutor: fc.constantFrom(...idsOriginales),
                postTexto: textoArb,
                imageDescription: textoArb,
                hashtags: fc.array(fc.constantFrom("#paro", "#u", "#crisis"), {
                    maxLength: 4,
                }),
                comments: fc.array(
                    fc.record({
                        autorId: fc.constantFrom(...idsOriginales),
                        texto: textoArb,
                        // `enRespuestaA` referencia siempre a un autor conocido
                        // del contrato (el autor del post) o es null: las
                        // referencias colgantes a ids que nunca son autores no
                        // son un escenario valido y el Servicio_Anonimizacion
                        // (por diseno) solo seudonimiza referencias a autores.
                        enRespuestaA: fc.constant(null as string | null),
                    }),
                    { maxLength: 6 },
                ),
                semana: fc.integer({ min: 1, max: 24 }),
            })
            .map((registro) => ({
                ...registro,
                // Resuelve las referencias `enRespuestaA` al autor del post para
                // ejercitar la seudonimizacion de referencias entre autores.
                comments: registro.comments.map((c, i) => ({
                    ...c,
                    enRespuestaA: i % 2 === 0 ? null : registro.postAutor,
                })),
            }))
            .map(
                ({
                    postAutor,
                    postTexto,
                    imageDescription,
                    hashtags,
                    comments,
                    semana,
                }): ContratoConIds => ({
                    idsOriginales,
                    contrato: {
                        post: { autorId: postAutor, texto: postTexto },
                        comments,
                        image_description: imageDescription,
                        hashtags,
                        metadata: {
                            version: "1.0.0",
                            fuente: "test",
                            generadoEn: "2024-01-01T00:00:00.000Z",
                            semana,
                            idioma: "es-BO",
                        },
                    },
                }),
            ),
    );

const SEUDONIMO_HEX = /^[0-9a-f]{64}$/;

describe("Property 7: Orden de etapas del pipeline con anonimizacion como precondicion (Req. 13.1, 13.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 7: Orden de etapas del pipeline con anonimización como precondición
    it("ejecuta las etapas en el orden de ORDEN_ETAPAS y la ANONIMIZACION precede a todo analisis y almacenamiento, que observan un contrato seudonimizado", async () => {
        await fc.assert(
            fc.asyncProperty(
                contratoConIdsArb,
                saltArb,
                async ({ contrato, idsOriginales }, salt) => {
                    const ordenEjecutado: EtapaPipeline[] = [];
                    // Contratos observados por cada etapa posterior a la
                    // anonimizacion (analisis + almacenamiento de resultados).
                    const observados = new Map<EtapaPipeline, ContratoNormalizado>();

                    // Etapas transformadoras reales (limpieza/normalizacion/
                    // anonimizacion) cableadas al Servicio_Anonimizacion real.
                    const reales = crearManejadoresEtapa({
                        anonimizacion: { servicio: servicioAnonimizacion, salt },
                    });

                    // Se envuelve cada manejador para registrar el orden de
                    // ejecucion; las etapas de analisis/almacenamiento ademas
                    // capturan el contrato recibido.
                    const manejadores: ManejadoresEtapa = {};
                    for (const etapa of ORDEN_ETAPAS) {
                        const original = reales[etapa];
                        manejadores[etapa] = (c, estado) => {
                            ordenEjecutado.push(etapa);
                            if (ETAPAS_POSTERIORES_A_ANONIMIZACION.includes(etapa)) {
                                observados.set(etapa, c);
                            }
                            return original?.(c, estado);
                        };
                    }

                    const orquestador = new OrquestadorPipeline(manejadores);
                    const resultado = await orquestador.ejecutar(
                        contrato,
                        estadoPipelineInicial(),
                    );

                    // (a) Orden canonico exacto y completitud (Req. 13.1).
                    expect(ordenEjecutado).toEqual([...ORDEN_ETAPAS]);
                    expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);

                    // (b) La ANONIMIZACION precede a cada etapa posterior de
                    // analisis y almacenamiento (Req. 13.5).
                    const iAnon = ordenEjecutado.indexOf(EtapaPipeline.ANONIMIZACION);
                    expect(iAnon).toBeGreaterThanOrEqual(0);
                    for (const etapa of ETAPAS_POSTERIORES_A_ANONIMIZACION) {
                        expect(iAnon).toBeLessThan(ordenEjecutado.indexOf(etapa));
                    }

                    // (c) Cada etapa posterior observa un contrato ya
                    // seudonimizado: sin ids originales y con autorId hex(64).
                    for (const etapa of ETAPAS_POSTERIORES_A_ANONIMIZACION) {
                        const observado = observados.get(etapa);
                        expect(observado).toBeDefined();
                        const json = JSON.stringify(observado);
                        for (const idOriginal of idsOriginales) {
                            expect(json).not.toContain(idOriginal);
                        }
                        expect(observado!.post.autorId).toMatch(SEUDONIMO_HEX);
                        for (const comentario of observado!.comments) {
                            expect(comentario.autorId).toMatch(SEUDONIMO_HEX);
                        }
                    }

                    // (d) El contrato resultante tambien queda anonimizado.
                    expect(resultado.contrato.post.autorId).toMatch(SEUDONIMO_HEX);
                },
            ),
            { numRuns: 100 },
        );
    });
});
