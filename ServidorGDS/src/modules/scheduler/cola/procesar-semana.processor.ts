/**
 * Procesador BullMQ de la `Cola_Trabajos` que ejecuta `procesarSemana` por cada
 * `Semana_Simulada` encolada (tarea 16.2).
 *
 * Es un envoltorio DELGADO sobre el `EjecutorTrabajoSemana` (logica agnostica de
 * cola): su unica responsabilidad es traducir el `Job` de BullMQ al contexto de
 * intento `(intento, maxIntentos)` y delegar. Asi la logica del motor de ciclos
 * permanece testeable de forma sincrona y determinista (sin Redis), y este
 * procesador solo aporta el "pegamento" con BullMQ.
 *
 * - **Idempotencia / concurrencia / estado / aislamiento**: las garantiza el
 *   `EjecutorTrabajoSemana` (ver su documentacion) sobre la triada `(A,I,N)`.
 * - **Reintentos acotados** (Req. 38.4): el ejecutor RELANZA el error cuando
 *   quedan intentos para que BullMQ aplique su backoff (configurado en
 *   `QueueModule.defaultJobOptions`); en el ultimo intento marca FALLIDO.
 * - **Aislamiento por institucion** (Req. 9.5, 38.4): cada `(A,I,N)` es un job
 *   independiente; un fallo de una institucion no detiene a las demas.
 *
 * _Requirements: 9.5, 27.2, 27.3, 27.5, 38.1, 38.2, 38.3, 38.4, 38.5, 10.6_
 */
import { Inject, Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { COLA_PROCESAR_SEMANA, REINTENTOS_POR_DEFECTO } from '../../../queue/queue.constants';
import { WsProgresoService } from '../../ws/ws-progreso.service';
import { EstadoTrabajo } from './estados-trabajo';
import {
    EjecutorTrabajoSemana,
    type ResultadoEjecucionTrabajo,
} from './ejecutor-trabajo-semana';
import { EJECUTOR_TRABAJO_SEMANA } from './puertos-cola';
import type { DatosTrabajoSemana } from './trabajo-semana';

@Processor(COLA_PROCESAR_SEMANA)
export class ProcesarSemanaProcessor extends WorkerHost {
    constructor(
        @Inject(EJECUTOR_TRABAJO_SEMANA)
        private readonly ejecutor: EjecutorTrabajoSemana,
        @Optional() private readonly progreso?: WsProgresoService,
    ) {
        super();
    }

    /**
     * Procesa un `Job` de la cola. Calcula el intento ACTUAL (1-indexado) a partir
     * de `job.attemptsMade` (intentos ya consumidos) y el maximo acotado desde
     * `job.opts.attempts` (o el valor por defecto del `QueueModule`).
     *
     * Tras un cierre de semana exitoso, publica el progreso del `Analisis` por el
     * WS Hub (Event-Driven), sin acoplarse al transporte WebSocket (Req. 18.6,
     * 21.4); un fallo de publicacion no afecta al resultado del ciclo.
     */
    async process(job: Job<DatosTrabajoSemana>): Promise<ResultadoEjecucionTrabajo> {
        const maxIntentos = job.opts?.attempts ?? REINTENTOS_POR_DEFECTO;
        // `attemptsMade` cuenta los intentos YA consumidos; el actual es +1.
        const intento = (job.attemptsMade ?? 0) + 1;
        const resultado = await this.ejecutor.ejecutar(job.data, { intento, maxIntentos });

        if (
            this.progreso &&
            !resultado.omitido &&
            resultado.estado === EstadoTrabajo.COMPLETADO
        ) {
            this.progreso.publicarProgreso({
                analisisId: job.data.analisisId,
                institucionId: job.data.institucionId,
                tipo: 'ciclo',
                semanaActual: job.data.numeroSemana,
                estadoEjecucion: 'EN_EJECUCION',
            });
        }

        return resultado;
    }
}
