/**
 * Punto de entrada del subsistema de observabilidad (Servicio_Observabilidad):
 * logging estructurado (Pino) y captura de errores (Sentry) del `ServidorGDS`
 * (D15; Req. 41.1, 41.2).
 */
export {
    inicializarSentry,
    sentryEstaActivo,
    capturarExcepcion,
    cerrarSentry,
} from './sentry';
export { construirOpcionesLogger, RUTAS_REDACTADAS } from './logger.config';
