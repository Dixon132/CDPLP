// Pruebas del cliente tipado de Reportes del feature `gds` (tarea 26.8).
//
// Cubren la lógica pura (horizontes, normalización, agrupación, derivación del
// nombre de archivo) y las funciones de red contra el backend autónomo con el
// cliente HTTP mockeado: listar/generar reportes de un análisis y exportar en
// PDF/Excel (Req. 19.1, 19.4, 19.5). No tocan red real ni DOM.
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
    HORIZONTES,
    HORIZONTE_META,
    FORMATOS_EXPORTACION,
    EXTENSION_FORMATO,
    esHorizonteValido,
    normalizeHorizonte,
    normalizeFormato,
    normalizeReporte,
    agruparPorHorizonte,
    nombreArchivoDesdeContentDisposition,
    nombreArchivoReporte,
    listReportesAnalisis,
    generarReporte,
    getReporte,
    exportReporte,
} from './reportesApi';

const mockClient = gdsApiClient as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

describe('reportesApi: horizontes y formatos (Req. 19.1, 19.5)', () => {
    it('expone exactamente {semanal, mensual, trimestral, semestral, final}', () => {
        expect([...HORIZONTES].sort()).toEqual(
            ['final', 'mensual', 'semanal', 'semestral', 'trimestral'].sort(),
        );
    });

    it('tiene metadatos de presentación para cada horizonte', () => {
        for (const h of HORIZONTES) {
            expect(HORIZONTE_META[h]).toBeTruthy();
            expect(typeof HORIZONTE_META[h].label).toBe('string');
        }
    });

    it('expone los formatos de exportación pdf/excel con su extensión', () => {
        expect([...FORMATOS_EXPORTACION].sort()).toEqual(['excel', 'pdf']);
        expect(EXTENSION_FORMATO.pdf).toBe('pdf');
        expect(EXTENSION_FORMATO.excel).toBe('xlsx');
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

describe('normalizeFormato', () => {
    it('reconoce excel/xlsx/xls como excel', () => {
        expect(normalizeFormato('excel')).toBe('excel');
        expect(normalizeFormato('XLSX')).toBe('excel');
        expect(normalizeFormato('xls')).toBe('excel');
    });

    it('cae a pdf ante cualquier otro valor', () => {
        expect(normalizeFormato('pdf')).toBe('pdf');
        expect(normalizeFormato('raro')).toBe('pdf');
        expect(normalizeFormato(undefined)).toBe('pdf');
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
            nombreArchivoDesdeContentDisposition('attachment; filename="reporte-mensual.pdf"'),
        ).toBe('reporte-mensual.pdf');
    });

    it('prefiere y decodifica filename* (RFC 5987)', () => {
        expect(
            nombreArchivoDesdeContentDisposition("attachment; filename*=UTF-8''reporte%20final.pdf"),
        ).toBe('reporte final.pdf');
    });

    it('devuelve null cuando no hay cabecera o no hay filename', () => {
        expect(nombreArchivoDesdeContentDisposition(null)).toBeNull();
        expect(nombreArchivoDesdeContentDisposition('attachment')).toBeNull();
    });
});

describe('nombreArchivoReporte', () => {
    it('genera un slug seguro a partir del título con extensión del formato', () => {
        expect(nombreArchivoReporte({ titulo: 'Informe Final 2025' }, 'pdf')).toBe(
            'informe-final-2025.pdf',
        );
        expect(nombreArchivoReporte({ titulo: 'Informe Final 2025' }, 'excel')).toBe(
            'informe-final-2025.xlsx',
        );
    });

    it('quita diacríticos y caracteres no seguros', () => {
        expect(nombreArchivoReporte({ titulo: 'Reporte Económico (marzo)' })).toBe(
            'reporte-economico-marzo.pdf',
        );
    });

    it('usa el horizonte y el id como respaldo sin título', () => {
        expect(nombreArchivoReporte({ horizonte: 'trimestral', id: 'r9' })).toBe(
            'reporte-trimestral-r9.pdf',
        );
    });
});

describe('funciones de red contra el backend autónomo (mock)', () => {
    beforeEach(() => {
        mockClient.get.mockReset();
        mockClient.post.mockReset();
        mockClient.put.mockReset();
        mockClient.delete.mockReset();
    });

    it('listReportesAnalisis llama a /analisis/:id/reportes y normaliza (Req. 19.4)', async () => {
        mockClient.get.mockResolvedValue({
            data: { reportes: [{ id: 'r1', horizonte: 'semanal', titulo: 'Semana 1' }] },
        });
        const lista = await listReportesAnalisis('a1');
        expect(mockClient.get).toHaveBeenCalledWith('/analisis/a1/reportes', { params: {} });
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({ id: 'r1', horizonte: 'semanal', titulo: 'Semana 1' });
    });

    it('listReportesAnalisis envía el horizonte como filtro cuando es válido', async () => {
        mockClient.get.mockResolvedValue({ data: [] });
        await listReportesAnalisis('a1', { horizonte: 'mensual' });
        expect(mockClient.get).toHaveBeenCalledWith('/analisis/a1/reportes', {
            params: { horizonte: 'mensual' },
        });
    });

    it('generarReporte hace POST con el horizonte normalizado (Req. 19.3)', async () => {
        mockClient.post.mockResolvedValue({ data: { id: 'r2', horizonte: 'final' } });
        const creado = await generarReporte('a1', { horizonte: 'final' });
        expect(mockClient.post).toHaveBeenCalledWith('/analisis/a1/reportes', {
            horizonte: 'final',
        });
        expect(creado.id).toBe('r2');
        expect(creado.horizonte).toBe('final');
    });

    it('generarReporte incluye institucionId cuando se provee', async () => {
        mockClient.post.mockResolvedValue({ data: { id: 'r3' } });
        await generarReporte('a1', { horizonte: 'semanal', institucionId: 'i1' });
        expect(mockClient.post).toHaveBeenCalledWith('/analisis/a1/reportes', {
            horizonte: 'semanal',
            institucionId: 'i1',
        });
    });

    it('getReporte obtiene un reporte por id y desenvuelve { data }', async () => {
        mockClient.get.mockResolvedValue({ data: { data: { id: 'r1', titulo: 'X' } } });
        const r = await getReporte('r1');
        expect(mockClient.get).toHaveBeenCalledWith('/reportes/r1');
        expect(r).toMatchObject({ id: 'r1', titulo: 'X' });
    });

    it('exportReporte pide blob de /reportes/:id/export/pdf y lee el filename (Req. 19.5)', async () => {
        const blob = new Blob(['%PDF'], { type: 'application/pdf' });
        mockClient.get.mockResolvedValue({
            data: blob,
            headers: { 'content-disposition': 'attachment; filename="r1.pdf"' },
        });
        const res = await exportReporte('r1', 'pdf');
        expect(mockClient.get).toHaveBeenCalledWith('/reportes/r1/export/pdf', {
            responseType: 'blob',
        });
        expect(res.blob).toBe(blob);
        expect(res.filename).toBe('r1.pdf');
    });

    it('exportReporte usa la ruta /export/excel para el formato excel', async () => {
        const blob = new Blob(['xlsx'], { type: 'application/octet-stream' });
        mockClient.get.mockResolvedValue({ data: blob, headers: {} });
        const res = await exportReporte('r1', 'excel');
        expect(mockClient.get).toHaveBeenCalledWith('/reportes/r1/export/excel', {
            responseType: 'blob',
        });
        expect(res.filename).toBeNull();
    });
});
