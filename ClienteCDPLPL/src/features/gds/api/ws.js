// Cliente WebSocket del feature `gds` (progreso en vivo) — tarea 26.9.
//
// La Plataforma_GDS refleja el avance de cada `Analisis` en tiempo real
// (Req. 21.4, 18.6) mediante el WS Hub del backend autónomo `ServidorGDS/`.
// Ese hub (tarea 24.1) es un gateway **socket.io** montado en el namespace
// `gds/progreso`, valida el JWT del colegio en el handshake (fail-closed) y solo
// entrega progreso de los `Analisis` a los que el cliente se SUSCRIBE estando
// autenticado.
//
// Este módulo es únicamente el CLIENTE suscriptor y está diseñado para DEGRADAR
// CON ELEGANCIA: si la URL no es válida, no hay token, no se puede cargar el
// cliente socket.io, o la conexión falla/cae, la pantalla principal sigue
// funcionando con los datos cargados por HTTP.
import { io } from 'socket.io-client';

import { GDS_API_URL } from './client.js';

// Namespace socket.io del WS Hub de progreso (debe coincidir con el backend,
// `NAMESPACE_PROGRESO = 'gds/progreso'`; socket.io lo expone como `/gds/progreso`).
export const GDS_WS_NAMESPACE = '/gds/progreso';

// Nombres de eventos/mensajes del contrato del hub (tarea 24.1).
export const MENSAJE_WS_PROGRESO = 'progreso';
export const MENSAJE_WS_SUSCRIBIR = 'suscribir';
export const MENSAJE_WS_DESUSCRIBIR = 'desuscribir';

/**
 * Resuelve la URL base del WebSocket de progreso (origen + namespace) a partir
 * de la configuración.
 *
 * Orden de preferencia:
 *  1. `VITE_GDS_WS_URL` explícita (origen http(s); socket.io negocia el upgrade
 *     a ws/wss), si está definida.
 *  2. Derivada de `VITE_GDS_API_URL` (vía `GDS_API_URL`): se conserva el origen
 *     (protocolo + host) y se añade el namespace del hub.
 *
 * socket.io-client acepta una URL http(s); no es necesario convertir el esquema
 * a ws://. Devuelve `null` si no se puede construir una URL válida (degradación).
 *
 * @param {object} [env] Entorno inyectable (para pruebas). Por defecto usa
 *   `import.meta.env`.
 * @returns {string|null}
 */
export function resolveGdsWsUrl(env) {
  const e = env ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined) ?? {};

  // 1. URL explícita.
  const explicit = e.VITE_GDS_WS_URL;
  let base;
  if (typeof explicit === 'string' && explicit.trim()) {
    base = explicit.trim();
  } else {
    // 2. Derivar del HTTP base configurable.
    base = (typeof e.VITE_GDS_API_URL === 'string' && e.VITE_GDS_API_URL.trim())
      ? e.VITE_GDS_API_URL.trim()
      : GDS_API_URL;
  }

  if (typeof base !== 'string' || !base.trim()) return null;

  try {
    const u = new URL(base);
    // Conservar solo el origen (protocolo + host) y añadir el namespace del hub.
    return `${u.protocol}//${u.host}${GDS_WS_NAMESPACE}`;
  } catch {
    return null;
  }
}

/**
 * Lee el JWT del colegio almacenado (mismo token usado por el cliente HTTP del
 * GDS). Devuelve `undefined` si no hay token o no hay `localStorage`.
 * @returns {string|undefined}
 */
export function obtenerTokenGds() {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const token = localStorage.getItem('token');
    return token && token.trim() ? token : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Crea y gestiona una conexión socket.io al hub de progreso del GDS.
 *
 * Es tolerante a fallos: nunca lanza si el WS no está disponible. Devuelve
 * siempre un manejador con `suscribir`/`desuscribir`/`close`; si no se pudo
 * iniciar la conexión (sin URL, sin token, sin cliente socket.io), las llamadas
 * son no-op y se notifica el estado `no-disponible` (degradación elegante).
 *
 * El JWT se envía en el handshake (`auth.token`), tal como espera el gateway
 * fail-closed del backend (tarea 24.1).
 *
 * @param {object} opts
 * @param {(progreso: object) => void} [opts.onProgreso] Mensaje de progreso normalizado.
 * @param {(estado: 'conectando'|'conectado'|'desconectado'|'no-disponible') => void} [opts.onEstado]
 * @param {string} [opts.url] URL explícita (si se omite, se resuelve de la config).
 * @param {string} [opts.token] JWT explícito (si se omite, se lee de `localStorage`).
 * @param {(url: string, opciones: object) => object} [opts.ioImpl] Fábrica socket.io inyectable (pruebas).
 * @returns {{
 *   suscribir: (analisisId: string) => void,
 *   desuscribir: (analisisId: string) => void,
 *   close: () => void,
 *   url: string|null,
 * }}
 */
export function createGdsProgresoSocket(opts = {}) {
  const { onProgreso, onEstado } = opts;
  const url = opts.url ?? resolveGdsWsUrl();
  const token = opts.token ?? obtenerTokenGds();
  const crearSocket = typeof opts.ioImpl === 'function' ? opts.ioImpl : io;

  let cerrado = false;
  const noop = { suscribir: () => {}, desuscribir: () => {}, close: () => {}, url: url ?? null };

  const emitirEstado = (estado) => {
    if (cerrado) return;
    if (typeof onEstado === 'function') {
      try { onEstado(estado); } catch { /* no propagar errores de UI */ }
    }
  };

  // Sin URL válida, sin token, o sin cliente socket.io → degradar silenciosamente.
  if (!url || !token || typeof crearSocket !== 'function') {
    emitirEstado('no-disponible');
    return noop;
  }

  let socket = null;
  try {
    emitirEstado('conectando');
    socket = crearSocket(url, {
      // JWT del colegio en el handshake (claim `auth.token`, fail-closed).
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });
  } catch {
    // Cualquier excepción al construir el socket → degradación.
    emitirEstado('no-disponible');
    return noop;
  }

  if (!socket || typeof socket.on !== 'function') {
    emitirEstado('no-disponible');
    return noop;
  }

  // Salas (analisisId) suscritas; se reenvían al (re)conectar para sobrevivir a
  // reconexiones automáticas de socket.io.
  const salas = new Set();

  const reenviarSuscripciones = () => {
    if (cerrado || typeof socket.emit !== 'function') return;
    for (const analisisId of salas) {
      try { socket.emit(MENSAJE_WS_SUSCRIBIR, { analisisId }); } catch { /* ignorar */ }
    }
  };

  socket.on('connect', () => {
    emitirEstado('conectado');
    reenviarSuscripciones();
  });
  socket.on('disconnect', () => emitirEstado('desconectado'));
  socket.on('connect_error', () => emitirEstado('desconectado'));
  // El gateway emite `error` y desconecta ante un handshake no autorizado.
  socket.on('error', () => emitirEstado('desconectado'));

  socket.on(MENSAJE_WS_PROGRESO, (data) => {
    if (cerrado || typeof onProgreso !== 'function') return;
    const parsed = parseProgresoMensaje(data);
    if (parsed) {
      try { onProgreso(parsed); } catch { /* aislar errores de UI */ }
    }
  });

  return {
    url,
    suscribir: (analisisId) => {
      if (cerrado || analisisId == null) return;
      const clave = String(analisisId);
      salas.add(clave);
      try {
        if (socket.connected) socket.emit(MENSAJE_WS_SUSCRIBIR, { analisisId: clave });
      } catch { /* ignorar */ }
    },
    desuscribir: (analisisId) => {
      if (analisisId == null) return;
      const clave = String(analisisId);
      salas.delete(clave);
      if (cerrado) return;
      try {
        if (socket.connected) socket.emit(MENSAJE_WS_DESUSCRIBIR, { analisisId: clave });
      } catch { /* ignorar */ }
    },
    close: () => {
      cerrado = true;
      salas.clear();
      try {
        if (typeof socket.removeAllListeners === 'function') socket.removeAllListeners();
        if (typeof socket.disconnect === 'function') socket.disconnect();
        else if (typeof socket.close === 'function') socket.close();
      } catch { /* ignorar */ }
    },
  };
}

/**
 * Normaliza de forma tolerante un mensaje de progreso del hub a la forma usada
 * por la UI; devuelve `null` ante mensajes no interpretables.
 *
 * El backend (`ProgresoEvento`, tarea 24.1) usa `semanaActual`/`estadoEjecucion`;
 * la UI (`EstadosEjecucion`) lee `numeroSemana`/`estado`. Aquí se mapean ambos
 * y se aceptan alias snake_case/cortos por robustez.
 *
 * Forma normalizada:
 *   { analisisId, institucionId, numeroSemana, estado, ...resto }
 *
 * @param {unknown} data
 * @returns {object|null}
 */
export function parseProgresoMensaje(data) {
  if (data == null) return null;
  let obj = data;
  if (typeof data === 'string') {
    try { obj = JSON.parse(data); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;
  const analisisId = obj.analisisId ?? obj.analisis_id ?? obj.A ?? null;
  const institucionId = obj.institucionId ?? obj.institucion_id ?? obj.I ?? null;
  const numeroSemana =
    obj.numeroSemana ?? obj.semanaActual ?? obj.numero_semana ?? obj.semana_actual ?? obj.N ?? obj.semana ?? null;
  const estado = obj.estado ?? obj.estadoEjecucion ?? obj.estado_ejecucion ?? obj.status ?? null;
  return { ...obj, analisisId, institucionId, numeroSemana, estado };
}

export default {
  GDS_WS_NAMESPACE,
  MENSAJE_WS_PROGRESO,
  MENSAJE_WS_SUSCRIBIR,
  MENSAJE_WS_DESUSCRIBIR,
  resolveGdsWsUrl,
  obtenerTokenGds,
  createGdsProgresoSocket,
  parseProgresoMensaje,
};
