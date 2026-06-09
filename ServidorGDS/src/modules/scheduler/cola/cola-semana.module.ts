/**
 * `ColaSemanaModule` - cableado NestJS del procesamiento por `Cola_Trabajos`
 * (tarea 16.2).
 *
 * Registra, sobre la `COLA_PROCESAR_SEMANA` ya configurada por el `QueueModule`
 * (conexion Redis + reintentos/backoff por defecto, Req. 38.1, 38.4):
 *  - los puertos del motor de ciclos con sus adaptadores por defecto (reloj/ID
 *    inyectables, cerrojo de concurrencia, registro de estado consultable y
 *    verificacion de idempotencia);
 *  - el `EjecutorTrabajoSemana` (logica agnostica de cola);
 *  - el `ProcesarSemanaProcessor` (worker BullMQ) y el `ColaProcesarSemanaService`
 *    (frontera de encolado con `jobId` determinista).
 *
 * El `ProcesadorSemanaPort` se resuelve al `ProcesadorSemana` REAL provisto por
 * `CicloModule` (token `PROCESADOR_SEMANA`): genera (Modulo_Simulacion) ->
 * valida -> analiza (pipeline IA/fallback) -> aprende -> almacena en transaccion
 * atomica (resultado + embeddings en pgvector). La idempotencia se verifica
 * contra `gds_ciclo_semanal` (ciclo COMPLETADO), de modo que reintentar una
 * semana ya procesada no la reprocesa.
 *
 * Este modulo se monta desde el `Programador_Temporal`/`GestorEjecucion`
 * (tareas 16.3/17), que ARRANCAN el procesamiento en la app viva. Las conexiones
 * (BullMQ/Redis y Prisma) son perezosas, de modo que la app arranca sin exigir
 * una Redis/DB vivas en tiempo de construccion del modulo.
 *
 * _Requirements: 9.5, 27.2, 27.3, 27.5, 38.1, 38.2, 38.3, 38.4, 38.5, 10.6_
 */
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { COLA_PROCESAR_SEMANA } from '../../../queue/queue.constants';
import { CicloModule } from '../../ciclo/ciclo.module';
import { ConsultaResultadoSemanaPrisma } from '../../ciclo/adaptadores-prisma';
import { WsModule } from '../../ws/ws.module';
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdUuid,
    RegistroEstadoTrabajosEnMemoria,
    RelojSistema,
} from './adaptadores-memoria';
import { ColaProcesarSemanaService } from './cola-procesar-semana.service';
import {
    EjecutorTrabajoSemana,
    type DependenciasEjecutor,
} from './ejecutor-trabajo-semana';
import { ProcesarSemanaProcessor } from './procesar-semana.processor';
import {
    CERROJO_CONCURRENCIA,
    CONSULTA_RESULTADO_SEMANA,
    EJECUTOR_TRABAJO_SEMANA,
    GENERADOR_ID_COLA,
    REGISTRO_ESTADO_TRABAJOS,
    RELOJ_COLA,
    type CerrojoConcurrencia,
    type ConsultaResultadoSemana,
    type GeneradorId,
    type ProcesadorSemanaPort,
    type RegistroEstadoTrabajos,
    type Reloj,
} from './puertos-cola';
import { PROCESADOR_SEMANA } from '../procesarSemana';

@Module({
    imports: [
        BullModule.registerQueue({ name: COLA_PROCESAR_SEMANA }),
        // El UNICO `procesarSemana` REAL (genera->valida->analiza->aprende->
        // almacena) se provee via `CicloModule` bajo el token `PROCESADOR_SEMANA`.
        CicloModule,
        // Fachada de publicacion de progreso (Event-Driven -> WS Hub).
        WsModule,
    ],
    providers: [
        // Reloj e ID inyectables (Req. 18.4).
        { provide: RELOJ_COLA, useClass: RelojSistema },
        { provide: GENERADOR_ID_COLA, useClass: GeneradorIdUuid },

        // Cerrojo de concurrencia sobre `(A,I,N)` (Req. 27.3, 38.2).
        { provide: CERROJO_CONCURRENCIA, useClass: CerrojoConcurrenciaEnMemoria },

        // Idempotencia REAL: la semana ya esta procesada si su ciclo esta
        // COMPLETADO en `gds_ciclo_semanal` (Req. 27.2, 38.3).
        {
            provide: CONSULTA_RESULTADO_SEMANA,
            useClass: ConsultaResultadoSemanaPrisma,
        },

        // Registro de estado consultable (Req. 27.5, 38.5), con reloj/ID inyectados.
        {
            provide: REGISTRO_ESTADO_TRABAJOS,
            useFactory: (reloj: Reloj, generadorId: GeneradorId) =>
                new RegistroEstadoTrabajosEnMemoria(reloj, generadorId),
            inject: [RELOJ_COLA, GENERADOR_ID_COLA],
        },

        // Logica del procesador, agnostica de la cola.
        {
            provide: EJECUTOR_TRABAJO_SEMANA,
            useFactory: (
                procesador: ProcesadorSemanaPort,
                cerrojo: CerrojoConcurrencia,
                consultaResultado: ConsultaResultadoSemana,
                registro: RegistroEstadoTrabajos,
            ) => {
                const deps: DependenciasEjecutor = {
                    procesador,
                    cerrojo,
                    consultaResultado,
                    registro,
                };
                return new EjecutorTrabajoSemana(deps);
            },
            inject: [
                PROCESADOR_SEMANA,
                CERROJO_CONCURRENCIA,
                CONSULTA_RESULTADO_SEMANA,
                REGISTRO_ESTADO_TRABAJOS,
            ],
        },

        // Worker BullMQ + frontera de encolado.
        ProcesarSemanaProcessor,
        ColaProcesarSemanaService,
    ],
    exports: [
        ColaProcesarSemanaService,
        EJECUTOR_TRABAJO_SEMANA,
        REGISTRO_ESTADO_TRABAJOS,
        CERROJO_CONCURRENCIA,
        CONSULTA_RESULTADO_SEMANA,
        RELOJ_COLA,
        GENERADOR_ID_COLA,
    ],
})
export class ColaSemanaModule { }
