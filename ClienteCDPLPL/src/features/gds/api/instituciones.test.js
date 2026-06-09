// Pruebas de la lógica pura del cliente de instituciones del feature `gds`
// (normalización, construcción de payload y validación). No tocan red ni DOM.
import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_INSTITUCION,
  normalizeInstitucion,
  institucionToPayload,
  validarInstitucion,
  RADIO_METROS_DEFECTO,
} from './instituciones.js';

describe('instituciones: categorías admitidas (Req. 7.2)', () => {
  it('expone exactamente {universidad, colegio, instituto, escuela}', () => {
    expect([...CATEGORIAS_INSTITUCION].sort()).toEqual(
      ['colegio', 'escuela', 'instituto', 'universidad'].sort()
    );
  });
});

describe('normalizeInstitucion', () => {
  it('normaliza una institución cruda tolerando snake_case y camelCase', () => {
    const raw = {
      id: 'i1',
      nombre: 'U Mayor',
      categoria: 'universidad',
      lat: '-16.5',
      lng: '-68.15',
      radioMetros: '750',
      logoUrl: 'http://x/logo.png',
      descripcion: 'desc',
    };
    expect(normalizeInstitucion(raw)).toEqual({
      id: 'i1',
      nombre: 'U Mayor',
      categoria: 'universidad',
      latitud: -16.5,
      longitud: -68.15,
      radio_metros: 750,
      logo_url: 'http://x/logo.png',
      descripcion: 'desc',
    });
  });

  it('usa valores por defecto seguros ante datos ausentes', () => {
    const n = normalizeInstitucion(null);
    expect(n.nombre).toBe('');
    expect(n.latitud).toBeNull();
    expect(n.longitud).toBeNull();
    expect(n.radio_metros).toBe(RADIO_METROS_DEFECTO);
  });
});

describe('institucionToPayload', () => {
  it('convierte numéricos y omite el logo vacío', () => {
    const payload = institucionToPayload({
      nombre: '  Colegio  ',
      categoria: 'colegio',
      latitud: '-16.5',
      longitud: '-68.1',
      radio_metros: '300',
      logo_url: '   ',
      descripcion: ' algo ',
    });
    expect(payload).toEqual({
      nombre: 'Colegio',
      categoria: 'colegio',
      latitud: -16.5,
      longitud: -68.1,
      radio_metros: 300,
      descripcion: 'algo',
    });
    expect(payload).not.toHaveProperty('logo_url');
  });

  it('incluye el logo cuando se provee', () => {
    const payload = institucionToPayload({
      nombre: 'X',
      categoria: 'escuela',
      latitud: 1,
      longitud: 2,
      radio_metros: 100,
      logo_url: 'http://x/l.png',
    });
    expect(payload.logo_url).toBe('http://x/l.png');
  });
});

describe('validarInstitucion (Req. 7.1, 7.2, 7.3)', () => {
  const valida = {
    nombre: 'Instituto Andino',
    categoria: 'instituto',
    latitud: -16.5,
    longitud: -68.15,
    radio_metros: 500,
  };

  it('acepta una institución completa y válida', () => {
    expect(validarInstitucion(valida)).toEqual({});
  });

  it('exige nombre', () => {
    expect(validarInstitucion({ ...valida, nombre: '   ' })).toHaveProperty('nombre');
  });

  it('exige una categoría del conjunto admitido', () => {
    expect(validarInstitucion({ ...valida, categoria: 'otra' })).toHaveProperty('categoria');
  });

  it('exige ubicación seleccionada en el mapa', () => {
    expect(validarInstitucion({ ...valida, latitud: null, longitud: null })).toHaveProperty(
      'ubicacion'
    );
  });

  it('exige un radio mayor a 0', () => {
    expect(validarInstitucion({ ...valida, radio_metros: 0 })).toHaveProperty('radio_metros');
  });
});
