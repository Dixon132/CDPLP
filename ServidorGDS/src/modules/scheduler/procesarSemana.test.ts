/**
 * Pruebas unitarias del UNICO `procesarSemana` transaccional (tarea 16.1).
 *
 * Verifican que `procesarSemana`:
 *  - ejecuta el flujo en el orden exacto genera -> valida -> analiza -> aprende
 *    -> almacena (Req. 12.3, 13.2, 13.3);
 *  - rechaza el contenido no conforme en la frontera del `Validador_Contrato`,
 *    sin llegar a analizar/almacenar (Req. 2.5);
 *  - persiste el resultado de la semana y los embeddings de la `Memoria_Semantica`
 *    dentro de UNA SOLA transaccion atomica (Req. 25.5, 36.1);
 *  - ante un fallo de persistencia, REVIERTE por completo: no queda resultado ni
 *    embeddings de esa semana (atomicidad, Req. 25.5);
 *  - ante un fallo del analisis (etapa del pipeline), NO abre la transaccion ni
 *    persiste nada (Req. 13.4);
 *  - reutiliza la MISMA logica para cualquier modo (no hay ramas por modo).
 *
 * Todo con dobles deterministas (sin red ni BD), coherente con el motor de
 * ciclos sincrono y determinista exigido por el plan.
 * _Requirements: 12.2, 12.3, 13.2, 13.3, 25.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { ValidadorContratoZod } from "../contracts/validadorContrato";
import type { MemoriaSemantica, VectorMemoria } from "../ai-engine/memoriaSemantica";
import {
    EtapaPipeline,
    ORDEN_ETAPAS,
    type EstadoPipeline,
    type ResultadoSemana,
} from "../pipeline/pipeline";
import type { ResultadosAnalisis } from "../pipeline/etapasAnalisis";
import {
    ProcesadorSemana,
    type AnalizadorSemana,
    type ArtefactosAprendizaje,
    type DependenciasProcesarSemana,
    type EntradaAprendizaje,
    type GeneradorSemana,
    type PersistorSemana,
    type ResultadoAnalisisSemana,
    type ResultadoGeneracionSemana,
    type UnidadTrabajoSemana,
} from "./procesarSemana";

// --- Fixtures --------------------------------------------------------------

function contratoValido(semana = 1): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "hola comunidad" },
        comments: [{ autorId: "u2", texto: "buen dia", enRespuestaA: "u1" }],
        image_description: "una foto de la plaza",
        hashtags: ["#colegio"],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana,
            idioma: "es-BO",
        },
    };
}

/** Almacen en memoria que simula la BD; las escrituras solo "se confirman" al commit. */
class AlmacenTx {
    resultados: UnidadTrabajoSemana[] = [];
    embeddings: VectorMemoria[] = [];
}

/**
 * Doble de `EjecutorTransaccional`: aplica las escrituras a un buffer staging y
 * solo las VUELCA al almacen real si el trabajo termina sin lanzar; si lanza,
 * descarta el staging (rollback) y propaga el error.
 */
function crearEjecutorTransaccional(almacen: AlmacenTx) {
    return async <R>(trabajo: (tx: AlmacenTx) => Promise<R>): Promise<R> => {
        const staging = new AlmacenTx();
        const resultado = await trabajo(staging); // si lanza -> no se vuelca (rollback)
        almacen.resultados.push(...staging.resultados);
        almacen.embeddings.push(...staging.embeddings);
        return resultado;
    };
}

/** `Memoria_Semantica` ligada a una transaccion (escribe en el staging tx). */
function memoriaTxFactory(): (tx: AlmacenTx) => MemoriaSemantica {
    return (tx: AlmacenTx): MemoriaSemantica => ({
        async indexar(vectores: VectorMemoria[]): Promise<void> {
            tx.embeddings.push(...vectores);
        },
        async buscarSimilares() {
            return [];
        },
    });
}

interface Traza {
    eventos: string[];
}

function crearGenerador(
    traza: Traza,
    contrato: unknown,
    comunidadId = "c1",
): GeneradorSemana {
    return {
        async generar(
            _a: string,
            _i: string,
            n: number,
        ): Promise<ResultadoGeneracionSemana> {
            traza.eventos.push(`genera:${n}`);
            return { contrato, comunidadId, proveedor: "doble" };
        },
    };
}

function crearAnalizador(traza: Traza): AnalizadorSemana {
    return {
        async analizar(
            contrato: ContratoNormalizado,
            estado?: EstadoPipeline,
        ): Promise<ResultadoAnalisisSemana> {
            traza.eventos.push(`analiza:${estado ? "reanuda" : "inicio"}`);
            const analisis: ResultadosAnalisis = {
                filtro: { contributivos: [], noContributivos: [] },
            };
            const resultado: ResultadoSemana = {
                etapasCompletadas: [...ORDEN_ETAPAS],
                contrato,
            };
            return { resultado, analisis };
        },
    };
}

function crearAprendizaje(traza: Traza): {
    aprender(entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje>;
} {
    return {
        async aprender(entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje> {
            traza.eventos.push(`aprende:${entrada.contexto.numeroSemana}`);
            return {
                perfiles: ["u1", "u2"],
                indice: { ciberacoso: 0.2 },
                scores: { u1: 0.5 },
                patrones: [],
            };
        },
    };
}

function crearDeps(
    almacen: AlmacenTx,
    traza: Traza,
    overrides: Partial<DependenciasProcesarSemana<AlmacenTx>> = {},
): DependenciasProcesarSemana<AlmacenTx> {
    const persistir: PersistorSemana<AlmacenTx> = async (tx, unidad) => {
        traza.eventos.push("almacena");
        tx.resultados.push(unidad);
        return { resultadoId: `res-${unidad.contexto.numeroSemana}` };
    };
    return {
        generador: crearGenerador(traza, contratoValido()),
        validador: new ValidadorContratoZod(() => { }),
        analizador: crearAnalizador(traza),
        aprendizaje: crearAprendizaje(traza),
        ejecutarTransaccion: crearEjecutorTransaccional(almacen),
        persistirResultado: persistir,
        memoriaTransaccional: memoriaTxFactory(),
        ...overrides,
    };
}

// --- Tests -----------------------------------------------------------------

describe("ProcesadorSemana.procesarSemana (flujo unico transaccional)", () => {
    it("ejecuta el flujo en orden: genera -> valida -> analiza -> aprende -> almacena", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const proc = new ProcesadorSemana<AlmacenTx>(crearDeps(almacen, traza));

        const r = await proc.procesarSemana("a1", "i1", 1);

        expect(traza.eventos).toEqual([
            "genera:1",
            "analiza:inicio",
            "aprende:1",
            "almacena",
        ]);
        expect(r.resultadoId).toBe("res-1");
        expect(r.analisisId).toBe("a1");
        expect(r.institucionId).toBe("i1");
        expect(r.comunidadId).toBe("c1");
        expect(r.numeroSemana).toBe(1);
        expect(r.proveedor).toBe("doble");
        expect(r.etapasCompletadas).toEqual([...ORDEN_ETAPAS]);
    });

    it("persiste el resultado de la semana Y los embeddings en la MISMA transaccion (atomicidad)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const proc = new ProcesadorSemana<AlmacenTx>(crearDeps(almacen, traza));

        await proc.procesarSemana("a1", "i1", 1);

        // Resultado de la semana persistido.
        expect(almacen.resultados).toHaveLength(1);
        const unidad = almacen.resultados[0];
        expect(unidad.contexto).toEqual({
            analisisId: "a1",
            institucionId: "i1",
            comunidadId: "c1",
            numeroSemana: 1,
        });
        expect(unidad.aprendizaje.perfiles).toEqual(["u1", "u2"]);

        // Embeddings acumulados, trazables al resultadoId de la MISMA semana.
        expect(almacen.embeddings.length).toBeGreaterThan(0);
        for (const v of almacen.embeddings) {
            expect(v.resultadoId).toBe("res-1");
            expect(v.analisisId).toBe("a1");
            expect(v.comunidadId).toBe("c1");
            expect(v.institucionId).toBe("i1");
            expect(v.numeroSemana).toBe(1);
        }
        // post + comentario + image_description = 3 fragmentos embebibles.
        expect(almacen.embeddings.map((v) => v.refContenido).sort()).toEqual([
            "comment:0",
            "image",
            "post",
        ]);
    });

    it("rechaza contenido no conforme en la frontera del Validador_Contrato (no analiza ni almacena)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const deps = crearDeps(almacen, traza, {
            // Contrato invalido: falta `post`.
            generador: crearGenerador(traza, { comments: [] }),
        });
        const proc = new ProcesadorSemana<AlmacenTx>(deps);

        await expect(proc.procesarSemana("a1", "i1", 1)).rejects.toThrow(
            /contrato no conforme/i,
        );

        // Solo se llego a generar; no se analizo, ni aprendio, ni almaceno.
        expect(traza.eventos).toEqual(["genera:1"]);
        expect(almacen.resultados).toHaveLength(0);
        expect(almacen.embeddings).toHaveLength(0);
    });

    it("revierte por completo cuando la persistencia del resultado falla (atomicidad, Req. 25.5)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const persistirQueFalla: PersistorSemana<AlmacenTx> = async () => {
            traza.eventos.push("almacena:falla");
            throw new Error("fallo de BD al persistir el resultado");
        };
        const proc = new ProcesadorSemana<AlmacenTx>(
            crearDeps(almacen, traza, { persistirResultado: persistirQueFalla }),
        );

        await expect(proc.procesarSemana("a1", "i1", 1)).rejects.toThrow(
            /fallo de BD/i,
        );

        // Rollback: ni resultado ni embeddings quedaron persistidos.
        expect(almacen.resultados).toHaveLength(0);
        expect(almacen.embeddings).toHaveLength(0);
    });

    it("revierte el resultado si el indexado de embeddings falla dentro de la transaccion", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const memoriaQueFalla = (): MemoriaSemantica => ({
            async indexar(): Promise<void> {
                throw new Error("fallo al indexar embeddings");
            },
            async buscarSimilares() {
                return [];
            },
        });
        const proc = new ProcesadorSemana<AlmacenTx>(
            crearDeps(almacen, traza, {
                memoriaTransaccional: () => memoriaQueFalla(),
            }),
        );

        await expect(proc.procesarSemana("a1", "i1", 1)).rejects.toThrow(
            /indexar embeddings/i,
        );

        // El resultado se escribio en el staging pero la transaccion se revirtio:
        // no debe quedar nada confirmado en el almacen real (atomicidad).
        expect(almacen.resultados).toHaveLength(0);
        expect(almacen.embeddings).toHaveLength(0);
    });

    it("no abre la transaccion cuando una etapa del analisis falla (Req. 13.4)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        let transaccionAbierta = false;
        const analizadorQueFalla: AnalizadorSemana = {
            async analizar(): Promise<ResultadoAnalisisSemana> {
                throw new Error("fallo en etapa NLP del pipeline");
            },
        };
        const proc = new ProcesadorSemana<AlmacenTx>(
            crearDeps(almacen, traza, {
                analizador: analizadorQueFalla,
                ejecutarTransaccion: async (trabajo) => {
                    transaccionAbierta = true;
                    return crearEjecutorTransaccional(almacen)(trabajo);
                },
            }),
        );

        await expect(proc.procesarSemana("a1", "i1", 1)).rejects.toThrow(
            /etapa NLP/i,
        );
        expect(transaccionAbierta).toBe(false);
        expect(almacen.resultados).toHaveLength(0);
    });

    it("rechaza numeros de semana invalidos (no entero o < 1)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const proc = new ProcesadorSemana<AlmacenTx>(crearDeps(almacen, traza));

        await expect(proc.procesarSemana("a1", "i1", 0)).rejects.toThrow(
            /numero de semana invalido/i,
        );
        await expect(proc.procesarSemana("a1", "i1", 1.5)).rejects.toThrow(
            /numero de semana invalido/i,
        );
        // No se genero ni proceso nada.
        expect(traza.eventos).toEqual([]);
    });

    it("propaga el estado de reanudacion al analizador (Req. 13.4)", async () => {
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const proc = new ProcesadorSemana<AlmacenTx>(crearDeps(almacen, traza));

        const estado: EstadoPipeline = {
            etapasCompletadas: [EtapaPipeline.LIMPIEZA, EtapaPipeline.NORMALIZACION],
        };
        await proc.procesarSemana("a1", "i1", 3, { estado });

        expect(traza.eventos).toContain("analiza:reanuda");
    });

    it("aplica la MISMA logica para multiples semanas (equivalencia entre modos)", async () => {
        // Procesar 3 semanas con el mismo ProcesadorSemana: no hay ramas por modo;
        // cualquier disparador (manual/automatico/tiempo real) reutiliza esto.
        const almacen = new AlmacenTx();
        const traza: Traza = { eventos: [] };
        const proc = new ProcesadorSemana<AlmacenTx>(crearDeps(almacen, traza));

        const r1 = await proc.procesarSemana("a1", "i1", 1);
        const r2 = await proc.procesarSemana("a1", "i1", 2);
        const r3 = await proc.procesarSemana("a1", "i1", 3);

        expect([r1.numeroSemana, r2.numeroSemana, r3.numeroSemana]).toEqual([1, 2, 3]);
        expect(almacen.resultados.map((u) => u.contexto.numeroSemana)).toEqual([
            1, 2, 3,
        ]);
        // Cada semana acumula sus embeddings sin borrar los previos (Req. 36.2).
        expect(almacen.embeddings.every((v) => v.resultadoId.startsWith("res-"))).toBe(
            true,
        );
    });
});
