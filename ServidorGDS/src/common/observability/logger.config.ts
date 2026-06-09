import type { Params } from 'nestjs-pino';
import type { LevelWithSilent } from 'pino';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Configuracion del logger estructurado del `ServidorGDS` (Servicio_Observabilidad).
 *
 * Usa **Pino** (estructurado, JSON) integrado con NestJS mediante `nestjs-pino`,
 * cubriendo el logging de aplicacion y el **request logging** HTTP (Req. 41.1).
 *
 * Politica de seguridad: **los secretos no se registran**. Se aplica redaccion
 * (`redact`) sobre cabeceras y campos sensibles (Authorization, cookies, JWT,
 * passwords, secretos, salt de anonimizacion, etc.), reemplazandolos por
 * `[Redacted]`, coherente con el aislamiento de datos (Req. 23, 41).
 */

/**
 * Rutas (paths de Pino) de campos sensibles a redactar en todo log/request.
 * Cubre cabeceras HTTP y cuerpos/objetos con credenciales o datos sensibles.
 */
export const RUTAS_REDACTADAS: readonly string[] = [
    // Cabeceras HTTP entrantes
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["set-cookie"]',
    'req.headers["x-api-key"]',
    'req.headers["x-auth-token"]',
    // Cabeceras de respuesta
    'res.headers["set-cookie"]',
    // Campos sensibles habituales en cuerpos/objetos logueados
    'password',
    'pass',
    'token',
    'accessToken',
    'refreshToken',
    'jwt',
    'authorization',
    'secret',
    'jwtSecret',
    'apiKey',
    'salt',
    'dsn',
    // Variantes anidadas frecuentes
    '*.password',
    '*.token',
    '*.secret',
    '*.salt',
    '*.authorization',
];

/**
 * Construye las opciones de `nestjs-pino` (`LoggerModule.forRoot`) para el
 * servicio. El nivel de log y el "pretty print" son configurables por entorno.
 *
 * - `LOG_LEVEL` controla el nivel (`info` por defecto; `silent` recomendado en
 *   pruebas para no contaminar la salida de Jest).
 * - En `production` se emite JSON puro (sin transport) para ingesta por la
 *   plataforma de logs; fuera de produccion puede usarse `pino-pretty` si esta
 *   disponible.
 */
export function construirOpcionesLogger(): Params {
    const nivel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

    return {
        pinoHttp: {
            level: nivel,
            // Identificador de servicio para correlacionar logs multi-servicio.
            base: { service: 'servidor-gds' },
            // Redaccion de secretos: nunca se escriben en claro (Req. 23, 41).
            redact: {
                paths: [...RUTAS_REDACTADAS],
                censor: '[Redacted]',
            },
            // Clasificacion de nivel por codigo de respuesta para request logging.
            customLogLevel: (
                _req: IncomingMessage,
                res: ServerResponse,
                err?: Error,
            ): LevelWithSilent => {
                if (err || res.statusCode >= 500) {
                    return 'error';
                }
                if (res.statusCode >= 400) {
                    return 'warn';
                }
                return 'info';
            },
        },
    };
}
