/**
 * Tipos y contrato estable del `Generador_Reportes` (modulo `reports`).
 *
 * El `Generador_Reportes` produce reportes COLECTIVOS y EXPLICATIVOS en cinco
 * horizontes temporales (semanal, mensual, trimestral, semestral y un informe
 * final) a partir de los RESULTADOS SEMANALES ACUMULADOS de un `Analisis`
 * (opcionalmente acotado a una `Institucion`). Cada reporte reune explicaciones,
 * evidencias, publicaciones relevantes, indicadores, cambios, tendencias,
 * factores detonantes, conclusiones y recomendaciones; toda conclusion y cada
 * cambio referencian la `Evidencia` que los sustenta POR IDENTIFICADOR
 * trazable, sin exponer diagnostico individual (solo agregados colectivos).
 *
 * Diseno: design.md > D13 (PDFKit + Puppeteer + Handlebars + ExcelJS) y
 * "Sistema de Evidencias". El render descargable (PDF/Excel) corresponde a la
 * tarea 23.2; esta tarea (23.1) produce la GENERACION por horizonte y el
 * contenido estructurado + narrativa (Handlebars) persistidos en `gds_reporte`.
 *
 * _Requirements: 19.1, 19.2, 19.3, 19.4_
 */

/**
 * Horizontes temporales del `Generador_Reportes` (Req. 19.1). Se alinean con
 * los cinco niveles de la `Memoria_Jerarquica` (`NivelMemoria`): el informe
 * `FINAL` corresponde al agregado global de todo el `Analisis`.
 */
export enum Horizonte {
    SEMANAL = 'SEMANAL',
    MENSUAL = 'MENSUAL',
    TRIMESTRAL = 'TRIMESTRAL',
    SEMESTRAL = 'SEMESTRAL',
    FINAL = 'FINAL',
}

/** Lista de horizontes validos (para validacion de entrada). */
export const HORIZONTES: readonly Horizonte[] = [
    Horizonte.SEMANAL,
    Horizonte.MENSUAL,
    Horizonte.TRIMESTRAL,
    Horizonte.SEMESTRAL,
    Horizonte.FINAL,
] as const;

/**
 * Numero de `Semana_Simulada` que abarca cada horizonte acotado. El informe
 * `FINAL` no es de tramo fijo: cubre TODO el `Analisis` (1..semanasTotales).
 */
export const SEMANAS_POR_HORIZONTE: Readonly<Record<Exclude<Horizonte, Horizonte.FINAL>, number>> = {
    [Horizonte.SEMANAL]: 1,
    [Horizonte.MENSUAL]: 4,
    [Horizonte.TRIMESTRAL]: 12,
    [Horizonte.SEMESTRAL]: 24,
};

/** Rango de semanas (inclusive) que cubre un reporte. */
export interface RangoSemanas {
    desde: number;
    hasta: number;
}

/** Direccion de un cambio de indicador entre el inicio y el fin del periodo. */
export type DireccionCambio = 'sube' | 'baja' | 'estable';

/**
 * Indicador colectivo agregado por dimension del `Indice_Riesgo` a lo largo del
 * periodo del reporte (Req. 17.4, 19.2). Referencia su evidencia por id.
 */
export interface IndicadorReporte {
    dimension: string;
    valorInicial: number;
    valorFinal: number;
    minimo: number;
    maximo: number;
    promedio: number;
    /** Promedio del score calibrado por la `Capa_ML` (null si no hay datos). */
    scoreCalibradoMlPromedio: number | null;
    /** Semanas del periodo con dato para esta dimension. */
    semanas: number[];
    evidenciaIds: string[];
}

/**
 * Cambio cuantificado de una dimension entre la primera y la ultima semana con
 * dato dentro del periodo (Req. 16.4, 19.2). Toda variacion lleva evidencia.
 */
export interface CambioReporte {
    dimension: string;
    desdeSemana: number;
    hastaSemana: number;
    variacionAbsoluta: number;
    /** Variacion porcentual; null si el valor inicial es 0 (indefinida). */
    variacionPct: number | null;
    direccion: DireccionCambio;
    evidenciaIds: string[];
}

/**
 * Explicacion en lenguaje natural (que / por que / cuando empezo / como
 * evoluciono) de la variacion de una dimension, con su evidencia (Req. 20.x).
 */
export interface ExplicacionReporte {
    dimension: string;
    numeroSemana: number;
    que: string;
    porQue: string;
    cuandoEmpezo?: string;
    comoEvoluciono?: string;
    evidenciaIds: string[];
}

/** Tendencia/patron detectado anclado a su `Comunidad_Digital`/zona (Req. 16, 33). */
export interface TendenciaReporte {
    tipo: string;
    descripcion: string;
    comunidadId: string;
}

/** Factor detonante: evento del `Escenario` correlacionado con cambios (Req. 16.4, 19.2). */
export interface DetonanteReporte {
    evento: string;
    semanas: number[];
    evidenciaIds: string[];
}

/** Evidencia anonimizada incluida en el reporte, trazable por id (Req. 30.5, 19.2). */
export interface EvidenciaReporte {
    id: string;
    tipo: string;
    /** Contenido anonimizado, sin identificadores crudos (Req. 30.5). */
    contenido: string;
    numeroSemana: number;
    contributividad: string;
    refContenido: string;
    metricas: { conteo?: number; variacionPct?: number };
}

/** Afirmacion colectiva respaldada por evidencia referenciada por id (Req. 20.1, 30.1). */
export interface AfirmacionConEvidencia {
    texto: string;
    evidenciaIds: string[];
}

/**
 * Contenido estructurado del reporte que se persiste en `gds_reporte.contenido`
 * (Json). Es COLECTIVO (por dimension/comunidad) y EXPLICATIVO: cada conclusion
 * y cada cambio referencian su evidencia por id (Req. 19.2, 19.4, 30.1).
 */
export interface ReporteContenido {
    horizonte: Horizonte;
    periodo: number;
    rango: RangoSemanas;
    analisisId: string;
    /** Institucion especifica si el reporte esta acotado a ella (Req. 19.4). */
    institucionId: string | null;
    /** Narrativa generada con Handlebars a partir del contenido estructurado. */
    resumen: string;
    indicadores: IndicadorReporte[];
    cambios: CambioReporte[];
    tendencias: TendenciaReporte[];
    detonantes: DetonanteReporte[];
    explicaciones: ExplicacionReporte[];
    /** Refs anonimizadas de publicaciones relevantes (Req. 19.2). */
    publicacionesRelevantes: string[];
    evidencias: EvidenciaReporte[];
    conclusiones: AfirmacionConEvidencia[];
    recomendaciones: AfirmacionConEvidencia[];
    generadoEn: string;
    /** Semanas con resultados encontrados en el periodo (trazabilidad de cobertura). */
    semanasCubiertas: number[];
}

/** Reporte persistido (fila `gds_reporte`) en su forma de dominio. */
export interface ReporteGenerado {
    id: string;
    analisisId: string;
    institucionId: string | null;
    horizonte: Horizonte;
    contenido: ReporteContenido;
    generadoEn: Date;
}

// ---------------------------------------------------------------------------
// Tipos "crudos" de entrada del constructor de contenido. Reflejan la forma de
// los datos leidos de Prisma (resultados semanales acumulados + patrones), pero
// se declaran de forma autonoma para que el constructor sea una funcion PURA y
// testeable sin acceso a la base de datos.
// ---------------------------------------------------------------------------

/** Explicacion cruda asociada a una dimension (modelo `gds_explicacion`). */
export interface ExplicacionCruda {
    que: string;
    porQue: string;
    cuandoEmpezo: string | null;
    comoEvoluciono: string | null;
}

/** Dimension cruda del indice de riesgo (modelo `gds_dimension_riesgo`). */
export interface DimensionCruda {
    nombre: string;
    valor: number;
    minimo: number;
    maximo: number;
    scoreCalibradoMl: number | null;
    explicaciones: ExplicacionCruda[];
}

/** Evidencia cruda asociada a un resultado (modelo `gds_evidences`). */
export interface EvidenciaCruda {
    id: string;
    tipo: string;
    contenido: string;
    numeroSemana: number;
    contributividad: string;
    refContenido: string;
    publicacionesAsociadas: string[];
    eventosAsociados: string[];
    indicadoresUtilizados: string[];
    conteo: number | null;
    variacionPct: number | null;
}

/** Resultado semanal acumulado (modelo `gds_resultado_analisis` + ciclo). */
export interface ResultadoCrudo {
    id: string;
    numeroSemana: number;
    institucionId: string;
    dimensiones: DimensionCruda[];
    evidencias: EvidenciaCruda[];
}

/** Patron/tendencia cruda anclada a su comunidad (modelo `gds_patron`). */
export interface PatronCrudo {
    tipo: string;
    descripcion: string;
    comunidadId: string;
}

/** Entrada del constructor PURO de contenido del reporte. */
export interface EntradaContenido {
    analisisId: string;
    institucionId: string | null;
    horizonte: Horizonte;
    periodo: number;
    rango: RangoSemanas;
    resultados: ResultadoCrudo[];
    patrones: PatronCrudo[];
    /** Reloj inyectable para determinismo en pruebas. */
    ahora?: Date;
}
