/**
 * Pruebas unitarias de la fachada de PUBLICACION del WS Hub
 * (`WsProgresoService`, tareas 24.1 / 24.2).
 *
 * Verifican que el motor de ciclos publica el progreso por el bus interno
 * (Event-Driven) SIN acoplarse al transporte WebSocket: emite el evento
 * `EVENTO_PROGRESO_GDS` con la carga util de orquestacion y completa el
 * `timestamp` cuando el llamador no lo aporta (Req. 18.6, 21.4).
 */
import type { EventEmitter2 } from '@nestjs/event-emitter';

import { EVENTO_PROGRESO_GDS, type ProgresoEvento } from './progreso.types';
import { WsProgresoService } from './ws-progreso.service';

/** Doble del bus de eventos: espia las emisiones. */
function fakeBus(): { bus: EventEmitter2; emit: jest.Mock } {
    const emit = jest.fn();
    return { bus: { emit } as unknown as EventEmitter2, emit };
}

describe('WsProgresoService (publicacion de progreso del WS Hub)', () => {
    it('publica EVENTO_PROGRESO_GDS con la carga util en el bus interno', () => {
        const { bus, emit } = fakeBus();
        const service = new WsProgresoService(bus);

        const evento: ProgresoEvento = {
            analisisId: 'a1',
            tipo: 'ciclo',
            semanaActual: 3,
            semanasProcesadas: 3,
            semanasPendientes: 21,
            estadoEjecucion: 'EN_EJECUCION',
            timestamp: 1700000000000,
        };
        service.publicarProgreso(evento);

        expect(emit).toHaveBeenCalledTimes(1);
        const [nombre, payload] = emit.mock.calls[0];
        expect(nombre).toBe(EVENTO_PROGRESO_GDS);
        expect(payload).toEqual(evento);
    });

    it('completa el timestamp cuando el llamador no lo aporta', () => {
        const { bus, emit } = fakeBus();
        const service = new WsProgresoService(bus);
        const antes = Date.now();

        service.publicarProgreso({ analisisId: 'a1', tipo: 'modo' });

        const [, payload] = emit.mock.calls[0] as [string, ProgresoEvento];
        expect(typeof payload.timestamp).toBe('number');
        expect(payload.timestamp as number).toBeGreaterThanOrEqual(antes);
    });

    it('respeta el timestamp explicito proporcionado por el llamador', () => {
        const { bus, emit } = fakeBus();
        const service = new WsProgresoService(bus);

        service.publicarProgreso({
            analisisId: 'a1',
            tipo: 'salto',
            timestamp: 42,
        });

        const [, payload] = emit.mock.calls[0] as [string, ProgresoEvento];
        expect(payload.timestamp).toBe(42);
    });

    it('preserva el analisisId que define la sala WS de entrega', () => {
        const { bus, emit } = fakeBus();
        const service = new WsProgresoService(bus);

        service.publicarProgreso({ analisisId: 'analisis-xyz', tipo: 'ciclo' });

        const [, payload] = emit.mock.calls[0] as [string, ProgresoEvento];
        expect(payload.analisisId).toBe('analisis-xyz');
    });
});
