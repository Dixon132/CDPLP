import type { IncomingMessage, ServerResponse } from 'http';

import { construirOpcionesLogger, RUTAS_REDACTADAS } from './logger.config';

/**
 * Pruebas de la configuracion del logger estructurado Pino del
 * Servicio_Observabilidad (Req. 41.1) y de la politica de no registrar secretos
 * (Req. 23, 41).
 */
describe('Servicio_Observabilidad - configuracion del logger Pino', () => {
    const nivelOriginal = process.env.LOG_LEVEL;
    const nodeEnvOriginal = process.env.NODE_ENV;

    afterEach(() => {
        if (nivelOriginal === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = nivelOriginal;
        if (nodeEnvOriginal === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = nodeEnvOriginal;
    });

    it('redacta cabeceras y campos sensibles para no registrar secretos', () => {
        const opciones = construirOpcionesLogger();
        const redact = opciones.pinoHttp && (opciones.pinoHttp as any).redact;

        expect(redact).toBeDefined();
        expect(redact.censor).toBe('[Redacted]');

        // Cubre credenciales en cabeceras y cuerpos.
        for (const ruta of [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'secret',
            'salt',
            'jwt',
        ]) {
            expect(redact.paths).toContain(ruta);
        }
    });

    it('expone las rutas redactadas como lista reutilizable y no vacia', () => {
        expect(Array.isArray(RUTAS_REDACTADAS)).toBe(true);
        expect(RUTAS_REDACTADAS.length).toBeGreaterThan(0);
        expect(RUTAS_REDACTADAS).toContain('req.headers.authorization');
    });

    it('respeta LOG_LEVEL cuando esta definido', () => {
        process.env.LOG_LEVEL = 'debug';
        const opciones = construirOpcionesLogger();
        expect((opciones.pinoHttp as any).level).toBe('debug');
    });

    it('usa nivel silent por defecto en entorno de pruebas', () => {
        delete process.env.LOG_LEVEL;
        process.env.NODE_ENV = 'test';
        const opciones = construirOpcionesLogger();
        expect((opciones.pinoHttp as any).level).toBe('silent');
    });

    it('clasifica el nivel de log segun el codigo de respuesta y el error', () => {
        const opciones = construirOpcionesLogger();
        const customLogLevel = (opciones.pinoHttp as any).customLogLevel as (
            req: IncomingMessage,
            res: ServerResponse,
            err?: Error,
        ) => string;

        const req = {} as IncomingMessage;
        expect(customLogLevel(req, { statusCode: 200 } as ServerResponse)).toBe('info');
        expect(customLogLevel(req, { statusCode: 404 } as ServerResponse)).toBe('warn');
        expect(customLogLevel(req, { statusCode: 500 } as ServerResponse)).toBe('error');
        expect(
            customLogLevel(req, { statusCode: 200 } as ServerResponse, new Error('x')),
        ).toBe('error');
    });
});
