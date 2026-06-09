import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';
import * as observabilidad from '../observability';

/**
 * Pruebas del filtro de excepciones global respecto a la observabilidad:
 * los errores no controlados (5xx) se reportan a Sentry; los errores de cliente
 * (4xx) no (Req. 41.2). Verifica ademas la forma JSON homogenea de la respuesta.
 */
describe('AllExceptionsFilter - integracion con Sentry', () => {
    let filtro: AllExceptionsFilter;
    let capturarSpy: jest.SpyInstance;

    const construirHost = (): {
        host: ArgumentsHost;
        statusMock: jest.Mock;
        jsonMock: jest.Mock;
    } => {
        const jsonMock = jest.fn();
        const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        const response = { status: statusMock };
        const request = { method: 'GET', url: '/api/gds/test' };
        const host = {
            switchToHttp: () => ({
                getResponse: () => response,
                getRequest: () => request,
            }),
        } as unknown as ArgumentsHost;
        return { host, statusMock, jsonMock };
    };

    beforeEach(() => {
        filtro = new AllExceptionsFilter();
        capturarSpy = jest
            .spyOn(observabilidad, 'capturarExcepcion')
            .mockImplementation(() => undefined);
        // Silenciar el logger de error en la salida de la prueba.
        jest.spyOn((filtro as any).logger, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('reporta a Sentry los errores no controlados (5xx)', () => {
        const { host, statusMock, jsonMock } = construirHost();
        const error = new Error('fallo interno');

        filtro.catch(error, host);

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(capturarSpy).toHaveBeenCalledTimes(1);
        expect(capturarSpy).toHaveBeenCalledWith(error, {
            method: 'GET',
            path: '/api/gds/test',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
        );
    });

    it('NO reporta a Sentry los errores de cliente (4xx)', () => {
        const { host, statusMock } = construirHost();
        const error = new HttpException('no encontrado', HttpStatus.NOT_FOUND);

        filtro.catch(error, host);

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(capturarSpy).not.toHaveBeenCalled();
    });
});
