/**
 * PBT del `Filtro_Relevancia` dentro del `Pipeline_Analisis`: clasificacion,
 * exclusion y conservacion del contenido no-contributivo, y posicion fija de la
 * etapa `FILTRO_RELEVANCIA` (tras `ANONIMIZACION` y antes de `NLP`).
 *
 * Property 39: Clasificacion, exclusion y conservacion del filtro de relevancia
 * en su posicion del pipeline.
 * Para todo `Contrato_Normalizado` procesado, el `Filtro_Relevancia` clasifica
 * cada publicacion y comentario en EXACTAMENTE una categoria
 * (`Contenido_Contributivo` o `Contenido_No_Contributivo`) formando una
 * PARTICION sin solapamiento ni omision; el calculo del `Indice_Riesgo` y de los
 * indicadores (modelado por el `Servicio_NLP`, primera etapa que consume la
 * senal) consume UNICAMENTE el `Contenido_Contributivo`, mientras el
 * `Contenido_No_Contributivo` se CONSERVA persistente marcado como tal (no se
 * elimina); y la etapa `FILTRO_RELEVANCIA` se ejecuta SIEMPRE inmediatamente
 * despues de `ANONIMIZACION` y antes de `NLP` en el orden del pipeline.
 *
 * Se ejecuta el `OrquestadorPipeline` real con las etapas transformadoras reales
 * (limpieza -> normalizacion -> anonimizacion) y las etapas de analisis reales
 * (`FILTRO_RELEVANCIA` con `FiltroRelevanciaBase`, `NLP` con el `Servicio_NLP`
 * real envuelto para capturar el contrato que recibe, y `VISION`), sin mocks del
 * orden ni del filtro. La clasificacion esperada de cada item se conoce por
 * construccion del generador `clasificacionRelevanciaArb`.
 *
 * **Validates: Requirements 34.1, 34.2, 34.3, 34.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 39: Clasificación, exclusión y conservación del filtro de relevancia en su posición del pipeline
import fc from "fast-check";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import type { ResultadoNLP, ServicioNLP } from "../../analisis";
import {
    Contributividad,
    FiltroRelevanciaBase,
    analizarContrato,
    servicioAnonimizacion,
    servicioVision,
} from "../../analisis";
import { crearManejadoresEtapa } from "../etapas";
import {
    crearResultadosAnalisis,
    type ResultadosAnalisis,
} from "../etapasAnalisis";
import {
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type ManejadoresEtapa,
} from "../pipeline";

// ---------------------------------------------------------------------------
// Generador `clasificacionRelevanciaArb`: contratos con MEZCLA de contenido
// contributivo (senal) y no-contributivo (ruido), donde la clasificacion
// esperada de cada item se conoce por construccion.
// ---------------------------------------------------------------------------

/** Item generado con su clasificacion esperada por construccion. */
interface ItemGenerado {
    texto: string;
    /** `true` si por construccion el texto es CONTRIBUTIVO (tiene senal textual). */
    contributivoEsperado: boolean;
}

/**
 * Textos CONTRIBUTIVOS: contienen al menos una palabra informativa
 * (secuencia de >= 2 letras), tambien tras limpieza/normalizacion. Incluyen
 * acentos/no-ASCII del espanol andino y casos con marcadores que NO anulan la
 * senal del texto restante.
 */
const textoContributivoArb: fc.Arbitrary<ItemGenerado> = fc
    .constantFrom(
        "el paro paralizo la ciudad entera",
        "estoy preocupado por las clases de manana",
        "totalmente de acuerdo con la marcha",
        "educación pública en crisis otra vez",
        "ñandú áéíóú tension en la universidad",
        "#paro hubo bloqueos en la avenida @alcaldia",
        "que examen mas dificil hoy",
    )
    .map((texto) => ({ texto, contributivoEsperado: true }));

/**
 * Textos NO-CONTRIBUTIVOS: vacios, en blanco, puramente simbolicos o compuestos
 * SOLO por marcadores (hashtags/menciones). Ninguno aporta palabras
 * informativas, ni siquiera tras la limpieza (que colapsa blancos y recorta).
 */
const textoNoContributivoArb: fc.Arbitrary<ItemGenerado> = fc
    .constantFrom(
        "",
        "   ",
        "!!! ??? ...",
        "#paro @alguien #lapaz",
        "123 :) 456",
        "@usuario",
        ":-) :-( ;)",
    )
    .map((texto) => ({ texto, contributivoEsperado: false }));

/** Un item cualquiera: senal o ruido. */
const itemArb: fc.Arbitrary<ItemGenerado> = fc.oneof(
    textoContributivoArb,
    textoNoContributivoArb,
);

/** Contrato generado junto con la clasificacion esperada por `refId`. */
interface ContratoConEsperado {
    contrato: ContratoNormalizado;
    /** refId -> contributivo esperado (`post`, `comment:0`, ...). */
    esperadoPorRef: Map<string, boolean>;
}

/**
 * `clasificacionRelevanciaArb`: genera un `Contrato_Normalizado` cuyo `post` y
 * `comments` mezclan contenido contributivo y no-contributivo, conservando para
 * cada `refId` la clasificacion esperada por construccion.
 */
const clasificacionRelevanciaArb: fc.Arbitrary<ContratoConEsperado> = fc
    .record({
        post: itemArb,
        comments: fc.array(itemArb, { minLength: 0, maxLength: 6 }),
        imageDescription: fc.constantFrom("", "una plaza con estudiantes"),
        semana: fc.integer({ min: 1, max: 24 }),
    })
    .map(({ post, comments, imageDescription, semana }): ContratoConEsperado => {
        const esperadoPorRef = new Map<string, boolean>();
        esperadoPorRef.set("post", post.contributivoEsperado);
        comments.forEach((c, i) => {
            esperadoPorRef.set(`comment:${i}`, c.contributivoEsperado);
        });
        return {
            esperadoPorRef,
            contrato: {
                post: { autorId: "u0", texto: post.texto },
                comments: comments.map((c, i) => ({
                    autorId: `u${i + 1}`,
                    texto: c.texto,
                    enRespuestaA: null,
                })),
                image_description: imageDescription,
                hashtags: ["#paro"],
                metadata: {
                    version: "1.0.0",
                    fuente: "test",
                    generadoEn: "2024-01-01T00:00:00.000Z",
                    semana,
                    idioma: "es-BO",
                },
            },
        };
    });

/**
 * `Servicio_NLP` de captura: registra el contrato que recibe (el contenido que
 * realmente alimenta el indice/indicadores) y delega en el calculo real.
 */
class ServicioNLPCaptura implements ServicioNLP {
    readonly recibidos: ContratoNormalizado[] = [];
    analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP> {
        this.recibidos.push(contrato);
        return Promise.resolve(analizarContrato(contrato));
    }
}

describe("Property 39: Clasificacion, exclusion y conservacion del filtro de relevancia en su posicion del pipeline (Req. 34.1, 34.2, 34.3, 34.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 39: Clasificación, exclusión y conservación del filtro de relevancia en su posición del pipeline

    it("la etapa FILTRO_RELEVANCIA esta SIEMPRE inmediatamente tras ANONIMIZACION y antes de NLP en el orden canonico (Req. 34.4)", () => {
        const iAnon = ORDEN_ETAPAS.indexOf(EtapaPipeline.ANONIMIZACION);
        const iFiltro = ORDEN_ETAPAS.indexOf(EtapaPipeline.FILTRO_RELEVANCIA);
        const iNlp = ORDEN_ETAPAS.indexOf(EtapaPipeline.NLP);
        expect(iAnon).toBeGreaterThanOrEqual(0);
        expect(iFiltro).toBe(iAnon + 1);
        expect(iNlp).toBe(iFiltro + 1);
    });

    it("particiona, excluye el ruido del NLP, conserva el no-contributivo y respeta el orden de etapas", async () => {
        await fc.assert(
            fc.asyncProperty(
                clasificacionRelevanciaArb,
                fc.string({ maxLength: 16 }),
                async ({ contrato, esperadoPorRef }, salt) => {
                    const acumulador: ResultadosAnalisis = crearResultadosAnalisis();
                    const nlpCaptura = new ServicioNLPCaptura();

                    // Etapas reales (transformadoras + analisis), cableadas a los
                    // servicios reales; NLP envuelto para capturar su entrada.
                    const reales = crearManejadoresEtapa({
                        anonimizacion: { servicio: servicioAnonimizacion, salt },
                        analisis: {
                            servicios: {
                                filtroRelevancia: new FiltroRelevanciaBase(),
                                servicioNLP: nlpCaptura,
                                servicioVision,
                            },
                            acumulador,
                        },
                    });

                    // Registrar el orden de ejecucion sin alterar el comportamiento.
                    const ordenEjecutado: EtapaPipeline[] = [];
                    const manejadores: ManejadoresEtapa = {};
                    for (const etapa of ORDEN_ETAPAS) {
                        const original = reales[etapa];
                        manejadores[etapa] = (c, estado) => {
                            ordenEjecutado.push(etapa);
                            return original?.(c, estado);
                        };
                    }

                    const orquestador = new OrquestadorPipeline(manejadores);
                    const resultado = await orquestador.ejecutar(
                        contrato,
                        estadoPipelineInicial(),
                    );

                    const filtro = acumulador.filtro;
                    expect(filtro).toBeDefined();
                    const refsEsperadas = [...esperadoPorRef.keys()];
                    const totalItems = refsEsperadas.length; // post + comentarios

                    // (a) PARTICION sin solape ni omision (Req. 34.1): cada item en
                    // exactamente un subconjunto, cobertura exacta de todos los refIds.
                    const refsContrib = filtro!.contributivos.map((i) => i.refId);
                    const refsNo = filtro!.noContributivos.map((i) => i.refId);
                    const todos = [...refsContrib, ...refsNo];
                    expect(refsContrib.length + refsNo.length).toBe(totalItems);
                    expect(refsContrib.some((r) => refsNo.includes(r))).toBe(false);
                    expect(new Set(todos).size).toBe(totalItems);
                    expect(new Set(todos)).toEqual(new Set(refsEsperadas));

                    // (b) Clasificacion correcta por construccion (Req. 34.1).
                    const contribSet = new Set(refsContrib);
                    for (const [ref, contributivoEsperado] of esperadoPorRef) {
                        expect(contribSet.has(ref)).toBe(contributivoEsperado);
                    }

                    // (c) El NO-CONTRIBUTIVO se CONSERVA y se MARCA, no se elimina
                    // (Req. 34.3): todos marcados, con motivo; ademas el contrato que
                    // se propaga por el pipeline conserva TODOS los items originales.
                    expect(
                        filtro!.noContributivos.every(
                            (i) =>
                                i.contributividad === Contributividad.NO_CONTRIBUTIVO &&
                                i.motivo.length > 0,
                        ),
                    ).toBe(true);
                    expect(resultado.contrato.comments).toHaveLength(
                        contrato.comments.length,
                    );

                    // (d) El NLP (indice/indicadores) consume UNICAMENTE el contenido
                    // contributivo; el ruido se EXCLUYE del analisis (Req. 34.2).
                    expect(nlpCaptura.recibidos).toHaveLength(1);
                    const entradaNlp = nlpCaptura.recibidos[0];
                    // Numero de comentarios contributivos esperados.
                    const comentariosContributivos = [...esperadoPorRef.entries()].filter(
                        ([ref, ok]) => ref !== "post" && ok,
                    ).length;
                    expect(entradaNlp.comments).toHaveLength(comentariosContributivos);
                    // Si el post no es contributivo, su senal se excluye (texto vacio).
                    if (!esperadoPorRef.get("post")) {
                        expect(entradaNlp.post.texto).toBe("");
                    }

                    // (e) Orden en ejecucion: FILTRO_RELEVANCIA inmediatamente tras
                    // ANONIMIZACION y antes de NLP (Req. 34.4).
                    const jAnon = ordenEjecutado.indexOf(EtapaPipeline.ANONIMIZACION);
                    const jFiltro = ordenEjecutado.indexOf(EtapaPipeline.FILTRO_RELEVANCIA);
                    const jNlp = ordenEjecutado.indexOf(EtapaPipeline.NLP);
                    expect(jAnon).toBeGreaterThanOrEqual(0);
                    expect(jFiltro).toBe(jAnon + 1);
                    expect(jNlp).toBe(jFiltro + 1);
                },
            ),
            { numRuns: 100 },
        );
    });
});
