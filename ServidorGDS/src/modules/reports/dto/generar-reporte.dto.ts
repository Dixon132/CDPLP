/**
 * DTO de generacion de un reporte por horizonte
 * (`POST /api/gds/analisis/:analisisId/reportes`).
 *
 * Valida la entrada con class-validator y se documenta en Swagger. Reglas:
 *  - `horizonte`: uno de los cinco horizontes (Req. 19.1).
 *  - `periodo`: entero >= 1, 1-based dentro del horizonte; ignorado para `FINAL`
 *    (el `ReportsService` lo normaliza). Por defecto 1.
 *  - `institucionId`: opcional; acota el reporte a una `Institucion` (Req. 19.4).
 *
 * _Requirements: 19.1, 19.3, 19.4, 40.4_
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

import { HORIZONTES, Horizonte } from '../reports.types';

export class GenerarReporteDto {
    @ApiProperty({
        description: 'Horizonte temporal del reporte (Req. 19.1).',
        enum: HORIZONTES as readonly string[],
        example: Horizonte.MENSUAL,
    })
    @IsIn(HORIZONTES as readonly string[])
    horizonte!: Horizonte;

    @ApiPropertyOptional({
        description:
            'Periodo 1-based dentro del horizonte (p. ej. mensual 1 => semanas 1..4). Ignorado para FINAL. Por defecto 1.',
        minimum: 1,
        example: 1,
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    periodo?: number;

    @ApiPropertyOptional({
        description: 'Acota el reporte a una Institucion participante (Req. 19.4).',
        example: 'inst-1',
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    institucionId?: string;
}
