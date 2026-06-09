/**
 * Interfaz estable del `Sistema_Evidencias` (subsistema desacoplado).
 *
 * El `Motor_Explicativo`, el `Indice_Riesgo`, el `Detector_Patrones` y los
 * reportes referencian `Evidencia` SOLO por identificador (string), sin conocer
 * como se almacena. Sustituir la implementacion (almacen Prisma, microservicio,
 * mock) mantiene valido este contrato sin cambios de firma (Req. 30.2, 30.6).
 *
 * Migracion NestJS (tarea 3.5): este contrato vive ahora en el modulo de
 * dominio `audit`. La implementacion full y sus PBT corresponden a la tarea
 * 13.2/13.7; esta migracion base preserva la interfaz estable y la conecta al
 * `PrismaService` global.
 *
 * Diseno: design.md > "Sistema de Evidencias (desacoplado, interfaz estable)".
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
 */

/**
 * Distincion senal/ruido usada en la auditoria de evidencias (Req. 34.5).
 *
 * El `Filtro_Relevancia` consumira esta misma distincion; ambos modulos deben
 * converger en este contrato.
 */
export enum Contributividad {
    CONTRIBUTIVO = 'CONTRIBUTIVO',
    NO_CONTRIBUTIVO = 'NO_CONTRIBUTIVO',
}

/** Naturaleza del dato evidenciado. */
export type TipoEvidencia = 'publicacion' | 'comentario' | 'conteo' | 'variacion';

/**
 * `Evidencia` persistente y auditable.
 *
 * Toda conclusion, indicador, dimension, patron y explicacion queda atada a una
 * `Evidencia` con trazabilidad hasta su `Semana_Simulada`,
 * `Comunidad_Digital`/`Institucion` y `Analisis` (Req. 30.1, 30.3). El contenido
 * siempre esta anonimizado, sin identificadores crudos (Req. 30.5).
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
 * Naturaleza del nodo de origen que referencia `Evidencia` por id trazable a
 * traves de `gds_evidence_ref` (enlace POR ID, sin acoplar el motor al almacen).
 */
export type TipoOrigen =
    | 'conclusion'
    | 'indicador'
    | 'dimension'
    | 'patron'
    | 'explicacion';

/**
 * Referencia logica polimorfica a una conclusion/indicador/dimension/patron/
 * explicacion que sustenta su afirmacion en `Evidencia` (Req. 30.1, 30.2).
 *
 * Se materializa en la tabla `gds_evidence_ref` (`origen_tipo`, `origen_id`,
 * `evidencia_id`); el `Sistema_Evidencias` no importa simbolos del origen.
 */
export interface OrigenConclusion {
    origenTipo: TipoOrigen;
    origenId: string;
}

/**
 * Recorrido auditable COMPLETO conclusion -> evidencia -> dato original
 * (Req. 30.4), partiendo del nodo de origen y resolviendo cada `Evidencia`
 * referenciada via `gds_evidence_ref` hasta su dato original anonimizado.
 */
export interface RecorridoConclusion {
    origen: OrigenConclusion;
    recorridos: RecorridoAuditoria[];
}

/**
 * Contrato estable del subsistema de evidencias. Los consumidores solo manejan
 * `string` ids; nunca importan simbolos del `Motor_Explicativo` ni del
 * `Indice_Riesgo` (desacople, Req. 30.6).
 */
export interface SistemaEvidencias {
    /** Almacena una `Evidencia` con identificadores trazables (Req. 30.1, 30.3). */
    almacenar(e: Omit<Evidencia, 'id'>): Promise<Evidencia>;
    /** Sirve evidencias por id; interfaz estable independiente de la implementacion (Req. 30.2, 30.6). */
    obtener(ids: string[]): Promise<Evidencia[]>;
    /** Expone el recorrido conclusion -> evidencia -> dato original, anonimizado (Req. 30.4, 30.5). */
    auditar(evidenciaId: string): Promise<RecorridoAuditoria>;
    /**
     * Enlaza POR ID una conclusion/indicador/dimension/patron/explicacion con
     * las `Evidencia` que la sustentan, materializando `gds_evidence_ref`
     * (Req. 30.1, 30.2). Idempotente sobre la terna (origenTipo, origenId,
     * evidenciaId): no duplica enlaces ya existentes.
     */
    vincular(origen: OrigenConclusion, evidenciaIds: string[]): Promise<void>;
    /**
     * Sirve las `Evidencia` que sustentan un nodo de origen, resueltas via
     * `gds_evidence_ref` (interfaz estable, Req. 30.2, 30.6).
     */
    obtenerPorOrigen(origen: OrigenConclusion): Promise<Evidencia[]>;
    /**
     * Expone el recorrido COMPLETO conclusion -> evidencia -> dato original
     * (Req. 30.4), anonimizado (Req. 30.5), a partir del nodo de origen.
     */
    auditarConclusion(origen: OrigenConclusion): Promise<RecorridoConclusion>;
}

/**
 * Token de inyeccion del `Sistema_Evidencias`. Permite depender de la interfaz
 * estable (no de la implementacion concreta) desde otros modulos.
 */
export const SISTEMA_EVIDENCIAS = Symbol('SISTEMA_EVIDENCIAS');
