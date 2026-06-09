/**
 * Pruebas unitarias de las etapas concretas del `Pipeline_Analisis` (tarea 9.2).
 *
 * Cubren:
 * - Limpieza y normalizacion de los campos del `Contrato_Normalizado`.
 * - La integracion de la `ANONIMIZACION` cableada al `Servicio_Anonimizacion`,
 *   garantizando que las etapas de analisis posteriores reciben el contrato ya
 *   seudonimizado (anonimizacion antes de todo analisis, Req. 13.5, 23.1).
 * - La reanudacion desde la etapa fallida sin repetir las completadas, con
 *   registro de la etapa fallida (Req. 13.4).
 *
 * La verificacion universal por propiedades vive en las tareas 9.3 (Property 7)
 * y 9.4 (Property 8).
 * _Requirements: 13.1, 13.4, 13.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { servicioAnonimizacion, ServicioAnonimizacionSha256 } from "../analisis";
import {
    crearManejadoresEtapa,
    crearPipelineAnalisis,
    limpiarContrato,
    limpiarTexto,
    normalizarContrato,
    normalizarHashtag,
    normalizarHashtags,
    normalizarTexto,
} from "./etapas";
import {
    EtapaPipeline,
    ErrorEtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type EstadoPipeline,
    type LoggerPipeline,
    type ManejadoresEtapa,
} from "./pipeline";

const SALT = "salt-de-prueba";

function contratoBase(
    sobreescritura: Partial<ContratoNormalizado> = {},
): ContratoNormalizado {
    return {
        post: { autorId: "usuario-1", texto: "hola mundo" },
        comments: [
            { autorId: "usuario-2", texto: "primer comentario", enRespuestaA: null },
            { autorId: "usuario-1", texto: "respondo", enRespuestaA: "usuario-2" },
        ],
        image_description: "una foto",
        hashtags: ["#Tag"],
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

describe("limpiarTexto", () => {
    it("colapsa espacios en blanco y recorta los extremos", () => {
        expect(limpiarTexto("  hola   mundo \n\t loco  ")).toBe("hola mundo loco");
    });

    it("elimina caracteres de control y de anchura cero", () => {
        expect(limpiarTexto("ho\u0000la\u200Bmundo\u0007")).toBe("holamundo");
    });

    it("conserva el texto ya limpio", () => {
        expect(limpiarTexto("texto limpio")).toBe("texto limpio");
    });
});

describe("limpiarContrato", () => {
    it("limpia post, comentarios, descripcion y hashtags sin mutar el original", () => {
        const original = contratoBase({
            post: { autorId: "usuario-1", texto: "  hola   mundo  " },
            comments: [
                { autorId: "usuario-2", texto: "  comentario\n\nruidoso ", enRespuestaA: null },
            ],
            image_description: "  foto   con espacios ",
            hashtags: ["  #Limpio  ", "   ", "#Otro"],
        });

        const limpio = limpiarContrato(original);

        expect(limpio.post.texto).toBe("hola mundo");
        expect(limpio.comments[0].texto).toBe("comentario ruidoso");
        expect(limpio.image_description).toBe("foto con espacios");
        // Descarta el hashtag que queda vacio tras la limpieza.
        expect(limpio.hashtags).toEqual(["#Limpio", "#Otro"]);
        // No muta el original.
        expect(original.post.texto).toBe("  hola   mundo  ");
        expect(original.hashtags).toEqual(["  #Limpio  ", "   ", "#Otro"]);
    });

    it("no altera los identificadores (eso es tarea de la anonimizacion)", () => {
        const limpio = limpiarContrato(contratoBase());
        expect(limpio.post.autorId).toBe("usuario-1");
        expect(limpio.comments[0].autorId).toBe("usuario-2");
        expect(limpio.comments[1].enRespuestaA).toBe("usuario-2");
    });
});

describe("normalizarTexto / normalizarHashtag(s)", () => {
    it("normaliza el texto a forma NFC", () => {
        // "e" + acento combinante -> "é" compuesto
        const descompuesto = "cafe\u0301";
        expect(normalizarTexto(descompuesto)).toBe("café");
        expect(normalizarTexto(descompuesto).normalize("NFC")).toBe(
            normalizarTexto(descompuesto),
        );
    });

    it("canoniza un hashtag a minusculas con un unico prefijo #", () => {
        expect(normalizarHashtag("##Tag")).toBe("#tag");
        expect(normalizarHashtag("Otro")).toBe("#otro");
        expect(normalizarHashtag("   ")).toBe("#");
    });

    it("descarta hashtags vacios y elimina duplicados preservando el orden", () => {
        expect(normalizarHashtags(["#A", "a", "  ", "#B", "B"])).toEqual([
            "#a",
            "#b",
        ]);
    });
});

describe("normalizarContrato", () => {
    it("normaliza textos en NFC y canoniza hashtags sin mutar el original", () => {
        const original = contratoBase({
            post: { autorId: "usuario-1", texto: "cafe\u0301" },
            hashtags: ["#Tag", "tag", "#Otro"],
        });

        const normalizado = normalizarContrato(original);

        expect(normalizado.post.texto).toBe("café");
        expect(normalizado.hashtags).toEqual(["#tag", "#otro"]);
        expect(original.post.texto).toBe("cafe\u0301");
    });
});

describe("integracion ANONIMIZACION antes de todo analisis (Req. 13.5, 23.1)", () => {
    it("las etapas de analisis reciben el contrato ya seudonimizado", async () => {
        const orden: EtapaPipeline[] = [];
        // Manejadores placeholder de analisis que registran el orden y observan
        // el contrato que reciben.
        const observados: ContratoNormalizado[] = [];
        const adicionales: ManejadoresEtapa = {};
        for (const etapa of [
            EtapaPipeline.FILTRO_RELEVANCIA,
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
        ]) {
            adicionales[etapa] = (contrato) => {
                orden.push(etapa);
                observados.push(contrato);
            };
        }

        const pipeline = crearPipelineAnalisis({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
            adicionales,
        });

        const resultado = await pipeline.ejecutar(
            contratoBase(),
            estadoPipelineInicial(),
        );

        // Todas las etapas se completaron en el orden canonico.
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);

        // El seudonimo esperado para usuario-1 con el salt de prueba.
        const seudo1 = new ServicioAnonimizacionSha256().seudonimo("usuario-1", SALT);
        const seudo2 = new ServicioAnonimizacionSha256().seudonimo("usuario-2", SALT);

        // El contrato resultante esta anonimizado.
        expect(resultado.contrato.post.autorId).toBe(seudo1);
        expect(resultado.contrato.comments[0].autorId).toBe(seudo2);

        // Cada etapa de analisis observo un contrato SIN identificadores originales.
        for (const observado of observados) {
            const json = JSON.stringify(observado);
            expect(json).not.toContain("usuario-1");
            expect(json).not.toContain("usuario-2");
            expect(observado.post.autorId).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    it("ANONIMIZACION precede a toda etapa de analisis en el orden ejecutado", async () => {
        const orden: EtapaPipeline[] = [];
        // Manejadores de las etapas transformadoras (con servicio real) envueltos
        // para registrar el orden de ejecucion.
        const reales = crearManejadoresEtapa({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
        });
        const registrados: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            const original = reales[etapa];
            registrados[etapa] = (contrato, estado) => {
                orden.push(etapa);
                return original?.(contrato, estado);
            };
        }

        const pipeline = new OrquestadorPipeline(registrados);
        await pipeline.ejecutar(contratoBase(), estadoPipelineInicial());

        expect(orden).toEqual([...ORDEN_ETAPAS]);
        const iAnon = orden.indexOf(EtapaPipeline.ANONIMIZACION);
        for (const etapa of [
            EtapaPipeline.FILTRO_RELEVANCIA,
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
        ]) {
            expect(iAnon).toBeLessThan(orden.indexOf(etapa));
        }
    });
});

describe("reanudacion desde la etapa fallida (Req. 13.4)", () => {
    function loggerCaptura(): { logger: LoggerPipeline; errores: unknown[][] } {
        const errores: unknown[][] = [];
        const logger: LoggerPipeline = {
            error: (...args) => {
                errores.push(args);
            },
        };
        return { logger, errores };
    }

    it("detiene en la etapa que falla, registra y no marca esa etapa como completada", async () => {
        const { logger, errores } = loggerCaptura();
        const ejecutadas: EtapaPipeline[] = [];
        const manejadores: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            manejadores[etapa] = () => {
                if (etapa === EtapaPipeline.NLP) {
                    throw new Error("fallo simulado en NLP");
                }
                ejecutadas.push(etapa);
            };
        }

        const pipeline = new OrquestadorPipeline(manejadores, logger);

        const error = await pipeline
            .ejecutar(contratoBase(), estadoPipelineInicial())
            .catch((e) => e);

        expect(error).toBeInstanceOf(ErrorEtapaPipeline);
        const err = error as ErrorEtapaPipeline;
        expect(err.etapa).toBe(EtapaPipeline.NLP);
        // Solo las etapas previas a NLP quedan completadas (NLP excluida).
        expect(err.etapasCompletadas).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
            EtapaPipeline.ANONIMIZACION,
            EtapaPipeline.FILTRO_RELEVANCIA,
        ]);
        // Se registro la etapa fallida.
        expect(errores).toHaveLength(1);
    });

    it("al reintentar resume desde la etapa fallida sin repetir las completadas", async () => {
        let debeFallar = true;
        const ejecutadas: EtapaPipeline[] = [];
        const manejadores: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            manejadores[etapa] = () => {
                if (etapa === EtapaPipeline.NLP && debeFallar) {
                    throw new Error("fallo transitorio en NLP");
                }
                ejecutadas.push(etapa);
            };
        }

        const { logger } = loggerCaptura();
        const pipeline = new OrquestadorPipeline(manejadores, logger);

        // Primer intento: falla en NLP.
        const error = (await pipeline
            .ejecutar(contratoBase(), estadoPipelineInicial())
            .catch((e) => e)) as ErrorEtapaPipeline;
        const estadoTrasFallo: EstadoPipeline = {
            etapasCompletadas: error.etapasCompletadas,
        };

        // Las etapas previas a NLP se ejecutaron una vez.
        expect(ejecutadas).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
            EtapaPipeline.ANONIMIZACION,
            EtapaPipeline.FILTRO_RELEVANCIA,
        ]);

        // Segundo intento (ya no falla): reanuda desde NLP.
        ejecutadas.length = 0;
        debeFallar = false;
        const resultado = await pipeline.ejecutar(contratoBase(), estadoTrasFallo);

        // No se repiten las etapas completadas; solo se ejecutan las pendientes.
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
    });

    it("usa el logger por defecto sin lanzar cuando ninguna etapa falla", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const pipeline = crearPipelineAnalisis({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
        });

        const resultado = await pipeline.ejecutar(
            contratoBase(),
            estadoPipelineInicial(),
        );

        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
