/**
 * Adaptador Prisma del `AlmacenEstadoEjecucion` (Req. 32.1, 32.5, 32.6, 32.8).
 *
 * Persiste el `Modo_Ejecucion`, el intervalo del Tiempo_Real y el
 * `Estado_Ejecucion` del `Analisis` en la tabla `gds_analisis` de la BD dedicada,
 * de modo que el modo elegido por el usuario SOBREVIVE a reinicios del servidor
 * (a diferencia del adaptador en memoria). Sustituye al doble en memoria sin
 * tocar el `GestorEjecucion` (depende solo de la frontera estable).
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type {
    EstadoEjecucion,
    ModoEjecucion,
} from '../../analysis/analysis.types';
import type {
    AlmacenEstadoEjecucion,
    EstadoEjecucionAnalisis,
} from './puertos-gestor';

@Injectable()
export class AlmacenEstadoEjecucionPrisma implements AlmacenEstadoEjecucion {
    constructor(private readonly prisma: PrismaService) { }

    async obtener(analisisId: string): Promise<EstadoEjecucionAnalisis> {
        const fila = await this.prisma.analisis.findUnique({
            where: { id: analisisId },
            select: {
                modoEjecucion: true,
                intervaloTiempoRealMs: true,
                estadoEjecucion: true,
            },
        });
        if (!fila) {
            return {
                modoEjecucion: 'MANUAL',
                intervaloTiempoRealMs: null,
                estadoEjecucion: 'DETENIDO',
            };
        }
        return {
            modoEjecucion: fila.modoEjecucion as ModoEjecucion,
            intervaloTiempoRealMs: fila.intervaloTiempoRealMs,
            estadoEjecucion: fila.estadoEjecucion as EstadoEjecucion,
        };
    }

    async fijarModo(
        analisisId: string,
        modo: ModoEjecucion,
        intervaloTiempoRealMs: number | null,
    ): Promise<void> {
        await this.prisma.analisis.update({
            where: { id: analisisId },
            data: { modoEjecucion: modo, intervaloTiempoRealMs },
        });
    }

    async fijarEstado(
        analisisId: string,
        estado: EstadoEjecucion,
    ): Promise<void> {
        await this.prisma.analisis.update({
            where: { id: analisisId },
            data: { estadoEjecucion: estado },
        });
    }
}
