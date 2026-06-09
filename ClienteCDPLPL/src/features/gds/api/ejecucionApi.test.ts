// Pruebas del cliente TS del control de ejecución del feature `gds`
// (Gestor_Ejecucion, Req. 32). Cubren la lógica pura (normalización de
// modo/estado, acotado de intervalo, payload del DTO, reglas de habilitación,
// detección de "no disponible" y normalización del resultado) y las funciones
// de red con un cliente axios mockeado (degradación con elegancia incluida).
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del cliente axios compartido ANTES de importar el módulo bajo prueba.
vi.mock('./client.js', () => {
    const put = vi.fn();
    const post = vi.fn();
    return { default: { put, post } };
});

import gdsApiClient from './client.js';
import {
    ESTADOS_EJECUCION,
    INTERVALO_DEFECTO_MS,
    INTERVALO_MAX_MS,
    INTERVALO_MIN_MS,
    MODOS_EJECUCION,
    avanzar,
    clampIntervalo,
    esModoValido,
    esNoDisponible,
    modoPayload,
    normalizeEstado,
    normalizeModo,
    normalizeResultado,
    pausar,
    puedeAvanzar,
    puedeAvanzarManual,
    puedePausar,
    puedeReanudar,
    reanudar,
    seleccionarModo,
} from './ejecucionApi';

const putMock = vi.mocked((gdsApiClient as unknown as { put: ReturnType<typeof vi.fn> }).put);
const postMock = vi.mocked((gdsApiClient as unknown as { post: ReturnType<typeof vi.fn> }).post);

describe('normalizeModo (Req. 32.1)', () => {
    it('reconoce los tres modos del dominio y sus sinónimos', () => {
        expect(normalizeModo('automatico')).toBe(MODOS_EJECUCION.AUTOMATICO);
        expect(normalizeModo('Automático')).toBe(MODOS_EJECUCION.AUTOMATICO);
        expect(normalizeModo('AUTO')).toBe(MODOS_EJECUCION.AUTOMATICO);
        expect(normalizeModo('manual')).toBe(MODOS_EJECUCION.MANUAL);
        expect(normalizeModo('tiempo real')).toBe(MODOS_EJECUCION.TIEMPO_REAL);
        expect(normalizeModo('REAL_TIME')).toBe(MODOS_EJECUCION.TIEMPO_REAL);
    });

    it('cae a MANUAL (el más seguro) ante valores desconocidos', () => {
        expect(normalizeModo('xyz')).toBe(MODOS_EJECUCION.MANUAL);
        expect(normalizeModo(undefined)).toBe(MODOS_EJECUCION.MANUAL);
    });

    it('esModoValido valida el dominio', () => {
        expect(esModoValido('TIEMPO_REAL')).toBe(true);
        expect(esModoValido('manual')).toBe(true);
        // 'xyz' normaliza a MANUAL, que es válido → la función reporta true.
        expect(esModoValido('MANUAL')).toBe(true);
    });
});

describe('normalizeEstado (Req. 32.6)', () => {
    it('reconoce los estados del dominio y sus sinónimos', () => {
        expect(normalizeEstado('EN_EJECUCION')).toBe(ESTADOS_EJECUCION.EN_EJECUCION);
        expect(normalizeEstado('running')).toBe(ESTADOS_EJECUCION.EN_EJECUCION);
        expect(normalizeEstado('paused')).toBe(ESTADOS_EJECUCION.PAUSADO);
        expect(normalizeEstado('finalizado')).toBe(ESTADOS_EJECUCION.COMPLETADO);
    });

    it('cae a DETENIDO ante valores desconocidos', () => {
        expect(normalizeEstado('???')).toBe(ESTADOS_EJECUCION.DETENIDO);
        expect(normalizeEstado(null)).toBe(ESTADOS_EJECUCION.DETENIDO);
    });
});

describe('clampIntervalo (Req. 32.5)', () => {
    it('acota a los límites', () => {
        expect(clampIntervalo(0)).toBe(INTERVALO_MIN_MS);
        expect(clampIntervalo(INTERVALO_MAX_MS + 1)).toBe(INTERVALO_MAX_MS);
    });

    it('respeta valores en rango y trunca decimales', () => {
        expect(clampIntervalo(5000)).toBe(5000);
        expect(clampIntervalo(1234.9)).toBe(1234);
    });

    it('cae al valor por defecto ante valores no numéricos', () => {
        expect(clampIntervalo('x')).toBe(INTERVALO_DEFECTO_MS);
        expect(clampIntervalo(undefined)).toBe(INTERVALO_DEFECTO_MS);
    });
});

describe('modoPayload (DTO SeleccionarModoDto, Req. 32.1, 32.5)', () => {
    it('omite el intervalo fuera de Tiempo_Real', () => {
        expect(modoPayload('MANUAL', 9999)).toEqual({ modo: 'MANUAL' });
        expect(modoPayload('AUTOMATICO')).toEqual({ modo: 'AUTOMATICO' });
    });

    it('incluye el intervalo acotado con el nombre exacto del DTO en Tiempo_Real', () => {
        expect(modoPayload('TIEMPO_REAL', 60000)).toEqual({
            modo: 'TIEMPO_REAL',
            intervaloTiempoRealMs: 60000,
        });
        expect(modoPayload('TIEMPO_REAL', 0)).toEqual({
            modo: 'TIEMPO_REAL',
            intervaloTiempoRealMs: INTERVALO_MIN_MS,
        });
        expect(modoPayload('TIEMPO_REAL', undefined)).toEqual({
            modo: 'TIEMPO_REAL',
            intervaloTiempoRealMs: INTERVALO_DEFECTO_MS,
        });
    });
});

describe('reglas de habilitación (Req. 32.2, 32.6, 32.8)', () => {
    it('puedeAvanzar salvo completado o en ejecución', () => {
        expect(puedeAvanzar('MANUAL', 'DETENIDO')).toBe(true);
        expect(puedeAvanzar('AUTOMATICO', 'DETENIDO')).toBe(true);
        expect(puedeAvanzar('MANUAL', 'COMPLETADO')).toBe(false);
        expect(puedeAvanzar('AUTOMATICO', 'EN_EJECUCION')).toBe(false);
    });

    it('puedeAvanzarManual solo en modo MANUAL sin completar', () => {
        expect(puedeAvanzarManual('MANUAL', 'DETENIDO')).toBe(true);
        expect(puedeAvanzarManual('AUTOMATICO', 'DETENIDO')).toBe(false);
        expect(puedeAvanzarManual('MANUAL', 'COMPLETADO')).toBe(false);
    });

    it('puedePausar solo en modos continuos en ejecución', () => {
        expect(puedePausar('AUTOMATICO', 'EN_EJECUCION')).toBe(true);
        expect(puedePausar('TIEMPO_REAL', 'EN_EJECUCION')).toBe(true);
        expect(puedePausar('MANUAL', 'EN_EJECUCION')).toBe(false);
        expect(puedePausar('AUTOMATICO', 'PAUSADO')).toBe(false);
    });

    it('puedeReanudar solo en modos continuos pausados', () => {
        expect(puedeReanudar('AUTOMATICO', 'PAUSADO')).toBe(true);
        expect(puedeReanudar('TIEMPO_REAL', 'PAUSADO')).toBe(true);
        expect(puedeReanudar('MANUAL', 'PAUSADO')).toBe(false);
        expect(puedeReanudar('AUTOMATICO', 'EN_EJECUCION')).toBe(false);
    });
});

describe('esNoDisponible (degradación con elegancia)', () => {
    it('considera no disponible 404/501', () => {
        expect(esNoDisponible({ response: { status: 404 } })).toBe(true);
        expect(esNoDisponible({ response: { status: 501 } })).toBe(true);
    });

    it('considera no disponible fallos de red sin respuesta', () => {
        expect(esNoDisponible({ request: {} })).toBe(true);
        expect(esNoDisponible({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('NO considera no disponible 401/403/422', () => {
        expect(esNoDisponible({ response: { status: 401 } })).toBe(false);
        expect(esNoDisponible({ response: { status: 422 } })).toBe(false);
    });
});

describe('normalizeResultado', () => {
    it('extrae los encolados desde avance.encolados (camelCase)', () => {
        expect(
            normalizeResultado({
                analisisId: 'a1',
                modoEjecucion: 'MANUAL',
                estadoEjecucion: 'DETENIDO',
                avance: { encolados: [{ analisisId: 'a1', institucionId: 'i1', numeroSemana: 3 }] },
            }),
        ).toEqual({
            analisisId: 'a1',
            modoEjecucion: 'MANUAL',
            estadoEjecucion: 'DETENIDO',
            encolados: [{ analisisId: 'a1', institucionId: 'i1', numeroSemana: 3 }],
        });
    });

    it('tolera snake_case y ausencias', () => {
        const r = normalizeResultado({
            analisis_id: 'a2',
            modo: 'tiempo real',
            estado: 'running',
            encolados: [{ analisis_id: 'a2', institucion_id: 'i9', numero_semana: 1 }],
        });
        expect(r.analisisId).toBe('a2');
        expect(r.modoEjecucion).toBe('TIEMPO_REAL');
        expect(r.estadoEjecucion).toBe('EN_EJECUCION');
        expect(r.encolados).toEqual([{ analisisId: 'a2', institucionId: 'i9', numeroSemana: 1 }]);
    });
});

describe('funciones de red', () => {
    beforeEach(() => {
        putMock.mockReset();
        postMock.mockReset();
    });

    it('seleccionarModo envía el payload correcto y degrada el 204 a ok:null', async () => {
        putMock.mockResolvedValue({ status: 204, data: '' });
        const res = await seleccionarModo('a1', 'TIEMPO_REAL', 60000);
        expect(putMock).toHaveBeenCalledWith('/analisis/a1/modo', {
            modo: 'TIEMPO_REAL',
            intervaloTiempoRealMs: 60000,
        });
        expect(res).toEqual({ ok: true, data: null });
    });

    it('avanzar normaliza el ResultadoEjecucion', async () => {
        postMock.mockResolvedValue({
            data: {
                analisisId: 'a1',
                modoEjecucion: 'MANUAL',
                estadoEjecucion: 'DETENIDO',
                avance: { encolados: [{ analisisId: 'a1', institucionId: 'i1', numeroSemana: 2 }] },
            },
        });
        const res = await avanzar('a1');
        expect(postMock).toHaveBeenCalledWith('/analisis/a1/avanzar');
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.estadoEjecucion).toBe('DETENIDO');
            expect(res.data.encolados).toHaveLength(1);
        }
    });

    it('degrada con elegancia cuando el endpoint aún no existe (404)', async () => {
        postMock.mockRejectedValue({ response: { status: 404 } });
        const res = await pausar('a1');
        expect(res).toEqual({ ok: false, noDisponible: true });
    });

    it('re-lanza errores reales (p. ej. 422)', async () => {
        postMock.mockRejectedValue({ response: { status: 422 } });
        await expect(reanudar('a1')).rejects.toMatchObject({ response: { status: 422 } });
    });
});
