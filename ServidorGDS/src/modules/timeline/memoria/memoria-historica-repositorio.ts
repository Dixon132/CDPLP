/**
 * Puerto de persistencia de la MEMORIA HISTORICA del `Motor_Memoria_Contextual`
 * sobre `gds_tendencia_historica` y `gds_evento_historico` (tarea 22.2).
 *
 * Al completarse el analisis de una `Semana_Simulada`, las tendencias y eventos
 * detectados se REGISTRAN en la memoria historica con sus referencias trazables
 * a semana/comunidad/institucion de origen (Req. 39.1, 39.3). El historial
 * completo de cada `Analisis` queda conservado de forma consultable y trazable a
 * lo largo de todas sus `Semana_Simulada` (Req. 39.2), recuperable de forma
 * RELACIONAL por este puerto y de forma VECTORIAL por la `Memoria_Semantica`
 * (`Embeddings_Search`) sobre `pgvector` (Req. 39.4).
 *
 * Capa de acceso a datos DELGADA (thin repository) sobre el `PrismaService`
 * global del servicio. La integridad referencial a `Analisis`/`Comunidad_Digital`
 * y la cascada de borrado las gobierna el esquema Prisma (`onDelete: Cascade`),
 * fuera de este puerto.
 *
 * _Requirements: 39.1, 39.2, 39.3, 39.4_
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type {
    EventoHistoricoRegistro,
    FiltroHistoria,
    TendenciaHistoricaRegistro,
} from './motor-memoria-contextual.types';

/**
 * Puerto de persistencia de la memoria historica (tendencias + eventos).
 *
 * Contrato estable que el `Motor_Memoria_Contextual` consume sin conocer
 * detalles de Prisma. Solo registra y recupera de forma relacional; la
 * recuperacion vectorial vive en la `Memoria_Semantica` (Req. 39.4).
 */
export interface MemoriaHistoricaRepositorio {
    /** Registra (acumulando) las tendencias historicas detectadas (Req. 39.3). */
    registrarTendencias(tendencias: TendenciaHistoricaRegistro[]): Promise<void>;
    /** Registra (acumulando) los eventos historicos detectados (Req. 39.3). */
    registrarEventos(eventos: EventoHistoricoRegistro[]): Promise<void>;
    /** Recupera relacionalmente las tendencias historicas que cumplen el filtro (Req. 39.4). */
    listarTendencias(filtro: FiltroHistoria): Promise<TendenciaHistoricaRegistro[]>;
    /** Recupera relacionalmente los eventos historicos que cumplen el filtro (Req. 39.4). */
    listarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]>;
}

/** Subconjunto del `PrismaClient` usado por el repositorio (permite dobles). */
export type ClienteMemoriaHistorica = Pick<
    PrismaService,
    'tendenciaHistorica' | 'eventoHistorico'
>;

/** Traduce el filtro de dominio al `where` de tendencias historicas. */
function aWhereTendencia(filtro: FiltroHistoria): Prisma.TendenciaHistoricaWhereInput {
    const where: Prisma.TendenciaHistoricaWhereInput = { analisisId: filtro.analisisId };
    if (filtro.comunidadId !== undefined) where.comunidadId = filtro.comunidadId;
    if (filtro.numeroSemana !== undefined) where.numeroSemana = filtro.numeroSemana;
    return where;
}

/** Traduce el filtro de dominio al `where` de eventos historicos. */
function aWhereEvento(filtro: FiltroHistoria): Prisma.EventoHistoricoWhereInput {
    const where: Prisma.EventoHistoricoWhereInput = { analisisId: filtro.analisisId };
    if (filtro.comunidadId !== undefined) where.comunidadId = filtro.comunidadId;
    if (filtro.numeroSemana !== undefined) where.numeroSemana = filtro.numeroSemana;
    return where;
}

/**
 * Implementacion del puerto sobre la BD dedicada del servicio via
 * `PrismaService`.
 */
@Injectable()
export class MemoriaHistoricaRepositorioPrisma implements MemoriaHistoricaRepositorio {
    constructor(private readonly prisma: PrismaService) { }

    async registrarTendencias(tendencias: TendenciaHistoricaRegistro[]): Promise<void> {
        if (tendencias.length === 0) {
            return;
        }
        await this.prisma.tendenciaHistorica.createMany({
            data: tendencias.map((t) => ({
                analisisId: t.analisisId,
                comunidadId: t.comunidadId,
                numeroSemana: t.numeroSemana,
                dimension: t.dimension,
                direccion: t.direccion,
                magnitud: t.magnitud,
                zonaLatitud: t.zonaLatitud,
                zonaLongitud: t.zonaLongitud,
                zonaRadioMetros: t.zonaRadioMetros,
            })),
        });
    }

    async registrarEventos(eventos: EventoHistoricoRegistro[]): Promise<void> {
        if (eventos.length === 0) {
            return;
        }
        await this.prisma.eventoHistorico.createMany({
            data: eventos.map((e) => ({
                analisisId: e.analisisId,
                comunidadId: e.comunidadId,
                numeroSemana: e.numeroSemana,
                tipo: e.tipo,
                descripcion: e.descripcion,
            })),
        });
    }

    async listarTendencias(
        filtro: FiltroHistoria,
    ): Promise<TendenciaHistoricaRegistro[]> {
        const rows = await this.prisma.tendenciaHistorica.findMany({
            where: aWhereTendencia(filtro),
            orderBy: [{ numeroSemana: 'asc' }, { id: 'asc' }],
        });
        return rows.map((r) => ({
            analisisId: r.analisisId,
            comunidadId: r.comunidadId,
            numeroSemana: r.numeroSemana,
            dimension: r.dimension,
            direccion: r.direccion,
            magnitud: r.magnitud,
            zonaLatitud: r.zonaLatitud,
            zonaLongitud: r.zonaLongitud,
            zonaRadioMetros: r.zonaRadioMetros,
        }));
    }

    async listarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]> {
        const rows = await this.prisma.eventoHistorico.findMany({
            where: aWhereEvento(filtro),
            orderBy: [{ numeroSemana: 'asc' }, { id: 'asc' }],
        });
        return rows.map((r) => ({
            analisisId: r.analisisId,
            comunidadId: r.comunidadId,
            numeroSemana: r.numeroSemana,
            tipo: r.tipo,
            descripcion: r.descripcion,
        }));
    }
}
