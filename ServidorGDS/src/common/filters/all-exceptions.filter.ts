import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { capturarExcepcion } from '../observability';

/**
 * Filtro de excepciones global del `ServidorGDS`.
 *
 * Normaliza cualquier excepcion a una respuesta JSON homogenea. Para las
 * `HttpException` de Nest (incluida la que produce el `ValidationPipe` ante
 * entradas no conformes) preserva el codigo y el detalle, de modo que el
 * mensaje identifique el/los campo(s) no conforme(s) (Req. 40.5).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const detalle =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${request.method} ${request.url} -> ${status}`,
                exception instanceof Error ? exception.stack : String(exception),
            );

            // Reporta el error no controlado a Sentry (no-op sin DSN; Req. 41.2).
            // Solo metadatos no sensibles de la peticion: nunca cuerpo/cabeceras
            // que puedan contener secretos.
            capturarExcepcion(exception, {
                method: request.method,
                path: request.url,
                statusCode: status,
            });
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            error: typeof detalle === 'string' ? { message: detalle } : detalle,
            // Exponer siempre en desarrollo el mensaje y stack para diagnóstico.
            ...(exception instanceof Error
                ? { debug: { message: exception.message, stack: exception.stack } }
                : {}),
        });
    }
}
