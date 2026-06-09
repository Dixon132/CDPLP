/**
 * DTO de creacion de un `Analisis` (endpoint `POST /api/gds/analisis`).
 *
 * Valida la entrada con class-validator y se documenta en Swagger
 * (@nestjs/swagger). Reglas de dominio (Req. 8.1-8.4, 29.2-29.4):
 *  - `nombre` obligatorio.
 *  - `institucionIds`: al menos UNA `Institucion` (Req. 8.3, 8.4). El
 *    `ValidationPipe` global rechaza con 400 una lista vacia, devolviendo el
 *    campo no conforme.
 *  - `radioAnalisis`: entero positivo en metros (base de la `Zona_Geografica`).
 *  - `semanasTotales`: entero en [1, 24] (Req. 8.1, configuracion temporal).
 *  - Escenario: de la `Biblioteca_Escenarios` (`escenarioId`) O personalizado en
 *    texto libre (`personalizado`), con la opcion de guardarlo en la biblioteca
 *    (`guardarEnBiblioteca`) (Req. 8.2, 29.2, 29.3). La exclusividad y presencia
 *    de uno de los dos la valida el `Gestor_Analisis` (mensaje de validacion).
 *  - `modoEjecucion` opcional (Req. 32); por defecto `MANUAL`.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 29.2, 29.3, 40.4_
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

import {
    MODOS_EJECUCION,
    SEMANAS_MAXIMAS,
    type ModoEjecucion,
} from '../analysis.types';

export class CrearAnalisisDto {
    @ApiProperty({
        description: 'Nombre legible del estudio longitudinal.',
        example: 'Tendencias UMSA - conflicto universitario 2025',
        maxLength: 200,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    nombre!: string;

    @ApiProperty({
        description:
            'Identificadores de las Institucion participantes (al menos una, Req. 8.3, 8.4).',
        type: [String],
        example: ['inst-1', 'inst-2'],
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsString({ each: true })
    institucionIds!: string[];

    @ApiProperty({
        description: 'Radio de analisis en metros (entero positivo).',
        minimum: 1,
        example: 1500,
    })
    @IsInt()
    @IsPositive()
    radioAnalisis!: number;

    @ApiProperty({
        description: `Numero total de Semana_Simulada (1..${SEMANAS_MAXIMAS}).`,
        minimum: 1,
        maximum: SEMANAS_MAXIMAS,
        example: 12,
    })
    @IsInt()
    @Min(1)
    @Max(SEMANAS_MAXIMAS)
    semanasTotales!: number;

    @ApiPropertyOptional({
        description:
            'Identificador de un Escenario_Reutilizable de la Biblioteca_Escenarios (Req. 8.2, 29.2). Excluyente con `personalizado`.',
        example: 'esc-guerra-del-gas',
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    escenarioId?: string;

    @ApiPropertyOptional({
        description:
            'Escenario personalizado en texto libre (Req. 8.2, 29.3). Excluyente con `escenarioId`.',
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    personalizado?: string;

    @ApiPropertyOptional({
        description:
            'Si se define un escenario personalizado, guardarlo en la biblioteca para reutilizarlo (Req. 29.3).',
        default: false,
    })
    @IsOptional()
    guardarEnBiblioteca?: boolean;

    @ApiPropertyOptional({
        description: 'Modo de ejecucion inicial (Req. 32). Por defecto MANUAL.',
        enum: MODOS_EJECUCION as readonly string[],
        default: 'MANUAL',
    })
    @IsOptional()
    @IsIn(MODOS_EJECUCION as readonly string[])
    modoEjecucion?: ModoEjecucion;

    @ApiPropertyOptional({
        description:
            'Intervalo del modo Tiempo_Real en milisegundos (entero positivo), si aplica (Req. 32).',
        minimum: 1,
        example: 60000,
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    intervaloTiempoRealMs?: number;
}
