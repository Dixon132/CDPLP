/**
 * Capa de Machine Learning (`Capa_ML`) - interfaces estables (Req. 31).
 *
 * La `Capa_ML` complementa el razonamiento LLM con ML clasico/representacional
 * (embeddings, agrupamiento tematico, deteccion de anomalias y tendencias y
 * scoring calibrado del `Indice_Riesgo`) **sobre** la `Capa_Analisis`, detras de
 * interfaces estables reemplazables por un microservicio Python sin acoplar el
 * `Pipeline_Analisis` (Req. 31.1, 31.2, 31.6).
 *
 * Principios:
 * - **Solo resultados colectivos con evidencia** (Req. 31.7): las salidas se
 *   refieren a la `Comunidad_Digital` y se respaldan con evidencia trazable por
 *   identificador (`evidenciaIds`, `refId`), nunca a nivel individual.
 * - **Calibracion, no fine-tuning pesado** (Req. 31.3): la mejora proviene de
 *   recalibrar con el `Corpus_Longitudinal` acumulado.
 *
 * Diseno: design.md > "Capa de Machine Learning (sobre la Capa_Analisis)".
 *
 * NOTA sobre tipos compartidos: `ZonaGeografica`, `EvolucionTemporal`,
 * `EntradaIndice` y `ReferenciaCorpus` pertenecen conceptualmente a otras capas
 * (adquisicion / analisis / corpus). Mientras esas capas no expongan sus tipos
 * definitivos, este modulo define **placeholders minimos** y estables aqui para
 * no acoplarse a implementaciones aun inexistentes. Cuando los tipos canonicos
 * existan, estos placeholders pueden reemplazarse por re-exportaciones sin
 * cambiar la firma de `CapaML`.
 *
 * _Requirements: 31.1, 31.2, 31.3, 31.7_
 */

// ---------------------------------------------------------------------------
// Placeholders minimos de tipos compartidos (ver NOTA en el encabezado)
// ---------------------------------------------------------------------------

/**
 * `Zona_Geografica` de una `Comunidad_Digital`: coordenadas de la institucion y
 * radio de analisis (Req. 33.1). Placeholder minimo alineado con el diseno
 * (`gds/adquisicion/proveedorGeneracion.ts`).
 */
export interface ZonaGeografica {
    latitud: number;
    longitud: number;
    radioMetros: number;
}

/**
 * Evolucion temporal correlacionada por el `Motor_Temporal` (Req. 16.2, 16.3).
 * Placeholder minimo: expone series numericas por dimension a partir de las
 * cuales la `Capa_ML` deriva tendencias, y opcionalmente relaciones detectadas.
 * Una evolucion sin relaciones/series significativas es valida (Req. 16.2).
 */
export interface EvolucionTemporal {
    analisisId: string;
    institucionId: string;
    hastaSemana: number;
    /** Serie temporal por dimension (valor por semana). */
    series?: Record<string, number[]>;
    /** Relaciones evento/tema/comportamiento detectadas (puede ser vacio). */
    relaciones?: Array<{ desde: string; hacia: string; descripcion: string }>;
}

/**
 * Entrada agregada para el scoring del `Indice_Riesgo` por comunidad/semana.
 * Placeholder minimo: senales numericas agregadas + evidencias trazables que
 * respaldan el resultado colectivo (Req. 30.1, 31.7).
 */
export interface EntradaIndice {
    comunidadId: string;
    numeroSemana: number;
    /** Senales numericas agregadas que alimentan el score. */
    senales: number[];
    /** Evidencias asociadas, trazables por id (Req. 30.1, 31.7). */
    evidenciaIds: string[];
}

/**
 * Referencia al `Corpus_Longitudinal` acumulado usado para calibrar (Req. 31.3).
 * Placeholder minimo: la persistencia real del artefacto vive en
 * `gds_calibracion` y se integra en tareas posteriores.
 */
export interface ReferenciaCorpus {
    analisisId: string;
    /** Numero de `Semana_Simulada` acumuladas en el corpus. */
    numeroSemanas: number;
    /** Referencia opaca al artefacto persistente (persistencia diferida). */
    artefactoRef?: string;
}

// ---------------------------------------------------------------------------
// Tipos de salida de la Capa_ML (design.md)
// ---------------------------------------------------------------------------

/** Agrupamiento tematico: cluster con sus miembros (refs) y una etiqueta. */
export interface ResultadoClustering {
    clusterId: number;
    miembros: string[];
    etiqueta: string;
}

/** Anomalia colectiva detectada respecto al patron longitudinal acumulado. */
export interface Anomalia {
    refId: string;
    score: number;
    descripcion: string;
}

/** Tendencia de una dimension a lo largo de la evolucion temporal. */
export interface Tendencia {
    dimension: string;
    direccion: "sube" | "baja" | "estable";
    magnitud: number;
}

/** Score calibrado del `Indice_Riesgo` en `[0,1]` con evidencia trazable. */
export interface ScoreCalibrado {
    /** Siempre en el rango cerrado [0,1] (Req. 31.2, 31.7). */
    score: number;
    /** Evidencias colectivas que respaldan el score (Req. 31.7). */
    evidenciaIds: string[];
}

/** Resultado de una calibracion: version del artefacto y metricas asociadas. */
export interface ResultadoCalibracion {
    version: string;
    metricas: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Interfaz estable de la Capa_ML
// ---------------------------------------------------------------------------

/**
 * Interfaz estable de la `Capa_ML` (Req. 31.2, 31.6).
 *
 * Reemplazable por un microservicio Python sin alterar estas firmas; el
 * `Pipeline_Analisis` nunca depende de una implementacion concreta.
 */
export interface CapaML {
    /** Embeddings de texto producidos por modelo local dentro de 8 GB VRAM (Req. 31.2, 31.5). */
    embeddings(textos: string[]): Promise<number[][]>;
    /** Agrupamiento tematico por similitud semantica (Req. 31.2). */
    clustering(vectores: number[][]): Promise<ResultadoClustering[]>;
    /** Deteccion de anomalias respecto al patron longitudinal acumulado (Req. 31.2). */
    anomalias(serie: number[][], zona?: ZonaGeografica): Promise<Anomalia[]>;
    /** Deteccion de tendencias sobre la evolucion temporal (Req. 31.2). */
    tendencias(evolucion: EvolucionTemporal, zona?: ZonaGeografica): Promise<Tendencia[]>;
    /**
     * Score calibrado del `Indice_Riesgo` en rango `[0,1]`, calibrado con el
     * `Corpus_Longitudinal` acumulado; resultado colectivo con evidencia tecnica
     * (Req. 31.2, 31.3, 31.7).
     */
    scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado>;
    /** Recalibra a partir del `Corpus_Longitudinal` acumulado (Req. 31.3, 31.4). */
    calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion>;
}
