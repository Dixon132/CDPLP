/**
 * `WsProgresoService` — fachada de PUBLICACION de progreso del WS Hub (tarea 24.1).
 *
 * Es la "forma de publicar eventos de progreso" que el resto del backend (motor
 * de ciclos `procesarSemana`, `GestorEjecucion`, `Herramienta_Aceleracion`,
 * `Programador_Temporal`) usa para reportar el avance de un `Analisis` SIN
 * conocer el transporte WebSocket: solo emite el evento interno
 * `EVENTO_PROGRESO_GDS` por el bus Event-Driven (`EventEmitter2`).
 *
 * El `ProgresoGateway` consume ese evento y lo reenvia por WS a la sala del
 * `Analisis`. Este desacople permite probar el motor de ciclos sin red ni
 * sockets y mantener el WS Hub como un detalle de infraestructura sustituible.
 *
 * _Requirements: 18.6, 21.4_
 */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EVENTO_PROGRESO_GDS, type ProgresoEvento } from './progreso.types';

@Injectable()
export class WsProgresoService {
    constructor(private readonly eventos: EventEmitter2) { }

    /**
     * Publica un evento de progreso de un `Analisis`. Completa el `timestamp` si
     * el llamador no lo aporta y lo emite por el bus interno; el `ProgresoGateway`
     * lo entrega por WebSockets a los clientes suscritos y autorizados.
     */
    publicarProgreso(evento: ProgresoEvento): void {
        const conMarca: ProgresoEvento = {
            ...evento,
            timestamp: evento.timestamp ?? Date.now(),
        };
        this.eventos.emit(EVENTO_PROGRESO_GDS, conMarca);
    }
}
