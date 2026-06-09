/**
 * Contrato del WS Hub de progreso en vivo (modulo `ws`, tarea 24.1).
 *
 * El `Frontend_GDS` recibe por WebSockets el progreso de los ciclos / saltos
 * temporales / `Modo_Ejecucion` de los `Analisis` a los que esta suscrito y
 * autorizado: semanas procesadas/pendientes y `Estado_Ejecucion` (en ejecucion,
 * pausa, etc.) (Req. 18.6, 21.4, 32.6).
 *
 * El backend (motor de ciclos `procesarSemana`, `GestorEjecucion`,
 * `Herramienta_Aceleracion`, `Programador_Temporal`) publica estos eventos a
 * traves del bus de eventos interno (Event-Driven, `EventsModule`) SIN acoplarse
 * al transporte WebSocket: emite `EVENTO_PROGRESO_GDS` y el `ProgresoGateway` lo
 * reenvia por WS unicamente a la sala (`room`) del `Analisis` correspondiente.
 */
import type { EstadoEjecucion } from '../analysis/analysis.types';

/** Nombre del evento interno (Event-Driven) que transporta el progreso. */
export const EVENTO_PROGRESO_GDS = 'gds.progreso' as const;

/**
 * Nombre del evento WebSocket que recibe el `Frontend_GDS` con cada actualizacion
 * de progreso de un `Analisis`.
 */
export const MENSAJE_WS_PROGRESO = 'progreso' as const;

/** Nombre del mensaje WebSocket con el que un cliente se suscribe a un `Analisis`. */
export const MENSAJE_WS_SUSCRIBIR = 'suscribir' as const;

/** Nombre del mensaje WebSocket con el que un cliente se da de baja de un `Analisis`. */
export const MENSAJE_WS_DESUSCRIBIR = 'desuscribir' as const;

/**
 * Tipo de evento de progreso que produce el motor de ciclos.
 *  - `ciclo`: avance de una `Semana_Simulada` (procesada/iniciada).
 *  - `salto`: progreso de un salto temporal (`Herramienta_Aceleracion`).
 *  - `modo`: cambio de `Modo_Ejecucion` o de `Estado_Ejecucion` (pausa/reanudar).
 */
export type TipoProgreso = 'ciclo' | 'salto' | 'modo';

/**
 * Carga util del progreso de un `Analisis` que viaja por el bus interno y por
 * WebSockets. Es COLECTIVO y de orquestacion: nunca contiene PII ni resultados
 * individuales (Req. 17.4).
 */
export interface ProgresoEvento {
    /** `Analisis` al que pertenece el progreso (define la sala WS). */
    analisisId: string;
    /** `Institucion` cuya `Semana_Simulada` avanza, si aplica. */
    institucionId?: string;
    /** Tipo de progreso reportado. */
    tipo: TipoProgreso;
    /** Numero de la `Semana_Simulada` en curso o recien procesada (1..24). */
    semanaActual?: number;
    /** Total de `Semana_Simulada` procesadas hasta ahora. */
    semanasProcesadas?: number;
    /** Total de `Semana_Simulada` pendientes. */
    semanasPendientes?: number;
    /** `Estado_Ejecucion` actual del `Analisis` (en ejecucion / pausa / ...). */
    estadoEjecucion?: EstadoEjecucion;
    /** Marca temporal (epoch ms) del evento; el publicador la fija si falta. */
    timestamp?: number;
}

/** Construye el identificador de sala (`room`) WS de un `Analisis`. */
export const salaAnalisis = (analisisId: string): string =>
    `analisis:${analisisId}`;
