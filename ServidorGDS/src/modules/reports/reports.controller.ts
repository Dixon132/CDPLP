/**
 * `ReportsController`: API HTTP del `Generador_Reportes`.
 *
 * Bajo el prefijo global `/api/gds`:
 *  - `POST /analisis/:analisisId/reportes`  genera y persiste un reporte del
 *    horizonte indicado desde los resultados semanales acumulados (Req. 19.1,
 *    19.3, 19.4).
 *  - `GET  /analisis/:analisisId/reportes`  lista los reportes del analisis.
 *  - `GET  /reportes/:id`                   recupera un reporte por id.
 *  - `GET  /reportes/:id/export/pdf`        descarga el reporte como PDF (Req. 19.5).
 *  - `GET  /reportes/:id/export/excel`      descarga el reporte como Excel (Req. 19.5).
 *
 * El `ValidationPipe` global aplica las reglas del DTO (class-validator),
 * devolviendo 400 con el campo no conforme ante datos invalidos (Req. 40.4).
 *
 * _Requirements: 19.1, 19.3, 19.4, 19.5, 40.4_
 */
import { Controller, Get, Param, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';

import { GenerarReporteDto } from './dto/generar-reporte.dto';
import { ReportsExportService } from './reports.export.service';
import { ReportsService } from './reports.service';
import type { ReporteGenerado } from './reports.types';

@ApiTags('reportes')
@Controller()
export class ReportsController {
    constructor(
        private readonly service: ReportsService,
        private readonly exportService: ReportsExportService,
    ) { }

    @Post('analisis/:analisisId/reportes')
    @ApiOperation({
        summary:
            'Genera un reporte por horizonte (semanal..final) desde los resultados semanales acumulados (Req. 19.1, 19.3).',
    })
    @ApiParam({ name: 'analisisId', description: 'Identificador del analisis.' })
    @ApiCreatedResponse({ description: 'Reporte generado y persistido.' })
    @ApiBadRequestResponse({ description: 'Horizonte/periodo invalido o institucion no participante.' })
    @ApiNotFoundResponse({ description: 'El analisis no existe.' })
    generar(
        @Param('analisisId') analisisId: string,
        @Body() dto: GenerarReporteDto,
    ): Promise<ReporteGenerado> {
        return this.service.generar({
            analisisId,
            horizonte: dto.horizonte,
            ...(dto.periodo !== undefined ? { periodo: dto.periodo } : {}),
            ...(dto.institucionId !== undefined ? { institucionId: dto.institucionId } : {}),
        });
    }

    @Get('analisis/:analisisId/reportes')
    @ApiOperation({ summary: 'Lista los reportes de un analisis (mas recientes primero).' })
    @ApiParam({ name: 'analisisId', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Catalogo de reportes del analisis.' })
    listar(@Param('analisisId') analisisId: string): Promise<ReporteGenerado[]> {
        return this.service.listar(analisisId);
    }

    @Get('reportes/:id')
    @ApiOperation({ summary: 'Recupera un reporte por su id.' })
    @ApiParam({ name: 'id', description: 'Identificador del reporte.' })
    @ApiOkResponse({ description: 'Reporte encontrado.' })
    @ApiNotFoundResponse({ description: 'El reporte no existe.' })
    obtener(@Param('id') id: string): Promise<ReporteGenerado> {
        return this.service.obtener(id);
    }

    @Get('reportes/:id/export/pdf')
    @ApiOperation({
        summary:
            'Descarga el reporte como PDF (PDFKit), conservando explicaciones y evidencias anonimizadas (Req. 19.5).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del reporte.' })
    @ApiProduces('application/pdf')
    @ApiOkResponse({ description: 'Archivo PDF descargable.' })
    @ApiNotFoundResponse({ description: 'El reporte no existe.' })
    async exportarPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const { buffer, filename, contentType } = await this.exportService.exportar(id, 'pdf');
        this.enviarDescarga(res, buffer, filename, contentType);
    }

    @Get('reportes/:id/export/excel')
    @ApiOperation({
        summary:
            'Descarga el reporte como Excel (ExcelJS), conservando explicaciones y evidencias anonimizadas (Req. 19.5).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del reporte.' })
    @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    @ApiOkResponse({ description: 'Archivo Excel (XLSX) descargable.' })
    @ApiNotFoundResponse({ description: 'El reporte no existe.' })
    async exportarExcel(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const { buffer, filename, contentType } = await this.exportService.exportar(id, 'excel');
        this.enviarDescarga(res, buffer, filename, contentType);
    }

    /** Escribe el `Buffer` como descarga binaria con cabeceras apropiadas. */
    private enviarDescarga(res: Response, buffer: Buffer, filename: string, contentType: string): void {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length.toString());
        res.end(buffer);
    }
}
