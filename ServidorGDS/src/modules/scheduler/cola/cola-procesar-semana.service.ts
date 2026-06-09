/**
 * `ColaProcesarSemanaService` - frontera de ENCOLADO de la `Cola_Trabajos`
 * (tarea 16.2).
 *
 * El `Programador_Temporal` y la `Herramienta_Aceleracion` (tareas 16.3/17)
 * encolan aqui el procesamiento de cada `Semana_Simulada` por `Institucion`
 * (Req. 38.1). Este servicio:
 *  - usa un `jobId` DETERMINISTA `(A,I,N)` para que BullMQ deduplique encolados
 *    repetidos de la misma semana de la misma institucion (idempotencia de
 *    encolado, Req. 27.2, 38.3);
 *  - aplica la politica de reintentos ACOTADA con backoff exponencial
 *    (Req. 38.4), heredada de `QueueModule.defaultJobOptions` y reafirmada aqui;
 *  - registra el estado PENDIENTE de forma consultable al aceptar el trabajo
 *    (Req. 27.5, 38.5) y expone `consultarEstado` para consultarlo despues.
 *
 * _Requirements: 9.1, 27.2, 27.5, 38.1, 38.3, 38.4, 38.5_
 */
import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import {
    BACKOFF_BASE_MS,
    COLA_PROCESAR_SEMANA,
    REINTENTOS_POR_DEFECTO,
} from '../../../queue/queue.constants';
import { EstadoTrabajo } from './estados-trabajo';
import {
    REGISTRO_ESTADO_TRABAJOS,
    type RegistroEstadoTrabajo,
    type RegistroEstadoTrabajos,
} from './puertos-cola';
import {
    jobIdSemana,
    type DatosTrabajoSemana,
} from './trabajo-semana';

/** Resultado de encolar una `Semana_Simulada`. */
export interface ResultadoEncolado {
    jobId: string;
    estado: EstadoTrabajo;
    datos: DatosTrabajoSemana;
}

@Injectable()
export class ColaProcesarSemanaService {
    constructor(
        @InjectQueue(COLA_PROCESAR_SEMANA) private readonly cola: Queue,
        @Inject(REGISTRO_ESTADO_TRABAJOS)
        private readonly registro: RegistroEstadoTrabajos,
    ) { }

    /**
     * Encola el procesamiento de la `Semana_Simulada` `(A,I,N)` (Req. 38.1).
     *
     * El `jobId` determinista garantiza que reencolar la misma semana de la misma
     * institucion NO cree un trabajo duplicado (Req. 27.2, 38.3). Marca el estado
     * PENDIENTE de forma consultable (Req. 27.5, 38.5).
     */
    async encolar(datos: DatosTrabajoSemana): Promise<ResultadoEncolado> {
        const jobId = jobIdSemana(datos);

        await this.cola.add(COLA_PROCESAR_SEMANA, datos, {
            jobId,
            // Politica de reintentos ACOTADA con backoff exponencial (Req. 38.4).
            attempts: REINTENTOS_POR_DEFECTO,
            backoff: { type: 'exponential', delay: BACKOFF_BASE_MS },
        });

        await this.registro.marcar({
            datos,
            jobId,
            estado: EstadoTrabajo.PENDIENTE,
            intentos: 0,
        });

        return { jobId, estado: EstadoTrabajo.PENDIENTE, datos };
    }

    /**
     * Consulta el estado actual de un trabajo `(A,I,N)` (Req. 27.5, 38.5), o
     * `undefined` si nunca fue encolado.
     */
    consultarEstado(
        datos: DatosTrabajoSemana,
    ): Promise<RegistroEstadoTrabajo | undefined> {
        return this.registro.consultar(datos);
    }

    /** Lista el estado de todos los trabajos conocidos (diagnostico). */
    listarEstados(): Promise<RegistroEstadoTrabajo[]> {
        return this.registro.listar();
    }
}
