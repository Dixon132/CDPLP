/**
 * Modulo `pipeline` - orquestacion de etapas y reanudacion.
 *
 * Tarea 9.1: framework de etapas (`ORDEN_ETAPAS`), interfaz `PipelineAnalisis`,
 * estado por etapa (`EstadoPipeline`) y orquestador esqueleto con reanudacion.
 * Las integraciones concretas de cada etapa se desarrollan en la tarea 9.2+.
 */
export const MODULE_NAME = "pipeline" as const;

export {
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    ErrorEtapaPipeline,
    loggerConsola,
    primeraEtapaPendiente,
    estadoPipelineInicial,
    estadoDesdeEtapasCompletadas,
    serializarEtapasCompletadas,
} from "./pipeline";
export type {
    EstadoPipeline,
    ResultadoSemana,
    PipelineAnalisis,
    ManejadorEtapa,
    ManejadoresEtapa,
    LoggerPipeline,
} from "./pipeline";

export {
    limpiarTexto,
    limpiarContrato,
    normalizarTexto,
    normalizarHashtag,
    normalizarHashtags,
    normalizarContrato,
    crearManejadoresEtapa,
    crearPipelineAnalisis,
} from "./etapas";
export type {
    ConfigAnonimizacion,
    ConfigAnalisis,
    ConfigEmbeddings,
    OpcionesManejadoresEtapa,
} from "./etapas";

export {
    crearManejadoresAnalisis,
    crearResultadosAnalisis,
    construirContratoContributivo,
} from "./etapasAnalisis";
export type {
    ServiciosAnalisis,
    ResultadosAnalisis,
} from "./etapasAnalisis";

export {
    crearManejadorEmbeddings,
    extraerFragmentosEmbeddings,
    persistirResultadoSemanaConEmbeddings,
    MODELO_EMBEDDING_POR_DEFECTO,
    ETAPA_EMBEDDINGS,
} from "./etapaEmbeddings";
export type {
    ContextoEmbeddings,
    FragmentosEmbeddings,
    EjecutorTransaccional,
    PersistorResultadoSemana,
    FabricaMemoriaTransaccional,
    OpcionesPersistenciaEmbeddings,
} from "./etapaEmbeddings";
