/**
 * Tipos de dominio de la integracion de calibracion de la `Capa_ML` con el
 * `Corpus_Longitudinal` (tarea 9.4).
 *
 * El bucle de aprendizaje longitudinal (CRISP-DM/MLOps) calibra la `Capa_ML`
 * **al crecer** el `Corpus_Longitudinal` acumulado de un `Analisis`, registrando
 * cada calibracion en `gds_calibracion` (`version`, `artefacto_ref`, `metricas`)
 * y conservando SIEMPRE la ultima calibracion valida ante un fallo del
 * `Servicio_IA` (Req. 31.3, 31.4, 36.4).
 *
 * Diseno: design.md > "Aprendizaje longitudinal (no reentrenamiento pesado)" y
 * tabla de entidades clave (`gds_calibracion`).
 * _Requirements: 31.3, 31.4, 36.4_
 */

/**
 * Clave estable bajo la cual se persiste, dentro de `metricas`, el numero de
 * `Semana_Simulada` acumuladas en el `Corpus_Longitudinal` al momento de
 * calibrar. Permite decidir de forma autocontenida si el corpus CRECIO respecto
 * a la ultima calibracion registrada, sin depender de la forma concreta de las
 * metricas que devuelva el `Servicio_IA`.
 */
export const METRICA_CORPUS_SEMANAS = "corpusSemanas" as const;

/**
 * Registro de una calibracion de la `Capa_ML` tal como se persiste en
 * `gds_calibracion` (Req. 31.2, 31.3, 36.4). Es la frontera estable entre el
 * servicio de integracion y su puerto de persistencia.
 */
export interface RegistroCalibracion {
    /** Identificador asignado por la persistencia (ausente antes de guardar). */
    id?: string;
    /** `Analisis` cuyo `Corpus_Longitudinal` produjo esta calibracion. */
    analisisId: string;
    /** Version del artefacto de calibracion producido por el `Servicio_IA`. */
    version: string;
    /** Referencia opaca al artefacto persistente de calibracion. */
    artefactoRef: string;
    /** Metricas tecnicas de la calibracion (incluye {@link METRICA_CORPUS_SEMANAS}). */
    metricas: Record<string, number>;
    /** Marca temporal asignada por la persistencia (ausente antes de guardar). */
    calibradoEn?: Date;
}

/** Motivo del resultado de una integracion de calibracion. */
export type MotivoCalibracion =
    /** El corpus crecio y se registro una nueva calibracion valida. */
    | "calibrada"
    /** El corpus no crecio desde la ultima calibracion; no se recalibra. */
    | "sin_crecimiento"
    /** El `Servicio_IA` fallo; se conserva la ultima calibracion valida. */
    | "fallo";

/**
 * Resultado de evaluar la integracion de calibracion ante un estado del
 * `Corpus_Longitudinal`.
 *
 * `vigente` es SIEMPRE la calibracion valida en uso tras la operacion: la
 * recien registrada si se calibro, o la ultima valida previa si no hubo
 * crecimiento o si la calibracion fallo (Req. 36.4). Es `null` solo cuando nunca
 * existio una calibracion valida.
 */
export interface ResultadoIntegracionCalibracion {
    /** `true` solo cuando se invoco `POST /calibrar` y se registro con exito. */
    calibrada: boolean;
    /** Motivo del resultado (calibrada / sin crecimiento / fallo). */
    motivo: MotivoCalibracion;
    /** Calibracion valida vigente tras la operacion (o `null` si no hay ninguna). */
    vigente: RegistroCalibracion | null;
    /** Error capturado cuando `motivo === "fallo"` (no se propaga). */
    error?: unknown;
}
