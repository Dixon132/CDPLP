/**
 * DTO de creacion de un `Escenario_Reutilizable` en la `Biblioteca_Escenarios`.
 *
 * Valida (class-validator) la entrada del endpoint `POST /escenarios` y se
 * documenta en Swagger (class-transformer/@nestjs/swagger). Los escenarios
 * creados por la API son SIEMPRE personalizados (`esPredefinido = false`): los
 * predefinidos solo se introducen por siembra del `Motor_Escenarios`.
 *
 * _Requirements: 29.1, 29.7, 40.5_
 */
import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsIn,
    IsInt,
    IsObject,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

import type { IntensidadEscenario } from '../escenarios.types';

/** Valores admitidos para la intensidad del escenario. */
export const INTENSIDADES_ESCENARIO: readonly IntensidadEscenario[] = [
    'baja',
    'media',
    'alta',
    'extrema',
];

export class CrearEscenarioDto {
    @ApiProperty({
        description: 'Nombre legible del escenario.',
        example: 'Conflicto barrial',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    nombre!: string;

    @ApiProperty({ description: 'Descripcion breve del escenario.' })
    @IsString()
    @MaxLength(500)
    descripcion!: string;

    @ApiProperty({
        description: 'Texto libre del contexto principal de cada generacion.',
    })
    @IsString()
    @MinLength(1)
    contexto!: string;

    @ApiProperty({
        description: 'Grado de impacto del escenario.',
        enum: INTENSIDADES_ESCENARIO as IntensidadEscenario[],
    })
    @IsIn(INTENSIDADES_ESCENARIO as IntensidadEscenario[])
    intensidad!: IntensidadEscenario;

    @ApiProperty({
        description: 'Numero de semanas estimado de vigencia/impacto.',
        minimum: 0,
        example: 6,
    })
    @IsInt()
    @Min(0)
    duracionEsperada!: number;

    @ApiProperty({
        description: 'Eventos que disparan o intensifican el escenario.',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    eventosDetonantes!: string[];

    @ApiProperty({
        description: 'Colectivos/roles que participan.',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    actoresInvolucrados!: string[];

    @ApiProperty({
        description: 'Categoria del escenario.',
        example: 'sociopolitico',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(60)
    categoria!: string;

    @ApiProperty({
        description: 'Etiquetas para busqueda/clasificacion.',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    tags!: string[];

    @ApiProperty({
        description: 'Ajustes de comportamiento de los Usuario_Sintetico.',
        type: Object,
        default: {},
    })
    @IsObject()
    configuracionComportamiento!: Record<string, unknown>;

    @ApiProperty({
        description: 'Parametros adicionales del escenario.',
        type: Object,
        default: {},
    })
    @IsObject()
    parametros!: Record<string, unknown>;
}
