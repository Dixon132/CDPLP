/**
 * `ReportsExportService`: exportacion DESCARGABLE del `Generador_Reportes`
 * (tarea 23.2).
 *
 * Recupera un reporte ya persistido en `gds_reporte` (tarea 23.1) por su id via
 * el `ReportsService` y lo renderiza al formato solicitado (PDF con PDFKit o
 * Excel con ExcelJS, diseno D13), CONSERVANDO explicaciones y evidencias
 * anonimizadas (Req. 19.5). Devuelve el `Buffer`, el nombre de archivo sugerido
 * y el `Content-Type` para que el controlador dispare la descarga.
 *
 * _Requirements: 19.5_
 */
import { Injectable } from '@nestjs/common';

import { renderReporteExcel, renderReportePdf } from './reports.export';
import { ReportsService } from './reports.service';
import type { ReporteContenido } from './reports.types';

/** Formatos descargables soportados (Req. 19.5, diseno D13). */
export type FormatoExportacion = 'pdf' | 'excel';

/** Resultado de una exportacion lista para descargar. */
export interface ReporteExportado {
    buffer: Buffer;
    filename: string;
    contentType: string;
}

const CONTENT_TYPE_PDF = 'application/pdf';
const CONTENT_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class ReportsExportService {
    constructor(private readonly reports: ReportsService) { }

    /**
     * Exporta el reporte `id` al `formato` indicado, conservando explicaciones y
     * evidencias anonimizadas (Req. 19.5). Lanza `NotFoundException` (via
     * `ReportsService.obtener`) si el reporte no existe.
     */
    async exportar(id: string, formato: FormatoExportacion): Promise<ReporteExportado> {
        const reporte = await this.reports.obtener(id);
        const contenido = reporte.contenido;

        if (formato === 'excel') {
            const buffer = await renderReporteExcel(contenido);
            return {
                buffer,
                filename: this.nombreArchivo(id, contenido, 'xlsx'),
                contentType: CONTENT_TYPE_XLSX,
            };
        }

        const buffer = await renderReportePdf(contenido);
        return {
            buffer,
            filename: this.nombreArchivo(id, contenido, 'pdf'),
            contentType: CONTENT_TYPE_PDF,
        };
    }

    /** Construye un nombre de archivo descriptivo y seguro para descarga. */
    private nombreArchivo(id: string, contenido: ReporteContenido, ext: string): string {
        const partes = [
            'reporte',
            contenido.horizonte.toLowerCase(),
            `analisis-${contenido.analisisId}`,
            contenido.institucionId ? `institucion-${contenido.institucionId}` : 'todas',
            `p${contenido.periodo}`,
            id,
        ];
        const base = partes.join('_').replace(/[^a-zA-Z0-9._-]/g, '-');
        return `${base}.${ext}`;
    }
}
