/**
 * Tipos base compartidos de la feature `gds`.
 *
 * Las pantallas y servicios concretos (tareas 26.2+) ampliarán estos tipos.
 */

/** Modos de ejecución de un análisis (Req. 32). */
export type ModoEjecucion = 'AUTOMATICO' | 'MANUAL' | 'TIEMPO_REAL';

/** Estados consultables de un ciclo/trabajo (Req. 27.5, 38.5). */
export type EstadoEjecucion =
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'COMPLETADO'
    | 'FALLIDO';

/** Coordenada geográfica (centro de la `Zona_Geografica`, Req. 33). */
export interface Coordenada {
    lat: number;
    lng: number;
}
