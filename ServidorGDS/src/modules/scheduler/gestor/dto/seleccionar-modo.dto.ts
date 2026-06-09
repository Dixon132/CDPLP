/**
 * DTO de seleccion del `Modo_Ejecucion` (endpoint `PUT /api/gds/analisis/:id/modo`).
 *
 * Valida la entrada con class-validator y se documenta en Swagger. Reglas
 * (Req. 32.1, 32.5, 40.4):
 *  - `modo`: uno de `AUTOMATICO` | `MANUAL` | `TIEMPO_REAL`.
 *  - `intervaloTiempoRealMs`: entero positivo en ms, OPCIONAL; solo aplica al
 *    `Modo_Ejecucion` Tiempo_Real (duracion de una `Semana_Simulada`,
 *    independiente de una semana calendario real). Si se omite en Tiempo_Real,
 *    el `GestorEjecucion` aplica el intervalo por defecto configurable.
 *
 * El `ValidationPipe` global rechaza con 400 los valores no conformes,
 * devolviendo el campo no conforme (Req. 40.4).
 *
 * _Requirements: 32.1, 32.5, 40.4_
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';

import {
    MODOS_EJECUCION,
    type ModoEjecucion,
} from '../../../analysis/analysis.types';

export class SeleccionarModoDto {
    @ApiProperty({
        description: 'Modo de ejecucion de la simulacion (Req. 32.1).',
        enum: MODOS_EJECUCION as readonly string[],
        example: 'TIEMPO_REAL',
    })
    @IsIn(MODOS_EJECUCION as readonly string[])
    modo!: ModoEjecucion;

    @ApiPropertyOptional({
        description:
            'Intervalo del Modo_Ejecucion Tiempo_Real en milisegundos (entero positivo). Duracion de una Semana_Simulada, independiente de una semana real (Req. 32.5).',
        minimum: 1,
        example: 60000,
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    intervaloTiempoRealMs?: number;
}
