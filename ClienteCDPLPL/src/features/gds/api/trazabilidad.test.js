// Pruebas de la lógica pura del cliente de trazabilidad del feature `gds`
// (meses/semanas, seudónimos, normalización, series por dimensión, comparación
// entre instituciones y disponibilidad parcial del soporte). No tocan red ni
// DOM. (Req. 22.1–22.6, 23.5)
import { describe, it, expect } from 'vitest';
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
  buildSeriesPorDimension,
  combinarComparacionInstituciones,
  evaluarDisponibilidadSoporte,
} from './trazabilidad.js';

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
    const grupos = agruparSemanasPorMes([5, 1, 2, 5, 9]);
    expect(grupos).toEqual([
      { mes: 1, semanas: [1, 2] },
      { mes: 2, semanas: [5] },
      { mes: 3, semanas: [9] },
    ]);
  });

  it('tolera entradas nulas o inválidas', () => {
    expect(agruparSemanasPorMes(null)).toEqual([]);
    expect(agruparSemanasPorMes([0, -1, 'x'])).toEqual([]);
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

  it('muestra un hash de forma compacta', () => {
    expect(mostrarSeudonimo(hash)).toBe(`anon-${'a'.repeat(8)}`);
  });

  it('respeta valores que ya son seudónimos anon', () => {
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
    expect(normalizeEvolucionPunto({ dimension: 'ansiedad_colectiva', numero_semana: 5, valor: 42 })).toEqual({
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
});

describe('buildSeriesPorDimension (Req. 22.2)', () => {
  it('agrupa puntos en series por dimensión, ordenadas por semana', () => {
    const series = buildSeriesPorDimension([
      { dimension: 'ansiedad_colectiva', semana: 2, valor: 30 },
      { dimension: 'ansiedad_colectiva', semana: 1, valor: 20 },
      { dimension: 'estres_academico', semana: 1, valor: 50 },
    ]);
    const ansiedad = series.find((s) => s.dimension === 'ansiedad_colectiva');
    const estres = series.find((s) => s.dimension === 'estres_academico');
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
      'estres_academico'
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
      'estres_academico'
    );
    expect(filas).toEqual([{ semana: 1, mes: 1, i1: 40 }]);
  });

  it('tolera entradas nulas', () => {
    expect(combinarComparacionInstituciones(null, 'x')).toEqual({ filas: [], series: [] });
  });
});

describe('evaluarDisponibilidadSoporte (Req. 22.6)', () => {
  it('marca completo cuando hay explicación y evidencia', () => {
    const r = evaluarDisponibilidadSoporte({
      explicacion: { texto: 'algo' },
      evidencias: [{ id: 'e1' }],
    });
    expect(r).toEqual({
      tieneExplicacion: true,
      tieneEvidencia: true,
      completo: true,
      faltantes: [],
    });
  });

  it('reporta faltantes para una vista parcial', () => {
    const soloEvid = evaluarDisponibilidadSoporte({ explicacion: null, evidencias: [{ id: 'e1' }] });
    expect(soloEvid.completo).toBe(false);
    expect(soloEvid.faltantes).toEqual(['explicación']);

    const soloExpl = evaluarDisponibilidadSoporte({ explicacion: { texto: 'x' }, evidencias: [] });
    expect(soloExpl.faltantes).toEqual(['evidencia']);

    const nada = evaluarDisponibilidadSoporte({});
    expect(nada.faltantes).toEqual(['explicación', 'evidencia']);
  });
});
