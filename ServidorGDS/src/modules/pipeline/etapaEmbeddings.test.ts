/**
 * Pruebas unitarias de la etapa final `EMBEDDINGS` del `Pipeline_Analisis`
 * (tarea 9.3).
 *
 * Verifican que la etapa, ejecutada TRAS la explicacion:
 *  - extrae del contenido analizado (post, comentarios, descripcion de imagen)
 *    los fragmentos a embeber con refs trazables 1:1 a semana/comunidad/
 *    institucion/analisis y al resultado de la semana (Req. 36.5);
 *  - calcula e indexa esos embeddings via la capacidad de INDEXAR de la
 *    `Memoria_Semantica` (tarea 9.1) acumulando en `pgvector` (Req. 36.1);
 *  - se integra como ULTIMA etapa del pipeline (tras `EXPLICACION`);
 *  - se persiste de forma TRANSACCIONAL junto con el resultado de la semana:
 *    resultado + embeddings se confirman en la misma transaccion y, ante un
 *    fallo de cualquiera de los dos, la transaccion se revierte por completo
 *    (atomicidad del bucle de aprendizaje, Req. 36.1).
 *
 * Se usa un DOBLE DETERMINISTA de la `Memoria_Semantica` (registra cada llamada
 * a `indexar`) y un ejecutor transaccional doble que simula commit/rollback.
 * Jest, deterministico, sin red ni BD.
 *
 * _Requirements: 36.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { servicioAnonimizacion } from "../analisis";
import type {
    ConsultaSimilitud,
    FiltroSimilitud,
    MemoriaSemantica,
    ResultadoSimilitud,
    VectorMemoria,
} from "../ai-engine/memoriaSemantica";
import {
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type ResultadoSemana,
} from "./pipeline";
import { crearManejadoresEtapa, crearPipelineAnalisis } from "./etapas";
import {
    MODELO_EMBEDDING_POR_DEFECTO,
    type ContextoEmbeddings,
    crearManejadorEmbeddings,
    extraerFragmentosEmbeddings,
    persistirResultadoSemanaConEmbeddings,
} from "./etapaEmbeddings";

const SALT = "salt-embeddings";

/**
 * Doble determinista de la `Memoria_Semantica`: registra cada llamada a
 * `indexar` (vectores + textos) para auditar que la etapa embebe el contenido
 * analizado correcto. `buscarSimilares` (tarea 9.2) no se usa aqui.
 */
class MemoriaSemanticaDoble implements MemoriaSemantica {
    readonly indexados: { vectores: VectorMemoria[]; textos: string[] }[] = [];
    /** Si es true, `indexar` lanza para simular un fallo de persistencia vectorial. */
    fallar = false;

    async indexar(vectores: VectorMemoria[], textos: string[]): Promise<void> {
        if (this.fallar) {
            throw new Error("fallo simulado al indexar embeddings");
        }
        this.indexados.push({
            vectores: vectores.map((v) => ({ ...v })),
            textos: [...textos],
        });
    }

    async buscarSimilares(
        _consulta: ConsultaSimilitud,
        _k: number,
        _filtro: FiltroSimilitud,
    ): Promise<ResultadoSimilitud[]> {
        throw new Error("no usado en estas pruebas");
    }
}

function contratoAnalizado(
    sobreescritura: Partial<ContratoNormalizado> = {},
): ContratoNormalizado {
    return {
        post: { autorId: "seudo-post", texto: "publicacion analizada" },
        comments: [
            { autorId: "seudo-c1", texto: "primer comentario", enRespuestaA: null },
            { autorId: "seudo-c2", texto: "segundo comentario", enRespuestaA: null },
        ],
        image_description: "descripcion de la imagen",
        hashtags: ["#tema"],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 4,
            idioma: "es-BO",
        },
        ...sobreescritura,
    };
}

function contextoBase(
    overrides: Partial<ContextoEmbeddings> = {},
): ContextoEmbeddings {
    return {
        analisisId: "an-1",
        comunidadId: "com-1",
        institucionId: "inst-1",
        resultadoId: "res-4",
        numeroSemana: 4,
        ...overrides,
    };
}

describe("extraerFragmentosEmbeddings", () => {
    it("extrae post, comentarios y descripcion de imagen con refs trazables 1:1", () => {
        const { vectores, textos } = extraerFragmentosEmbeddings(
            contratoAnalizado(),
            contextoBase(),
        );

        // post + 2 comentarios + imagen = 4 fragmentos.
        expect(textos).toEqual([
            "publicacion analizada",
            "primer comentario",
            "segundo comentario",
            "descripcion de la imagen",
        ]);
        expect(vectores).toHaveLength(4);

        // refId estable y unico por fragmento dentro del resultado de la semana.
        expect(vectores.map((v) => v.refId)).toEqual([
            "res-4#post",
            "res-4#comment:0",
            "res-4#comment:1",
            "res-4#image",
        ]);
        // refContenido describe el origen del fragmento.
        expect(vectores.map((v) => v.refContenido)).toEqual([
            "post",
            "comment:0",
            "comment:1",
            "image",
        ]);
        // Todas las refs trazables (Req. 36.5) y el modelo por defecto.
        for (const v of vectores) {
            expect(v.analisisId).toBe("an-1");
            expect(v.comunidadId).toBe("com-1");
            expect(v.institucionId).toBe("inst-1");
            expect(v.resultadoId).toBe("res-4");
            expect(v.numeroSemana).toBe(4);
            expect(v.modelo).toBe(MODELO_EMBEDDING_POR_DEFECTO);
        }
    });

    it("omite fragmentos vacios (no embebe contenido en blanco)", () => {
        const { vectores, textos } = extraerFragmentosEmbeddings(
            contratoAnalizado({
                post: { autorId: "seudo-post", texto: "   " },
                comments: [
                    { autorId: "seudo-c1", texto: "unico comentario", enRespuestaA: null },
                ],
                image_description: "",
            }),
            contextoBase(),
        );

        expect(textos).toEqual(["unico comentario"]);
        expect(vectores.map((v) => v.refId)).toEqual(["res-4#comment:0"]);
    });

    it("respeta el modelo de embeddings indicado en el contexto", () => {
        const { vectores } = extraerFragmentosEmbeddings(
            contratoAnalizado(),
            contextoBase({ modelo: "all-MiniLM-L6-v2" }),
        );
        for (const v of vectores) {
            expect(v.modelo).toBe("all-MiniLM-L6-v2");
        }
    });

    it("no muta el contrato de entrada", () => {
        const contrato = contratoAnalizado();
        const copia = JSON.parse(JSON.stringify(contrato));
        extraerFragmentosEmbeddings(contrato, contextoBase());
        expect(contrato).toEqual(copia);
    });
});

describe("etapa EMBEDDINGS en el Pipeline_Analisis", () => {
    it("se integra como ULTIMA etapa y indexa el contenido analizado (Req. 36.1)", async () => {
        const memoria = new MemoriaSemanticaDoble();
        const contexto = contextoBase();

        const pipeline = crearPipelineAnalisis({
            anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
            embeddings: { memoria, contexto },
        });

        const resultado = await pipeline.ejecutar(
            contratoAnalizado(),
            estadoPipelineInicial(),
        );

        // El pipeline completo termina en EMBEDDINGS.
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
        expect(resultado.etapasCompletadas[resultado.etapasCompletadas.length - 1]).toBe(
            EtapaPipeline.EMBEDDINGS,
        );

        // La Memoria_Semantica fue invocada exactamente una vez con los fragmentos.
        expect(memoria.indexados).toHaveLength(1);
        const { textos, vectores } = memoria.indexados[0];
        // El contenido embebido es el ya anonimizado por la etapa ANONIMIZACION.
        expect(textos).toContain("publicacion analizada");
        expect(vectores).toHaveLength(textos.length);
        expect(vectores[0].resultadoId).toBe("res-4");
    });

    it("EMBEDDINGS se ejecuta despues de EXPLICACION en el orden real", async () => {
        const orden: EtapaPipeline[] = [];
        const memoria = new MemoriaSemanticaDoble();

        // Manejadores de analisis que registran el orden, incl. EXPLICACION.
        const adicionales = Object.fromEntries(
            [
                EtapaPipeline.FILTRO_RELEVANCIA,
                EtapaPipeline.NLP,
                EtapaPipeline.VISION,
                EtapaPipeline.TEMPORAL,
                EtapaPipeline.PATRONES,
                EtapaPipeline.INDICE,
                EtapaPipeline.EXPLICACION,
            ].map((etapa) => [etapa, () => void orden.push(etapa)]),
        );

        // Envolver el manejador EMBEDDINGS para registrar su posicion en el orden.
        const baseEmbeddings = crearManejadorEmbeddings(memoria, contextoBase());
        const pipeline = new OrquestadorPipeline(
            crearManejadoresEtapa({
                anonimizacion: { servicio: servicioAnonimizacion, salt: SALT },
                adicionales: {
                    ...adicionales,
                    [EtapaPipeline.EMBEDDINGS]: async (contrato, estado) => {
                        orden.push(EtapaPipeline.EMBEDDINGS);
                        return baseEmbeddings(contrato, estado);
                    },
                },
            }),
        );

        await pipeline.ejecutar(contratoAnalizado(), estadoPipelineInicial());

        const iExplicacion = orden.indexOf(EtapaPipeline.EXPLICACION);
        const iEmbeddings = orden.indexOf(EtapaPipeline.EMBEDDINGS);
        expect(iExplicacion).toBeGreaterThanOrEqual(0);
        expect(iEmbeddings).toBe(orden.length - 1);
        expect(iExplicacion).toBeLessThan(iEmbeddings);
        expect(memoria.indexados).toHaveLength(1);
    });
});

describe("persistirResultadoSemanaConEmbeddings (transaccional, Req. 36.1)", () => {
    /** Ejecutor transaccional doble: confirma solo si el trabajo no lanza. */
    function ejecutorDoble() {
        const eventos: string[] = [];
        const ejecutar = async <R>(trabajo: (tx: unknown) => Promise<R>): Promise<R> => {
            const tx = { id: "tx-1" };
            eventos.push("begin");
            try {
                const r = await trabajo(tx);
                eventos.push("commit");
                return r;
            } catch (e) {
                eventos.push("rollback");
                throw e;
            }
        };
        return { ejecutar, eventos };
    }

    it("persiste el resultado y los embeddings en la MISMA transaccion (commit)", async () => {
        const memoria = new MemoriaSemanticaDoble();
        const { ejecutar, eventos } = ejecutorDoble();
        const resultadosGuardados: { tx: unknown; resultado: ResultadoSemana }[] = [];

        const resultado: ResultadoSemana = {
            etapasCompletadas: [...ORDEN_ETAPAS],
            contrato: contratoAnalizado(),
        };
        const contexto = contextoBase();

        await persistirResultadoSemanaConEmbeddings(
            {
                ejecutar,
                persistirResultado: async (tx, res) => {
                    resultadosGuardados.push({ tx, resultado: res });
                },
                memoriaTransaccional: () => memoria,
            },
            resultado,
            contexto,
        );

        // La transaccion se confirmo (commit) una sola vez.
        expect(eventos).toEqual(["begin", "commit"]);
        // El resultado se persistio y los embeddings se indexaron, ambos dentro de la tx.
        expect(resultadosGuardados).toHaveLength(1);
        expect(memoria.indexados).toHaveLength(1);
        expect(resultadosGuardados[0].tx).toEqual({ id: "tx-1" });
    });

    it("revierte TODO si falla el indexado de embeddings (no persiste el resultado)", async () => {
        const memoria = new MemoriaSemanticaDoble();
        memoria.fallar = true; // simula fallo de pgvector dentro de la tx
        const { ejecutar, eventos } = ejecutorDoble();
        let resultadoConfirmado = false;

        const resultado: ResultadoSemana = {
            etapasCompletadas: [...ORDEN_ETAPAS],
            contrato: contratoAnalizado(),
        };

        await expect(
            persistirResultadoSemanaConEmbeddings(
                {
                    ejecutar,
                    // El persistor del resultado solo "confirma" si la tx hace commit;
                    // como la tx hara rollback, marcamos el efecto provisional aqui y
                    // verificamos que la tx no llega a commit.
                    persistirResultado: async () => {
                        resultadoConfirmado = true;
                    },
                    memoriaTransaccional: () => memoria,
                },
                resultado,
                contextoBase(),
            ),
        ).rejects.toThrow(/indexar embeddings/);

        // La transaccion se revirtio: no hubo commit.
        expect(eventos).toEqual(["begin", "rollback"]);
        // No quedaron embeddings indexados (el doble fallo antes de registrar).
        expect(memoria.indexados).toHaveLength(0);
        // El persistor se invoco dentro de la tx pero su efecto se descarta por rollback.
        expect(resultadoConfirmado).toBe(true);
    });

    it("no indexa embeddings si falla la persistencia del resultado (orden y rollback)", async () => {
        const memoria = new MemoriaSemanticaDoble();
        const { ejecutar, eventos } = ejecutorDoble();

        await expect(
            persistirResultadoSemanaConEmbeddings(
                {
                    ejecutar,
                    persistirResultado: async () => {
                        throw new Error("fallo simulado al persistir el resultado");
                    },
                    memoriaTransaccional: () => memoria,
                },
                {
                    etapasCompletadas: [...ORDEN_ETAPAS],
                    contrato: contratoAnalizado(),
                },
                contextoBase(),
            ),
        ).rejects.toThrow(/persistir el resultado/);

        expect(eventos).toEqual(["begin", "rollback"]);
        // El indexado nunca se alcanzo (la persistencia del resultado va primero).
        expect(memoria.indexados).toHaveLength(0);
    });
});
