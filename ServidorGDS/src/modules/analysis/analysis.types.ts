/**
 * Tipos del `Gestor_Analisis` (modulo `analysis`).
 *
 * Un `Analisis` es un ESTUDIO LONGITUDINAL que agrupa una o mas `Institucion`
 * (cada una con su `Comunidad_Digital`), un `Escenario` fijado como COPIA
 * INMUTABLE y una configuracion temporal de hasta 24 `Semana_Simulada`. Es la
 * RAIZ del subgrafo en cascada de la base de datos dedicada: al eliminarlo, sus
 * datos dependientes (comunidades, ciclos, resultados, memorias, embeddings,
 * patrones, evidencias, reportes, calibraciones...) se borran en cascada de
 * forma consistente y AISLADA por analisis (Req. 25.4, 25.7).
 *
 * Persistencia: modelo Prisma `Analisis` (tabla `gds_analisis`) sobre la base de
 * datos DEDICADA del servicio, a traves del `PrismaService` global (Req. 25.1).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 25.4, 25.6, 25.7, 29.4, 29.6_
 */

/** Limite superior de `Semana_Simulada` configurables para un `Analisis`. */
export const SEMANAS_MAXIMAS = 24;

/**
 * Modo de ejecucion del `Analisis` (Req. 32). El `GestorEjecucion` (tarea 17)
 * usa estos valores; aqui se definen para fijar el modo inicial al crear.
 */
export const MODOS_EJECUCION = ['AUTOMATICO', 'MANUAL', 'TIEMPO_REAL'] as const;
export type ModoEjecucion = (typeof MODOS_EJECUCION)[number];

/** Estado de ejecucion del `Analisis` (Req. 32). Inicial: `DETENIDO`. */
export const ESTADOS_EJECUCION = [
    'DETENIDO',
    'EN_EJECUCION',
    'PAUSADO',
    'COMPLETADO',
] as const;
export type EstadoEjecucion = (typeof ESTADOS_EJECUCION)[number];

/** Estado de ciclo de vida del `Analisis`. */
export const ESTADOS_ANALISIS = ['ACTIVO', 'ARCHIVADO'] as const;
export type EstadoAnalisis = (typeof ESTADOS_ANALISIS)[number];

/**
 * `Analisis` tal como vive en la base de datos dedicada. Refleja el modelo
 * Prisma `Analisis` (mapeado a `gds_analisis`) y expone los identificadores de
 * las `Institucion` participantes (derivados de sus `Comunidad_Digital`).
 */
export interface Analisis {
    id: string;
    /** Nombre legible del estudio longitudinal. */
    nombre: string;
    /** Copia INMUTABLE del contexto del escenario fijado (Req. 8.6, 29.4). */
    escenario: string;
    /** `true` si el escenario fijado provino de texto libre personalizado. */
    escenarioEsPersonalizado: boolean;
    /** Referencia al `Escenario_Reutilizable` de origen, para trazabilidad (Req. 29.6). */
    escenarioId: string | null;
    /** Version del escenario usada, para trazabilidad (Req. 29.6). */
    escenarioVersion: number | null;
    /** Numero total de `Semana_Simulada` configuradas (1..24). */
    semanasTotales: number;
    /** Radio de analisis en metros, base de la `Zona_Geografica` (Req. 33.1). */
    radioAnalisis: number;
    /** Salt de anonimizacion del `Analisis` (SHA-256 + salt, Req. 23). */
    saltAnon: string;
    /** Modo de ejecucion seleccionado (Req. 32). */
    modoEjecucion: ModoEjecucion;
    /** Intervalo del modo Tiempo_Real en ms, si aplica (Req. 32). */
    intervaloTiempoRealMs: number | null;
    /** Estado de ejecucion (Req. 32). Inicial: `DETENIDO`. */
    estadoEjecucion: EstadoEjecucion;
    /** Estado de ciclo de vida del `Analisis`. */
    estado: EstadoAnalisis;
    /** `Institucion` participantes (una `Comunidad_Digital` por cada una). */
    institucionIds: string[];
}

/**
 * Puerto estable que DISPARA el ciclo inicial (semana 1) de una `Institucion`
 * de un `Analisis` recien creado (Req. 8.5).
 *
 * El `Gestor_Analisis` depende SOLO de esta frontera, no de la `Cola_Trabajos`
 * (BullMQ) concreta, de modo que la creacion del analisis permanece desacoplada
 * del arranque de Redis y es testeable con un doble determinista. La
 * implementacion de produccion encola `procesarSemana(analisisId, institucionId, 1)`
 * en la `Cola_Trabajos` (tarea 16.2) cuando el `GestorEjecucion`/`Programador`
 * (tareas 16.3/17) cablean BullMQ en la app viva.
 */
export interface DisparadorCicloInicial {
    /** Dispara la `Semana_Simulada` 1 de `(analisisId, institucionId)` (Req. 8.5). */
    dispararSemanaInicial(
        analisisId: string,
        institucionId: string,
    ): Promise<void>;
}

/** Token DI del `DisparadorCicloInicial` (frontera estable, Req. 8.5). */
export const DISPARADOR_CICLO_INICIAL = Symbol('GDS:DISPARADOR_CICLO_INICIAL');
