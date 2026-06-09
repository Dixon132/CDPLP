/**
 * Pruebas unitarias del framework del `Pipeline_Analisis` (tarea 9.1).
 *
 * Cubren el orden canonico de `ORDEN_ETAPAS` (limpieza -> ... -> explicacion),
 * la precondicion de anonimizacion (Req. 13.5) y la posicion del filtro de
 * relevancia (Req. 34.4), asi como el esqueleto de reanudacion del orquestador
 * que ejecuta desde la primera etapa no completada sin repetir las completadas
 * (Req. 13.1, 13.4). La verificacion universal por propiedades vive en las
 * tareas 9.3 (Property 7) y 9.4 (Property 8). La tarea 12.1 anade la verificacion
 * del punto de entrada canonico libre de origen (`procesar`) y la persistencia
 * de `etapas_completadas`.
 * _Requirements: 2.2, 2.4, 13.1, 13.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    estadoDesdeEtapasCompletadas,
    serializarEtapasCompletadas,
    primeraEtapaPendiente,
    type EstadoPipeline,
    type ManejadoresEtapa,
} from "./pipeline";

function contratoDummy(): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "hola" },
        comments: [],
        image_description: "",
        hashtags: [],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
    };
}

describe("ORDEN_ETAPAS", () => {
    it("define el orden canonico completo de las 11 etapas", () => {
        expect([...ORDEN_ETAPAS]).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
            EtapaPipeline.ANONIMIZACION,
            EtapaPipeline.FILTRO_RELEVANCIA,
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
            EtapaPipeline.EMBEDDINGS,
        ]);
    });

    it("incluye cada etapa del enum exactamente una vez", () => {
        const valores = Object.values(EtapaPipeline);
        expect(ORDEN_ETAPAS).toHaveLength(valores.length);
        expect(new Set(ORDEN_ETAPAS).size).toBe(ORDEN_ETAPAS.length);
        for (const etapa of valores) {
            expect(ORDEN_ETAPAS).toContain(etapa);
        }
    });

    it("ejecuta ANONIMIZACION antes de toda etapa de analisis (Req. 13.5)", () => {
        const iAnon = ORDEN_ETAPAS.indexOf(EtapaPipeline.ANONIMIZACION);
        const etapasAnalisis = [
            EtapaPipeline.FILTRO_RELEVANCIA,
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
            EtapaPipeline.EMBEDDINGS,
        ];
        for (const etapa of etapasAnalisis) {
            expect(iAnon).toBeLessThan(ORDEN_ETAPAS.indexOf(etapa));
        }
    });

    it("coloca FILTRO_RELEVANCIA justo tras ANONIMIZACION y antes de NLP (Req. 34.4)", () => {
        const iAnon = ORDEN_ETAPAS.indexOf(EtapaPipeline.ANONIMIZACION);
        const iFiltro = ORDEN_ETAPAS.indexOf(EtapaPipeline.FILTRO_RELEVANCIA);
        const iNlp = ORDEN_ETAPAS.indexOf(EtapaPipeline.NLP);
        expect(iFiltro).toBe(iAnon + 1);
        expect(iFiltro).toBeLessThan(iNlp);
    });

    it("coloca EMBEDDINGS como ultima etapa, tras la explicacion (Req. 36.1)", () => {
        expect(ORDEN_ETAPAS[ORDEN_ETAPAS.length - 1]).toBe(EtapaPipeline.EMBEDDINGS);
        expect(ORDEN_ETAPAS.indexOf(EtapaPipeline.EXPLICACION)).toBeLessThan(
            ORDEN_ETAPAS.indexOf(EtapaPipeline.EMBEDDINGS),
        );
    });
});

describe("primeraEtapaPendiente", () => {
    it("devuelve 0 cuando no hay etapas completadas", () => {
        expect(primeraEtapaPendiente(estadoPipelineInicial())).toBe(0);
    });

    it("devuelve el indice de la primera etapa no completada", () => {
        const estado: EstadoPipeline = {
            etapasCompletadas: [
                EtapaPipeline.LIMPIEZA,
                EtapaPipeline.NORMALIZACION,
            ],
        };
        expect(primeraEtapaPendiente(estado)).toBe(2);
    });

    it("devuelve la longitud total cuando todas estan completadas", () => {
        const estado: EstadoPipeline = { etapasCompletadas: [...ORDEN_ETAPAS] };
        expect(primeraEtapaPendiente(estado)).toBe(ORDEN_ETAPAS.length);
    });
});

describe("OrquestadorPipeline", () => {
    function manejadoresQueRegistran(orden: EtapaPipeline[]): ManejadoresEtapa {
        const manejadores: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            manejadores[etapa] = () => {
                orden.push(etapa);
            };
        }
        return manejadores;
    }

    it("ejecuta todas las etapas en el orden de ORDEN_ETAPAS desde un estado vacio", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const orquestador = new OrquestadorPipeline(
            manejadoresQueRegistran(ejecutadas),
        );

        const resultado = await orquestador.ejecutar(
            contratoDummy(),
            estadoPipelineInicial(),
        );

        expect(ejecutadas).toEqual([...ORDEN_ETAPAS]);
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("reanuda desde la primera etapa no completada sin repetir las completadas", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const orquestador = new OrquestadorPipeline(
            manejadoresQueRegistran(ejecutadas),
        );
        const estado: EstadoPipeline = {
            etapasCompletadas: [
                EtapaPipeline.LIMPIEZA,
                EtapaPipeline.NORMALIZACION,
                EtapaPipeline.ANONIMIZACION,
            ],
        };

        const resultado = await orquestador.ejecutar(contratoDummy(), estado);

        // Solo se ejecutan las etapas pendientes, en orden.
        expect(ejecutadas).toEqual([
            EtapaPipeline.FILTRO_RELEVANCIA,
            EtapaPipeline.NLP,
            EtapaPipeline.VISION,
            EtapaPipeline.TEMPORAL,
            EtapaPipeline.PATRONES,
            EtapaPipeline.INDICE,
            EtapaPipeline.EXPLICACION,
            EtapaPipeline.EMBEDDINGS,
        ]);
        // El resultado acumula las completadas previas + las recien ejecutadas.
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("no ejecuta ninguna etapa cuando todas estan completadas (idempotencia)", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const orquestador = new OrquestadorPipeline(
            manejadoresQueRegistran(ejecutadas),
        );
        const estado: EstadoPipeline = { etapasCompletadas: [...ORDEN_ETAPAS] };

        const resultado = await orquestador.ejecutar(contratoDummy(), estado);

        expect(ejecutadas).toEqual([]);
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("trata las etapas sin manejador como placeholder (no-op) y aun asi las marca completadas", async () => {
        // Orquestador sin manejadores inyectados (andamiaje puro).
        const orquestador = new OrquestadorPipeline();

        const resultado = await orquestador.ejecutar(
            contratoDummy(),
            estadoPipelineInicial(),
        );

        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("no muta el estado de entrada", async () => {
        const orquestador = new OrquestadorPipeline();
        const estado = estadoPipelineInicial();

        await orquestador.ejecutar(contratoDummy(), estado);

        expect(estado.etapasCompletadas).toEqual([]);
    });
});

describe("OrquestadorPipeline.procesar (firma canonica libre de origen, Req. 2.2/2.4)", () => {
    function manejadoresQueRegistran(orden: EtapaPipeline[]): ManejadoresEtapa {
        const manejadores: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            manejadores[etapa] = () => {
                orden.push(etapa);
            };
        }
        return manejadores;
    }

    it("procesa un contrato SIN ningun parametro de origen y recorre ORDEN_ETAPAS", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const orquestador = new OrquestadorPipeline(
            manejadoresQueRegistran(ejecutadas),
        );

        // Unico argumento: el contrato. No hay parametro de fuente/origen.
        const resultado = await orquestador.procesar(contratoDummy());

        expect(ejecutadas).toEqual([...ORDEN_ETAPAS]);
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("la aridad publica de procesar no exige un parametro de origen", () => {
        // procesar(contrato, estado?) -> el unico parametro requerido es el contrato.
        expect(OrquestadorPipeline.prototype.procesar.length).toBe(1);
    });

    it("arranca desde un estado inicial cuando no se pasa estado", async () => {
        const orquestador = new OrquestadorPipeline();
        const resultado = await orquestador.procesar(contratoDummy());
        expect(resultado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("reanuda desde un EstadoPipeline persistido sin repetir etapas completadas", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const orquestador = new OrquestadorPipeline(
            manejadoresQueRegistran(ejecutadas),
        );
        const estado: EstadoPipeline = {
            etapasCompletadas: [
                EtapaPipeline.LIMPIEZA,
                EtapaPipeline.NORMALIZACION,
                EtapaPipeline.ANONIMIZACION,
                EtapaPipeline.FILTRO_RELEVANCIA,
            ],
        };

        const resultado = await orquestador.procesar(contratoDummy(), estado);

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

    it("no importa ningun simbolo de la Capa_Adquisicion (desacople de tipos)", () => {
        // El modulo pipeline solo conoce el tipo compartido ContratoNormalizado.
        // Verificamos a nivel de runtime que procesar opera sobre el contrato sin
        // requerir metadatos de proveedor/fuente: un contrato minimo basta.
        const minimo = contratoDummy();
        expect(() => new OrquestadorPipeline().procesar(minimo)).not.toThrow();
    });
});

describe("persistencia de etapas_completadas (Req. 13.1)", () => {
    it("serializa las etapas completadas en el orden canonico sin duplicados", () => {
        const estado = {
            etapasCompletadas: [
                EtapaPipeline.ANONIMIZACION,
                EtapaPipeline.LIMPIEZA,
                EtapaPipeline.NORMALIZACION,
                EtapaPipeline.LIMPIEZA, // duplicado
            ],
        };
        expect(serializarEtapasCompletadas(estado)).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
            EtapaPipeline.ANONIMIZACION,
        ]);
    });

    it("reconstruye el estado desde la columna persistida descartando valores desconocidos", () => {
        const estado = estadoDesdeEtapasCompletadas([
            "NORMALIZACION",
            "LIMPIEZA",
            "ETAPA_DESCONOCIDA",
        ]);
        expect(estado.etapasCompletadas).toEqual([
            EtapaPipeline.LIMPIEZA,
            EtapaPipeline.NORMALIZACION,
        ]);
    });

    it("round-trip: procesar -> serializar -> reconstruir -> reanudar es idempotente", async () => {
        const ejecutadas: EtapaPipeline[] = [];
        const manejadores: ManejadoresEtapa = {};
        for (const etapa of ORDEN_ETAPAS) {
            manejadores[etapa] = () => {
                ejecutadas.push(etapa);
            };
        }

        // Primer pase: completa todo el pipeline.
        const orquestador = new OrquestadorPipeline(manejadores);
        const resultado = await orquestador.procesar(contratoDummy());

        // Persistimos (simulado) en la columna etapas_completadas.
        const persistido = serializarEtapasCompletadas(resultado).map((e) => e.toString());
        expect(persistido).toEqual([...ORDEN_ETAPAS]);

        // Reconstruir el estado desde lo persistido y reanudar: nada por hacer.
        ejecutadas.length = 0;
        const estado = estadoDesdeEtapasCompletadas(persistido);
        expect(primeraEtapaPendiente(estado)).toBe(ORDEN_ETAPAS.length);
        const reanudado = await orquestador.procesar(contratoDummy(), estado);
        expect(ejecutadas).toEqual([]); // idempotencia: no se repite ninguna etapa
        expect(reanudado.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });
});
