import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Controlador raiz del servicio. Expone el health-check publico del
 * `ServidorGDS` bajo `GET /api/gds/health` (liveness del servicio autonomo).
 */
@ApiTags('health')
@Controller()
export class AppController {
    @Get('health')
    @ApiOperation({ summary: 'Liveness del ServidorGDS' })
    @ApiOkResponse({
        description: 'El servicio esta operativo',
        schema: {
            example: { service: 'ServidorGDS', status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' },
        },
    })
    health(): { service: string; status: string; timestamp: string } {
        return {
            service: 'ServidorGDS',
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
