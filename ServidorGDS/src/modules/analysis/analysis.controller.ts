/**
 * `AnalysisController`: API HTTP del `Gestor_Analisis`.
 *
 * Expone la creacion y administracion de `Analisis` (estudios longitudinales) a
 * traves del `AnalysisService`. Bajo el prefijo global `/api/gds`, las rutas
 * quedan en `/api/gds/analisis`.
 *
 * Reglas garantizadas por el servicio:
 *  - `POST` crea un `Analisis` con escenario INMUTABLE fijado, una
 *    `Comunidad_Digital` por institucion y dispara la semana 1 por cada una
 *    (Req. 8.1, 8.3, 8.5, 8.6, 29.4, 29.6).
 *  - rechaza con 400 la creacion sin instituciones o con seleccion de escenario
 *    invalida (Req. 8.2, 8.4).
 *  - `DELETE` elimina el `Analisis` en CASCADA, aislado por analisis (Req. 25.4,
 *    25.7).
 *
 * El `ValidationPipe` global aplica las reglas de los DTO (class-validator),
 * devolviendo 400 con el campo no conforme ante datos invalidos (Req. 40.4).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 25.4, 25.7, 29.4, 29.6, 40.4_
 */
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { AnalysisService } from './analysis.service';
import type { Analisis } from './analysis.types';
import { CrearAnalisisDto } from './dto/crear-analisis.dto';

@ApiTags('analisis')
@Controller('analisis')
export class AnalysisController {
    constructor(private readonly service: AnalysisService) { }

    @Get()
    @ApiOperation({ summary: 'Lista todos los Analisis (estudios longitudinales).' })
    @ApiOkResponse({ description: 'Catalogo de analisis.' })
    listar(): Promise<Analisis[]> {
        return this.service.listar();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Recupera un Analisis por su id.' })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Analisis encontrado.' })
    @ApiNotFoundResponse({ description: 'El analisis no existe.' })
    obtener(@Param('id') id: string): Promise<Analisis> {
        return this.service.obtener(id);
    }

    @Get(':id/estado')
    @ApiOperation({
        summary: 'Estado/progreso del Analisis: modo, estado, semana actual/total.',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Estado de ejecucion y progreso.' })
    @ApiNotFoundResponse({ description: 'El analisis no existe.' })
    estado(@Param('id') id: string) {
        return this.service.obtenerEstado(id);
    }

    @Get(':id/comunidades')
    @ApiOperation({
        summary:
            'Lista las comunidades (instituciones + zona geografica) de un Analisis.',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Comunidades del analisis.' })
    @ApiNotFoundResponse({ description: 'El analisis no existe.' })
    comunidades(@Param('id') id: string) {
        return this.service.listarComunidades(id);
    }

    @Get(':id/instituciones/:institucionId/evolucion')
    @ApiOperation({
        summary: 'Evolucion temporal por dimension de una comunidad (Req. 22.2).',
    })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'institucionId' })
    @ApiOkResponse({ description: 'Serie de evolucion por dimension.' })
    evolucion(
        @Param('id') id: string,
        @Param('institucionId') institucionId: string,
    ) {
        return this.service.obtenerEvolucion(id, institucionId);
    }

    @Get(':id/instituciones/:institucionId/resultados')
    @ApiOperation({
        summary: 'Resultados semanales navegables de una comunidad (Req. 22.1).',
    })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'institucionId' })
    @ApiOkResponse({ description: 'Resultados semanales.' })
    resultados(
        @Param('id') id: string,
        @Param('institucionId') institucionId: string,
    ) {
        return this.service.obtenerResultados(id, institucionId);
    }

    @Get(':id/instituciones/:institucionId/cronologia')
    @ApiOperation({
        summary:
            'Cronología de contenido por semana de una institución: publicaciones tomadas en cuenta, aportes de post/comentarios/imagen y hashtags.',
    })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'institucionId' })
    @ApiOkResponse({ description: 'Cronología de contenido por semana.' })
    cronologia(
        @Param('id') id: string,
        @Param('institucionId') institucionId: string,
    ) {
        return this.service.obtenerCronologia(id, institucionId);
    }

    @Get(':id/instituciones/:institucionId/semanas/:semana/explicacion')
    @ApiOperation({
        summary: 'Explicacion que sustenta un indicador semanal (Req. 22.3).',
    })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'institucionId' })
    @ApiParam({ name: 'semana' })
    @ApiOkResponse({ description: 'Explicacion.' })
    explicacion(
        @Param('id') id: string,
        @Param('institucionId') institucionId: string,
        @Param('semana') semana: string,
    ) {
        return this.service.obtenerExplicacion(id, institucionId, Number(semana));
    }

    @Get(':id/instituciones/:institucionId/semanas/:semana/evidencias')
    @ApiOperation({
        summary: 'Evidencias que respaldan un resultado semanal (Req. 22.5).',
    })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'institucionId' })
    @ApiParam({ name: 'semana' })
    @ApiOkResponse({ description: 'Evidencias.' })
    evidencias(
        @Param('id') id: string,
        @Param('institucionId') institucionId: string,
        @Param('semana') semana: string,
    ) {
        return this.service.obtenerEvidencias(id, institucionId, Number(semana));
    }

    @Post()
    @ApiOperation({
        summary:
            'Crea un Analisis: fija el escenario inmutable, crea una comunidad por institucion y dispara la semana 1 (Req. 8.1, 8.3, 8.5, 8.6).',
    })
    @ApiCreatedResponse({ description: 'Analisis creado.' })
    @ApiBadRequestResponse({
        description:
            'Creacion invalida: sin instituciones, institucion inexistente o seleccion de escenario invalida (Req. 8.2, 8.4).',
    })
    crear(@Body() dto: CrearAnalisisDto): Promise<Analisis> {
        return this.service.crear(dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({
        summary:
            'Elimina un Analisis en cascada, aislado por analisis (Req. 25.4, 25.7).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiNoContentResponse({ description: 'Analisis eliminado en cascada.' })
    @ApiNotFoundResponse({ description: 'El analisis no existe.' })
    async eliminar(@Param('id') id: string): Promise<void> {
        await this.service.eliminar(id);
    }
}
