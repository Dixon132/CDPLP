/**
 * `InstitutionsController`: API HTTP del `Gestor_Instituciones`.
 *
 * Expone el CRUD de instituciones educativas geolocalizadas y la consulta
 * PROACTIVA de restricciones de eliminacion a traves del `InstitutionsService`.
 * Bajo el prefijo global `/api/gds`, las rutas quedan en
 * `/api/gds/instituciones`.
 *
 * Reglas garantizadas por el servicio:
 *  - `POST` crea/persiste una `Institucion` validada (Req. 7.1-7.4).
 *  - `PUT` edita y audita los cambios (Req. 7.5).
 *  - `DELETE` rechaza ATOMICAMENTE el borrado de una institucion referenciada,
 *    devolviendo 409 con el mensaje de dependencia (Req. 7.6).
 *  - `GET :id/restricciones` expone las restricciones aun sin intentar borrar
 *    (Req. 7.8).
 *
 * El `ValidationPipe` global aplica las reglas de los DTO (class-validator),
 * devolviendo 400 con el campo no conforme ante datos invalidos (Req. 40.4).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 40.4_
 */
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CrearInstitucionDto } from './dto/crear-institucion.dto';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { InstitutionsService } from './institutions.service';
import type { Institucion, RestriccionEliminacion } from './institutions.types';

@ApiTags('instituciones')
@Controller('instituciones')
export class InstitutionsController {
    constructor(private readonly service: InstitutionsService) { }

    @Get()
    @ApiOperation({ summary: 'Lista todas las instituciones educativas.' })
    @ApiOkResponse({ description: 'Catalogo de instituciones.' })
    listar(): Promise<Institucion[]> {
        return this.service.listar();
    }

    @Get(':id/restricciones')
    @ApiOperation({
        summary:
            'Expone de forma proactiva las restricciones de eliminacion y el mensaje de dependencia (Req. 7.8).',
    })
    @ApiParam({ name: 'id', description: 'Identificador de la institucion.' })
    @ApiOkResponse({ description: 'Restricciones de eliminacion de la institucion.' })
    @ApiNotFoundResponse({ description: 'La institucion no existe.' })
    restricciones(@Param('id') id: string): Promise<RestriccionEliminacion> {
        return this.service.restriccionesEliminacion(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Recupera una institucion por su id.' })
    @ApiParam({ name: 'id', description: 'Identificador de la institucion.' })
    @ApiOkResponse({ description: 'Institucion encontrada.' })
    @ApiNotFoundResponse({ description: 'La institucion no existe.' })
    obtener(@Param('id') id: string): Promise<Institucion> {
        return this.service.obtener(id);
    }

    @Post()
    @ApiOperation({
        summary:
            'Crea y persiste una institucion educativa geolocalizada (Req. 7.1-7.4).',
    })
    @ApiCreatedResponse({ description: 'Institucion creada.' })
    crear(@Body() dto: CrearInstitucionDto): Promise<Institucion> {
        return this.service.crear(dto);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Edita una institucion y registra los cambios para auditoria (Req. 7.5).',
    })
    @ApiParam({ name: 'id', description: 'Identificador de la institucion.' })
    @ApiOkResponse({ description: 'Institucion actualizada.' })
    @ApiNotFoundResponse({ description: 'La institucion no existe.' })
    actualizar(
        @Param('id') id: string,
        @Body() dto: ActualizarInstitucionDto,
    ): Promise<Institucion> {
        return this.service.actualizar(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({
        summary:
            'Elimina una institucion; rechaza atomicamente si esta referenciada (Req. 7.6).',
    })
    @ApiParam({ name: 'id', description: 'Identificador de la institucion.' })
    @ApiNoContentResponse({ description: 'Institucion eliminada.' })
    @ApiNotFoundResponse({ description: 'La institucion no existe.' })
    @ApiConflictResponse({
        description: 'La institucion esta referenciada por un analisis y no puede eliminarse.',
    })
    async eliminar(@Param('id') id: string): Promise<void> {
        await this.service.eliminar(id);
    }
}
