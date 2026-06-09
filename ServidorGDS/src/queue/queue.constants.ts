/**
 * Constantes compartidas de la `Cola_Trabajos` (BullMQ sobre Redis).
 *
 * Centralizar el nombre de la cola evita errores de tipeo entre el modulo que
 * la registra (`QueueModule`) y los consumidores que la inyectan (el
 * `Scheduler`/`Controlador_Ciclo` la reutilizaran en tareas posteriores).
 */

/**
 * Nombre de la cola que procesa cada `Semana_Simulada`.
 *
 * El `Programador_Temporal` y el `Controlador_Ciclo` encolan aqui el
 * procesamiento de una `Semana_Simulada` por `Institucion` (Req. 38.1).
 */
export const COLA_PROCESAR_SEMANA = 'procesar-semana';

/**
 * Numero de reintentos acotados por defecto ante un fallo de trabajo.
 *
 * Cumple la politica de reintentos acotada del Req. 38.4 sin reintentar de
 * forma indefinida.
 */
export const REINTENTOS_POR_DEFECTO = 3;

/**
 * Retardo base (ms) del backoff exponencial entre reintentos.
 */
export const BACKOFF_BASE_MS = 5_000;
