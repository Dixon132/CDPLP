// Pruebas de la lógica pura del cliente de reportes del feature `gds`
// (horizontes, normalización, agrupación y derivación del nombre de archivo de
// la exportación). No tocan red ni DOM. (Req. 19.1, 19.5)
import { describe, it, expect } from 'vitest';
import {
  HORIZONTES,
  HORIZONTE_META,
  esHorizonteValido,
  normalizeHorizonte,
  normalizeReporte,
  agruparPorHorizonte,
  nombreArchivoDesdeContentDisposition,
  nombreArchivoReporte,
} from './reportes.js';

describe('reportes: horizontes (Req. 19.1)', () => {
  it('expone exactamente {semanal, mensual, trimestral, semestral, final}', () => {
    expect([...HORIZONTES].sort()).toEqual(
      ['final', 'mensual', 'semanal', 'semestral', 'trimestral'].sort()
    );
  });

  it('tiene metadatos de presentación para cada horizonte', () => {
    for (const h of HORIZONTES) {
      expect(HORIZONTE_META[h]).toBeTruthy();
      expect(typeof HORIZONTE_META[h].label).toBe('string');
    }
  });
});

describe('esHorizonteValido', () => {
  it('acepta los horizontes del dominio sin importar mayúsculas/espacios', () => {
    expect(esHorizonteValido('semanal')).toBe(true);
    expect(esHorizonteValido('  TRIMESTRAL ')).toBe(true);
    expect(esHorizonteValido('final')).toBe(true);
  });

  it('rechaza valores fuera del dominio', () => {
    expect(esHorizonteValido('diario')).toBe(false);
    expect(esHorizonteValido('')).toBe(false);
    expect(esHorizonteValido(null)).toBe(false);
  });
});

describe('normalizeHorizonte', () => {
  it('mapea sinónimos comunes al horizonte canónico', () => {
    expect(normalizeHorizonte('weekly')).toBe('semanal');
    expect(normalizeHorizonte('month')).toBe('mensual');
    expect(normalizeHorizonte('quarter')).toBe('trimestral');
    expect(normalizeHorizonte('semestre')).toBe('semestral');
    expect(normalizeHorizonte('informe-final')).toBe('final');
  });

  it('cae a "semanal" ante un valor desconocido', () => {
    expect(normalizeHorizonte('???')).toBe('semanal');
    expect(normalizeHorizonte(undefined)).toBe('semanal');
  });
});

describe('normalizeReporte', () => {
  it('normaliza un reporte crudo tolerando snake_case y camelCase', () => {
    const raw = {
      id: 'r1',
      horizonte: 'MENSUAL',
      titulo: 'Reporte de marzo',
      analisis_id: 'a1',
      institucion_id: 'i1',
      institucion: 'U Mayor',
      periodo: 'Mes 1',
      created_at: '2025-03-01T00:00:00Z',
    };
    expect(normalizeReporte(raw)).toEqual({
      id: 'r1',
      horizonte: 'mensual',
      titulo: 'Reporte de marzo',
      analisisId: 'a1',
      institucionId: 'i1',
      institucionNombre: 'U Mayor',
      periodo: 'Mes 1',
      generadoEn: '2025-03-01T00:00:00Z',
    });
  });

  it('usa valores por defecto seguros ante datos ausentes', () => {
    const n = normalizeReporte(null);
    expect(n.id).toBeNull();
    expect(n.horizonte).toBe('semanal');
    expect(n.titulo).toBe('Reporte');
    expect(n.institucionNombre).toBe('');
  });
});

describe('agruparPorHorizonte', () => {
  it('agrupa preservando todas las claves del dominio', () => {
    const grupos = agruparPorHorizonte([
      { horizonte: 'semanal' },
      { horizonte: 'semanal' },
      { horizonte: 'final' },
    ]);
    expect(Object.keys(grupos).sort()).toEqual([...HORIZONTES].sort());
    expect(grupos.semanal).toHaveLength(2);
    expect(grupos.final).toHaveLength(1);
    expect(grupos.mensual).toEqual([]);
  });

  it('tolera entradas nulas devolviendo grupos vacíos', () => {
    const grupos = agruparPorHorizonte(null);
    for (const h of HORIZONTES) {
      expect(grupos[h]).toEqual([]);
    }
  });
});

describe('nombreArchivoDesdeContentDisposition (Req. 19.5)', () => {
  it('extrae filename simple', () => {
    expect(
      nombreArchivoDesdeContentDisposition('attachment; filename="reporte-mensual.pdf"')
    ).toBe('reporte-mensual.pdf');
  });

  it('prefiere y decodifica filename* (RFC 5987)', () => {
    expect(
      nombreArchivoDesdeContentDisposition(
        "attachment; filename*=UTF-8''reporte%20final.pdf"
      )
    ).toBe('reporte final.pdf');
  });

  it('devuelve null cuando no hay cabecera o no hay filename', () => {
    expect(nombreArchivoDesdeContentDisposition(null)).toBeNull();
    expect(nombreArchivoDesdeContentDisposition('attachment')).toBeNull();
  });
});

describe('nombreArchivoReporte', () => {
  it('genera un slug seguro a partir del título', () => {
    expect(nombreArchivoReporte({ titulo: 'Informe Final 2025' })).toBe('informe-final-2025.pdf');
  });

  it('quita diacríticos y caracteres no seguros', () => {
    expect(nombreArchivoReporte({ titulo: 'Reporte Económico (marzo)' })).toBe(
      'reporte-economico-marzo.pdf'
    );
  });

  it('usa el horizonte y el id como respaldo sin título', () => {
    expect(nombreArchivoReporte({ horizonte: 'trimestral', id: 'r9' })).toBe(
      'reporte-trimestral-r9.pdf'
    );
  });

  it('respeta una extensión personalizada', () => {
    expect(nombreArchivoReporte({ titulo: 'X' }, 'csv')).toBe('x.csv');
    expect(nombreArchivoReporte({ titulo: 'X' }, '.json')).toBe('x.json');
  });
});
