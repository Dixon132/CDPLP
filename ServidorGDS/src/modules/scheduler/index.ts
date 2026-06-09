/**
 * Modulo `scheduler` - Programador_Temporal, Herramienta_Aceleracion y el UNICO
 * `procesarSemana` (transaccional) reutilizado por todos los modos de ejecucion.
 *
 * Tarea 16.1: `procesarSemana` (genera -> valida -> analiza -> aprende ->
 * almacena en transaccion atomica) y su adaptador al `Pipeline_Analisis`. El
 * porte a la `Cola_Trabajos` (BullMQ) y el `Programador_Temporal`/
 * `Herramienta_Aceleracion` se desarrollan en las tareas 16.2/16.3.
 */
export const MODULE_NAME = "scheduler" as const;

export {
    ProcesadorSemana,
    PROCESADOR_SEMANA,
} from "./procesarSemana";
export type {
    ContextoSemana,
    ResultadoGeneracionSemana,
    GeneradorSemana,
    ResultadoAnalisisSemana,
    AnalizadorSemana,
    EntradaAprendizaje,
    ArtefactosAprendizaje,
    MotorAprendizaje,
    UnidadTrabajoSemana,
    PersistorSemana,
    DependenciasProcesarSemana,
    OpcionesProcesarSemana,
    ResultadoProcesarSemana,
} from "./procesarSemana";

export { AnalizadorPipeline } from "./analizadorPipeline";
export type { OpcionesAnalizadorPipeline } from "./analizadorPipeline";

// Tarea 16.2: porte de `procesarSemana` a la `Cola_Trabajos` (BullMQ/Redis).
export * from "./cola";

// Tarea 16.3: `Programador_Temporal` y `Herramienta_Aceleracion` (encolado de
// semanas pendientes en orden creciente, sin ruta alternativa por modo).
export * from "./programador";

// Tarea 17.1: `GestorEjecucion` (modos Manual / Automatico / Tiempo_Real y
// pausar/reanudar) y su API HTTP, reutilizando los disparadores anteriores.
export * from "./gestor";
