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
import { PlanAnalisisPrisma } from '../../ciclo/adaptadores-prisma';
import { AlmacenEstadoEjecucionPrisma } from '../gestor/almacen-estado-ejecucion.prisma';
import { ColaProcesarSemanaService } from './cola-procesar-semana.service';
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
        // Dependencias del ENCADENADO SECUENCIAL del modo Automatico (opcionales:
        // en pruebas unitarias del processor no se inyectan y el encadenado se
        // omite de forma segura).
        @Optional() private readonly plan?: PlanAnalisisPrisma,
        @Optional() private readonly almacen?: AlmacenEstadoEjecucionPrisma,
        @Optional() private readonly encolador?: ColaProcesarSemanaService,
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
     *
     * Ademas, en modo AUTOMATICO encola la SIGUIENTE `Semana_Simulada` SOLO tras
     * registrar la actual (encadenado estrictamente secuencial: generar ->
     * analizar -> registrar -> siguiente). Asi nunca hay mas de una semana por
     * institucion en vuelo, lo que evita el desorden, los saltos y las repeticiones
     * del encolado masivo previo (los reintentos con backoff reordenaban la cola).
     */
    async process(job: Job<DatosTrabajoSemana>): Promise<ResultadoEjecucionTrabajo> {
        const maxIntentos = job.opts?.attempts ?? REINTENTOS_POR_DEFECTO;
        // `attemptsMade` cuenta los intentos YA consumidos; el actual es +1.
        const intento = (job.attemptsMade ?? 0) + 1;
        const resultado = await this.ejecutor.ejecutar(job.data, { intento, maxIntentos });

        const completada =
            !resultado.omitido && resultado.estado === EstadoTrabajo.COMPLETADO;

        if (this.progreso && completada) {
            this.progreso.publicarProgreso({
                analisisId: job.data.analisisId,
                institucionId: job.data.institucionId,
                tipo: 'ciclo',
                semanaActual: job.data.numeroSemana,
                estadoEjecucion: 'EN_EJECUCION',
            });
        }

        if (completada) {
            await this.encadenarSiguienteAutomatico(job.data);
        }

        return resultado;
    }

    /**
     * Encadena la siguiente `Semana_Simulada` del modo AUTOMATICO tras registrar
     * la actual. Solo actua si el `Analisis` esta en modo AUTOMATICO y no esta
     * PAUSADO/DETENIDO. Encola la semana `ultimaCompletada + 1` (que, al ir
     * estrictamente en orden, es contigua) hasta `totalSemanas`; cuando TODAS las
     * instituciones llegan al total, marca el `Analisis` COMPLETADO y se detiene.
     *
     * Es defensivo: cualquier error aqui se ignora (la semana actual YA quedo
     * registrada de forma atomica; no debe relanzarse para no provocar un
     * reintento del job ya completado).
     */
    private async encadenarSiguienteAutomatico(
        datos: DatosTrabajoSemana,
    ): Promise<void> {
        if (!this.plan || !this.almacen || !this.encolador) {
            return;
        }
        try {
            const { analisisId, institucionId } = datos;
            const { modoEjecucion, estadoEjecucion } =
                await this.almacen.obtener(analisisId);

            if (modoEjecucion !== 'AUTOMATICO') {
                return; // Manual y Tiempo_Real gestionan su propio ritmo.
            }
            if (estadoEjecucion === 'PAUSADO' || estadoEjecucion === 'DETENIDO') {
                return; // Respeta la pausa/parada: no encola mas semanas.
            }

            const total = await this.plan.totalSemanas(analisisId);
            const ultima = await this.plan.ultimaSemanaCompletada(
                analisisId,
                institucionId,
            );
            const siguiente = ultima + 1;

            if (siguiente <= total) {
                await this.encolador.encolar({
                    analisisId,
                    institucionId,
                    numeroSemana: siguiente,
                });
                return;
            }

            // Esta institucion llego al total. Si TODAS las del analisis terminaron,
            // el analisis queda COMPLETADO (condicion de parada del automatico).
            const instituciones = await this.plan.institucionesDe(analisisId);
            const ultimas = await Promise.all(
                instituciones.map((i) =>
                    this.plan!.ultimaSemanaCompletada(analisisId, i),
                ),
            );
            const todasCompletas =
                ultimas.length > 0 && ultimas.every((u) => u >= total);
            if (todasCompletas) {
                await this.almacen.fijarEstado(analisisId, 'COMPLETADO');
            }
        } catch {
            // Silencioso a proposito: la semana actual ya esta registrada; el
            // encadenado se reintentara en el proximo disparo (avanzar/reanudar).
        }
    }
}
