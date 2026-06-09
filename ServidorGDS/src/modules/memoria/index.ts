/**
 * Modulo `memoria` - `Motor_Memoria_Contextual` y persistencia de la
 * `Memoria_Jerarquica` de 5 niveles sobre `gds_memoria_*`.
 *
 * Tarea 6.1: contrato/tipos del motor y puerto de persistencia (thin
 * repository). Tarea 6.2: consolidacion jerarquica acumulativa. Tarea 6.3:
 * construccion del `ContextoGeneracion` bajo umbral de tokens.
 */
export const MODULE_NAME = "memoria" as const;

// Contrato y tipos del Motor_Memoria_Contextual (tarea 6.1).
export {
    NivelMemoria,
    ORDEN_NIVELES,
} from "./motorMemoriaContextual";
export type {
    MemoriaNivel,
    MotorMemoriaContextual,
} from "./motorMemoriaContextual";

// Puerto de persistencia sobre gds_memoria_* (tarea 6.1).
export {
    MemoriaRepositorioPrisma,
    memoriaRepositorio,
    aListaStrings,
    mapSemanalRowToMemoria,
    mapMensualRowToMemoria,
    mapTrimestralRowToMemoria,
    mapSemestralRowToMemoria,
    mapGlobalRowToMemoria,
    mapMemoriaToSemanalCreate,
    mapMemoriaToMensualCreate,
    mapMemoriaToTrimestralCreate,
    mapMemoriaToSemestralCreate,
    mapMemoriaToGlobalCreate,
} from "./memoriaRepositorio";
export type {
    ClienteMemoria,
    MemoriaRepositorio,
} from "./memoriaRepositorio";

// Consolidacion jerarquica acumulativa (tarea 6.2) y construccion de contexto
// bajo umbral de tokens (tarea 6.3).
export {
    MotorMemoriaContextualImpl,
    consolidarMemorias,
    estimarTokens,
    seleccionarContextoMemoria,
    textoMemoria,
} from "./motorMemoriaContextualImpl";
export type {
    FuenteResumenSemanal,
    ResumenSemanaCruda,
    SeleccionContexto,
} from "./motorMemoriaContextualImpl";
