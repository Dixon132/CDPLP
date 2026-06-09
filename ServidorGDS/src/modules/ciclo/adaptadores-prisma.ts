/**
 * Adaptadores Prisma del motor de ciclos (tarea 28.1 - cableado end-to-end).
 *
 * Reemplazan los dobles/stubs en memoria por implementaciones reales sobre la BD
 * dedicada (`gds_analisis`/`gds_ciclo_semanal`), de modo que el
 * `Programador_Temporal`/`Herramienta_Aceleracion` (avance) y el
 * `EjecutorTrabajoSemana` (idempotencia) operen sobre el estado real del
 * `Analisis` sin tocar su logica (depende solo de los puertos estables).
 *
 *  - {@link PlanAnalisisPrisma}: estado de avance real de un `Analisis`
 *    (instituciones participantes, total de semanas y ultima semana COMPLETADA
 *    por institucion), leido de `gds_comunidad_digital`/`gds_analisis`/
 *    `gds_ciclo_semanal` (Req. 12.4, 18.3).
 *  - {@link ConsultaResultadoSemanaPrisma}: verificacion de idempotencia real
 *    (`(A,I,N)` ya COMPLETADA en `gds_ciclo_semanal`), de modo que un reintento
 *    de una semana ya procesada no la reprocese (Req. 27.2, 38.3).
 *
 * _Requirements: 12.4, 18.3, 27.2, 38.3_
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { EstadoTrabajo } from '../scheduler/cola/estados-trabajo';
import type { ConsultaResultadoSemana } from '../scheduler/cola/puertos-cola';
import type { PlanAnalisis } from '../scheduler/programador/puertos-programador';
import type { DatosTrabajoSemana } from '../scheduler/cola/trabajo-semana';

/**
 * `PlanAnalisis` real sobre la BD dedicada (Req. 12.4, 18.3): deriva el estado
 * de avance de cada `(analisisId, institucionId)` de las filas persistidas, sin
 * estado en memoria.
 */
@Injectable()
export class PlanAnalisisPrisma implements PlanAnalisis {
    constructor(private readonly prisma: PrismaService) { }

    /** `Institucion` participantes = comunidades del `Analisis` (Req. 9.5). */
    async institucionesDe(analisisId: string): Promise<string[]> {
        const comunidades = await this.prisma.comunidad.findMany({
            where: { analisisId },
            select: { institucionId: true },
            orderBy: { institucionId: 'asc' },
        });
        return comunidades.map((c) => c.institucionId);
    }

    /** Total de `Semana_Simulada` configuradas para el `Analisis`. */
    async totalSemanas(analisisId: string): Promise<number> {
        const analisis = await this.prisma.analisis.findUnique({
            where: { id: analisisId },
            select: { semanasTotales: true },
        });
        return analisis?.semanasTotales ?? 0;
    }

    /**
     * Ultima `Semana_Simulada` COMPLETADA de `(A,I)` (0 si ninguna). Como el
     * procesamiento es contiguo desde la semana 1, equivale a la cantidad de
     * semanas completadas y la siguiente pendiente es `+1` (Req. 12.4).
     */
    async ultimaSemanaCompletada(
        analisisId: string,
        institucionId: string,
    ): Promise<number> {
        const ultima = await this.prisma.cicloSemanal.findFirst({
            where: { analisisId, institucionId, estado: EstadoTrabajo.COMPLETADO },
            orderBy: { numeroSemana: 'desc' },
            select: { numeroSemana: true },
        });
        return ultima?.numeroSemana ?? 0;
    }
}

/**
 * Verificacion de idempotencia real (Req. 27.2, 38.3): la semana `(A,I,N)` ya
 * esta procesada si su `gds_ciclo_semanal` esta en estado COMPLETADO. Como
 * `procesarSemana` persiste el cierre del ciclo dentro de la MISMA transaccion
 * atomica que su resultado (tarea 16.1), un intento fallido no deja la semana
 * COMPLETADA: el reintento la reprocesa sin duplicar.
 */
@Injectable()
export class ConsultaResultadoSemanaPrisma implements ConsultaResultadoSemana {
    constructor(private readonly prisma: PrismaService) { }

    async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
        const ciclo = await this.prisma.cicloSemanal.findUnique({
            where: {
                analisisId_institucionId_numeroSemana: {
                    analisisId: datos.analisisId,
                    institucionId: datos.institucionId,
                    numeroSemana: datos.numeroSemana,
                },
            },
            select: { estado: true },
        });
        return ciclo?.estado === EstadoTrabajo.COMPLETADO;
    }
}
