// Pruebas de la lógica pura del cliente de control de ejecución del feature
// `gds` (modos, estados, acotado de intervalo, payload y reglas de
// habilitación). No tocan red ni DOM. Cubren Req. 32.1, 32.2, 32.5, 32.6.
import { describe, it, expect } from 'vitest';
import {
  MODOS_EJECUCION,
  ESTADOS_EJECUCION,
  INTERVALO_MIN_MS,
  INTERVALO_MAX_MS,
  INTERVALO_DEFECTO_MS,
  esModoValido,
  normalizeModo,
  clampIntervalo,
  modoPayload,
  puedeAvanzarManual,
  puedePausar,
  puedeReanudar,
  normalizeEstado,
  esNoDisponible,
} from './ejecucion.js';

describe('modos de ejecución (Req. 32.1)', () => {
  it('expone exactamente {AUTOMATICO, MANUAL, TIEMPO_REAL}', () => {
    expect(Object.values(MODOS_EJECUCION).sort()).toEqual(
      ['AUTOMATICO', 'MANUAL', 'TIEMPO_REAL'].sort()
    );
  });
});

describe('normalizeModo', () => {
  it('normaliza variantes de mayúsculas, espacios y guiones', () => {
    expect(normalizeModo('automatico')).toBe(MODOS_EJECUCION.AUTOMATICO);
    expect(normalizeModo('  Tiempo Real ')).toBe(MODOS_EJECUCION.TIEMPO_REAL);
    expect(normalizeModo('tiempo-real')).toBe(MODOS_EJECUCION.TIEMPO_REAL);
    expect(normalizeModo('realtime')).toBe(MODOS_EJECUCION.TIEMPO_REAL);
    expect(normalizeModo('MANUAL')).toBe(MODOS_EJECUCION.MANUAL);
  });

  it('cae a MANUAL ante un valor desconocido (no auto-avanza)', () => {
    expect(normalizeModo('???')).toBe(MODOS_EJECUCION.MANUAL);
    expect(normalizeModo(undefined)).toBe(MODOS_EJECUCION.MANUAL);
    expect(normalizeModo(null)).toBe(MODOS_EJECUCION.MANUAL);
  });
});

describe('esModoValido', () => {
  it('acepta los modos del dominio y sus sinónimos normalizables', () => {
    expect(esModoValido('AUTOMATICO')).toBe(true);
    expect(esModoValido('tiempo real')).toBe(true);
  });

  it('siempre verdadero porque normaliza a un modo válido', () => {
    // normalizeModo nunca produce un valor fuera del dominio.
    expect(esModoValido('cualquier-cosa')).toBe(true);
  });
});

describe('clampIntervalo (Req. 32.5)', () => {
  it('acota por debajo del mínimo', () => {
    expect(clampIntervalo(0)).toBe(INTERVALO_MIN_MS);
    expect(clampIntervalo(-100)).toBe(INTERVALO_MIN_MS);
  });

  it('acota por encima del máximo', () => {
    expect(clampIntervalo(INTERVALO_MAX_MS + 1)).toBe(INTERVALO_MAX_MS);
  });

  it('respeta valores dentro de rango y trunca decimales', () => {
    expect(clampIntervalo(5000)).toBe(5000);
    expect(clampIntervalo(1234.9)).toBe(1234);
  });

  it('cae al valor por defecto ante valores no numéricos', () => {
    expect(clampIntervalo('x')).toBe(INTERVALO_DEFECTO_MS);
    expect(clampIntervalo(undefined)).toBe(INTERVALO_DEFECTO_MS);
  });
});

describe('modoPayload (Req. 32.1, 32.5)', () => {
  it('incluye el intervalo solo en modo Tiempo_Real', () => {
    expect(modoPayload(MODOS_EJECUCION.TIEMPO_REAL, 3000)).toEqual({
      modo: MODOS_EJECUCION.TIEMPO_REAL,
      intervaloMs: 3000,
    });
  });

  it('omite el intervalo en modos Automático y Manual', () => {
    expect(modoPayload(MODOS_EJECUCION.AUTOMATICO, 3000)).toEqual({
      modo: MODOS_EJECUCION.AUTOMATICO,
    });
    expect(modoPayload(MODOS_EJECUCION.MANUAL)).toEqual({ modo: MODOS_EJECUCION.MANUAL });
  });

  it('acota el intervalo fuera de rango y aplica el defecto si es inválido', () => {
    expect(modoPayload(MODOS_EJECUCION.TIEMPO_REAL, 0).intervaloMs).toBe(INTERVALO_MIN_MS);
    expect(modoPayload(MODOS_EJECUCION.TIEMPO_REAL, 'x').intervaloMs).toBe(INTERVALO_DEFECTO_MS);
  });
});

describe('normalizeEstado', () => {
  it('normaliza estados del dominio y sinónimos', () => {
    expect(normalizeEstado('en_ejecucion')).toBe(ESTADOS_EJECUCION.EN_EJECUCION);
    expect(normalizeEstado('running')).toBe(ESTADOS_EJECUCION.EN_EJECUCION);
    expect(normalizeEstado('paused')).toBe(ESTADOS_EJECUCION.PAUSADO);
    expect(normalizeEstado('finalizado')).toBe(ESTADOS_EJECUCION.COMPLETADO);
  });

  it('cae a DETENIDO ante un valor desconocido', () => {
    expect(normalizeEstado('???')).toBe(ESTADOS_EJECUCION.DETENIDO);
    expect(normalizeEstado(undefined)).toBe(ESTADOS_EJECUCION.DETENIDO);
  });
});

describe('puedeAvanzarManual (Req. 32.2)', () => {
  it('solo en modo MANUAL y no completado', () => {
    expect(puedeAvanzarManual(MODOS_EJECUCION.MANUAL, ESTADOS_EJECUCION.DETENIDO)).toBe(true);
    expect(puedeAvanzarManual(MODOS_EJECUCION.MANUAL, ESTADOS_EJECUCION.EN_EJECUCION)).toBe(true);
  });

  it('no avanza si está completado o no es manual', () => {
    expect(puedeAvanzarManual(MODOS_EJECUCION.MANUAL, ESTADOS_EJECUCION.COMPLETADO)).toBe(false);
    expect(puedeAvanzarManual(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.DETENIDO)).toBe(false);
    expect(puedeAvanzarManual(MODOS_EJECUCION.TIEMPO_REAL, ESTADOS_EJECUCION.DETENIDO)).toBe(false);
  });
});

describe('puedePausar (Req. 32.6)', () => {
  it('solo modos continuos en ejecución', () => {
    expect(puedePausar(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.EN_EJECUCION)).toBe(true);
    expect(puedePausar(MODOS_EJECUCION.TIEMPO_REAL, ESTADOS_EJECUCION.EN_EJECUCION)).toBe(true);
  });

  it('no pausa en modo manual ni fuera de ejecución', () => {
    expect(puedePausar(MODOS_EJECUCION.MANUAL, ESTADOS_EJECUCION.EN_EJECUCION)).toBe(false);
    expect(puedePausar(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.PAUSADO)).toBe(false);
    expect(puedePausar(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.DETENIDO)).toBe(false);
  });
});

describe('puedeReanudar (Req. 32.6, 32.8)', () => {
  it('solo modos continuos estando pausado', () => {
    expect(puedeReanudar(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.PAUSADO)).toBe(true);
    expect(puedeReanudar(MODOS_EJECUCION.TIEMPO_REAL, ESTADOS_EJECUCION.PAUSADO)).toBe(true);
  });

  it('no reanuda en modo manual ni si no está pausado', () => {
    expect(puedeReanudar(MODOS_EJECUCION.MANUAL, ESTADOS_EJECUCION.PAUSADO)).toBe(false);
    expect(puedeReanudar(MODOS_EJECUCION.AUTOMATICO, ESTADOS_EJECUCION.EN_EJECUCION)).toBe(false);
  });
});

describe('esNoDisponible (tolerancia a endpoints aún no implementados)', () => {
  it('trata 404 y 501 como no disponible', () => {
    expect(esNoDisponible({ response: { status: 404 } })).toBe(true);
    expect(esNoDisponible({ response: { status: 501 } })).toBe(true);
  });

  it('trata fallos de red (sin respuesta) como no disponible', () => {
    expect(esNoDisponible({ request: {} })).toBe(true);
    expect(esNoDisponible({ code: 'ERR_NETWORK' })).toBe(true);
  });

  it('no oculta errores con respuesta significativa (401/403/422)', () => {
    expect(esNoDisponible({ response: { status: 401 } })).toBe(false);
    expect(esNoDisponible({ response: { status: 403 } })).toBe(false);
    expect(esNoDisponible({ response: { status: 422 } })).toBe(false);
  });
});
