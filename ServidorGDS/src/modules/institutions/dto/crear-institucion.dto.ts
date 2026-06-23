/**
 * DTO de alta de una `Institucion` (endpoint `POST /api/gds/instituciones`).
 *
 * Valida la entrada con class-validator y se documenta en Swagger
 * (@nestjs/swagger). Reglas de geolocalizacion y categoria (Req. 7.2, 7.3):
 *  - `categoria` dentro de {universidad, colegio, instituto, escuela}.
 *  - `latitud` en [-90, 90]; `longitud` en [-180, 180] (grados decimales).
 *  - `radioMetros` entero positivo (radio de influencia en metros).
 *  - `logoUrl` y `descripcion` son opcionales (Req. 7.4).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 40.4_
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

import {
    CATEGORIAS_INSTITUCION,
    type CategoriaInstitucion,
} from '../institutions.types';

export class CrearInstitucionDto {
    @ApiProperty({
        description: 'Nombre legible de la institucion educativa.',
        example: 'Universidad Mayor de San Andres',
        maxLength: 200,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    nombre!: string;

    @ApiProperty({
        description: 'Categoria de la institucion.',
        enum: CATEGORIAS_INSTITUCION as readonly string[],
        example: 'universidad',
    })
    @IsIn(CATEGORIAS_INSTITUCION as readonly string[])
    categoria!: CategoriaInstitucion;

    @ApiProperty({
        description: 'Latitud geografica en grados decimales.',
        minimum: -90,
        maximum: 90,
        example: -16.5,
    })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitud!: number;

    @ApiProperty({
        description: 'Longitud geografica en grados decimales.',
        minimum: -180,
        maximum: 180,
        example: -68.15,
    })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitud!: number;

    @ApiProperty({
        description: 'Radio de influencia en metros (entero positivo).',
        minimum: 1,
        example: 1500,
    })
    @IsInt()
    @IsPositive()
    radioMetros!: number;

    @ApiPropertyOptional({
        description: 'Referencia al archivo del logo asociado a la institucion.',
        maxLength: 2048,
        example: 'https://cdn.gds/logos/umsa.png',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    logoUrl?: string;

    @ApiPropertyOptional({
        description: 'Descripcion libre de la institucion.',
        maxLength: 2000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    descripcion?: string;
}
