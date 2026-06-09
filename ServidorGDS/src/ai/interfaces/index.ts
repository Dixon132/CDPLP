/**
 * Superficie de importacion ESTABLE de los subsistemas de IA del `ServidorGDS`.
 *
 * Reexporta las INTERFACES ESTABLES (`Servicio_NLP`, `Servicio_Vision`,
 * `Filtro_Relevancia`) definidas junto al trabajo previo en `modules/analisis`
 * y los tokens DI bajo los que se registran sus implementaciones (fallback TS
 * en esta tarea; cliente HTTP del `Servicio_IA` en la tarea 8.1).
 *
 * Las FORMAS de entrada/salida de estas interfaces son las mismas que cumple el
 * contrato HTTP del `Servicio_IA` (`POST /nlp`, `POST /vision`,
 * `POST /relevancia`), de modo que el cliente Python y el fallback son
 * INTERCAMBIABLES sin tocar el `Pipeline_Analisis` (Req. 14.5, 15.4, 34.6).
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`".
 * _Requirements: 14.5, 15.4, 34.6, 35.3_
 */

// Interfaz estable Servicio_NLP y tipos de su resultado (POST /nlp).
export type {
    ServicioNLP,
    ResultadoNLP,
    AnalisisSemantico,
    DeteccionEmocional,
    SenalEmocional,
    ClasificacionTematica,
    GrupoTematico,
    ElementoCausal,
    TipoElementoCausal,
    AnalisisConversacional,
    InteraccionConversacional,
    InterpretacionTendencia,
    DireccionTendencia,
    TerminoClave,
} from "../../modules/analisis/servicioNLP";

// Interfaz estable Servicio_Vision y forma de su resultado (POST /vision).
export type {
    ServicioVision,
    ResultadoVision,
} from "../../modules/analisis/servicioVision";

// Interfaz estable Filtro_Relevancia y forma de su resultado (POST /relevancia).
export type {
    FiltroRelevancia,
    ResultadoFiltroRelevancia,
    ItemClasificado,
} from "../../modules/analisis/interfaces";
export { Contributividad } from "../../modules/analisis/interfaces";

// Interfaz estable Capa_ML y tipos de su contrato (POST /embeddings,
// /clustering, /anomalias, /tendencias, /score-calibrado).
export type {
    CapaML,
    EntradaIndice,
    EvolucionTemporal,
    ReferenciaCorpus,
    ResultadoCalibracion,
    ResultadoClustering,
    Anomalia,
    Tendencia,
    ScoreCalibrado,
    ZonaGeografica,
} from "../../modules/ml/capaML";

// Tokens DI de los subsistemas reemplazables.
export {
    SERVICIO_NLP,
    SERVICIO_VISION,
    FILTRO_RELEVANCIA,
    CAPA_ML,
} from "./tokens";
