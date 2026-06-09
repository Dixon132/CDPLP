/**
 * Puertos (interfaces estables) del `GestorEjecucion` (tarea 17.1).
 *
 * El `GestorEjecucion` gobierna los tres `Modo_Ejecucion` (Manual / Automatico /
 * Tiempo_Real) y el ciclo de pausa/reanudacion de un `Analisis`, pero NO procesa
 * por su cuenta ni conoce la cola, el framework o la BD concreta: solo orquesta
 * QUIEN dispara el avance y CUANDO, reutilizando el UNICO `procesarSemana` a
 * traves de la `Herramienta_Aceleracion` (Manual/Automatico) y el
 * `Programador_Temporal` (Tiempo_Real). El modo nunca cambia QUE se ejecuta ni
 * POR DONDE pasa, lo que garantiza la equivalencia de resultado entre modos
 * (design.md > "Modos de ejecucion", Req. 32.7, coherente con 18.4).
 *
 * Para mantenerlo agnostico, depende solo de estos puertos:
 *  - `AlmacenEstadoEjecucion`: persiste el `Modo_Ejecucion`, el intervalo del
 *    Tiempo_Real y el `Estado_Ejecucion` del `Analisis` (en produccion, Prisma
 *    sobre `gds_analisis`; en pruebas, un doble en memoria).
 *  - `Temporizador`: contador inyectable del `Modo_Ejecucion` Tiempo_Real
 *    (Req. 32.4, 32.5). En produccion, `setInterval`/Cron; en pruebas, un doble
 *    determinista que dispara los vencimientos a voluntad (sin esperas reales).
 *
 * _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
 */
import type {
    EstadoEjecucion,
    ModoEjecucion,
} from '../../analysis/analysis.types';

/**
 * Instantanea del estado de ejecucion de un `Analisis` que gobierna la
 * `Cola_Trabajos`: que modo esta seleccionado, con que intervalo (si es
 * Tiempo_Real) y en que estado de ejecucion se encuentra.
 */
export interface EstadoEjecucionAnalisis {
    /** `Modo_Ejecucion` seleccionado (Req. 32.1). */
    modoEjecucion: ModoEjecucion;
    /** Intervalo del `Modo_Ejecucion` Tiempo_Real en ms, o `null` (Req. 32.5). */
    intervaloTiempoRealMs: number | null;
    /** `Estado_Ejecucion` actual (Req. 32.6). */
    estadoEjecucion: EstadoEjecucion;
}

/**
 * Puerto de PERSISTENCIA del estado de ejecucion del `Analisis` (Req. 32.1,
 * 32.5, 32.6, 32.8). El `GestorEjecucion` lee y fija el modo, el intervalo y el
 * estado a traves de esta frontera; nunca toca la BD concreta. En produccion lo
 * respalda Prisma sobre `gds_analisis`; en pruebas, un doble en memoria.
 */
export interface AlmacenEstadoEjecucion {
    /** Recupera el estado de ejecucion de `(analisisId)`. */
    obtener(analisisId: string): Promise<EstadoEjecucionAnalisis>;
    /** Fija el `Modo_Ejecucion` y el intervalo del Tiempo_Real (Req. 32.1, 32.5). */
    fijarModo(
        analisisId: string,
        modo: ModoEjecucion,
        intervaloTiempoRealMs: number | null,
    ): Promise<void>;
    /** Fija el `Estado_Ejecucion` (Req. 32.6, 32.8). */
    fijarEstado(analisisId: string, estado: EstadoEjecucion): Promise<void>;
}

/** Funcion que CANCELA un contador del Tiempo_Real previamente programado. */
export type CancelarTemporizador = () => void;

/**
 * Contador inyectable del `Modo_Ejecucion` Tiempo_Real (Req. 32.4, 32.5).
 *
 * `programar` arranca un contador que, al vencer cada `intervaloMs`, invoca
 * `alVencer` (que encola la siguiente `Semana_Simulada` pendiente). Devuelve una
 * funcion para cancelarlo (al pausar, cambiar de modo o completar el `Analisis`).
 *
 * En produccion lo respalda `setInterval`/Cron/node-schedule; en pruebas, un
 * doble determinista que permite disparar los vencimientos a voluntad, de modo
 * que el contador del Tiempo_Real se verifique de forma sincrona sin esperas
 * reales (Req. 18.4).
 */
export interface Temporizador {
    programar(
        intervaloMs: number,
        alVencer: () => void | Promise<void>,
    ): CancelarTemporizador;
}

// --- Tokens de inyeccion (NestJS) -----------------------------------------

/** Token DI del `GestorEjecucion` (orquestador de los tres modos). */
export const GESTOR_EJECUCION = Symbol('GDS:GESTOR_EJECUCION');
/** Token DI del `AlmacenEstadoEjecucion` (estado de modo/intervalo/ejecucion). */
export const ALMACEN_ESTADO_EJECUCION = Symbol('GDS:ALMACEN_ESTADO_EJECUCION');
/** Token DI del `Temporizador` del Tiempo_Real (contador inyectable, Req. 32.5). */
export const TEMPORIZADOR_EJECUCION = Symbol('GDS:TEMPORIZADOR_EJECUCION');
/** Token DI del intervalo por defecto del Tiempo_Real en ms (Req. 32.5). */
export const INTERVALO_TIEMPO_REAL_POR_DEFECTO = Symbol(
    'GDS:INTERVALO_TIEMPO_REAL_POR_DEFECTO',
);

/**
 * Intervalo por defecto del `Modo_Ejecucion` Tiempo_Real (Req. 32.5).
 *
 * Representa la duracion de UNA `Semana_Simulada` y es INDEPENDIENTE de la
 * duracion de una semana calendario real: por defecto un valor breve y
 * configurable, sustituible por el provider del token
 * `INTERVALO_TIEMPO_REAL_POR_DEFECTO` o por el intervalo recibido del
 * `Frontend_GDS` al seleccionar el modo.
 */
export const INTERVALO_TIEMPO_REAL_DEFECTO_MS = 60_000 as const;
