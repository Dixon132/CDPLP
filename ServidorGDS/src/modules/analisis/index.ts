/**
 * Modulo `analisis` - interfaces + servicios del pipeline (NLP, vision, indice, etc.).
 * Andamiaje: el resto de servicios se desarrolla en las tareas 11 a 13.
 */
export const MODULE_NAME = "analisis" as const;

export type { ServicioAnonimizacion } from "./interfaces";
export {
    ServicioAnonimizacionSha256,
    servicioAnonimizacion,
} from "./servicioAnonimizacion";

export type {
    FactoresAsociacion,
    PesosAsociacion,
    EntradaScoreSemana,
    ResultadoScoreSemana,
} from "./scoreAsociacion";
export {
    FACTORES_ASOCIACION,
    PESOS_POR_DEFECTO,
    clamp01,
    calcularScoreAsociacion,
    ServicioScoreAsociacion,
    servicioScoreAsociacion,
} from "./scoreAsociacion";

export type {
    PatronDetectado,
    OrigenComunidad,
    ColumnasZona,
    RegistroPatron,
} from "./detectorPatrones";
export {
    aRadioMetrosEntero,
    zonaAColumnas,
    aRegistroPatron,
    asociarPatronesAZona,
    claveZona,
    agruparPorZona,
    ServicioDetectorPatrones,
    servicioDetectorPatrones,
} from "./detectorPatrones";

export type {
    EntradaIndice,
    DefinicionDimension,
    DimensionRiesgo,
    IndiceRiesgo,
} from "./indiceRiesgo";
export {
    RANGO_POR_DEFECTO,
    DIMENSIONES_POR_DEFECTO,
    clampRango,
    calcularDimensiones,
    entradaMlPorDimension,
    resolverScoresCalibradosMl,
    ServicioIndiceRiesgo,
    servicioIndiceRiesgo,
} from "./indiceRiesgo";

export type {
    TerminoClave,
    AnalisisSemantico,
    SenalEmocional,
    DeteccionEmocional,
    GrupoTematico,
    ClasificacionTematica,
    TipoElementoCausal,
    ElementoCausal,
    InteraccionConversacional,
    AnalisisConversacional,
    DireccionTendencia,
    InterpretacionTendencia,
    ResultadoNLP,
    ServicioNLP,
} from "./servicioNLP";
export {
    aplanarItems,
    tokenizar,
    analizarSemantica,
    detectarEmocion,
    clasificarTemas,
    inferirElementosCausales,
    analizarConversacion,
    interpretarTendencias,
    analizarContrato,
    ServicioNLPBase,
    servicioNLP,
} from "./servicioNLP";

export type {
    ResultadoSemanalTemporal,
    FuenteResultadosTemporal,
    MotorTemporal,
} from "./motorTemporal";
export {
    UMBRAL_VARIACION,
    ordenarResultados,
    construirSeries,
    dimensionesQueVarian,
    derivarRelaciones,
    correlacionarEvolucion,
    zonaDeEvolucion,
    MotorTemporalService,
    FuenteResultadosEnMemoria,
} from "./motorTemporal";

export type {
    DireccionVariacion,
    ContextoExplicacion,
    EvidenciaCuantificable,
    Explicacion,
    MotorExplicativo,
} from "./motorExplicativo";
export {
    UMBRAL_VARIACION_EXPLICATIVO,
    ConclusionSinEvidenciaError,
    normalizarEvidenciaIds,
    tieneEvidenciaReferenciable,
    calcularEvidenciaCuantificable,
    construirExplicacion,
    ServicioMotorExplicativo,
    servicioMotorExplicativo,
} from "./motorExplicativo";

export type { ResultadoVision, ServicioVision } from "./servicioVision";
export {
    esDescripcionVacia,
    tokenizarDescripcion,
    derivarEscena,
    derivarObjetos,
    derivarContextoEmocional,
    analizarDescripcion,
    ServicioVisionMock,
    servicioVision,
} from "./servicioVision";

// Filtro_Relevancia (senal vs ruido) - tarea 10.1 (Req. 34).
export {
    Contributividad,
    type FiltroRelevancia,
    type ItemClasificado,
    type ResultadoFiltroRelevancia,
} from "./interfaces";
export type { ItemContrato } from "./filtroRelevancia";
export {
    MIN_LONGITUD_PALABRA,
    aplanarItemsContrato,
    quitarMarcadores,
    contarPalabrasInformativas,
    tieneMarcadores,
    clasificarItem,
    clasificarContrato,
    FiltroRelevanciaBase,
    filtroRelevancia,
} from "./filtroRelevancia";
