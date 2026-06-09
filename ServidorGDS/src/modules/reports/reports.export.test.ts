/**
 * Pruebas unitarias de la exportacion descargable del `Generador_Reportes`
 * (tarea 23.2): render PDF (PDFKit) y Excel (ExcelJS) del `ReporteContenido`,
 * y el `ReportsExportService` que recupera el reporte y delega en los
 * renderizadores. Verifican que la exportacion CONSERVA explicaciones y
 * evidencias ANONIMIZADAS (Req. 19.5). Jest (sin vitest).
 *
 * _Requirements: 19.5_
 */
import { NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';

import { renderReporteExcel, renderReportePdf } from './reports.export';
import { ReportsExportService } from './reports.export.service';
import type { ReportsService } from './reports.service';
import { Horizonte, ReporteContenido, ReporteGenerado } from './reports.types';

function contenidoFake(): ReporteContenido {
    return {
        horizonte: Horizonte.MENSUAL,
        periodo: 1,
        rango: { desde: 1, hasta: 4 },
        analisisId: 'an-1',
        institucionId: 'inst-1',
        resumen: 'Reporte mensual del analisis an-1, semanas 1 a 4.',
        indicadores: [
            {
                dimension: 'estres_academico',
                valorInicial: 20,
                valorFinal: 50,
                minimo: 20,
                maximo: 50,
                promedio: 33.3,
                scoreCalibradoMlPromedio: 0.33,
                semanas: [1, 2, 4],
                evidenciaIds: ['ev-1', 'ev-2'],
            },
        ],
        cambios: [
            {
                dimension: 'estres_academico',
                desdeSemana: 1,
                hastaSemana: 4,
                variacionAbsoluta: 30,
                variacionPct: 150,
                direccion: 'sube',
                evidenciaIds: ['ev-1', 'ev-2'],
            },
        ],
        tendencias: [{ tipo: 'tendencia', descripcion: 'alza sostenida', comunidadId: 'com-1' }],
        detonantes: [{ evento: 'paro', semanas: [1, 2], evidenciaIds: ['ev-1'] }],
        explicaciones: [
            {
                dimension: 'estres_academico',
                numeroSemana: 1,
                que: 'aumento del estres colectivo',
                porQue: 'cercania de examenes',
                cuandoEmpezo: 'semana 1',
                comoEvoluciono: 'al alza',
                evidenciaIds: ['ev-1'],
            },
        ],
        publicacionesRelevantes: ['post:1', 'post:2'],
        evidencias: [
            {
                id: 'ev-1',
                tipo: 'variacion',
                contenido: 'contenido anonimizado de la evidencia uno',
                numeroSemana: 1,
                contributividad: 'CONTRIBUTIVO',
                refContenido: 'post:1',
                metricas: { conteo: 3 },
            },
            {
                id: 'ev-2',
                tipo: 'variacion',
                contenido: 'contenido anonimizado de la evidencia dos',
                numeroSemana: 2,
                contributividad: 'CONTRIBUTIVO',
                refContenido: 'post:2',
                metricas: { conteo: 5, variacionPct: 40 },
            },
        ],
        conclusiones: [
            { texto: 'La dimension colectiva "estres_academico" aumento (150%).', evidenciaIds: ['ev-1', 'ev-2'] },
        ],
        recomendaciones: [
            { texto: 'Dar seguimiento colectivo a "estres_academico".', evidenciaIds: ['ev-1', 'ev-2'] },
        ],
        generadoEn: '2025-02-02T00:00:00.000Z',
        semanasCubiertas: [1, 2, 4],
    };
}

function reporteFake(): ReporteGenerado {
    return {
        id: 'rep-1',
        analisisId: 'an-1',
        institucionId: 'inst-1',
        horizonte: Horizonte.MENSUAL,
        contenido: contenidoFake(),
        generadoEn: new Date('2025-02-02T00:00:00.000Z'),
    };
}

describe('renderReportePdf', () => {
    it('produce un PDF valido (cabecera %PDF) no vacio', async () => {
        const buffer = await renderReportePdf(contenidoFake());
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
        // Firma de archivo PDF.
        expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });
});

describe('renderReporteExcel', () => {
    it('produce un XLSX valido (firma ZIP PK) no vacio', async () => {
        const buffer = await renderReporteExcel(contenidoFake());
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
        // Firma de archivo ZIP (XLSX es un contenedor OOXML/ZIP).
        expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    });

    it('conserva explicaciones y evidencias anonimizadas en sus hojas (Req. 19.5)', async () => {
        const contenido = contenidoFake();
        const buffer = await renderReporteExcel(contenido);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

        // Las hojas esperadas existen.
        const nombresHojas = wb.worksheets.map((w) => w.name);
        expect(nombresHojas).toEqual(
            expect.arrayContaining(['Explicaciones', 'Evidencias', 'Conclusiones', 'Recomendaciones']),
        );

        // La explicacion se conserva (que / por que).
        const explicaciones = wb.getWorksheet('Explicaciones')!;
        const filaExpl = explicaciones.getRow(2);
        expect(filaExpl.getCell(3).value).toBe('aumento del estres colectivo');
        expect(filaExpl.getCell(4).value).toBe('cercania de examenes');

        // La evidencia conserva su id trazable y su contenido anonimizado.
        const evidencias = wb.getWorksheet('Evidencias')!;
        const ids: string[] = [];
        const contenidos: string[] = [];
        evidencias.eachRow((row, idx) => {
            if (idx === 1) return; // cabecera
            ids.push(String(row.getCell(1).value));
            contenidos.push(String(row.getCell(6).value));
        });
        expect(ids).toEqual(['ev-1', 'ev-2']);
        expect(contenidos).toContain('contenido anonimizado de la evidencia uno');

        // Las conclusiones referencian la evidencia por id (trazabilidad).
        const conclusiones = wb.getWorksheet('Conclusiones')!;
        expect(String(conclusiones.getRow(2).getCell(2).value)).toBe('ev-1, ev-2');
    });
});

describe('ReportsExportService', () => {
    function crearServicio(reporte: ReporteGenerado | null): ReportsExportService {
        const reports = {
            obtener: async (id: string) => {
                if (!reporte || reporte.id !== id) {
                    throw new NotFoundException(`Reporte no encontrado: ${id}`);
                }
                return reporte;
            },
        } as unknown as ReportsService;
        return new ReportsExportService(reports);
    }

    it('exporta a PDF con nombre y content-type correctos', async () => {
        const service = crearServicio(reporteFake());
        const out = await service.exportar('rep-1', 'pdf');
        expect(out.contentType).toBe('application/pdf');
        expect(out.filename).toMatch(/^reporte_mensual_analisis-an-1_institucion-inst-1_p1_rep-1\.pdf$/);
        expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('exporta a Excel con nombre y content-type correctos', async () => {
        const service = crearServicio(reporteFake());
        const out = await service.exportar('rep-1', 'excel');
        expect(out.contentType).toBe(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        expect(out.filename).toMatch(/\.xlsx$/);
        expect(out.buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    });

    it('propaga NotFound cuando el reporte no existe', async () => {
        const service = crearServicio(null);
        await expect(service.exportar('no-existe', 'pdf')).rejects.toBeInstanceOf(NotFoundException);
    });
});
