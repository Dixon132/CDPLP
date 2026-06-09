/**
 * `FuenteResumenSemanalPrisma` - fuente real del resumen crudo de una
 * `Semana_Simulada` (tarea 28.1 - cableado end-to-end).
 *
 * Reemplaza el placeholder `FuenteResumenSemanalPendiente` del modulo `timeline`
 * por una implementacion que LEE de la BD dedicada el resumen ya persistido por
 * el motor de ciclos (`procesarSemana` -> `gds_memoria_semanal`), de modo que el
 * `Motor_Memoria_Contextual` pueda (re)consolidar la `Memoria_Jerarquica` sin
 * acoplarse a la `Capa_Analisis`/`Controlador_Ciclo` (Req. 28.1, 28.7, 28.8).
 *
 * Si la semana aun no tiene `gds_memoria_semanal` (p. ej. se invoca antes de
 * cerrarla), degrada a un resumen minimo coherente con el `Escenario` inmutable,
 * sin bloquear la consolidacion.
 *
 * _Requirements: 28.1, 28.7, 28.8_
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type {
    FuenteResumenSemanal,
    ResumenSemanaCruda,
} from './motor-memoria-contextual.service';

/** Coerce un valor `Json` de Prisma a una lista de cadenas (defensivo). */
function aListaCadenas(valor: unknown): string[] {
    if (!Array.isArray(valor)) {
        return [];
    }
    return valor.filter((v): v is string => typeof v === 'string');
}

@Injectable()
export class FuenteResumenSemanalPrisma implements FuenteResumenSemanal {
    constructor(private readonly prisma: PrismaService) { }

    async obtenerResumenSemana(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda> {
        const [comunidad, analisis, memoria] = await Promise.all([
            this.prisma.comunidad.findUniqueOrThrow({
                where: { id: comunidadId },
                select: { institucionId: true },
            }),
            this.prisma.analisis.findUniqueOrThrow({
                where: { id: analisisId },
                select: { escenario: true },
            }),
            this.prisma.memoriaSemanal.findUnique({
                where: {
                    analisisId_comunidadId_numeroSemana: {
                        analisisId,
                        comunidadId,
                        numeroSemana: semanaN,
                    },
                },
                select: {
                    escenario: true,
                    resumen: true,
                    eventosRelevantes: true,
                    cambiosImportantes: true,
                    anomalias: true,
                    tendencias: true,
                },
            }),
        ]);

        if (!memoria) {
            // Degradacion: la semana aun no esta cerrada; resumen minimo coherente
            // con el Escenario inmutable (Req. 28.7).
            return {
                escenario: analisis.escenario,
                institucionId: comunidad.institucionId,
                resumen: `Semana ${semanaN} sin resumen consolidado todavia.`,
                eventosRelevantes: [],
                cambiosImportantes: [],
                anomalias: [],
                tendencias: [],
            };
        }

        return {
            escenario: memoria.escenario || analisis.escenario,
            institucionId: comunidad.institucionId,
            resumen: memoria.resumen,
            eventosRelevantes: aListaCadenas(memoria.eventosRelevantes),
            cambiosImportantes: aListaCadenas(memoria.cambiosImportantes),
            anomalias: aListaCadenas(memoria.anomalias),
            tendencias: aListaCadenas(memoria.tendencias),
        };
    }
}
