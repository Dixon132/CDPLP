/**
 * Provider FALLBACK determinista del `Servicio_Vision` (Req. 15, 35.3).
 *
 * Reposiciona la implementacion mock determinista TS previa
 * ({@link ServicioVisionMock}) como un provider NestJS inyectable bajo el token
 * estable {@link SERVICIO_VISION}. NO es el motor de vision primario (ese es el
 * `Vision_Engine` del `Servicio_IA`, consumido por HTTP en la tarea 8.1): sirve
 * como DEGRADACION SEGURA y como doble determinista para pruebas (Req. 35).
 *
 * Cumple la misma interfaz estable `Servicio_Vision` (entrada
 * `image_description`, salida `{ scene, objects[], emotion_context }`) que
 * implementara el cliente HTTP, de modo que ambos son intercambiables sin tocar
 * el `Pipeline_Analisis` (Req. 15.4).
 *
 * _Requirements: 15.1, 15.2, 15.3, 15.4, 35.3_
 */
import { Injectable } from "@nestjs/common";

import {
    ServicioVisionMock,
    type ServicioVision,
} from "../../modules/analisis/servicioVision";

/**
 * Fallback determinista del `Servicio_Vision`, inyectable en el contenedor DI.
 *
 * Hereda toda la logica pura de {@link ServicioVisionMock}; el decorador
 * `@Injectable()` solo habilita su registro como provider bajo el token
 * {@link SERVICIO_VISION}.
 */
@Injectable()
export class ServicioVisionFallback
    extends ServicioVisionMock
    implements ServicioVision { }
