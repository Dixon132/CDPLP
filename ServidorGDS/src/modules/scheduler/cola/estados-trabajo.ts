/**
 * Dominio consultable de estados de un trabajo de la `Cola_Trabajos` (BullMQ)
 * que procesa una `Semana_Simulada` (tarea 16.2).
 *
 * El estado de cada trabajo `(analisisId, institucionId, numeroSemana)` debe ser
 * CONSULTABLE y acotado a un dominio cerrado (Req. 38.5), coherente con el estado
 * de ciclo del Req. 27.5: {pendiente, en proceso, completado, fallido}. Modelar
 * el dominio como un `enum` cerrado permite verificar por pruebas que ningun
 * trabajo cae fuera de estos cuatro valores (Property 26, tarea 16.10).
 *
 * Diseno: design.md > "Invariantes y mecanismos del motor" (estado EN_PROCESO,
 * reintentos acotados, aislamiento por institucion).
 * _Requirements: 27.5, 38.5_
 */

/**
 * Estados posibles de un trabajo de la `Cola_Trabajos`.
 *
 * Es un dominio CERRADO y consultable (Req. 38.5):
 *  - `PENDIENTE`: encolado/aceptado, aun no procesado (o a la espera de reintento).
 *  - `EN_PROCESO`: un worker adquirio el bloqueo de concurrencia sobre `(A,I,N)`
 *    y lo esta ejecutando (impide procesamiento concurrente, Req. 27.3, 38.2).
 *  - `COMPLETADO`: `procesarSemana` termino y persistio su resultado atomicamente.
 *  - `FALLIDO`: agoto la politica de reintentos acotada sin completar (Req. 38.4).
 */
export enum EstadoTrabajo {
    PENDIENTE = 'PENDIENTE',
    EN_PROCESO = 'EN_PROCESO',
    COMPLETADO = 'COMPLETADO',
    FALLIDO = 'FALLIDO',
}

/**
 * Conjunto cerrado de todos los estados validos, en orden del ciclo de vida
 * tipico. Util para validacion y para las pruebas del dominio consultable
 * (Req. 38.5, Property 26).
 */
export const ESTADOS_TRABAJO: readonly EstadoTrabajo[] = [
    EstadoTrabajo.PENDIENTE,
    EstadoTrabajo.EN_PROCESO,
    EstadoTrabajo.COMPLETADO,
    EstadoTrabajo.FALLIDO,
] as const;

/** Estados terminales: el trabajo no avanza mas sin una nueva accion explicita. */
export const ESTADOS_TERMINALES: ReadonlySet<EstadoTrabajo> = new Set([
    EstadoTrabajo.COMPLETADO,
    EstadoTrabajo.FALLIDO,
]);

/** `true` si `valor` pertenece al dominio cerrado de `EstadoTrabajo` (Req. 38.5). */
export function esEstadoTrabajo(valor: unknown): valor is EstadoTrabajo {
    return (
        typeof valor === 'string' &&
        (ESTADOS_TRABAJO as readonly string[]).includes(valor)
    );
}

/** `true` si el estado es terminal (COMPLETADO o FALLIDO). */
export function esEstadoTerminal(estado: EstadoTrabajo): boolean {
    return ESTADOS_TERMINALES.has(estado);
}
