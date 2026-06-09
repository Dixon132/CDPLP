/**
 * `Score_Asociacion` comunitario probabilistico (Req. 11).
 *
 * MIGRACION (tarea 14.1): el hogar canonico de este componente es ahora el
 * modulo de dominio `communities` (Comunidad_Digital / Usuario_Sintetico /
 * Score_Asociacion / Zona_Geografica). Este archivo se conserva como una
 * fachada de COMPATIBILIDAD que re-exporta la implementacion migrada, de modo
 * que los consumidores previos del modulo `analisis` (p. ej. `indiceRiesgo`,
 * las pruebas y el PBT) sigan funcionando sin cambios.
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.5_
 */
export type {
    FactoresAsociacion,
    PesosAsociacion,
    EntradaScoreSemana,
    ResultadoScoreSemana,
    RecalculadorScoreAsociacion,
} from '../communities/scoreAsociacion';

export {
    FACTORES_ASOCIACION,
    PESOS_POR_DEFECTO,
    SCORE_ASOCIACION,
    clamp01,
    calcularScoreAsociacion,
    ScoreAsociacionService,
    ServicioScoreAsociacion,
    servicioScoreAsociacion,
} from '../communities/scoreAsociacion';
