// Pruebas del hook de progreso en vivo (tarea 26.9).
//
// Verifican el contrato de `useProgresoEnVivo`: respeta `habilitado`, abre la
// conexión socket.io con el JWT en el handshake, se suscribe a las salas
// (`analisisId`) indicadas, acumula el progreso recibido por análisis y refleja
// el estado de conexión. La fábrica socket.io se inyecta (`ioImpl`) para que las
// pruebas sean deterministas y no abran sockets reales.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useProgresoEnVivo } from './useProgresoEnVivo.js';

/** Socket falso que registra emisiones y permite disparar eventos en pruebas. */
class FakeSocket {
    constructor() {
        this.connected = false;
        this.listeners = {};
        this.emitidos = [];
    }
    on(evento, cb) { (this.listeners[evento] ??= []).push(cb); return this; }
    emit(evento, payload) { this.emitidos.push([evento, payload]); return this; }
    removeAllListeners() { this.listeners = {}; }
    disconnect() { this.connected = false; }
    disparar(evento, payload) { for (const cb of this.listeners[evento] ?? []) cb(payload); }
    abrir() { this.connected = true; this.disparar('connect'); }
}

describe('useProgresoEnVivo', () => {
    beforeEach(() => {
        localStorage.setItem('token', 'jwt-test');
    });
    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('permanece inactivo y no conecta cuando está deshabilitado', () => {
        const ioImpl = vi.fn();
        const { result } = renderHook(() =>
            useProgresoEnVivo({ habilitado: false, ioImpl, url: 'http://localhost:4000/gds/progreso' }),
        );
        expect(result.current.estadoConexion).toBe('inactivo');
        expect(ioImpl).not.toHaveBeenCalled();
    });

    it('conecta con el JWT en el handshake y refleja el estado conectado', async () => {
        const fake = new FakeSocket();
        const ioImpl = vi.fn(() => fake);
        const { result } = renderHook(() =>
            useProgresoEnVivo({ ioImpl, url: 'http://localhost:4000/gds/progreso' }),
        );
        expect(ioImpl).toHaveBeenCalledTimes(1);
        expect(ioImpl.mock.calls[0][1].auth).toEqual({ token: 'jwt-test' });

        act(() => fake.abrir());
        await waitFor(() => expect(result.current.estadoConexion).toBe('conectado'));
    });

    it('se suscribe a las salas indicadas y acumula el progreso por análisis', async () => {
        const fake = new FakeSocket();
        const ioImpl = vi.fn(() => fake);
        const { result } = renderHook(() =>
            useProgresoEnVivo({
                ioImpl,
                url: 'http://localhost:4000/gds/progreso',
                analisisIds: ['a1', 'a2'],
            }),
        );

        act(() => fake.abrir());

        const subs = fake.emitidos.filter(([e]) => e === 'suscribir').map(([, p]) => p.analisisId);
        expect(subs).toEqual(expect.arrayContaining(['a1', 'a2']));

        act(() => {
            fake.disparar('progreso', { analisisId: 'a1', tipo: 'ciclo', semanaActual: 4, estadoEjecucion: 'EN_PROCESO' });
        });

        await waitFor(() => {
            expect(result.current.progresoPorAnalisis.a1).toMatchObject({ numeroSemana: 4, estado: 'EN_PROCESO' });
            expect(result.current.ultimoProgreso).toMatchObject({ analisisId: 'a1' });
        });
    });

    it('degrada con elegancia (no-disponible) cuando no hay token', () => {
        localStorage.clear();
        const ioImpl = vi.fn();
        const { result } = renderHook(() =>
            useProgresoEnVivo({ ioImpl, url: 'http://localhost:4000/gds/progreso' }),
        );
        expect(ioImpl).not.toHaveBeenCalled();
        expect(result.current.estadoConexion).toBe('no-disponible');
    });

    it('cierra la conexión al desmontar', () => {
        const fake = new FakeSocket();
        const disconnectSpy = vi.spyOn(fake, 'disconnect');
        const ioImpl = vi.fn(() => fake);
        const { unmount } = renderHook(() =>
            useProgresoEnVivo({ ioImpl, url: 'http://localhost:4000/gds/progreso' }),
        );
        unmount();
        expect(disconnectSpy).toHaveBeenCalled();
    });
});
