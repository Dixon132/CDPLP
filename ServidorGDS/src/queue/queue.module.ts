import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
    BACKOFF_BASE_MS,
    COLA_PROCESAR_SEMANA,
    REINTENTOS_POR_DEFECTO,
} from './queue.constants';
import { parseRedisUrl } from './redis-connection';

/**
 * Queue module: configuracion de BullMQ sobre la Redis PROPIA del servicio.
 *
 * Registra:
 *  - La conexion raiz a la Redis dedicada (resuelta desde `REDIS_URL` por
 *    `ConfigService`), con opciones de trabajo por defecto: reintentos
 *    acotados y backoff exponencial (Req. 38.1, 38.4).
 *  - Una cola nombrada (`COLA_PROCESAR_SEMANA`) que el `Scheduler` /
 *    `Controlador_Ciclo` reutilizaran para encolar cada `Semana_Simulada`
 *    por `Institucion` (Req. 38.1).
 *
 * Es `@Global()` y reexporta `BullModule` para que cualquier modulo de dominio
 * pueda inyectar la cola con `@InjectQueue(COLA_PROCESAR_SEMANA)` sin volver a
 * configurar la conexion. Los procesadores de la cola (`procesarSemana`) se
 * implementan en una tarea posterior; aqui solo se configura la infraestructura.
 */
@Global()
@Module({
    imports: [
        // Conexion raiz a la Redis dedicada + opciones de trabajo por defecto.
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: parseRedisUrl(config.getOrThrow<string>('REDIS_URL')),
                defaultJobOptions: {
                    // Politica de reintentos acotada ante fallos (Req. 38.4).
                    attempts: REINTENTOS_POR_DEFECTO,
                    backoff: {
                        type: 'exponential',
                        delay: BACKOFF_BASE_MS,
                    },
                    // Higiene de la cola: limpiar trabajos terminados/fallidos.
                    removeOnComplete: { count: 1_000 },
                    removeOnFail: { count: 5_000 },
                },
            }),
        }),
        // Cola nombrada reutilizable por el Scheduler (Req. 38.1).
        BullModule.registerQueue({
            name: COLA_PROCESAR_SEMANA,
        }),
    ],
    // Reexportar BullModule expone la cola registrada a los modulos consumidores.
    exports: [BullModule],
})
export class QueueModule { }
