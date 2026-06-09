/**
 * Etapa `EMBEDDINGS` del `Pipeline_Analisis` (tarea 9.3).
 *
 * Es la ULTIMA etapa del pipeline: se ejecuta **tras la explicacion** y, sobre
 * el contenido ya analizado y anonimizado, calcula los `Embeddings` del
 * contenido y los ACUMULA en `pgvector` (`Memoria_Semantica`) **sin borrar** los
 * previos, con referencias trazables a semana/comunidad/institucion/analisis y
 * al resultado de la semana (Req. 36.1).
 *
 * Reutiliza la capacidad de INDEXAR de la `Memoria_Semantica` (tarea 9.1) a
 * traves de su interfaz estable {@link MemoriaSemantica.indexar}; este modulo NO
 * reimplementa la generacion de embeddings ni la persistencia vectorial.
 *
 * Persistencia transaccional (Req. 36.1): el indexado de los embeddings y el
 * almacenamiento del `ResultadoSemana` se ejecutan dentro de la **misma unidad
 * de trabajo atomica** ({@link persistirResultadoSemanaConEmbeddings}). Si
 * cualquiera de los dos falla, la transaccion se revierte y no se persiste ni el
 * resultado ni los embeddings de esa semana (atomicidad).
 *
 * Diseno: design.md > "Pipeline de analisis" (etapa final EMBEDDINGS -> pgvector)
 * y "Bucle de aprendizaje" (almacena en transaccion: resultados + embeddings).
 * _Requirements: 36.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type {
    MemoriaSemantica,
    ModeloEmbedding,
    VectorMemoria,
} from "../ai-engine/memoriaSemantica";
import {
    EtapaPipeline,
    type ManejadorEtapa,
    type ResultadoSemana,
} from "./pipeline";

/**
 * Contexto trazable de la `Semana_Simulada` que se esta procesando. Aporta las
 * referencias que acompanan a cada vector de la `Memoria_Semantica` (Req. 36.5)
 * y que el `Contrato_Normalizado` por si solo no contiene (no conoce su origen).
 */
export interface ContextoEmbeddings {
    /** `Analisis` de origen (Req. 36.5). */
    analisisId: string;
    /** `Comunidad_Digital` de origen (Req. 36.5). */
    comunidadId: string;
    /** `Institucion` de origen (Req. 36.5). */
    institucionId: string;
    /** `ResultadoAnalisis` de la semana cuyos embeddings se acumulan (Req. 36.5). */
    resultadoId: string;
    /** `Semana_Simulada` de origen (Req. 36.5). */
    numeroSemana: number;
    /** Modelo de embeddings a registrar; por defecto `BAAI/bge-m3` (Req. 36.1). */
    modelo?: ModeloEmbedding;
}

/** Modelo de embeddings por defecto de la `Memoria_Semantica` (design.md, D10). */
export const MODELO_EMBEDDING_POR_DEFECTO: ModeloEmbedding = "BAAI/bge-m3";

/** Fragmentos del contenido analizado listos para embeber (refs 1:1 con textos). */
export interface FragmentosEmbeddings {
    vectores: VectorMemoria[];
    textos: string[];
}

/** Indica si un texto aporta contenido embebible (no vacio tras recortar). */
function tieneContenido(texto: string): boolean {
    return texto.trim().length > 0;
}

/**
 * Extrae del `Contrato_Normalizado` ya analizado/anonimizado los fragmentos a
 * embeber (post, cada comentario y la descripcion de imagen), emparejando cada
 * texto con sus referencias trazables (`VectorMemoria`) en correspondencia
 * posicional 1:1.
 *
 * - `refId` es estable y unico por fragmento dentro del resultado de la semana:
 *   `"{resultadoId}#post"`, `"{resultadoId}#comment:{i}"`, `"{resultadoId}#image"`.
 * - Los fragmentos vacios (sin contenido tras recortar) se omiten: no se embeben
 *   textos vacios.
 *
 * No muta el contrato.
 */
export function extraerFragmentosEmbeddings(
    contrato: ContratoNormalizado,
    contexto: ContextoEmbeddings,
): FragmentosEmbeddings {
    const modelo = contexto.modelo ?? MODELO_EMBEDDING_POR_DEFECTO;
    const vectores: VectorMemoria[] = [];
    const textos: string[] = [];

    const refBase = (sufijo: string): VectorMemoria => ({
        refId: `${contexto.resultadoId}#${sufijo}`,
        analisisId: contexto.analisisId,
        comunidadId: contexto.comunidadId,
        institucionId: contexto.institucionId,
        resultadoId: contexto.resultadoId,
        numeroSemana: contexto.numeroSemana,
        refContenido: sufijo,
        modelo,
    });

    // 1) Publicacion principal.
    if (tieneContenido(contrato.post.texto)) {
        vectores.push(refBase("post"));
        textos.push(contrato.post.texto);
    }

    // 2) Comentarios (preservando el indice para trazabilidad).
    contrato.comments.forEach((comentario, i) => {
        if (tieneContenido(comentario.texto)) {
            vectores.push(refBase(`comment:${i}`));
            textos.push(comentario.texto);
        }
    });

    // 3) Descripcion de imagen (Vision_Engine, contenido analizado).
    if (tieneContenido(contrato.image_description)) {
        vectores.push(refBase("image"));
        textos.push(contrato.image_description);
    }

    return { vectores, textos };
}

/**
 * Construye el manejador de la etapa `EMBEDDINGS` cableado a la
 * `Memoria_Semantica` (tarea 9.1) y al contexto trazable de la semana.
 *
 * Al ejecutarse (tras la explicacion), extrae los fragmentos del contenido
 * analizado y los indexa via {@link MemoriaSemantica.indexar}, acumulandolos en
 * `pgvector` sin borrar los previos (Req. 36.1, 36.2). La `EMBEDDINGS` no
 * transforma el contrato: devuelve `void` y el orquestador conserva el contrato
 * en curso.
 *
 * Cuando no hay fragmentos embebibles (todo el contenido vacio), `indexar` es
 * no-op por contrato de la `Memoria_Semantica`.
 *
 * Para garantizar la persistencia **transaccional** junto con el resultado de
 * la semana (Req. 36.1), la `memoria` que se inyecta aqui debe estar ligada a la
 * transaccion activa; vease {@link persistirResultadoSemanaConEmbeddings}.
 */
export function crearManejadorEmbeddings(
    memoria: MemoriaSemantica,
    contexto: ContextoEmbeddings,
): ManejadorEtapa {
    return async (contrato) => {
        const { vectores, textos } = extraerFragmentosEmbeddings(contrato, contexto);
        await memoria.indexar(vectores, textos);
    };
}

/**
 * Ejecutor transaccional: ejecuta `trabajo` dentro de una transaccion atomica y
 * devuelve su resultado. Si `trabajo` lanza, la transaccion se revierte y el
 * error se propaga. En produccion lo provee Prisma (`$transaction`); en pruebas
 * se inyecta un doble determinista. `TX` es el handle de la transaccion (p. ej.
 * el cliente Prisma transaccional) que se propaga a los colaboradores ligados a
 * la transaccion.
 */
export type EjecutorTransaccional<TX = unknown> = <R>(
    trabajo: (tx: TX) => Promise<R>,
) => Promise<R>;

/**
 * Persiste el resultado de la semana dentro de la transaccion activa. La
 * implementacion concreta (escritura de `gds_resultado_analisis` y tablas del
 * subgrafo) pertenece a `procesarSemana` (tarea 16.1); aqui se declara el puerto
 * estable que coordina la atomicidad con el indexado de embeddings.
 */
export type PersistorResultadoSemana<TX = unknown> = (
    tx: TX,
    resultado: ResultadoSemana,
    contexto: ContextoEmbeddings,
) => Promise<void>;

/**
 * Fabrica una `Memoria_Semantica` ligada a la transaccion `tx`, de modo que su
 * indexado se acumule en `pgvector` dentro de la MISMA transaccion que el
 * resultado de la semana. En produccion construye un `MemoriaSemanticaService`
 * sobre un almacen ligado al cliente Prisma transaccional; en pruebas devuelve
 * un doble determinista.
 */
export type FabricaMemoriaTransaccional<TX = unknown> = (
    tx: TX,
) => MemoriaSemantica;

/** Dependencias para persistir resultado + embeddings de forma transaccional. */
export interface OpcionesPersistenciaEmbeddings<TX = unknown> {
    /** Abre/gestiona la transaccion atomica. */
    ejecutar: EjecutorTransaccional<TX>;
    /** Persiste el `ResultadoSemana` dentro de la transaccion. */
    persistirResultado: PersistorResultadoSemana<TX>;
    /** Crea la `Memoria_Semantica` ligada a la transaccion (indexado tx-scoped). */
    memoriaTransaccional: FabricaMemoriaTransaccional<TX>;
}

/**
 * Persiste **atomicamente** el `ResultadoSemana` y los `Embeddings` del contenido
 * analizado en una unica transaccion (Req. 36.1).
 *
 * Dentro de la transaccion: (1) persiste el resultado de la semana y (2) calcula
 * e indexa los embeddings del contenido analizado en la `Memoria_Semantica`
 * ligada a esa misma transaccion. Si cualquiera de los dos pasos falla, la
 * transaccion se revierte por completo: no queda ni el resultado ni los
 * embeddings de esa semana (atomicidad del bucle de aprendizaje).
 *
 * Reutiliza la capacidad de INDEXAR de la tarea 9.1 ({@link MemoriaSemantica.indexar})
 * sin modificarla.
 */
export async function persistirResultadoSemanaConEmbeddings<TX = unknown>(
    opciones: OpcionesPersistenciaEmbeddings<TX>,
    resultado: ResultadoSemana,
    contexto: ContextoEmbeddings,
): Promise<void> {
    const { ejecutar, persistirResultado, memoriaTransaccional } = opciones;
    await ejecutar(async (tx) => {
        // 1) Persistir el resultado de la semana en la transaccion.
        await persistirResultado(tx, resultado, contexto);
        // 2) Indexar los embeddings del contenido analizado en la MISMA
        //    transaccion (acumulacion en pgvector sin borrar previos, Req. 36.1/36.2).
        const memoria = memoriaTransaccional(tx);
        const { vectores, textos } = extraerFragmentosEmbeddings(
            resultado.contrato,
            contexto,
        );
        await memoria.indexar(vectores, textos);
    });
}

/** Etiqueta de la etapa final del pipeline, por conveniencia para los llamadores. */
export const ETAPA_EMBEDDINGS = EtapaPipeline.EMBEDDINGS;
