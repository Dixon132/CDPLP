// Pruebas del cliente tipado de Trazabilidad del feature `gds` (tarea 26.7).
//
// Cubren la lógica pura (meses/semanas, seudónimos, normalización, series por
// dimensión, comparación por institución y por zona, disponibilidad parcial del
// soporte) y las funciones de red contra el backend autónomo con el cliente
// HTTP mockeado: comunidades, evolución, resultados y soporte (Req. 22.1–22.6,
// 33.5, 23.5). No tocan red real ni DOM.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente axios compartido ANTES de importar el módulo bajo prueba.
vi.mock('./client.js', () => {
    const client = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    };
    return { default: client, gdsApiClient: client };
});

import gdsApiClient from './client.js';
import {
    SEMANAS_POR_MES,
    colorPorIndice,
    dimensionMeta,
    mesDeSemana,
    agruparSemanasPorMes,
    esSeudonimoHash,
    mostrarSeudonimo,
    normalizeEvolucionPunto,
    normalizeEvidencia,
    normalizeExplicacion,
    normalizeComunidad,
    normalizeZona,
    buildSeriesPorDimension,
    combinarComparacionInstituciones,
    combinarComparacionPorZona,
    evaluarDisponibilidadSoporte,
    listComunidades,
    getEvolucionDimensiones,
    getEvolucionPuntos,
    listResultadosSemanales,
    getSoporteResultado,
} from './trazabilidadApi';

const mockClient = gdsApiClient as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

describe('mesDeSemana / agruparSemanasPorMes (Req. 22.1)', () => {
    it('mapea semanas a meses de 4 semanas', () => {
        expect(SEMANAS_POR_MES).toBe(4);
        expect(mesDeSemana(1)).toBe(1);
        expect(mesDeSemana(4)).toBe(1);
        expect(mesDeSemana(5)).toBe(2);
        expect(mesDeSemana(24)).toBe(6);
    });

    it('cae a mes 1 ante valores inválidos', () => {
        expect(mesDeSemana(0)).toBe(1);
        expect(mesDeSemana(-3)).toBe(1);
        expect(mesDeSemana('abc')).toBe(1);
    });

    it('agrupa semanas por mes en orden creciente sin duplicar', () => {
        expect(agruparSemanasPorMes([5, 1, 2, 5, 9])).toEqual([
            { mes: 1, semanas: [1, 2] },
            { mes: 2, semanas: [5] },
            { mes: 3, semanas: [9] },
        ]);
    });

    it('tolera entradas nulas o inválidas', () => {
        expect(agruparSemanasPorMes(null)).toEqual([]);
        expect(agruparSemanasPorMes([0, -1, NaN])).toEqual([]);
    });
});

describe('seudónimos (Req. 23.5)', () => {
    const hash = 'a'.repeat(64);

    it('reconoce un hash SHA-256 hex de 64', () => {
        expect(esSeudonimoHash(hash)).toBe(true);
        expect(esSeudonimoHash('ABCDEF0123456789'.repeat(4))).toBe(true);
        expect(esSeudonimoHash('xyz')).toBe(false);
        expect(esSeudonimoHash(null)).toBe(false);
    });

    it('muestra un hash de forma compacta y respeta seudónimos anon', () => {
        expect(mostrarSeudonimo(hash)).toBe(`anon-${'a'.repeat(8)}`);
        expect(mostrarSeudonimo('anon-1234')).toBe('anon-1234');
        expect(mostrarSeudonimo('anon_xyz')).toBe('anon_xyz');
    });

    it('enmascara identificadores crudos sin exponerlos completos', () => {
        expect(mostrarSeudonimo('usuario_estudiante_12345')).toBe('anon-_12345');
        expect(mostrarSeudonimo('ab12')).toBe('anon-ab12');
        expect(mostrarSeudonimo('')).toBe('anónimo');
        expect(mostrarSeudonimo(null)).toBe('anónimo');
    });

    it('nunca devuelve el identificador crudo largo tal cual', () => {
        const crudo = 'identificador-real-sensible-0001';
        expect(mostrarSeudonimo(crudo)).not.toBe(crudo);
        expect(mostrarSeudonimo(crudo).startsWith('anon-')).toBe(true);
    });
});

describe('colorPorIndice / dimensionMeta (Req. 17.5)', () => {
    it('asigna colores de forma estable y cíclica', () => {
        expect(colorPorIndice(0)).toBe(colorPorIndice(0));
        expect(typeof colorPorIndice(99)).toBe('string');
        expect(colorPorIndice(-1)).toBe(colorPorIndice(0));
    });

    it('usa metadatos conocidos y deriva etiqueta para dimensiones nuevas', () => {
        expect(dimensionMeta('estres_academico').label).toBe('Estrés académico');
        const nueva = dimensionMeta('nueva_dimension_x', 1);
        expect(nueva.label).toBe('Nueva Dimension X');
        expect(typeof nueva.color).toBe('string');
    });
});

describe('normalizadores (snake_case / camelCase)', () => {
    it('normaliza un punto de evolución y deriva el mes', () => {
        expect(
            normalizeEvolucionPunto({ dimension: 'ansiedad_colectiva', numero_semana: 5, valor: 42 }),
        ).toEqual({
            dimension: 'ansiedad_colectiva',
            semana: 5,
            mes: 2,
            valor: 42,
            comunidadId: null,
        });
    });

    it('normaliza una evidencia conservando la cadena de trazabilidad (Req. 22.5)', () => {
        const e = normalizeEvidencia({
            id: 'e1',
            tipo: 'publicacion',
            ref_contenido: 'a'.repeat(64),
            numero_semana: 3,
            institucion_id: 'i1',
            analisis_id: 'an1',
        });
        expect(e.id).toBe('e1');
        expect(e.refContenido).toBe('a'.repeat(64));
        expect(e.semana).toBe(3);
        expect(e.institucionId).toBe('i1');
        expect(e.analisisId).toBe('an1');
    });

    it('normaliza una explicación con sus evidencias', () => {
        const x = normalizeExplicacion({
            dimension: 'conflicto_social',
            explicacion: 'Aumento por evento del escenario',
            cuando_empezo: 'semana 3',
            evidencias: [{ id: 'e1', ref_contenido: 'b'.repeat(64) }],
        });
        expect(x.dimension).toBe('conflicto_social');
        expect(x.texto).toBe('Aumento por evento del escenario');
        expect(x.cuando).toBe('semana 3');
        expect(x.evidencias).toHaveLength(1);
        expect(x.evidencias[0].id).toBe('e1');
    });

    it('normaliza una comunidad con su zona explícita (Req. 33)', () => {
        const c = normalizeComunidad({
            institucion_id: 'i1',
            nombre: 'U Mayor',
            zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radio_metros: 800 },
        });
        expect(c).toEqual({
            institucionId: 'i1',
            institucionNombre: 'U Mayor',
            zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        });
    });

    it('reconstruye la zona desde coordenadas sueltas de la institución', () => {
        const c = normalizeComunidad({ id: 'i2', nombre: 'Colegio X', lat: -17, lon: -66, radio: 500 });
        expect(c.zona).toEqual({ nombre: '', latitud: -17, longitud: -66, radioMetros: 500 });
    });

    it('deja la zona en null cuando no hay coordenadas', () => {
        expect(normalizeComunidad({ id: 'i3', nombre: 'Sin ubicación' }).zona).toBeNull();
        expect(normalizeZona(null)).toBeNull();
    });
});

describe('buildSeriesPorDimension (Req. 22.2)', () => {
    it('agrupa puntos en series por dimensión, ordenadas por semana', () => {
        const series = buildSeriesPorDimension([
            { dimension: 'ansiedad_colectiva', semana: 2, valor: 30 },
            { dimension: 'ansiedad_colectiva', semana: 1, valor: 20 },
            { dimension: 'estres_academico', semana: 1, valor: 50 },
        ]);
        const ansiedad = series.find((s) => s.dimension === 'ansiedad_colectiva')!;
        const estres = series.find((s) => s.dimension === 'estres_academico')!;
        expect(ansiedad.datos.map((d) => d.semana)).toEqual([1, 2]);
        expect(ansiedad.datos.map((d) => d.valor)).toEqual([20, 30]);
        expect(estres.label).toBe('Estrés académico');
    });

    it('tolera puntos crudos normalizándolos', () => {
        const series = buildSeriesPorDimension([
            { dimension: 'aislamiento', numero_semana: 1, value: 10 },
        ]);
        expect(series[0].datos[0].valor).toBe(10);
        expect(series[0].datos[0].mes).toBe(1);
    });

    it('devuelve [] ante entrada vacía o nula', () => {
        expect(buildSeriesPorDimension([])).toEqual([]);
        expect(buildSeriesPorDimension(null)).toEqual([]);
    });
});

describe('combinarComparacionInstituciones (Req. 22.4)', () => {
    it('combina la misma dimensión de varias instituciones por semana', () => {
        const { filas, series } = combinarComparacionInstituciones(
            [
                {
                    institucionId: 'i1',
                    institucionNombre: 'U Mayor',
                    puntos: [
                        { dimension: 'estres_academico', semana: 1, valor: 40 },
                        { dimension: 'estres_academico', semana: 2, valor: 55 },
                    ],
                },
                {
                    institucionId: 'i2',
                    institucionNombre: 'Colegio X',
                    puntos: [{ dimension: 'estres_academico', semana: 1, valor: 30 }],
                },
            ],
            'estres_academico',
        );

        expect(series.map((s) => s.clave)).toEqual(['i1', 'i2']);
        expect(filas).toEqual([
            { semana: 1, mes: 1, i1: 40, i2: 30 },
            { semana: 2, mes: 1, i1: 55 },
        ]);
    });

    it('filtra por la dimensión solicitada e ignora otras', () => {
        const { filas } = combinarComparacionInstituciones(
            [
                {
                    institucionId: 'i1',
                    puntos: [
                        { dimension: 'estres_academico', semana: 1, valor: 40 },
                        { dimension: 'ansiedad_colectiva', semana: 1, valor: 99 },
                    ],
                },
            ],
            'estres_academico',
        );
        expect(filas).toEqual([{ semana: 1, mes: 1, i1: 40 }]);
    });

    it('tolera entradas nulas', () => {
        expect(combinarComparacionInstituciones(null, 'x')).toEqual({ filas: [], series: [] });
    });
});

describe('combinarComparacionPorZona (Req. 33.4, 33.5)', () => {
    it('resume cada institución por su zona con último/promedio/máximo y coordenadas', () => {
        const puntos = combinarComparacionPorZona(
            [
                {
                    institucionId: 'i1',
                    institucionNombre: 'U Mayor',
                    zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radioMetros: 800 },
                    puntos: [
                        { dimension: 'estres_academico', semana: 2, valor: 60 },
                        { dimension: 'estres_academico', semana: 1, valor: 40 },
                        { dimension: 'ansiedad_colectiva', semana: 1, valor: 99 },
                    ],
                },
                {
                    institucionId: 'i2',
                    institucionNombre: 'Colegio X',
                    zona: null,
                    puntos: [{ dimension: 'estres_academico', semana: 1, valor: 30 }],
                },
            ],
            'estres_academico',
        );

        expect(puntos[0]).toMatchObject({
            institucionId: 'i1',
            zonaNombre: 'Centro',
            latitud: -16.5,
            longitud: -68.15,
            radioMetros: 800,
            tieneCoordenadas: true,
            valorUltimo: 60, // semana 2 es la última
            valorPromedio: 50, // (40 + 60) / 2
            valorMaximo: 60,
        });
        expect(puntos[1]).toMatchObject({
            institucionId: 'i2',
            tieneCoordenadas: false,
            valorUltimo: 30,
            valorMaximo: 30,
        });
    });

    it('devuelve valores nulos cuando la institución no tiene datos de la dimensión', () => {
        const [p] = combinarComparacionPorZona(
            [{ institucionId: 'i1', puntos: [{ dimension: 'otra', semana: 1, valor: 10 }] }],
            'estres_academico',
        );
        expect(p.valorUltimo).toBeNull();
        expect(p.valorPromedio).toBeNull();
        expect(p.valorMaximo).toBeNull();
    });

    it('tolera entradas nulas', () => {
        expect(combinarComparacionPorZona(null, 'x')).toEqual([]);
    });
});

describe('evaluarDisponibilidadSoporte (Req. 22.6)', () => {
    it('marca completo cuando hay explicación y evidencia', () => {
        expect(
            evaluarDisponibilidadSoporte({
                explicacion: { texto: 'algo' } as never,
                evidencias: [{ id: 'e1' } as never],
            }),
        ).toEqual({
            tieneExplicacion: true,
            tieneEvidencia: true,
            completo: true,
            faltantes: [],
        });
    });

    it('reporta faltantes para una vista parcial', () => {
        const soloEvid = evaluarDisponibilidadSoporte({
            explicacion: null,
            evidencias: [{ id: 'e1' } as never],
        });
        expect(soloEvid.completo).toBe(false);
        expect(soloEvid.faltantes).toEqual(['explicación']);

        const soloExpl = evaluarDisponibilidadSoporte({
            explicacion: { texto: 'x' } as never,
            evidencias: [],
        });
        expect(soloExpl.faltantes).toEqual(['evidencia']);

        expect(evaluarDisponibilidadSoporte({}).faltantes).toEqual(['explicación', 'evidencia']);
    });
});

describe('funciones de red contra el backend autónomo (mock)', () => {
    beforeEach(() => {
        mockClient.get.mockReset();
        mockClient.post.mockReset();
    });

    it('listComunidades llama al endpoint y normaliza con zona (Req. 22.4, 33.5)', async () => {
        mockClient.get.mockResolvedValue({
            data: {
                comunidades: [
                    {
                        institucion_id: 'i1',
                        nombre: 'U Mayor',
                        zona: { nombre: 'Centro', lat: -16.5, lng: -68.15, radio: 800 },
                    },
                ],
            },
        });
        const lista = await listComunidades('a1');
        expect(mockClient.get).toHaveBeenCalledWith('/analisis/a1/comunidades');
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({
            institucionId: 'i1',
            institucionNombre: 'U Mayor',
            zona: { nombre: 'Centro', latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        });
    });

    it('listComunidades degrada a [] ante error de red', async () => {
        mockClient.get.mockRejectedValue(new Error('404'));
        expect(await listComunidades('a1')).toEqual([]);
    });

    it('getEvolucionDimensiones llama al endpoint y construye series (Req. 22.2)', async () => {
        mockClient.get.mockResolvedValue({
            data: [
                { dimension: 'estres_academico', semana: 1, valor: 40 },
                { dimension: 'estres_academico', semana: 2, valor: 55 },
            ],
        });
        const series = await getEvolucionDimensiones('a1', 'i1');
        expect(mockClient.get).toHaveBeenCalledWith('/analisis/a1/instituciones/i1/evolucion');
        expect(series).toHaveLength(1);
        expect(series[0].datos.map((d) => d.valor)).toEqual([40, 55]);
    });

    it('getEvolucionPuntos aplana las series en puntos con comunidadId', async () => {
        mockClient.get.mockResolvedValue({
            data: [{ dimension: 'aislamiento', semana: 1, valor: 10 }],
        });
        const puntos = await getEvolucionPuntos('a1', 'i1');
        expect(puntos).toEqual([
            { dimension: 'aislamiento', semana: 1, mes: 1, valor: 10, comunidadId: 'i1' },
        ]);
    });

    it('listResultadosSemanales normaliza semana/mes (Req. 22.1)', async () => {
        mockClient.get.mockResolvedValue({
            data: { resultados: [{ numero_semana: 5, resumen: 'pico de estrés' }] },
        });
        const res = await listResultadosSemanales('a1', 'i1');
        expect(mockClient.get).toHaveBeenCalledWith('/analisis/a1/instituciones/i1/resultados');
        expect(res[0]).toMatchObject({ semana: 5, mes: 2, resumen: 'pico de estrés' });
    });

    it('getSoporteResultado combina explicación y evidencia (Req. 22.3, 22.5)', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url.endsWith('/explicacion')) {
                return Promise.resolve({
                    data: { data: { explicacion: 'Subió por el evento', cuando_empezo: 'semana 3' } },
                });
            }
            return Promise.resolve({
                data: [{ id: 'e1', tipo: 'publicacion', ref_contenido: 'a'.repeat(64) }],
            });
        });

        const soporte = await getSoporteResultado({
            analisisId: 'a1',
            institucionId: 'i1',
            semana: 3,
            dimension: 'estres_academico',
        });
        expect(mockClient.get).toHaveBeenCalledWith(
            '/analisis/a1/instituciones/i1/semanas/3/explicacion',
            { params: { dimension: 'estres_academico' } },
        );
        expect(soporte.explicacion?.texto).toBe('Subió por el evento');
        expect(soporte.evidencias).toHaveLength(1);
        expect(soporte.parcial).toBe(false);
    });

    it('getSoporteResultado entrega vista parcial cuando la explicación falla (Req. 22.6)', async () => {
        mockClient.get.mockImplementation((url: string) => {
            if (url.endsWith('/explicacion')) return Promise.reject(new Error('500'));
            return Promise.resolve({ data: [{ id: 'e1', tipo: 'comentario' }] });
        });

        const soporte = await getSoporteResultado({
            analisisId: 'a1',
            institucionId: 'i1',
            semana: 2,
        });
        expect(soporte.explicacion).toBeNull();
        expect(soporte.evidencias).toHaveLength(1);
        expect(soporte.parcial).toBe(true);
        expect(soporte.faltantes).toEqual(['explicación']);
    });
});
