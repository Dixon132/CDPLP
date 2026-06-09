/**
 * Modulo `ws` — WS Hub (progreso en vivo via WebSockets).
 *
 * Exporta la superficie publica del WS Hub: el modulo NestJS, el gateway, la
 * fachada de publicacion y el contrato de eventos de progreso (tarea 24.1).
 */
export const MODULE_NAME = 'ws' as const;

export { WsModule } from './ws.module';
export { ProgresoGateway, NAMESPACE_PROGRESO } from './progreso.gateway';
export { WsProgresoService } from './ws-progreso.service';
export {
    EVENTO_PROGRESO_GDS,
    MENSAJE_WS_PROGRESO,
    MENSAJE_WS_SUSCRIBIR,
    MENSAJE_WS_DESUSCRIBIR,
    salaAnalisis,
    type ProgresoEvento,
    type TipoProgreso,
} from './progreso.types';
