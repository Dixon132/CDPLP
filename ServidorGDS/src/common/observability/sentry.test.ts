import * as Sentry from '@sentry/node';

import {
    inicializarSentry,
    sentryEstaActivo,
    capturarExcepcion,
    cerrarSentry,
} from './sentry';

/**
 * Pruebas del wrapper de Sentry del Servicio_Observabilidad.
 *
 * Verifica el comportamiento guardado por `SENTRY_DSN`: sin DSN todo es no-op
 * (dev/test/CI no requieren Sentry); con DSN se inicializa y se reportan los
 * errores (Req. 41.2).
 */
describe('Servicio_Observabilidad - Sentry (guardado por SENTRY_DSN)', () => {
    const dsnOriginal = process.env.SENTRY_DSN;

    afterEach(async () => {
        await cerrarSentry(0);
        if (dsnOriginal === undefined) {
            delete process.env.SENTRY_DSN;
        } else {
            process.env.SENTRY_DSN = dsnOriginal;
        }
        jest.restoreAllMocks();
    });

    it('es no-op cuando no hay SENTRY_DSN (inicializarSentry devuelve false)', () => {
        delete process.env.SENTRY_DSN;
        const initSpy = jest.spyOn(Sentry, 'init');

        const activo = inicializarSentry();

        expect(activo).toBe(false);
        expect(sentryEstaActivo()).toBe(false);
        expect(initSpy).not.toHaveBeenCalled();
    });

    it('es no-op cuando SENTRY_DSN esta vacio o en blanco', () => {
        process.env.SENTRY_DSN = '   ';
        const initSpy = jest.spyOn(Sentry, 'init');

        expect(inicializarSentry()).toBe(false);
        expect(initSpy).not.toHaveBeenCalled();
    });

    it('capturarExcepcion no lanza ni reporta cuando Sentry no esta activo', () => {
        delete process.env.SENTRY_DSN;
        inicializarSentry();
        const captureSpy = jest.spyOn(Sentry, 'captureException');

        expect(() => capturarExcepcion(new Error('fallo'))).not.toThrow();
        expect(captureSpy).not.toHaveBeenCalled();
    });

    it('inicializa Sentry y reporta excepciones cuando hay SENTRY_DSN', () => {
        process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
        const initSpy = jest.spyOn(Sentry, 'init').mockImplementation(() => undefined as never);
        const captureSpy = jest
            .spyOn(Sentry, 'captureException')
            .mockImplementation(() => 'event-id' as never);

        const activo = inicializarSentry();

        expect(activo).toBe(true);
        expect(sentryEstaActivo()).toBe(true);
        expect(initSpy).toHaveBeenCalledTimes(1);

        const error = new Error('boom');
        capturarExcepcion(error, { path: '/api/gds/x', statusCode: 500 });

        expect(captureSpy).toHaveBeenCalledWith(error, {
            extra: { path: '/api/gds/x', statusCode: 500 },
        });
    });

    it('es idempotente: no reinicializa si ya estaba activo', () => {
        process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
        const initSpy = jest.spyOn(Sentry, 'init').mockImplementation(() => undefined as never);

        expect(inicializarSentry()).toBe(true);
        expect(inicializarSentry()).toBe(true);

        expect(initSpy).toHaveBeenCalledTimes(1);
    });
});
