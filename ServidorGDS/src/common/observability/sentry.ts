import * as Sentry from '@sentry/node';

/**
 * Captura de errores con Sentry para el `ServidorGDS` (Servicio_Observabilidad).
 *
 * La inicializacion esta **guardada por la variable de entorno `SENTRY_DSN`**:
 * cuando no hay DSN (entorno de desarrollo, pruebas o CI sin Sentry) todas las
 * funciones son **no-op**, de modo que el servicio arranca y los tests corren
 * sin requerir una cuenta de Sentry (Req. 41.2).
 *
 * Al producirse un error no controlado, el `AllExceptionsFilter` invoca
 * `capturarExcepcion(...)`, que solo reporta a Sentry si la inicializacion fue
 * efectiva.
 */

/** Estado de inicializacion del cliente Sentry (true solo si habia DSN valido). */
let sentryInicializado = false;

/**
 * Inicializa Sentry de forma idempotente y guardada por entorno.
 *
 * @returns `true` si Sentry quedo activo (habia `SENTRY_DSN`); `false` si quedo
 *          como no-op (sin DSN).
 */
export function inicializarSentry(): boolean {
    const dsn = process.env.SENTRY_DSN?.trim();

    // Sin DSN -> no-op total (dev/test/CI). No se inicializa nada.
    if (!dsn) {
        sentryInicializado = false;
        return false;
    }

    if (sentryInicializado) {
        return true;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? 'development',
        // Muestreo de tracing configurable; por defecto desactivado para no
        // introducir coste ni ruido en produccion sin configuracion explicita.
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
        // No enviar PII por defecto: coherente con el aislamiento de datos y la
        // politica de no filtrar secretos/datos personales (Req. 23, 41).
        sendDefaultPii: false,
    });

    sentryInicializado = true;
    return true;
}

/** Indica si el cliente Sentry esta activo (DSN presente e inicializado). */
export function sentryEstaActivo(): boolean {
    return sentryInicializado;
}

/**
 * Reporta una excepcion a Sentry. No-op si Sentry no fue inicializado.
 *
 * @param excepcion error o valor capturado por el filtro global.
 * @param contexto  etiquetas/extra no sensibles para enriquecer el evento.
 */
export function capturarExcepcion(
    excepcion: unknown,
    contexto?: Record<string, unknown>,
): void {
    if (!sentryInicializado) {
        return;
    }

    Sentry.captureException(excepcion, contexto ? { extra: contexto } : undefined);
}

/**
 * Cierra el cliente Sentry vaciando la cola de eventos pendientes. No-op si no
 * estaba activo. Util en apagados controlados o al final de las pruebas.
 *
 * @param timeoutMs tiempo maximo de espera para el flush.
 */
export async function cerrarSentry(timeoutMs = 2000): Promise<void> {
    if (!sentryInicializado) {
        return;
    }
    await Sentry.close(timeoutMs);
    sentryInicializado = false;
}
