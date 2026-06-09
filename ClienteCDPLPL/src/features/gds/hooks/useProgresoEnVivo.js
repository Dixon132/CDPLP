// Hook de progreso en vivo de la Plataforma_GDS (Req. 21.4, 18.6) — tarea 26.9.
//
// Abre una conexión socket.io al WS Hub del backend autónomo (namespace
// `gds/progreso`, tarea 24.1) con el JWT del colegio en el handshake, se
// suscribe a las salas (`analisisId`) que se le indiquen y mantiene un mapa con
// el último progreso conocido por análisis. Degrada con elegancia: si el WS no
// está disponible (sin URL, sin token, conexión caída), el hook devuelve un
// estado `no-disponible`/`desconectado` y el mapa que tenga, sin romper la
// pantalla principal.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import { createGdsProgresoSocket } from '../api/ws.js';

/**
 * Normaliza la lista de IDs de análisis a suscribir a un array estable de
 * strings únicos, descartando vacíos.
 * @param {unknown} analisisIds
 * @returns {string[]}
 */
function normalizarIds(analisisIds) {
  if (analisisIds == null) return [];
  const arr = Array.isArray(analisisIds) ? analisisIds : [analisisIds];
  const set = new Set();
  for (const id of arr) {
    if (id == null) continue;
    const clave = String(id).trim();
    if (clave) set.add(clave);
  }
  return Array.from(set).sort();
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.habilitado=true] Permite desactivar la suscripción.
 * @param {string|string[]} [opts.analisisIds] `Analisis` a los que suscribirse para recibir su progreso.
 * @param {string} [opts.url] URL WS explícita (se resuelve de la config si se omite).
 * @param {string} [opts.token] JWT explícito (se lee de `localStorage` si se omite).
 * @param {(url: string, opciones: object) => object} [opts.ioImpl] Fábrica socket.io inyectable (pruebas).
 * @returns {{
 *   estadoConexion: 'inactivo'|'conectando'|'conectado'|'desconectado'|'no-disponible',
 *   progresoPorAnalisis: Record<string, object>,
 *   ultimoProgreso: object|null,
 * }}
 */
export function useProgresoEnVivo(opts = {}) {
  const { habilitado = true, url, token, ioImpl } = opts;
  const [estadoConexion, setEstadoConexion] = useState('inactivo');
  const [progresoPorAnalisis, setProgresoPorAnalisis] = useState({});
  const [ultimoProgreso, setUltimoProgreso] = useState(null);
  const handleRef = useRef(null);

  // Lista estable de IDs (clave de dependencia serializada) para evitar
  // re-suscripciones por identidad de array distinta en cada render.
  const ids = useMemo(() => normalizarIds(opts.analisisIds), [opts.analisisIds]);
  const idsKey = ids.join('|');

  const onProgreso = useCallback((p) => {
    setUltimoProgreso(p);
    const clave = p?.analisisId != null ? String(p.analisisId) : null;
    if (clave) {
      setProgresoPorAnalisis((prev) => ({ ...prev, [clave]: p }));
    }
  }, []);

  // Conexión: se (re)crea solo cuando cambian habilitado/url/token/impl.
  useEffect(() => {
    if (!habilitado) {
      setEstadoConexion('inactivo');
      return undefined;
    }

    const handle = createGdsProgresoSocket({
      url,
      token,
      ioImpl,
      onProgreso,
      onEstado: setEstadoConexion,
    });
    handleRef.current = handle;

    return () => {
      try { handle.close(); } catch { /* ignorar */ }
      handleRef.current = null;
    };
  }, [habilitado, url, token, ioImpl, onProgreso]);

  // Suscripciones: se reconcilian cuando cambia el conjunto de IDs (o tras
  // recrear la conexión). El handle reenvía las salas al (re)conectar.
  useEffect(() => {
    const handle = handleRef.current;
    if (!habilitado || !handle) return undefined;

    for (const id of ids) {
      handle.suscribir(id);
    }

    return () => {
      const actual = handleRef.current;
      if (!actual) return;
      for (const id of ids) {
        actual.desuscribir(id);
      }
    };
    // `idsKey` representa el contenido de `ids`; `estadoConexion` reintenta la
    // suscripción tras una reconexión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, idsKey, estadoConexion]);

  return { estadoConexion, progresoPorAnalisis, ultimoProgreso };
}

export default useProgresoEnVivo;
