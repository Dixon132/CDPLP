/**
 * Interfaz estable del `Sistema_Evidencias` (subsistema desacoplado).
 *
 * El `Motor_Explicativo`, el `Indice_Riesgo`, el `Detector_Patrones` y los
 * reportes referencian `Evidencia` SOLO por identificador (string), sin conocer
 * como se almacena. Sustituir la implementacion (almacen Prisma, microservicio,
 * mock) mantiene valido este contrato sin cambios de firma (Req. 30.2, 30.6).
 *
 * Diseno: design.md > "Sistema de Evidencias (desacoplado, interfaz estable)".
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
 */

/**
 * Distincion senal/ruido usada en la auditoria de evidencias (Req. 34.5).
 *
 * Enum compartido local del modulo `evidencias`. El `Filtro_Relevancia`
 * (tarea 10) consumira esta misma distincion; cuando `src/modules/analisis`
 * exponga su propia version, ambos modulos deben converger en este contrato.
 */
export enum Contributividad {
    CONTRIBUTIVO = "CONTRIBUTIVO",
    NO_CONTRIBUTIVO = "NO_CONTRIBUTIVO",
}

/** Naturaleza del dato evidenciado. */
export type TipoEvidencia = "publicacion" | "comentario" | "conteo" | "variacion";

/**
 * `Evidencia` persistente y auditable.
 *
 * Toda conclusion, indicador, dimension, patron y explicacion queda atada a una
 * `Evidencia` con trazabilidad hasta su `Semana_Simulada`,
 * `Comunidad_Digital`/`Institucion` y `Analisis` (Req. 30.1, 30.3). El contenido
 * siempre esta anonimizado, sin identificadores crudos (Req. 30.5).
 *
 * `resultadoId` ancla la evidencia al `Resultado_Analisis` semanal de origen,
 * requerido por la persistencia (`gds_evidences`) para la trazabilidad completa.
 */
export interface Evidencia {
    /** Identificador trazable estable (Req. 30.1). */
    id: string;
    /** `Resultado_Analisis` semanal de origen (trazabilidad de la conclusion). */
    resultadoId: string;
    /** `Analisis` de origen (Req. 30.3). */
    analisisId: string;
    comunidadId: string;
    institucionId: string;
    numeroSemana: number;
    /** Ref al post/comentario anonimizado de origen. */
    refContenido: string;
    /** Distincion senal/ruido en la auditoria (Req. 34.5). */
    contributividad: Contributividad;
    tipo: TipoEvidencia;
    /** Contenido anonimizado, sin id crudo (Req. 30.5). */
    contenido: string;
    // --- Campos del recorrido auditable "Por que?" (ej.: "Estres Academico = 82") ---
    /** Refs anonimizadas de publicaciones que sustentan la conclusion. */
    publicacionesAsociadas: string[];
    /** Refs anonimizadas de comentarios que sustentan la conclusion. */
    comentariosAsociados: string[];
    /** Eventos del `Escenario` relacionados. */
    eventosAsociados: string[];
    /** Semanas que aportan a la conclusion. */
    semanasInvolucradas: number[];
    /** Dimensiones/indicadores empleados. */
    indicadoresUtilizados: string[];
    /** Explicacion en lenguaje natural generada por IA. */
    explicacionIA: string;
    /** Metricas que respaldan la conclusion. */
    metricasUtilizadas: Record<string, number>;
    /** Metricas cuantificables opcionales (conteo, variacion %). */
    metricas?: { conteo?: number; variacionPct?: number };
}

/**
 * Recorrido auditable conclusion -> evidencia -> dato original (Req. 30.4).
 *
 * El `datoOriginal` apunta al contenido anonimizado de origen sin exponer
 * identificadores crudos (Req. 30.5).
 */
export interface RecorridoAuditoria {
    evidencia: Evidencia;
    datoOriginal: { numeroSemana: number; comunidadId: string; refContenido: string };
}

/**
 * Contrato estable del subsistema de evidencias. Los consumidores solo manejan
 * `string` ids; nunca importan simbolos del `Motor_Explicativo` ni del
 * `Indice_Riesgo` (desacople, Req. 30.6).
 */
export interface SistemaEvidencias {
    /** Almacena una `Evidencia` con identificadores trazables (Req. 30.1, 30.3). */
    almacenar(e: Omit<Evidencia, "id">): Promise<Evidencia>;
    /** Sirve evidencias por id; interfaz estable independiente de la implementacion (Req. 30.2, 30.6). */
    obtener(ids: string[]): Promise<Evidencia[]>;
    /** Expone el recorrido conclusion -> evidencia -> dato original, anonimizado (Req. 30.4, 30.5). */
    auditar(evidenciaId: string): Promise<RecorridoAuditoria>;
}
