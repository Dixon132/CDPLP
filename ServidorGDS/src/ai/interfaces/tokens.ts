/**
 * Tokens DI (NestJS) de los subsistemas de IA reemplazables (Req. 35.3).
 *
 * Estos tokens identifican las INTERFACES ESTABLES `Servicio_NLP`,
 * `Servicio_Vision`, `Filtro_Relevancia` y `Capa_ML`. Tanto el FALLBACK
 * determinista en TypeScript (tareas 3.3/3.4) como el futuro cliente HTTP del
 * `Servicio_IA` (tarea 8.1) se registran bajo el MISMO token, de modo que el
 * `Pipeline_Analisis` los inyecta por contrato sin acoplarse a la
 * implementacion concreta (Req. 14.5, 15.4, 31.6, 34.6, 35.3).
 *
 * Se usan `symbol` unicos como tokens para evitar colisiones accidentales con
 * tokens string de otros proveedores del contenedor de inyeccion.
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`" y "Aislamiento y
 * reemplazabilidad".
 * _Requirements: 14.5, 15.4, 31.6, 34.6, 35.3_
 */

/** Token DI de la interfaz estable `Servicio_NLP` (Req. 14.5, 35.3). */
export const SERVICIO_NLP = Symbol("GDS:SERVICIO_NLP");

/** Token DI de la interfaz estable `Servicio_Vision` (Req. 15.4, 35.3). */
export const SERVICIO_VISION = Symbol("GDS:SERVICIO_VISION");

/** Token DI de la interfaz estable `Filtro_Relevancia` (Req. 34.6, 35.3). */
export const FILTRO_RELEVANCIA = Symbol("GDS:FILTRO_RELEVANCIA");

/**
 * Token DI de la interfaz estable `Capa_ML` (Req. 31.6, 35.3).
 *
 * Bajo este token se registra el FALLBACK determinista TS (tarea 3.4,
 * `CapaMlFallback`) y, mas adelante, el cliente HTTP del `Servicio_IA`
 * (`POST /embeddings`, `/clustering`, `/anomalias`, `/tendencias`,
 * `/score-calibrado`). Ambos cumplen la misma interfaz `CapaML` y son
 * intercambiables sin tocar el `Pipeline_Analisis`.
 */
export const CAPA_ML = Symbol("GDS:CAPA_ML");
