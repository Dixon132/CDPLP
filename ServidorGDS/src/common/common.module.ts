import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { construirOpcionesLogger } from './observability';

/**
 * Common module: utilidades transversales (filtros de excepcion, interceptores,
 * guards y logging/observabilidad).
 *
 * Registra el **logger estructurado Pino** (`nestjs-pino`) de forma global y lo
 * reexporta para que cualquier modulo de dominio inyecte el `Logger` y para que
 * `main.ts` lo establezca como logger de la aplicacion (request logging + logs
 * estructurados con redaccion de secretos; Req. 41.1). El filtro de excepciones
 * global y la inicializacion de Sentry se cablean en `main.ts`.
 */
@Module({
    imports: [LoggerModule.forRoot(construirOpcionesLogger())],
    exports: [LoggerModule],
})
export class CommonModule { }
