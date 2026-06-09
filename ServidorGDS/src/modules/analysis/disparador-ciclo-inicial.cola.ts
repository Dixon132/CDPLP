/**
 * `DisparadorCicloInicialCola` - adaptador REAL del `DisparadorCicloInicial`
 * (tarea 28.1 - cableado end-to-end).
 *
 * Sustituye al placeholder `DisparadorCicloInicialPendiente`: tras crear un
 * `Analisis`, el `Gestor_Analisis` dispara la `Semana_Simulada` 1 de cada
 * `Institucion` ENCOLANDO `procesarSemana(analisisId, institucionId, 1)` en la
 * `Cola_Trabajos` (BullMQ) a traves de la frontera estable
 * `ColaProcesarSemanaService` (Req. 8.5). El `jobId` determinista `(A,I,1)`
 * garantiza idempotencia del encolado (Req. 27.2, 38.3): re-disparar la semana 1
 * no crea un trabajo duplicado.
 *
 * El `Gestor_Analisis` sigue dependiendo SOLO de la frontera estable
 * `DISPARADOR_CICLO_INICIAL`; aqui se conecta esa frontera a la cola real sin
 * tocar el `AnalysisService`.
 *
 * _Requirements: 8.5, 27.2, 38.1, 38.3_
 */
import { Injectable } from '@nestjs/common';

import { ColaProcesarSemanaService } from '../scheduler/cola/cola-procesar-semana.service';
import type { DisparadorCicloInicial } from './analysis.types';

@Injectable()
export class DisparadorCicloInicialCola implements DisparadorCicloInicial {
    constructor(private readonly cola: ColaProcesarSemanaService) { }

    /** Encola la `Semana_Simulada` 1 de `(analisisId, institucionId)` (Req. 8.5). */
    async dispararSemanaInicial(
        analisisId: string,
        institucionId: string,
    ): Promise<void> {
        await this.cola.encolar({ analisisId, institucionId, numeroSemana: 1 });
    }
}
