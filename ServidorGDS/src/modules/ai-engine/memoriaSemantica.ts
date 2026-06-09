/**
 * `Memoria_Semantica` vectorial (embeddings en pgvector) - contrato estable.
 *
 * Define los tipos y la interfaz del Motor de Memoria Semantica descrito en
 * design.md > "Motor de Memoria Semantica vectorial (embeddings + pgvector)".
 *
 * El sistema "aprende" acumulando una memoria semantica: por cada `Semana_Simulada`
 * se generan `Embeddings` del contenido analizado (via `Servicio_IA`) y se
 * ACUMULAN en `pgvector` (`gds_embedding`) **sin borrar** los de semanas
 * anteriores, con referencias trazables a su `Semana_Simulada`,
 * `Comunidad_Digital`/`Institucion`, `Analisis` y al `ResultadoAnalisis` de
 * origen (Req. 36.1, 36.2, 36.5).
 *
 * Alcance de la tarea 9.1 (este archivo + su servicio y repositorio): SOLO la
 * capacidad de INDEXAR (`indexar`). La recuperacion por similitud
 * (`buscarSimilares`, `Embeddings_Search`) se completa en la tarea 9.2; aqui se
 * declara en la interfaz por fidelidad al diseno, pero su implementacion concreta
 * NO forma parte de esta tarea.
 *
 * _Requirements: 36.1, 36.2, 36.5_
 */

/** Modelos de embeddings admitidos por la `Memoria_Semantica` (design.md, Req. 31.2, 36.1). */
export type ModeloEmbedding =
    | "BAAI/bge-m3"
    | "BAAI/bge-large-en-v1.5"
    | "all-MiniLM-L6-v2";

/**
 * Metadato trazable de un vector de la `Memoria_Semantica` (Req. 36.5).
 *
 * El vector numerico NO viaja en este tipo: se calcula via `Servicio_IA` a
 * partir del `texto` correspondiente en {@link MemoriaSemantica.indexar} y vive
 * en la columna `vector` de `gds_embedding` (pgvector). Aqui solo se describen
 * las REFERENCIAS trazables que acompanan a cada vector.
 *
 * NOTA sobre `resultadoId`: el esquema `gds_embedding` exige la referencia al
 * `ResultadoAnalisis` de origen (trazabilidad del resultado de la semana, Req.
 * 36.5). El diseno enumera "semana/comunidad/institucion/analisis"; este campo
 * extiende esa lista con el resultado de origen requerido por la persistencia.
 */
export interface VectorMemoria {
    /** Id estable del fragmento embebido; se usa como clave primaria del vector. */
    refId: string;
    /** Trazabilidad de origen: `Analisis` (Req. 36.5). */
    analisisId: string;
    /** Trazabilidad de origen: `Comunidad_Digital` (Req. 36.5). */
    comunidadId: string;
    /** Trazabilidad de origen: `Institucion` (Req. 36.5). */
    institucionId: string;
    /** Trazabilidad de origen: `ResultadoAnalisis` de la semana (Req. 36.5). */
    resultadoId: string;
    /** Trazabilidad de origen: `Semana_Simulada` (Req. 36.5). */
    numeroSemana: number;
    /** Referencia al contenido anonimizado de origen embebido. */
    refContenido: string;
    /** Modelo de Sentence Transformers que produjo el vector (Req. 36.1). */
    modelo: ModeloEmbedding;
}

/**
 * Resultado de una consulta `Embeddings_Search` por similitud vectorial.
 * (Definido por fidelidad al diseno; consumido por la tarea 9.2.)
 */
export interface ResultadoSimilitud {
    refId: string;
    /** Similitud dentro del rango definido (Req. 36.6). */
    similitud: number;
    refContenido: string;
    numeroSemana: number;
}

/** Parametros de una consulta `Embeddings_Search` (texto o vector ya calculado). */
export interface ConsultaSimilitud {
    texto?: string;
    vector?: number[];
}

/** Filtro COLECTIVO de `Embeddings_Search` (nunca a nivel de diagnostico individual). */
export interface FiltroSimilitud {
    analisisId: string;
    comunidadId?: string;
}

/**
 * Motor de `Memoria_Semantica` vectorial (Req. 36).
 */
export interface MemoriaSemantica {
    /**
     * Genera `Embeddings` de `textos` via `Servicio_IA` y los acumula en
     * `pgvector` **sin borrar** los previos, con refs trazables (Req. 36.1, 36.2,
     * 36.5).
     *
     * `vectores[i]` aporta las referencias trazables del fragmento cuyo contenido
     * embebido es `textos[i]` (correspondencia posicional 1:1).
     */
    indexar(vectores: VectorMemoria[], textos: string[]): Promise<void>;

    /**
     * `Embeddings_Search`: recupera contexto por similitud vectorial sobre
     * `pgvector`, ordenado por similitud descendente, filtrado por
     * analisis/comunidad, sin diagnostico individual (Req. 36.3, 36.6, 39.4).
     *
     * Se implementa en la tarea 9.2.
     */
    buscarSimilares(
        consulta: ConsultaSimilitud,
        k: number,
        filtro: FiltroSimilitud,
    ): Promise<ResultadoSimilitud[]>;
}

/** Token DI (NestJS) de la interfaz estable {@link MemoriaSemantica}. */
export const MEMORIA_SEMANTICA = Symbol("GDS:MEMORIA_SEMANTICA");
