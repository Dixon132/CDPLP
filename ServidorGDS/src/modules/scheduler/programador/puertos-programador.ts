/**
 * Puertos (interfaces estables) del `Programador_Temporal` y de la
 * `Herramienta_Aceleracion` (tarea 16.3).
 *
 * Tanto el disparador en tiempo real (`Programador_Temporal`) como la utilidad
 * administrativa de salto (`Herramienta_Aceleracion`) NO procesan por su cuenta:
 * se limitan a ENCOLAR el procesamiento de cada `Semana_Simulada` pendiente en la
 * MISMA `Cola_Trabajos` (BullMQ/Redis), reutilizando el UNICO `procesarSemana`
 * (tarea 16.1) y la frontera de encolado `ColaProcesarSemanaService` (tarea 16.2).
 * No hay ruta alternativa por modo: el modo solo cambia QUIEN dispara y CUANTO se
 * avanza, no QUE se ejecuta ni POR DONDE pasa (design.md > "Modos de ejecucion",
 * Req. 18.4, 32.7).
 *
 * Para mantenerlos AGNOSTICOS del framework, de la cola y de la BD, dependen solo
 * de estos puertos:
 *  - `PlanAnalisis`: estado del avance de un `Analisis` (instituciones, total de
 *    `Semana_Simulada` y ultima semana COMPLETADA por institucion). Lo respalda
 *    Prisma en produccion (`gds_analisis`/`gds_ciclo_semanal`); un doble en
 *    memoria en pruebas.
 *  - `EncoladorSemana`: frontera de encolado `(A,I,N)` con `jobId` determinista.
 *    Lo satisface `ColaProcesarSemanaService` (tarea 16.2); un doble que registra
 *    encolados en pruebas.
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import type { ResultadoEncolado } from '../cola/cola-procesar-semana.service';
import type { DatosTrabajoSemana } from '../cola/trabajo-semana';

/**
 * Estado del avance de un `Analisis`, expuesto como puerto estable.
 *
 * Las `Semana_Simulada` se numeran de 1 a `totalSemanas` por `Institucion` y se
 * procesan en orden estrictamente creciente y CONTIGUO. La frontera de "lo
 * pendiente" de cada `(A,I)` es la ultima semana COMPLETADA: las pendientes son
 * `[ultimaSemanaCompletada + 1 .. totalSemanas]`.
 */
export interface PlanAnalisis {
    /** `Institucion` que participan en el `Analisis` (aislamiento por institucion, Req. 9.5). */
    institucionesDe(analisisId: string): Promise<string[]>;

    /** Total de `Semana_Simulada` del `Analisis` (p. ej. 24). Entero >= 1. */
    totalSemanas(analisisId: string): Promise<number>;

    /**
     * Numero de la ultima `Semana_Simulada` COMPLETADA de `(A,I)`, o `0` si aun
     * no se completo ninguna. Como el procesamiento es contiguo desde la semana
     * 1, este valor coincide con la cantidad de semanas completadas y la siguiente
     * pendiente es `ultimaSemanaCompletada + 1` (Req. 12.4).
     */
    ultimaSemanaCompletada(
        analisisId: string,
        institucionId: string,
    ): Promise<number>;
}

/**
 * Frontera de ENCOLADO de una `Semana_Simulada` en la `Cola_Trabajos`.
 *
 * Es la unica salida del `Programador_Temporal`/`Herramienta_Aceleracion`: ambos
 * encolan `(A,I,N)` aqui. La satisface `ColaProcesarSemanaService` (tarea 16.2),
 * que aplica `jobId` determinista (idempotencia de encolado, Req. 27.2, 38.3) y
 * registra el estado PENDIENTE consultable (Req. 38.5).
 */
export interface EncoladorSemana {
    encolar(datos: DatosTrabajoSemana): Promise<ResultadoEncolado>;
}

// --- Tokens de inyeccion (NestJS) -----------------------------------------

/** Token DI del `PlanAnalisis` (estado de avance del analisis). */
export const PLAN_ANALISIS = Symbol('GDS:PLAN_ANALISIS');
/** Token DI del `EncoladorSemana` (frontera de encolado, `ColaProcesarSemanaService`). */
export const ENCOLADOR_SEMANA = Symbol('GDS:ENCOLADOR_SEMANA');
/** Token DI del `Programador_Temporal` (disparador en tiempo real simulado). */
export const PROGRAMADOR_TEMPORAL = Symbol('GDS:PROGRAMADOR_TEMPORAL');
/** Token DI de la `Herramienta_Aceleracion` (salto administrativo). */
export const HERRAMIENTA_ACELERACION = Symbol('GDS:HERRAMIENTA_ACELERACION');
