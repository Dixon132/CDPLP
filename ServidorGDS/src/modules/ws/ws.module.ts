import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module';
import { ProgresoGateway } from './progreso.gateway';
import { WsProgresoService } from './ws-progreso.service';

/**
 * Modulo `ws` — WS Hub de progreso en vivo (tarea 24.1).
 *
 * Cablea:
 *  - `ProgresoGateway`: gateway WebSocket (socket.io) con handshake fail-closed
 *    que valida el JWT del colegio reutilizando el `ServicioAutenticacionService`
 *    del modulo `authentication` (tarea 19.1) y reenvia el progreso por sala de
 *    `Analisis`.
 *  - `WsProgresoService`: fachada de publicacion (Event-Driven) que el motor de
 *    ciclos usa para emitir progreso sin acoplarse al transporte WS. Se exporta
 *    para que los modulos de orquestacion (scheduler, gestor) lo inyecten.
 *
 * Importa `AuthenticationModule` (que exporta `ServicioAutenticacionService`) y
 * depende del `EventsModule` global para el bus de eventos interno.
 *
 * _Requirements: 18.6, 21.4, 24.1, 24.7, 24.8_
 */
@Module({
    imports: [AuthenticationModule],
    providers: [ProgresoGateway, WsProgresoService],
    exports: [WsProgresoService],
})
export class WsModule { }
