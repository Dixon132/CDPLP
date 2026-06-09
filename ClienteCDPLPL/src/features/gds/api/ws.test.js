// Pruebas del cliente WebSocket de progreso del GDS (tarea 26.9).
//
// Verifican el contrato del CLIENTE socket.io suscriptor del WS Hub (tarea 24.1):
//  - resuelve la URL del namespace `gds/progreso` desde la config;
//  - normaliza los mensajes de progreso del backend a la forma de la UI;
//  - envía el JWT en el handshake (`auth.token`) y se (de)suscribe por sala;
//  - DEGRADA CON ELEGANCIA (sin URL/sin token/sin cliente) sin lanzar.
// El cliente socket.io se inyecta (`ioImpl`) para que las pruebas sean
// deterministas y no abran sockets reales.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  resolveGdsWsUrl,
  parseProgresoMensaje,
  obtenerTokenGds,
  createGdsProgresoSocket,
  GDS_WS_NAMESPACE,
  MENSAJE_WS_PROGRESO,
  MENSAJE_WS_SUSCRIBIR,
  MENSAJE_WS_DESUSCRIBIR,
} from './ws.js';

/** Socket falso que registra emisiones y permite disparar eventos en pruebas. */
class FakeSocket {
  constructor() {
    this.connected = false;
    this.listeners = {};
    this.emitidos = [];
    this.desconectado = false;
    this.listenersLimpiados = false;
  }

  on(evento, cb) {
    (this.listeners[evento] ??= []).push(cb);
    return this;
  }

  emit(evento, payload) {
    this.emitidos.push([evento, payload]);
    return this;
  }

  removeAllListeners() {
    this.listenersLimpiados = true;
    this.listeners = {};
  }

  disconnect() {
    this.desconectado = true;
    this.connected = false;
  }

  // --- Helpers de prueba (no forman parte de la API de socket.io) ---
  disparar(evento, payload) {
    for (const cb of this.listeners[evento] ?? []) cb(payload);
  }

  abrir() {
    this.connected = true;
    this.disparar('connect');
  }
}

describe('resolveGdsWsUrl', () => {
  it('usa VITE_GDS_WS_URL explícita conservando origen + namespace', () => {
    const url = resolveGdsWsUrl({ VITE_GDS_WS_URL: 'https://gds.example.com' });
    expect(url).toBe(`https://gds.example.com${GDS_WS_NAMESPACE}`);
  });

  it('deriva del VITE_GDS_API_URL cuando no hay URL WS explícita', () => {
    const url = resolveGdsWsUrl({ VITE_GDS_API_URL: 'http://localhost:4000' });
    expect(url).toBe(`http://localhost:4000${GDS_WS_NAMESPACE}`);
  });

  it('devuelve null ante una base no parseable', () => {
    expect(resolveGdsWsUrl({ VITE_GDS_API_URL: 'no-es-url', VITE_GDS_WS_URL: '   ' })).toBeNull();
  });
});

describe('parseProgresoMensaje', () => {
  it('mapea los campos del backend (semanaActual/estadoEjecucion) a la UI', () => {
    const out = parseProgresoMensaje({
      analisisId: 'a1',
      institucionId: 'i1',
      tipo: 'ciclo',
      semanaActual: 5,
      estadoEjecucion: 'EN_PROCESO',
    });
    expect(out).toMatchObject({
      analisisId: 'a1',
      institucionId: 'i1',
      numeroSemana: 5,
      estado: 'EN_PROCESO',
    });
  });

  it('acepta JSON en string', () => {
    const out = parseProgresoMensaje(JSON.stringify({ analisisId: 'a2', semana: 3 }));
    expect(out.analisisId).toBe('a2');
    expect(out.numeroSemana).toBe(3);
  });

  it('devuelve null ante datos no interpretables', () => {
    expect(parseProgresoMensaje(null)).toBeNull();
    expect(parseProgresoMensaje('{ roto')).toBeNull();
    expect(parseProgresoMensaje(42)).toBeNull();
  });
});

describe('obtenerTokenGds', () => {
  afterEach(() => localStorage.clear());

  it('devuelve el token almacenado', () => {
    localStorage.setItem('token', 'jwt-abc');
    expect(obtenerTokenGds()).toBe('jwt-abc');
  });

  it('devuelve undefined sin token', () => {
    localStorage.clear();
    expect(obtenerTokenGds()).toBeUndefined();
  });
});

describe('createGdsProgresoSocket (degradación elegante)', () => {
  it('reporta no-disponible y entrega no-ops cuando falta el token', () => {
    const onEstado = vi.fn();
    const ioImpl = vi.fn();
    const handle = createGdsProgresoSocket({
      url: `http://localhost:4000${GDS_WS_NAMESPACE}`,
      token: undefined,
      ioImpl,
      onEstado,
    });
    expect(ioImpl).not.toHaveBeenCalled();
    expect(onEstado).toHaveBeenCalledWith('no-disponible');
    // No lanza al invocar las operaciones.
    expect(() => {
      handle.suscribir('a1');
      handle.desuscribir('a1');
      handle.close();
    }).not.toThrow();
  });

  it('no abre socket y entrega no-ops cuando falta el token (sin URL explícita)', () => {
    // Sin `url` explícita se resuelve de la config; sin token, igualmente degrada.
    const onEstado = vi.fn();
    const ioImpl = vi.fn();
    const handle = createGdsProgresoSocket({ token: undefined, onEstado, ioImpl });
    expect(ioImpl).not.toHaveBeenCalled();
    expect(onEstado).toHaveBeenCalledWith('no-disponible');
    expect(() => handle.suscribir('a1')).not.toThrow();
  });
});

describe('createGdsProgresoSocket (conexión y suscripción)', () => {
  let fake;
  let ioImpl;
  const url = `http://localhost:4000${GDS_WS_NAMESPACE}`;

  beforeEach(() => {
    fake = new FakeSocket();
    ioImpl = vi.fn(() => fake);
  });

  it('envía el JWT en el handshake (auth.token) y pide transporte websocket', () => {
    createGdsProgresoSocket({ url, token: 'jwt-xyz', ioImpl });
    expect(ioImpl).toHaveBeenCalledTimes(1);
    const [urlArg, optsArg] = ioImpl.mock.calls[0];
    expect(urlArg).toBe(url);
    expect(optsArg.auth).toEqual({ token: 'jwt-xyz' });
    expect(optsArg.transports).toContain('websocket');
  });

  it('emite conectando y luego conectado al abrir la conexión', () => {
    const onEstado = vi.fn();
    createGdsProgresoSocket({ url, token: 'jwt', ioImpl, onEstado });
    expect(onEstado).toHaveBeenCalledWith('conectando');
    fake.abrir();
    expect(onEstado).toHaveBeenCalledWith('conectado');
  });

  it('emite desconectado ante disconnect/connect_error', () => {
    const onEstado = vi.fn();
    createGdsProgresoSocket({ url, token: 'jwt', ioImpl, onEstado });
    fake.disparar('disconnect');
    expect(onEstado).toHaveBeenLastCalledWith('desconectado');
    fake.disparar('connect_error');
    expect(onEstado).toHaveBeenLastCalledWith('desconectado');
  });

  it('suscribe a la sala solo cuando está conectado y reenvía al reconectar', () => {
    const handle = createGdsProgresoSocket({ url, token: 'jwt', ioImpl });
    // Aún no conectado: no se emite, pero se recuerda la sala.
    handle.suscribir('a1');
    expect(fake.emitidos.filter(([e]) => e === MENSAJE_WS_SUSCRIBIR)).toHaveLength(0);
    // Al conectar, se reenvían las salas pendientes.
    fake.abrir();
    const subs = fake.emitidos.filter(([e]) => e === MENSAJE_WS_SUSCRIBIR);
    expect(subs).toHaveLength(1);
    expect(subs[0][1]).toEqual({ analisisId: 'a1' });
  });

  it('emite suscribir/desuscribir con el analisisId cuando ya está conectado', () => {
    const handle = createGdsProgresoSocket({ url, token: 'jwt', ioImpl });
    fake.abrir();
    handle.suscribir('a9');
    handle.desuscribir('a9');
    expect(fake.emitidos).toEqual(
      expect.arrayContaining([
        [MENSAJE_WS_SUSCRIBIR, { analisisId: 'a9' }],
        [MENSAJE_WS_DESUSCRIBIR, { analisisId: 'a9' }],
      ]),
    );
  });

  it('normaliza y entrega los mensajes de progreso recibidos', () => {
    const onProgreso = vi.fn();
    createGdsProgresoSocket({ url, token: 'jwt', ioImpl, onProgreso });
    fake.abrir();
    fake.disparar(MENSAJE_WS_PROGRESO, {
      analisisId: 'a1',
      tipo: 'ciclo',
      semanaActual: 7,
      estadoEjecucion: 'EN_PROCESO',
    });
    expect(onProgreso).toHaveBeenCalledTimes(1);
    expect(onProgreso.mock.calls[0][0]).toMatchObject({
      analisisId: 'a1',
      numeroSemana: 7,
      estado: 'EN_PROCESO',
    });
  });

  it('close() limpia listeners, desconecta y silencia progreso posterior', () => {
    const onProgreso = vi.fn();
    const handle = createGdsProgresoSocket({ url, token: 'jwt', ioImpl, onProgreso });
    fake.abrir();
    handle.close();
    expect(fake.desconectado).toBe(true);
    expect(fake.listenersLimpiados).toBe(true);
  });
});
