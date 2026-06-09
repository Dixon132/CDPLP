// Pruebas de la lógica pura del cliente de análisis del feature `gds`
// (construcción de payload, acotado de semanas y validación). No tocan red ni
// DOM. Cubren Req. 8.1, 8.2, 8.3, 8.4 y la configuración temporal (Req. 12.1).
import { describe, it, expect } from 'vitest';
import {
  SEMANAS_MIN,
  SEMANAS_MAX,
  SEMANAS_DEFECTO,
  RADIO_ANALISIS_DEFECTO,
  TIPO_ESCENARIO,
  ANALISIS_ESTADO_INICIAL,
  analisisToPayload,
  clampSemanas,
  validarAnalisis,
} from './analisis.js';

const baseValida = {
  nombre: 'Estudio U Andina',
  descripcion: 'Tendencias del semestre',
  institucionIds: ['i1', 'i2'],
  radio_metros: 1500,
  total_semanas: 12,
  tipo_escenario: TIPO_ESCENARIO.BIBLIOTECA,
  escenario_id: 'pred:pandemia',
  escenario_texto: '',
  escenario_nombre: '',
  guardar_en_biblioteca: false,
};

describe('clampSemanas (Req. 12.1: 1..24)', () => {
  it('acota por debajo del mínimo', () => {
    expect(clampSemanas(0)).toBe(SEMANAS_MIN);
    expect(clampSemanas(-5)).toBe(SEMANAS_MIN);
  });

  it('acota por encima del máximo', () => {
    expect(clampSemanas(25)).toBe(SEMANAS_MAX);
    expect(clampSemanas(1000)).toBe(SEMANAS_MAX);
  });

  it('respeta valores dentro de rango y trunca decimales', () => {
    expect(clampSemanas(12)).toBe(12);
    expect(clampSemanas(8.9)).toBe(8);
  });

  it('cae al valor por defecto ante valores no numéricos', () => {
    expect(clampSemanas('x')).toBe(SEMANAS_DEFECTO);
    expect(clampSemanas(undefined)).toBe(SEMANAS_DEFECTO);
  });
});

describe('analisisToPayload', () => {
  it('construye el payload con escenario de biblioteca (Req. 8.1, 8.2, 8.3)', () => {
    const payload = analisisToPayload(baseValida);
    expect(payload).toEqual({
      nombre: 'Estudio U Andina',
      descripcion: 'Tendencias del semestre',
      institucion_ids: ['i1', 'i2'],
      radio_metros: 1500,
      total_semanas: 12,
      escenario: { tipo: TIPO_ESCENARIO.BIBLIOTECA, escenario_id: 'pred:pandemia' },
    });
  });

  it('construye el payload con escenario personalizado y guardado en biblioteca (Req. 29.2)', () => {
    const payload = analisisToPayload({
      ...baseValida,
      tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
      escenario_texto: '  Conflicto local por el agua  ',
      escenario_nombre: '  Crisis del agua  ',
      guardar_en_biblioteca: true,
    });
    expect(payload.escenario).toEqual({
      tipo: TIPO_ESCENARIO.PERSONALIZADO,
      texto: 'Conflicto local por el agua',
      guardar_en_biblioteca: true,
      nombre: 'Crisis del agua',
    });
  });

  it('omite el nombre del escenario personalizado cuando está vacío', () => {
    const payload = analisisToPayload({
      ...baseValida,
      tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
      escenario_texto: 'algo',
      escenario_nombre: '   ',
      guardar_en_biblioteca: false,
    });
    expect(payload.escenario).not.toHaveProperty('nombre');
    expect(payload.escenario.guardar_en_biblioteca).toBe(false);
  });

  it('recorta nombre/descripcion y filtra ids vacíos', () => {
    const payload = analisisToPayload({
      ...baseValida,
      nombre: '  Estudio  ',
      descripcion: '  desc  ',
      institucionIds: ['i1', '', null, 'i3'],
    });
    expect(payload.nombre).toBe('Estudio');
    expect(payload.descripcion).toBe('desc');
    expect(payload.institucion_ids).toEqual(['i1', 'i3']);
  });

  it('acota las semanas fuera de rango al construir el payload', () => {
    expect(analisisToPayload({ ...baseValida, total_semanas: 99 }).total_semanas).toBe(SEMANAS_MAX);
  });
});

describe('validarAnalisis (Req. 8.1, 8.2, 8.3, 8.4, 12.1)', () => {
  it('acepta un formulario completo y válido (biblioteca)', () => {
    expect(validarAnalisis(baseValida)).toEqual({});
  });

  it('acepta un formulario válido con escenario personalizado', () => {
    expect(
      validarAnalisis({
        ...baseValida,
        tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
        escenario_id: '',
        escenario_texto: 'Crisis sociopolítica regional',
      })
    ).toEqual({});
  });

  it('exige nombre', () => {
    expect(validarAnalisis({ ...baseValida, nombre: '   ' })).toHaveProperty('nombre');
  });

  it('exige al menos una institución (Req. 8.4)', () => {
    expect(validarAnalisis({ ...baseValida, institucionIds: [] })).toHaveProperty('institucionIds');
    expect(validarAnalisis({ ...baseValida, institucionIds: ['', null] })).toHaveProperty(
      'institucionIds'
    );
  });

  it('exige radio mayor a 0', () => {
    expect(validarAnalisis({ ...baseValida, radio_metros: 0 })).toHaveProperty('radio_metros');
    expect(validarAnalisis({ ...baseValida, radio_metros: -1 })).toHaveProperty('radio_metros');
  });

  it('exige semanas enteras dentro de [1, 24] (Req. 12.1)', () => {
    expect(validarAnalisis({ ...baseValida, total_semanas: 0 })).toHaveProperty('total_semanas');
    expect(validarAnalisis({ ...baseValida, total_semanas: 25 })).toHaveProperty('total_semanas');
    expect(validarAnalisis({ ...baseValida, total_semanas: 5.5 })).toHaveProperty('total_semanas');
  });

  it('exige seleccionar un escenario de la biblioteca cuando ese es el tipo', () => {
    expect(validarAnalisis({ ...baseValida, escenario_id: '' })).toHaveProperty('escenario');
  });

  it('exige texto del escenario personalizado', () => {
    expect(
      validarAnalisis({
        ...baseValida,
        tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
        escenario_id: '',
        escenario_texto: '   ',
      })
    ).toHaveProperty('escenario');
  });

  it('exige nombre del escenario personalizado al guardarlo en la biblioteca (Req. 29.2)', () => {
    expect(
      validarAnalisis({
        ...baseValida,
        tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
        escenario_id: '',
        escenario_texto: 'algo',
        guardar_en_biblioteca: true,
        escenario_nombre: '',
      })
    ).toHaveProperty('escenario_nombre');
  });
});

describe('constantes y estado inicial', () => {
  it('expone el rango temporal y el radio por defecto', () => {
    expect(SEMANAS_MIN).toBe(1);
    expect(SEMANAS_MAX).toBe(24);
    expect(ANALISIS_ESTADO_INICIAL.radio_metros).toBe(RADIO_ANALISIS_DEFECTO);
    expect(ANALISIS_ESTADO_INICIAL.total_semanas).toBe(SEMANAS_DEFECTO);
    expect(ANALISIS_ESTADO_INICIAL.tipo_escenario).toBe(TIPO_ESCENARIO.BIBLIOTECA);
  });
});
