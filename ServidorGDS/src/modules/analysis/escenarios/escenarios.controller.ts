/**
 * `EscenariosController`: API HTTP de la `Biblioteca_Escenarios`.
 *
 * Expone el CRUD VERSIONADO de los `Escenario_Reutilizable` y la siembra de
 * predefinidos a traves del `Motor_Escenarios` (interfaz estable
 * `MOTOR_ESCENARIOS`). Depende solo de la interfaz, no de la implementacion
 * (Req. 29, 30.2). Bajo el prefijo global `/api/gds`, las rutas quedan en
 * `/api/gds/escenarios`.
 *
 * Reglas de dominio garantizadas por el motor:
 *  - `POST` crea un escenario PERSONALIZADO con `version = 1` (Req. 29.1).
 *  - `PUT` genera una NUEVA version sin mutar las previas (Req. 29.5, 29.6).
 *  - los predefinidos solo se introducen por `POST /escenarios/seed` (Req. 29.7).
 *
 * _Requirements: 29.1, 29.2, 29.5, 29.6, 29.7, 40.5_
 */
import {
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CrearEscenarioDto } from './dto/crear-escenario.dto';
import { EditarEscenarioDto } from './dto/editar-escenario.dto';
import {
    MOTOR_ESCENARIOS,
    type DefinicionEscenario,
    type EscenarioReutilizable,
    type MotorEscenarios,
} from './escenarios.types';

@ApiTags('escenarios')
@Controller('escenarios')
export class EscenariosController {
    constructor(
        @Inject(MOTOR_ESCENARIOS)
        private readonly motor: MotorEscenarios,
    ) { }

    @Get()
    @ApiOperation({
        summary:
            'Lista los Escenario_Reutilizable de la Biblioteca_Escenarios (predefinidos y personalizados).',
    })
    @ApiOkResponse({ description: 'Catalogo de escenarios disponibles.' })
    listar(): Promise<EscenarioReutilizable[]> {
        return this.motor.listar();
    }

    @Post('seed')
    @ApiOperation({
        summary:
            'Siembra IDEMPOTENTE de los escenarios predefinidos en la biblioteca.',
    })
    @ApiOkResponse({
        description: 'Escenarios predefinidos presentes tras la siembra.',
    })
    sembrar(): Promise<EscenarioReutilizable[]> {
        return this.motor.sembrarPredefinidos();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Recupera un Escenario_Reutilizable por su id.' })
    @ApiParam({ name: 'id', description: 'Identificador del escenario.' })
    @ApiOkResponse({ description: 'Escenario encontrado.' })
    @ApiNotFoundResponse({ description: 'El escenario no existe.' })
    async obtener(@Param('id') id: string): Promise<EscenarioReutilizable> {
        const escenario = await this.motor.obtenerPorId(id);
        if (!escenario) {
            throw new NotFoundException(
                `Escenario no encontrado en la biblioteca: ${id}`,
            );
        }
        return escenario;
    }

    @Post()
    @ApiOperation({
        summary:
            'Define y persiste un Escenario_Reutilizable personalizado (version 1).',
    })
    @ApiCreatedResponse({ description: 'Escenario creado.' })
    crear(@Body() dto: CrearEscenarioDto): Promise<EscenarioReutilizable> {
        const definicion: DefinicionEscenario = {
            ...dto,
            // Los escenarios creados por la API son siempre personalizados.
            esPredefinido: false,
        };
        return this.motor.guardar(definicion);
    }

    @Put(':id')
    @ApiOperation({
        summary:
            'Edita un escenario generando una NUEVA version sin mutar las previas.',
    })
    @ApiParam({ name: 'id', description: 'Identificador del escenario base.' })
    @ApiOkResponse({ description: 'Nueva version del escenario.' })
    @ApiNotFoundResponse({ description: 'El escenario base no existe.' })
    async editar(
        @Param('id') id: string,
        @Body() dto: EditarEscenarioDto,
    ): Promise<EscenarioReutilizable> {
        const existente = await this.motor.obtenerPorId(id);
        if (!existente) {
            throw new NotFoundException(
                `Escenario no encontrado en la biblioteca: ${id}`,
            );
        }
        return this.motor.editar(id, dto as Partial<EscenarioReutilizable>);
    }
}
