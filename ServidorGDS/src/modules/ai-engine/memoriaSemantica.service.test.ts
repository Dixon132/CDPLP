/**
 * Pruebas unitarias del indexador de la `Memoria_Semantica` (tarea 9.1).
 *
 * Verifican que `MemoriaSemanticaService.indexar`:
 *  - genera los embeddings via un DOBLE DETERMINISTA del `Servicio_IA`
 *    (`GeneradorEmbeddings`) y los empareja 1:1 con sus refs trazables;
 *  - ACUMULA monotonamente en el almacen SIN borrar previos (Req. 36.2): el
 *    corpus solo crece y los vectores de lotes anteriores permanecen;
 *  - persiste cada vector con refs trazables a
 *    semana/comunidad/institucion/analisis y al resultado de origen (Req. 36.5);
 *  - valida la correspondencia posicional y es no-op ante lote vacio.
 *
 * El almacen es un DOBLE en memoria append-only (sin operacion de borrado), de
 * modo que la ausencia de borrado es estructural y la prueba observa unicamente
 * la acumulacion. Jest, deterministico, sin red ni BD.
 *
 * _Requirements: 36.1, 36.2, 36.5_
 */
import type {
    AlmacenEmbeddings,
    FiltroTrazabilidad,
    RefEmbedding,
    RegistroEmbedding,
} from "./embeddingRepositorio";
import type { VectorMemoria } from "./memoriaSemantica";
import {
    type BuscadorSemantico,
    type GeneradorEmbeddings,
    MemoriaSemanticaService,
} from "./memoriaSemantica.service";
import type {
    ConsultaBusquedaSemantica,
    ResultadoBusquedaSemantica,
} from "../../ai/servicio-ia.client";
import type { RegistroIncidente } from "../../ai/health/proxy-degradacion";

/**
 * Doble DETERMINISTA del `Servicio_IA`: produce un vector reproducible por texto
 * (longitud + suma de codigos de caracter), registrando cada llamada para
 * verificar que el indexador genera embeddings via el servicio.
 */
class GeneradorEmbeddingsDoble implements GeneradorEmbeddings {
    readonly llamadas: string[][] = [];

    async embeddings(textos: string[]): Promise<number[][]> {
        this.llamadas.push([...textos]);
        return textos.map((t) => GeneradorEmbeddingsDoble.vector(t));
    }

    /** Vector determinista de dimension 3 derivado del texto. */
    static vector(texto: string): number[] {
        const suma = [...texto].reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return [texto.length, suma % 97, (suma * 7) % 101];
    }
}

/**
 * Doble en memoria del puerto append-only {@link AlmacenEmbeddings}. NO expone
 * ninguna operacion de borrado: el array interno solo crece (Req. 36.2).
 */
class AlmacenEmbeddingsMemoria implements AlmacenEmbeddings {
    /** Lotes insertados, en orden, para auditar la acumulacion. */
    readonly lotes: RegistroEmbedding[][] = [];
    private readonly registros: RegistroEmbedding[] = [];

    async insertar(registros: RegistroEmbedding[]): Promise<void> {
        this.lotes.push(registros.map((r) => ({ ...r, vector: [...r.vector] })));
        // Idempotencia por refId (clave estable), acumulando sin borrar.
        for (const r of registros) {
            const existente = this.registros.findIndex((x) => x.refId === r.refId);
            if (existente === -1) {
                this.registros.push({ ...r, vector: [...r.vector] });
            }
        }
    }

    async contar(filtro?: FiltroTrazabilidad): Promise<number> {
        return this.filtrar(filtro).length;
    }

    async listarRefs(filtro?: FiltroTrazabilidad): Promise<RefEmbedding[]> {
        return this.filtrar(filtro).map((r) => ({
            refId: r.refId,
            analisisId: r.analisisId,
            comunidadId: r.comunidadId,
            institucionId: r.institucionId,
            resultadoId: r.resultadoId,
            numeroSemana: r.numeroSemana,
            refContenido: r.refContenido,
            modelo: r.modelo,
        }));
    }

    async recuperarRefs(
        refIds: string[],
        filtro: FiltroTrazabilidad,
    ): Promise<RefEmbedding[]> {
        if (refIds.length === 0) {
            return [];
        }
        const candidatos = new Set(refIds);
        return this.filtrar(filtro)
            .filter((r) => candidatos.has(r.refId))
            .map((r) => ({
                refId: r.refId,
                analisisId: r.analisisId,
                comunidadId: r.comunidadId,
                institucionId: r.institucionId,
                resultadoId: r.resultadoId,
                numeroSemana: r.numeroSemana,
                refContenido: r.refContenido,
                modelo: r.modelo,
            }));
    }

    /** Acceso de solo lectura al vector persistido de un refId (para asserts). */
    vectorDe(refId: string): number[] | undefined {
        return this.registros.find((r) => r.refId === refId)?.vector;
    }

    private filtrar(filtro?: FiltroTrazabilidad): RegistroEmbedding[] {
        return this.registros.filter((r) => {
            if (filtro?.analisisId !== undefined && r.analisisId !== filtro.analisisId) return false;
            if (filtro?.comunidadId !== undefined && r.comunidadId !== filtro.comunidadId) return false;
            if (filtro?.institucionId !== undefined && r.institucionId !== filtro.institucionId) return false;
            if (filtro?.numeroSemana !== undefined && r.numeroSemana !== filtro.numeroSemana) return false;
            return true;
        });
    }
}

/** Construye un `VectorMemoria` trazable para la semana/comunidad indicadas. */
function meta(
    refId: string,
    refContenido: string,
    overrides: Partial<VectorMemoria> = {},
): VectorMemoria {
    return {
        refId,
        analisisId: "an-1",
        comunidadId: "com-1",
        institucionId: "inst-1",
        resultadoId: "res-1",
        numeroSemana: 1,
        refContenido,
        modelo: "BAAI/bge-m3",
        ...overrides,
    };
}

describe("MemoriaSemanticaService.indexar", () => {
    it("genera embeddings via Servicio_IA y persiste vector + refs trazables", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(gen, almacen);

        const textos = ["hola mundo", "otro fragmento"];
        const vectores = [meta("f1", "post"), meta("f2", "comment:0")];

        await memoria.indexar(vectores, textos);

        // El indexador llamo al Servicio_IA con exactamente los textos a embeber.
        expect(gen.llamadas).toEqual([textos]);

        // Cada vector persistido conserva sus refs trazables (Req. 36.5)...
        const refs = await almacen.listarRefs();
        expect(refs).toHaveLength(2);
        expect(refs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    refId: "f1",
                    analisisId: "an-1",
                    comunidadId: "com-1",
                    institucionId: "inst-1",
                    resultadoId: "res-1",
                    numeroSemana: 1,
                    refContenido: "post",
                    modelo: "BAAI/bge-m3",
                }),
                expect.objectContaining({ refId: "f2", refContenido: "comment:0" }),
            ]),
        );

        // ...y el vector es el del doble determinista para su texto (1:1 posicional).
        expect(almacen.vectorDe("f1")).toEqual(GeneradorEmbeddingsDoble.vector("hola mundo"));
        expect(almacen.vectorDe("f2")).toEqual(GeneradorEmbeddingsDoble.vector("otro fragmento"));
    });

    it("acumula monotonamente sin borrar los vectores de semanas anteriores (Req. 36.2)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(gen, almacen);

        // Semana 1.
        await memoria.indexar(
            [meta("s1-f1", "post", { numeroSemana: 1 })],
            ["semana uno"],
        );
        expect(await almacen.contar()).toBe(1);

        // Semana 2: nuevos vectores; el corpus debe CRECER, no reemplazar.
        await memoria.indexar(
            [
                meta("s2-f1", "post", { numeroSemana: 2 }),
                meta("s2-f2", "comment:0", { numeroSemana: 2 }),
            ],
            ["semana dos a", "semana dos b"],
        );
        expect(await almacen.contar()).toBe(3);

        // Semana 3: mas vectores; acumulacion estrictamente creciente.
        await memoria.indexar(
            [meta("s3-f1", "post", { numeroSemana: 3 })],
            ["semana tres"],
        );

        const total = await almacen.contar();
        expect(total).toBe(4);

        // El vector de la semana 1 SIGUE presente tras indexar semanas posteriores.
        expect(await almacen.contar({ numeroSemana: 1 })).toBe(1);
        expect(almacen.vectorDe("s1-f1")).toEqual(
            GeneradorEmbeddingsDoble.vector("semana uno"),
        );

        // La cuenta por semana confirma la acumulacion contigua sin perdidas.
        expect(await almacen.contar({ numeroSemana: 2 })).toBe(2);
        expect(await almacen.contar({ numeroSemana: 3 })).toBe(1);
    });

    it("re-indexar el mismo fragmento no duplica ni borra (idempotente por refId)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(gen, almacen);

        await memoria.indexar([meta("f1", "post")], ["contenido"]);
        await memoria.indexar([meta("f1", "post")], ["contenido"]);

        expect(await almacen.contar()).toBe(1);
        // El vector previo se conserva (no se borro al reintentar).
        expect(almacen.vectorDe("f1")).toEqual(
            GeneradorEmbeddingsDoble.vector("contenido"),
        );
    });

    it("preserva la trazabilidad por comunidad/institucion en lotes distintos", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(gen, almacen);

        await memoria.indexar(
            [meta("a-f1", "post", { comunidadId: "com-A", institucionId: "inst-A" })],
            ["a"],
        );
        await memoria.indexar(
            [meta("b-f1", "post", { comunidadId: "com-B", institucionId: "inst-B" })],
            ["b"],
        );

        expect(await almacen.contar({ comunidadId: "com-A" })).toBe(1);
        expect(await almacen.contar({ comunidadId: "com-B" })).toBe(1);
        expect(await almacen.contar({ institucionId: "inst-A" })).toBe(1);
    });

    it("es no-op ante un lote vacio (no toca el corpus ni el Servicio_IA)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(gen, almacen);

        await memoria.indexar([], []);

        expect(gen.llamadas).toHaveLength(0);
        expect(almacen.lotes).toHaveLength(0);
        expect(await almacen.contar()).toBe(0);
    });

    it("rechaza el desajuste de longitud entre vectores y textos", async () => {
        const memoria = new MemoriaSemanticaService(
            new GeneradorEmbeddingsDoble(),
            new AlmacenEmbeddingsMemoria(),
        );

        await expect(
            memoria.indexar([meta("f1", "post")], ["a", "b"]),
        ).rejects.toThrow(/desajuste de longitud/);
    });

    it("rechaza si el Servicio_IA devuelve un numero de vectores inconsistente", async () => {
        const genMalo: GeneradorEmbeddings = {
            // Devuelve menos vectores que textos.
            embeddings: async (textos) => textos.slice(1).map(() => [0, 0, 0]),
        };
        const almacen = new AlmacenEmbeddingsMemoria();
        const memoria = new MemoriaSemanticaService(genMalo, almacen);

        await expect(
            memoria.indexar([meta("f1", "post")], ["unico"]),
        ).rejects.toThrow(/devolvio/);
        // No se persistio nada ante el error.
        expect(await almacen.contar()).toBe(0);
    });
});

describe("MemoriaSemanticaService.buscarSimilares (Embeddings_Search)", () => {
    /**
     * Doble DETERMINISTA del `Servicio_IA` (`POST /embeddings/search`): devuelve
     * una lista FIJA de candidatos (puntuados por similitud) registrando la
     * consulta recibida. Puede configurarse para FALLAR y reproducir la
     * indisponibilidad del servicio.
     */
    class BuscadorSemanticoDoble implements BuscadorSemantico {
        readonly consultas: ConsultaBusquedaSemantica[] = [];
        constructor(
            private readonly respuesta:
                | ResultadoBusquedaSemantica[]
                | (() => Promise<ResultadoBusquedaSemantica[]>),
        ) { }

        async buscarSimilares(
            consulta: ConsultaBusquedaSemantica,
        ): Promise<ResultadoBusquedaSemantica[]> {
            this.consultas.push(consulta);
            if (typeof this.respuesta === "function") {
                return this.respuesta();
            }
            return this.respuesta.map((r) => ({ ...r }));
        }
    }

    /** Doble del receptor de incidentes: captura las degradaciones registradas. */
    class RegistroIncidenteDoble implements RegistroIncidente {
        readonly warnings: Array<{ mensaje: string; contexto?: string }> = [];
        readonly logs: Array<{ mensaje: string; contexto?: string }> = [];
        warn(mensaje: string, contexto?: string): void {
            this.warnings.push({ mensaje, contexto });
        }
        log(mensaje: string, contexto?: string): void {
            this.logs.push({ mensaje, contexto });
        }
    }

    /** Candidato de `POST /embeddings/search` (refId + similitud crudos). */
    function candidato(
        refId: string,
        similitud: number,
    ): ResultadoBusquedaSemantica {
        // refContenido/semana del Servicio_IA se ignoran: la trazabilidad
        // autoritativa proviene de gds_embedding (el almacen).
        return { refId, similitud, refContenido: "(ignorado)", semana: null };
    }

    /** Siembra el almacen con un vector trazable via el indexador real. */
    async function sembrar(
        memoria: MemoriaSemanticaService,
        refId: string,
        refContenido: string,
        overrides: Partial<VectorMemoria> = {},
    ): Promise<void> {
        await memoria.indexar([meta(refId, refContenido, overrides)], [refContenido]);
    }

    it("devuelve los fragmentos ordenados por similitud DESCENDENTE (Req. 36.6)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const indexador = new MemoriaSemanticaService(gen, almacen);
        await sembrar(indexador, "f-baja", "fragmento baja");
        await sembrar(indexador, "f-alta", "fragmento alta");
        await sembrar(indexador, "f-media", "fragmento media");

        // El Servicio_IA devuelve los candidatos DESORDENADOS a proposito.
        const buscador = new BuscadorSemanticoDoble([
            candidato("f-media", 0.5),
            candidato("f-alta", 0.9),
            candidato("f-baja", 0.1),
        ]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        const resultados = await memoria.buscarSimilares({ texto: "consulta" }, 5, {
            analisisId: "an-1",
        });

        // Ordenados por similitud descendente, con la trazabilidad autoritativa.
        expect(resultados.map((r) => r.refId)).toEqual(["f-alta", "f-media", "f-baja"]);
        expect(resultados.map((r) => r.similitud)).toEqual([0.9, 0.5, 0.1]);
        expect(resultados[0]).toEqual({
            refId: "f-alta",
            similitud: 0.9,
            refContenido: "fragmento alta",
            numeroSemana: 1,
        });

        // La consulta se delego al Servicio_IA con el filtro colectivo.
        expect(buscador.consultas).toHaveLength(1);
        expect(buscador.consultas[0]).toMatchObject({
            texto: "consulta",
            k: 5,
            filtro: { analisisId: "an-1", comunidadId: undefined },
        });
    });

    it("trunca a los k mas similares", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const indexador = new MemoriaSemanticaService(gen, almacen);
        await sembrar(indexador, "f1", "uno");
        await sembrar(indexador, "f2", "dos");
        await sembrar(indexador, "f3", "tres");

        const buscador = new BuscadorSemanticoDoble([
            candidato("f1", 0.3),
            candidato("f2", 0.8),
            candidato("f3", 0.6),
        ]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        const resultados = await memoria.buscarSimilares({ texto: "q" }, 2, {
            analisisId: "an-1",
        });

        expect(resultados.map((r) => r.refId)).toEqual(["f2", "f3"]);
    });

    it("aplica el filtro COLECTIVO: descarta refs fuera del analisis/comunidad (Req. 36.6, 39.4)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const indexador = new MemoriaSemanticaService(gen, almacen);
        // Pertenecen al ambito colectivo consultado (an-1 / com-1).
        await sembrar(indexador, "in-1", "dentro 1", { comunidadId: "com-1" });
        await sembrar(indexador, "in-2", "dentro 2", { comunidadId: "com-1" });
        // Fuera de ambito: otro analisis y otra comunidad.
        await sembrar(indexador, "out-analisis", "otro analisis", {
            analisisId: "an-2",
        });
        await sembrar(indexador, "out-comunidad", "otra comunidad", {
            comunidadId: "com-2",
        });

        // El Servicio_IA (mal filtrado o no) devuelve TODO; el ServidorGDS debe
        // recortar al ambito colectivo de forma autoritativa.
        const buscador = new BuscadorSemanticoDoble([
            candidato("in-1", 0.9),
            candidato("out-comunidad", 0.85),
            candidato("in-2", 0.7),
            candidato("out-analisis", 0.6),
            candidato("inexistente", 0.99),
        ]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        const resultados = await memoria.buscarSimilares({ texto: "q" }, 10, {
            analisisId: "an-1",
            comunidadId: "com-1",
        });

        // Solo los del ambito colectivo (an-1 + com-1), ordenados por similitud.
        expect(resultados.map((r) => r.refId)).toEqual(["in-1", "in-2"]);
        // Nunca se exponen refs de otro analisis/comunidad ni inexistentes.
        for (const r of resultados) {
            expect(["out-analisis", "out-comunidad", "inexistente"]).not.toContain(
                r.refId,
            );
        }
    });

    it("propaga vector y filtro de comunidad a la consulta del Servicio_IA", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const indexador = new MemoriaSemanticaService(gen, almacen);
        await sembrar(indexador, "f1", "uno", { comunidadId: "com-9" });

        const buscador = new BuscadorSemanticoDoble([candidato("f1", 0.5)]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        await memoria.buscarSimilares({ vector: [1, 2, 3] }, 3, {
            analisisId: "an-1",
            comunidadId: "com-9",
        });

        expect(buscador.consultas[0]).toMatchObject({
            vectorConsulta: [1, 2, 3],
            k: 3,
            filtro: { analisisId: "an-1", comunidadId: "com-9" },
        });
    });

    it("DEGRADA a la Memoria_Jerarquica registrando el incidente si el Embeddings_Search falla (Req. 28.5, 35.3)", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const indexador = new MemoriaSemanticaService(gen, almacen);
        await sembrar(indexador, "f1", "uno");

        const buscador = new BuscadorSemanticoDoble(async () => {
            throw new Error("Servicio_IA caido");
        });
        const incidentes = new RegistroIncidenteDoble();
        const memoria = new MemoriaSemanticaService(
            gen,
            almacen,
            buscador,
            incidentes,
        );

        const resultados = await memoria.buscarSimilares({ texto: "q" }, 5, {
            analisisId: "an-1",
        });

        // No se propaga el error: contexto semantico VACIO (se usara la
        // Memoria_Jerarquica para armar el ContextoGeneracion).
        expect(resultados).toEqual([]);
        // El incidente quedo REGISTRADO con su causa.
        expect(incidentes.warnings).toHaveLength(1);
        expect(incidentes.warnings[0].mensaje).toMatch(/Memoria_Jerarquica/);
        expect(incidentes.warnings[0].mensaje).toMatch(/Servicio_IA caido/);
    });

    it("DEGRADA y registra el incidente si el buscador no esta cableado", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const incidentes = new RegistroIncidenteDoble();
        // Sin buscador (Embeddings_Search no disponible).
        const memoria = new MemoriaSemanticaService(
            gen,
            almacen,
            undefined,
            incidentes,
        );

        const resultados = await memoria.buscarSimilares({ texto: "q" }, 5, {
            analisisId: "an-1",
        });

        expect(resultados).toEqual([]);
        expect(incidentes.warnings).toHaveLength(1);
    });

    it("devuelve vacio sin consultar al Servicio_IA si k no es positivo", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const buscador = new BuscadorSemanticoDoble([candidato("f1", 0.5)]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        await expect(
            memoria.buscarSimilares({ texto: "q" }, 0, { analisisId: "an-1" }),
        ).resolves.toEqual([]);
        expect(buscador.consultas).toHaveLength(0);
    });

    it("devuelve vacio cuando el Embeddings_Search no encuentra candidatos", async () => {
        const gen = new GeneradorEmbeddingsDoble();
        const almacen = new AlmacenEmbeddingsMemoria();
        const buscador = new BuscadorSemanticoDoble([]);
        const memoria = new MemoriaSemanticaService(gen, almacen, buscador);

        await expect(
            memoria.buscarSimilares({ texto: "q" }, 5, { analisisId: "an-1" }),
        ).resolves.toEqual([]);
    });
});
