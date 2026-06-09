/**
 * Modulo `ml` - Capa_ML (reemplazable por microservicio Python).
 *
 * Expone la interfaz estable `CapaML`, sus tipos de soporte, una
 * implementacion base/heuristica determinista (fallback seguro, sin GPU) y un
 * envoltorio de **degradacion segura** (`CapaMLConDegradacion` + fabrica) que
 * consumen NLP/temporal/patrones/indice sin acoplar el `Pipeline_Analisis`
 * (Req. 31.5, 31.6).
 * _Requirements: 31.1, 31.2, 31.3, 31.5, 31.6, 31.7_
 */
export const MODULE_NAME = "ml" as const;

export type {
    Anomalia,
    CapaML,
    EntradaIndice,
    EvolucionTemporal,
    ReferenciaCorpus,
    ResultadoCalibracion,
    ResultadoClustering,
    ScoreCalibrado,
    Tendencia,
    ZonaGeografica,
} from "./capaML";

export { CapaMLBase, capaMLBase, clamp01 } from "./capaMLBase";

export type {
    CausaDegradacion,
    IncidenteDegradacion,
    OpcionesDegradacion,
    OperacionCapaML,
    RegistradorIncidente,
} from "./capaMLConDegradacion";

export {
    CapaMLConDegradacion,
    crearCapaMLConDegradacion,
    registradorIncidenteConsola,
} from "./capaMLConDegradacion";
