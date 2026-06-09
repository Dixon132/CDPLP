/**
 * Modulo `ai-engine` - AI Engine (Capa_ML via Servicio_IA, embeddings/pgvector,
 * calibracion con el `Corpus_Longitudinal`).
 *
 * Expone la integracion de calibracion de la `Capa_ML` (tarea 9.4): tipos de
 * dominio, puerto de persistencia sobre `gds_calibracion` y el servicio que
 * calibra al crecer el corpus conservando la ultima calibracion valida ante
 * fallo (Req. 31.3, 31.4, 36.4).
 */
export const MODULE_NAME = "ai-engine" as const;

export {
    METRICA_CORPUS_SEMANAS,
    type MotivoCalibracion,
    type RegistroCalibracion,
    type ResultadoIntegracionCalibracion,
} from "./calibracion";

export {
    aMetricas,
    CalibracionRepositorioPrisma,
    calibracionRepositorio,
    type CalibracionRepositorio,
    type ClienteCalibracion,
    mapFilaToRegistro,
    semanasDeRegistro,
} from "./calibracionRepositorio";

export {
    type CalibradorCapaML,
    ServicioCalibracion,
} from "./servicioCalibracion";
