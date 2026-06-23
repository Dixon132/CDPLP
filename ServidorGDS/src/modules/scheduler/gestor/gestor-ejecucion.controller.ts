/**
 * `GestorEjecucionController` - API HTTP del control de `Modo_Ejecucion` de un
 * `Analisis` (tarea 17.1).
 *
 * Expone, bajo el prefijo global `/api/gds`, el control del ritmo de la
 * simulacion desde el `Frontend_GDS` (Req. 32):
 *  - `PUT  /analisis/:id/modo`     -> selecciona el modo (y el intervalo del
 *    Tiempo_Real) (Req. 32.1, 32.5).
 *  - `POST /analisis/:id/avanzar`  -> avanza segun el modo: una semana (Manual),
 *    hasta el final (Automatico) o arranca el contador (Tiempo_Real)
 *    (Req. 32.2, 32.3, 32.4).
 *  - `POST /analisis/:id/pausar`   -> pausa la ejecucion automatica/tiempo real
 *    conservando el estado (Req. 32.6, 32.8).
 *  - `POST /analisis/:id/reanudar` -> reanuda desde la siguiente semana pendiente
 *    (Req. 32.6, 32.8).
 *
 * Los tres modos encolan `procesarSemana` en la misma `Cola_Trabajos`, de modo
 * que el resultado del `Analisis` es equivalente sea cual sea el modo (Req.
 * 32.7). El `ValidationPipe` global valida los DTO (Req. 40.4).
 *
 * _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
 */
import {
    Body,
    Controller,
    HttpCode,
    Inject,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import {
    GestorEjecucionService,
    type ResultadoEjecucion,
} from './gestor-ejecucion';
import { GESTOR_EJECUCION } from './puertos-gestor';
import { SeleccionarModoDto } from './dto/seleccionar-modo.dto';

@ApiTags('ejecucion')
@Controller('analisis')
export class GestorEjecucionController {
    constructor(
        @Inject(GESTOR_EJECUCION)
        private readonly gestor: GestorEjecucionService,
    ) { }

    @Put(':id/modo')
    @HttpCode(204)
    @ApiOperation({
        summary:
            'Selecciona el Modo_Ejecucion (Automatico/Manual/Tiempo_Real) y, si aplica, el intervalo del Tiempo_Real (Req. 32.1, 32.5).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Modo de ejecucion actualizado.' })
    @ApiBadRequestResponse({ description: 'Modo o intervalo invalido (Req. 40.4).' })
    async seleccionarModo(
        @Param('id') id: string,
        @Body() dto: SeleccionarModoDto,
    ): Promise<void> {
        await this.gestor.seleccionarModo(
            id,
            dto.modo,
            dto.intervaloTiempoRealMs,
        );
    }

    @Post(':id/avanzar')
    @ApiOperation({
        summary:
            'Avanza la simulacion segun el modo: una semana (Manual), hasta el final (Automatico) o arranca el contador (Tiempo_Real) (Req. 32.2, 32.3, 32.4).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Avance disparado; trabajos encolados.' })
    async avanzar(@Param('id') id: string): Promise<ResultadoEjecucion> {
        try {
            return await this.gestor.avanzar(id);
        } catch (err) {
            // Log del error real para diagnóstico
            const msg = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : '';
            console.error(`[GDS][avanzar] Error al avanzar analisis ${id}:`, msg, stack);
            throw err;
        }
    }

    @Post(':id/pausar')
    @HttpCode(204)
    @ApiOperation({
        summary:
            'Pausa la ejecucion Automatico/Tiempo_Real conservando el estado del Analisis (Req. 32.6, 32.8).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Ejecucion pausada.' })
    @ApiBadRequestResponse({
        description: 'El analisis no esta en un estado pausable.',
    })
    async pausar(@Param('id') id: string): Promise<void> {
        await this.gestor.pausar(id);
    }

    @Post(':id/reanudar')
    @ApiOperation({
        summary:
            'Reanuda la ejecucion pausada desde la siguiente Semana_Simulada pendiente (Req. 32.6, 32.8).',
    })
    @ApiParam({ name: 'id', description: 'Identificador del analisis.' })
    @ApiOkResponse({ description: 'Ejecucion reanudada; trabajos encolados.' })
    @ApiBadRequestResponse({ description: 'El analisis no esta pausado.' })
    reanudar(@Param('id') id: string): Promise<ResultadoEjecucion> {
        return this.gestor.reanudar(id);
    }
}
