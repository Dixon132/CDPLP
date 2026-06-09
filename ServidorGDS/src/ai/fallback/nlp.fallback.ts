/**
 * Provider FALLBACK determinista del `Servicio_NLP` (Req. 14, 35.3).
 *
 * Reposiciona la implementacion base/heuristica TS previa
 * ({@link ServicioNLPBase}) como un provider NestJS inyectable bajo el token
 * estable {@link SERVICIO_NLP}. NO es el cerebro primario (ese es el
 * `Servicio_IA` en Python, consumido por HTTP en la tarea 8.1): sirve como
 * DEGRADACION SEGURA cuando el `Servicio_IA` no esta disponible y como doble
 * determinista para pruebas (Req. 35).
 *
 * Cumple la misma interfaz estable `Servicio_NLP` que implementara el cliente
 * HTTP, de modo que ambos son intercambiables sin tocar el `Pipeline_Analisis`
 * (Req. 14.5).
 *
 * _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 35.3_
 */
import { Injectable } from "@nestjs/common";

import {
    ServicioNLPBase,
    type ServicioNLP,
} from "../../modules/analisis/servicioNLP";

/**
 * Fallback determinista del `Servicio_NLP`, inyectable en el contenedor DI.
 *
 * Hereda toda la logica pura de {@link ServicioNLPBase}; el decorador
 * `@Injectable()` solo habilita su registro como provider bajo el token
 * {@link SERVICIO_NLP}.
 */
@Injectable()
export class ServicioNlpFallback extends ServicioNLPBase implements ServicioNLP { }
