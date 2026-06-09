/**
 * Pruebas unitarias de las etapas de ANALISIS del `Pipeline_Analisis` y su
 * integracion con los servicios de IA con fallback (tarea 12.2).
 *
 * Cubren:
 * - El orden: anonimizacion antes de todo, `FILTRO_RELEVANCIA` tras la
 *   anonimizacion y antes del NLP (Req. 13.1, 13.5, 34.4).
 * - El NLP recibe UNICAMENTE el contenido contributivo (excluye el ruido,
 *   Req. 34.2) y el contenido no-contributivo se conserva (Req. 34.3).
 * - NLP/Vision via proxy IA->fallback: con el `Servicio_IA` (primario) caido,
 *   el pipeline completa el analisis usando el fallback determinista TS
 *   (Req. 35.3, 35.4) sin que el pipeline conozca la implementacion concreta.
 * - Reanudacion desde la etapa de analisis fallida sin repetir las completadas
 *   (Req. 13.4).
 *
 * La verificacion universal por propiedades vive en las tareas 12.4 (Property 7)
 * y 12.5 (Property 39).
 * _Requirements: 13.1, 13.4, 13.5, 34.4_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    Contributividad,
    ServicioAnonimizacionSha256,
    filtroRelevancia,
    servicioAnonimizacion,
    servicioNLP,
    servicioVision,
    type FiltroRelevancia,
    type ResultadoFiltroRelevancia,
    type ResultadoNLP,
    type ServicioNLP,
    type ServicioVision,
} from "../analisis";
import { crearManejadoresEtapa, crearPipelineAnalisis } from "./etapas";
import {
    construirContratoContributivo,
    crearManejadoresAnalisis,
    crearResultadosAnalisis,
    type ResultadosAnalisis,
    type ServiciosAnalisis,
} from "./etapasAnalisis";
import {
    EtapaPipeline,
    ErrorEtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type EstadoPipeline,
    type ManejadoresEtapa,
} from "./pipeline";
import { ProxyDegradacionServicioIA } from "../../ai/health/proxy-degradacion";
import type { SondaServicioIA } from "../../ai/health/sonda-servicio-ia";
import {
    crearAdaptadorFiltroRelevancia,
    crearAdaptadorServicioNlp,
    crearAdaptadorServicioVision,
} from "../../ai/proxy-adapters";

const SALT = "salt-de-prueba-12-2";

function contratoBase(
    sobreescritura: Partial<ContratoNormalizado> = {},
): ContratoNormalizado {
    return {
        post: { autorId: "usuario-1", texto: "Hoy hubo mucha tension en el curso" },
        comments: [
            { autorId: "usuario-2", texto: "estoy preocupado por el examen", enRespuestaA: null },
            { autorId: "usuario-3", texto: "#examen #estres", enRespuestaA: null },
            { autorId: "usuario-1", texto: "   ", enRespuestaA: "usuario-2" },
        ],
        image_description: "Un grupo de estudiantes reunido frente al aula",
        hashtags: ["#examen"],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
        ...sobreescritura,
    };
}

/** Servicios de analisis con las implementaciones fallback deterministas TS. */
function serviciosFallback(): ServiciosAnalisis {
    return {
        filtroRelevancia,
        servicioNLP,
        servicioVision,
    };
}

describe("construirContratoContributivo (Req. 34.2)", () => {
    it("excluye comentarios no-contributivos y conserva los contributivos", () => {
        const contrato = contratoBase();
        const filtro: ResultadoFiltroRelevancia = {
            contributivos: [
                { refId: "post", contributividad: Contributividad.CONTRIBUTIVO, motivo: "" },
                { refId: "comment:0", contributividad: Contributividad.CONTRIBUTIVO, motivo: "" },
            ],
            noContributivos: [
                { refId: "comment:1", contributividad: Contributividad.NO_CONTRIBUTIVO, motivo: "solo marcadores" },
                { refId: "comment:2", contributividad: Contributividad.NO_CONTRIBUTIVO, motivo: "vacio" },
            ],
        };

        const soloContributivo = construirContratoContributivo(contrato, filtro);

        expect(soloContributivo.post.texto).toBe(contrato.post.texto);
        expect(soloContributivo.comments).toHaveLength(1);
        expect(soloContributivo.comments[0].texto).toBe("estoy preocupado por el examen");
        // No muta el contrato original (el no-contributivo se conserva, Req. 34.3).
        expect(contrato.comments).toHaveLength(3);
    });

    it("vacia el texto del post cuando el post es no-contributivo, preservando la forma", () => {
        const contrato = contratoBase();
        const filtro: ResultadoFiltroRelevancia = {
            contributivos: [
                { refId: "comment:0", contributividad: Contributividad.CONTRIBUTIVO, motivo: "" },
            ],
            noContributivos: [
                { refId: "post", contributividad: Contributividad.NO_CONTRIBUTIVO, motivo: "ruido" },
            ],
        };

        const soloContributivo = construirContratoContributivo(contrato, filtro);

        expect(soloContributivo.post.autorId).toBe(contrato.post.autorId);
        expect(soloContributivo.post.texto).toBe("");
        expect(contrato.post.texto).not.toBe(""); // original intacto
    });
});

describe("crearManejadoresAnalisis - etapas y acumulador", () => {
    it("FILTRO_RELEVANCIA clasifica y guarda la particion sin transformar el contrato", async () => {
        const acumulador = crearResultadosAnalisis();
        const manejadores = crearManejadoresAnalisis(serviciosFallback(), acumulador);
        const contrato = contratoBase();

        const transformado = await manejadores[EtapaPipeline.FILTRO_RELEVANCIA]!(
            contrato,
            estadoPipelineInicial(),
        );

        // No transforma el contrato (devuelve void).
        expect(transformado).toBeUndefined();
        expect(acumulador.filtro).toBeDefined();
        // Particion: post y comment:0 son senal; comment:1 (#) y comment:2 (vacio) ruido.
        const refsContrib = acumulador.filtro!.contributivos.map((i) => i.refId);
        const refsRuido = acumulador.filtro!.noContributivos.map((i) => i.refId);
        expect(refsContrib).toEqual(expect.arrayContaining(["post", "comment:0"]));
        expect(refsRuido).toEqual(expect.arrayContaining(["comment:1", "comment:2"]));
    });

    it("NLP analiza SOLO el contenido contributivo (excluye el ruido, Req. 34.2)", async () => {
        const acumulador = crearResultadosAnalisis();
        // NLP doble que captura el contrato que recibe.
        let recibido: ContratoNormalizado | undefined;
        const nlpEspia: ServicioNLP = {
            analizar: async (c) => {
                recibido = c;
                return servicioNLP.analizar(c);
            },
        };
        const manejadores = crearManejadoresAnalisis(
            { ...serviciosFallback(), servicioNLP: nlpEspia },
            acumulador,
        );
        const contrato = contratoBase();

        await manejadores[EtapaPipeline.FILTRO_RELEVANCIA]!(contrato, estadoPipelineInicial());
        await manejadores[EtapaPipeline.NLP]!(contrato, estadoPipelineInicial());

        expect(recibido).toBeDefined();
        // El ruido (comentarios no-contributivos) no llega al NLP.
        expect(recibido!.comments).toHaveLength(1);
        expect(recibido!.comments[0].texto).toBe("estoy preocupado por el examen");
        expect(acumulador.nlp).toBeDefined();
        expect(acumulador.nlp!.derivadoDeComprensionContextual).toBe(true);
    });

    it("VISION deriva la salida de image_description y la guarda en el acumulador", async () => {
        const acumulador = crearResultadosAnalisis();
        const manejadores = crearManejadoresAnalisis(serviciosFallback(), acumulador);
        const contrato = contratoBase();

        await manejadores[EtapaPipeline.VISION]!(contrato, estadoPipelineInicial());

        expect(acumulador.vision).toBeDefined();
        expect(acumulador.vision!.scene.length).toBeGreaterThan(0);
        expect(acumulador.vision!.objects.length).toBeGreaterThan(0);
    });

    it("VISION se omite (no lanza) cuando image_description esta vacia", async () => {
        const acumulador = crearResultadosAnalisis();
        const manejadores = crearManejadoresAnalisis(serviciosFallback(), acumulador);
        const contrato = contratoBase({ image_description: "   " });

        await expect(
            manejadores[EtapaPipeline.VISION]!(contrato, estadoPipelineInicial()),
        ).resolves.toBeUndefined();
        expect(acumulador.vision).toBeUndefined();
    });
});

describe("integracion via crearPipelineAnalisis (orden + anonimizacion + filtro->NLP)", () => {
    it("ejecuta todas las etapas en orden; el NLP recibe contenido anonimizado y contributivo", async () => {
        const acumulador = crearResultadosAnalisis();
        // Espia el contrato que ve el NLP a traves de un wrapper del servicio.
        let vistoPorNlp: ContratoNormalizado | undefined;
        const nlpEspia: ServicioNLP = {
            analizar: async (c) => {
                vistoPorNlp = c;
                return servicioNLP.analizar(c);
            },
        };

        const pipeline = crearPipelineAnalisis({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
            analisis: {
                servicios: { ...serviciosFallback(), servicioNLP: nlpEspia },
                acumulador,
            },
        });

        const resultado = await pipeline.procesar(contratoBase());

        // Todas las etapas se completaron en el orden canonico.
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);

        // El NLP vio el contrato ya anonimizado (sin ids originales).
        expect(vistoPorNlp).toBeDefined();
        const seudo1 = new ServicioAnonimizacionSha256().seudonimo("usuario-1", SALT);
        const json = JSON.stringify(vistoPorNlp);
        expect(json).not.toContain("usuario-1");
        expect(json).not.toContain("usuario-2");
        expect(vistoPorNlp!.post.autorId).toBe(seudo1);

        // El filtro corrio antes del NLP y el NLP solo vio contributivo.
        expect(acumulador.filtro).toBeDefined();
        expect(vistoPorNlp!.comments.length).toBeLessThan(contratoBase().comments.length);

        // Resultados de analisis acumulados.
        expect(acumulador.nlp).toBeDefined();
        expect(acumulador.vision).toBeDefined();
    });

    it("FILTRO_RELEVANCIA se ejecuta despues de ANONIMIZACION y antes de NLP (Req. 34.4)", async () => {
        const orden: EtapaPipeline[] = [];
        const acumulador = crearResultadosAnalisis();

        // Servicios que registran su momento de ejecucion (delegando al fallback).
        const serviciosRegistrados: ServiciosAnalisis = {
            filtroRelevancia: {
                clasificar: async (c) => {
                    orden.push(EtapaPipeline.FILTRO_RELEVANCIA);
                    return filtroRelevancia.clasificar(c);
                },
            },
            servicioNLP: {
                analizar: async (c) => {
                    orden.push(EtapaPipeline.NLP);
                    return servicioNLP.analizar(c);
                },
            },
            servicioVision: {
                analizar: async (d) => {
                    orden.push(EtapaPipeline.VISION);
                    return servicioVision.analizar(d);
                },
            },
        };

        const pipeline = crearPipelineAnalisis({
            anonimizacion: {
                servicio: {
                    seudonimo: (id, salt) => servicioAnonimizacion.seudonimo(id, salt),
                    anonimizar: (c, salt) => {
                        orden.push(EtapaPipeline.ANONIMIZACION);
                        return servicioAnonimizacion.anonimizar(c, salt);
                    },
                },
                salt: SALT,
            },
            analisis: { servicios: serviciosRegistrados, acumulador },
        });

        await pipeline.procesar(contratoBase());

        const iAnon = orden.indexOf(EtapaPipeline.ANONIMIZACION);
        const iFiltro = orden.indexOf(EtapaPipeline.FILTRO_RELEVANCIA);
        const iNlp = orden.indexOf(EtapaPipeline.NLP);
        expect(iAnon).toBeGreaterThanOrEqual(0);
        expect(iAnon).toBeLessThan(iFiltro);
        expect(iFiltro).toBeLessThan(iNlp);
    });
});

describe("NLP/Vision via proxy IA->fallback (Req. 35.3, 35.4)", () => {
    /** Sonda que reporta el `Servicio_IA` como NO disponible. */
    const sondaCaida: SondaServicioIA = { disponible: async () => false };
    /** Logger silencioso para no contaminar la salida de pruebas. */
    const loggerMudo = { warn: () => undefined, log: () => undefined };

    function serviciosProxyConPrimarioCaido(): ServiciosAnalisis {
        // Primarios que SIEMPRE fallan (simulan el Servicio_IA caido).
        const nlpPrimario: ServicioNLP = {
            analizar: async () => {
                throw new Error("Servicio_IA NLP caido");
            },
        };
        const visionPrimario: ServicioVision = {
            analizar: async () => {
                throw new Error("Servicio_IA Vision caido");
            },
        };
        const filtroPrimario: FiltroRelevancia = {
            clasificar: async () => {
                throw new Error("Servicio_IA Relevancia caido");
            },
        };

        // El proxy degrada al fallback determinista TS sin bloquear el ciclo.
        const proxyNlp = new ProxyDegradacionServicioIA<ServicioNLP>(
            nlpPrimario,
            servicioNLP,
            sondaCaida,
            { nombre: "Servicio_NLP", logger: loggerMudo },
        );
        const proxyVision = new ProxyDegradacionServicioIA<ServicioVision>(
            visionPrimario,
            servicioVision,
            sondaCaida,
            { nombre: "Servicio_Vision", logger: loggerMudo },
        );
        const proxyFiltro = new ProxyDegradacionServicioIA<FiltroRelevancia>(
            filtroPrimario,
            filtroRelevancia,
            sondaCaida,
            { nombre: "Filtro_Relevancia", logger: loggerMudo },
        );

        return {
            filtroRelevancia: crearAdaptadorFiltroRelevancia(proxyFiltro),
            servicioNLP: crearAdaptadorServicioNlp(proxyNlp),
            servicioVision: crearAdaptadorServicioVision(proxyVision),
        };
    }

    it("con el Servicio_IA caido, el pipeline completa el analisis via fallback TS", async () => {
        const acumulador = crearResultadosAnalisis();
        const pipeline = crearPipelineAnalisis({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
            analisis: { servicios: serviciosProxyConPrimarioCaido(), acumulador },
        });

        const resultado = await pipeline.procesar(contratoBase());

        // El ciclo NO se bloquea: todas las etapas se completan (Req. 35.3).
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
        // Los resultados provienen del fallback determinista TS.
        expect(acumulador.filtro).toBeDefined();
        expect(acumulador.nlp).toBeDefined();
        expect(acumulador.vision).toBeDefined();
        // El resultado del fallback coincide con el calculo determinista directo.
        const filtroDirecto = await filtroRelevancia.clasificar(
            servicioAnonimizacion.anonimizar(contratoBase(), SALT),
        );
        expect(acumulador.filtro!.contributivos.map((i) => i.refId)).toEqual(
            filtroDirecto.contributivos.map((i) => i.refId),
        );
    });
});

describe("reanudacion desde la etapa de analisis fallida (Req. 13.4)", () => {
    it("si NLP falla, reanuda desde NLP sin repetir las etapas completadas", async () => {
        const acumulador = crearResultadosAnalisis();
        let debeFallarNlp = true;
        const nlpInestable: ServicioNLP = {
            analizar: async (c) => {
                if (debeFallarNlp) {
                    throw new Error("fallo transitorio del NLP");
                }
                return servicioNLP.analizar(c);
            },
        };

        // Conjunto COMPLETO de manejadores: transformadoras (limpieza,
        // normalizacion, anonimizacion) + analisis (filtro/NLP/vision).
        const manejadores = crearManejadoresEtapa({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
            analisis: {
                servicios: { ...serviciosFallback(), servicioNLP: nlpInestable },
                acumulador,
            },
        });

        // Envolvemos cada manejador para registrar el orden de ejecucion.
        const ejecutadas: EtapaPipeline[] = [];
        const registrados: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            const original = manejadores[etapa];
            registrados[etapa] = (c, e) => {
                ejecutadas.push(etapa);
                return original?.(c, e);
            };
        }
        const orquestador = new OrquestadorPipeline(registrados, {
            error: () => undefined,
        });

        // Primer intento: falla en NLP.
        const error = (await orquestador
            .procesar(contratoBase())
            .catch((e) => e)) as ErrorEtapaPipeline;
        expect(error).toBeInstanceOf(ErrorEtapaPipeline);
        expect(error.etapa).toBe(EtapaPipeline.NLP);
        expect(error.etapasCompletadas).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
            EtapaPipeline.ANONIMIZACION,
            EtapaPipeline.FILTRO_RELEVANCIA,
        ]);

        // Segundo intento (NLP ya no falla): reanuda desde NLP sin repetir.
        ejecutadas.length = 0;
        debeFallarNlp = false;
        const estado: EstadoPipeline = { etapasCompletadas: error.etapasCompletadas };
        const resultado = await orquestador.procesar(contratoBase(), estado);

        expect(ejecutadas).toEqual([
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
            EtapaPipeline.EMBEDDINGS,
        ]);
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
        expect(acumulador.nlp).toBeDefined();
    });
});
