import { Module } from '@nestjs/common';

import { GestorEjecucionModule } from './gestor/gestor-ejecucion.module';

/**
 * `SchedulerModule` - punto de montaje del motor de ciclos en la app viva
 * (tarea 28.1 - cableado end-to-end).
 *
 * Importa el `GestorEjecucionModule` (modos Manual/Automatico/Tiempo_Real +
 * pausar/reanudar y su API HTTP `PUT /analisis/:id/modo`, `POST .../avanzar`,
 * etc.), que a su vez monta el `ProgramadorModule` (Programador_Temporal /
 * Herramienta_Aceleracion) y el `ColaSemanaModule` (worker BullMQ + el UNICO
 * `procesarSemana` REAL via `CicloModule`). Asi el `app.module` resuelve toda la
 * cadena de orquestacion y el ciclo conecta de extremo a extremo:
 *
 *   crear analisis -> DisparadorCicloInicial (encola semana 1) -> Cola_Trabajos
 *   (BullMQ) -> procesarSemana (genera->valida->analiza->aprende->almacena) ->
 *   pgvector (Memoria_Semantica) + progreso WS.
 *
 * No hay ruta alternativa por modo: el modo solo decide QUIEN dispara y CUANDO,
 * reutilizando el mismo `procesarSemana` (Req. 12.3, 18.4, 32.7).
 *
 * El arranque no exige una Redis/DB vivas en tiempo de CONSTRUCCION del modulo:
 * las conexiones (BullMQ/ioredis y Prisma) se establecen de forma perezosa y con
 * reintentos, consistente con el patron del resto del servicio.
 *
 * _Requirements: 12.3, 13.1, 13.2, 13.3, 18.4, 33.2, 36.1_
 */
@Module({
    imports: [GestorEjecucionModule],
    exports: [GestorEjecucionModule],
})
export class SchedulerModule { }
