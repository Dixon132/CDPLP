/**
 * `ReportsService` (`Generador_Reportes`): produce reportes COLECTIVOS y
 * EXPLICATIVOS en cinco horizontes temporales (semanal, mensual, trimestral,
 * semestral y un informe final) para un `Analisis`, opcionalmente acotados a una
 * `Institucion`, a partir de los RESULTADOS SEMANALES ACUMULADOS (Req. 19).
 *
 * Provider `@Injectable()` que lee de la BD DEDICADA via `PrismaService` global
 * (`gds_resultado_analisis`, `gds_dimension_riesgo`, `gds_explicacion`,
 * `gds_evidences`, `gds_patron`) y persiste el reporte en `gds_reporte`,
 * asociado al `Analisis` y, cuando corresponde, a la `Institucion` (Req. 19.4).
 *
 * La GENERACION por horizonte y el contenido estructurado + narrativa
 * (Handlebars) son responsabilidad de esta tarea (23.1). El render descargable
 * (PDF/Excel con PDFKit/Puppeteer/ExcelJS) corresponde a la tarea 23.2 y consume
 * el `ReporteContenido` que aqui se persiste, conservando explicaciones y
 * evidencias.
 *
 * _Requirements: 19.1, 19.2, 19.3, 19.4_
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { construirContenido, rangoSemanas } from './reports.generador';
import {
    EvidenciaCruda,
    Horizonte,
    MetricaSemanaContenido,
    PatronCrudo,
    ReporteContenido,
    ReporteGenerado,
    ResultadoCrudo,
} from './reports.types';

/** Parametros de generacion de un reporte por horizonte (Req. 19.1, 19.3, 19.4). */
export interface GenerarReporteParams {
    analisisId: string;
    horizonte: Horizonte;
    /** Periodo 1-based dentro del horizonte (ignorado para `FINAL`). */
    periodo?: number;
    /** Acota el reporte a una `Institucion` especifica (Req. 19.4). */
    institucionId?: string | null;
}

/** Normaliza un valor `Json` de Prisma a un arreglo de strings. */
function aListaStrings(valor: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === 'string');
}

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Genera y PERSISTE un reporte del horizonte/periodo indicados desde los
     * resultados semanales acumulados, asociado al `Analisis` y, si se indica, a
     * la `Institucion` (Req. 19.1, 19.3, 19.4).
     */
    async generar(params: GenerarReporteParams): Promise<ReporteGenerado> {
        const { analisisId, horizonte } = params;
        const institucionId = params.institucionId ?? null;
        const periodo = horizonte === Horizonte.FINAL ? 1 : params.periodo ?? 1;

        const analisis = await this.prisma.analisis.findUnique({
            where: { id: analisisId },
            select: { id: true, semanasTotales: true },
        });
        if (!analisis) {
            throw new NotFoundException(`Analisis no encontrado: ${analisisId}`);
        }

        if (institucionId !== null) {
            const comunidad = await this.prisma.comunidad.findFirst({
                where: { analisisId, institucionId },
                select: { id: true },
            });
            if (!comunidad) {
                throw new BadRequestException(
                    `La institucion ${institucionId} no participa en el analisis ${analisisId}.`,
                );
            }
        }

        let rango;
        try {
            rango = rangoSemanas(horizonte, periodo, analisis.semanasTotales);
        } catch (err) {
            throw new BadRequestException(err instanceof Error ? err.message : 'Periodo invalido.');
        }

        const resultados = await this.leerResultados(analisisId, institucionId, rango.desde, rango.hasta);
        const patrones = await this.leerPatrones(analisisId, institucionId);

        const contenido = construirContenido({
            analisisId,
            institucionId,
            horizonte,
            periodo,
            rango,
            resultados,
            patrones,
        });

        // Si el reporte cubre TODO el analisis (sin institucion acotada), agrega
        // una SECCION por cada institucion participante (Req. 19.4): el mismo
        // reporte queda dividido por institucion para comparar su evolucion.
        if (institucionId === null) {
            const comunidades = await this.prisma.comunidad.findMany({
                where: { analisisId },
                select: {
                    institucionId: true,
                    institucion: { select: { nombre: true, logoUrl: true } },
                },
            });
            const secciones = [];
            for (const com of comunidades) {
                const resInst = resultados.filter((r) => r.institucionId === com.institucionId);
                if (resInst.length === 0) continue;
                const patrInst = await this.leerPatrones(analisisId, com.institucionId);
                const cronologia = await this.leerCronologia(
                    analisisId,
                    com.institucionId,
                    rango.desde,
                    rango.hasta,
                );
                const c = construirContenido({
                    analisisId,
                    institucionId: com.institucionId,
                    horizonte,
                    periodo,
                    rango,
                    resultados: resInst,
                    patrones: patrInst,
                });
                secciones.push({
                    institucionId: com.institucionId,
                    institucionNombre: com.institucion?.nombre ?? com.institucionId,
                    logoUrl: com.institucion?.logoUrl ?? null,
                    resumen: c.resumen,
                    indicadores: c.indicadores,
                    cambios: c.cambios,
                    conclusiones: c.conclusiones,
                    recomendaciones: c.recomendaciones,
                    detonantes: c.detonantes,
                    hitos: c.hitos,
                    cronologia,
                    semanasCubiertas: c.semanasCubiertas,
                });
            }
            contenido.secciones = secciones;
        }

        const fila = await this.prisma.reporte.create({
            data: {
                analisisId,
                institucionId,
                horizonte,
                contenido: contenido as unknown as Prisma.InputJsonValue,
            },
        });

        this.logger.log(
            `[reportes] generado id=${fila.id} analisis=${analisisId} ` +
            `institucion=${institucionId ?? 'todas'} horizonte=${horizonte} periodo=${periodo} ` +
            `semanas=${rango.desde}-${rango.hasta} evidencias=${contenido.evidencias.length}`,
        );

        return {
            id: fila.id,
            analisisId: fila.analisisId,
            institucionId: fila.institucionId,
            horizonte: fila.horizonte as Horizonte,
            contenido,
            generadoEn: fila.generadoEn,
        };
    }

    /** Lista los reportes de un `Analisis`, mas recientes primero. */
    async listar(analisisId: string): Promise<ReporteGenerado[]> {
        const filas = await this.prisma.reporte.findMany({
            where: { analisisId },
            orderBy: [{ generadoEn: 'desc' }],
        });
        return filas.map((f) => ({
            id: f.id,
            analisisId: f.analisisId,
            institucionId: f.institucionId,
            horizonte: f.horizonte as Horizonte,
            contenido: f.contenido as unknown as ReporteContenido,
            generadoEn: f.generadoEn,
        }));
    }

    /** Recupera un reporte por id o lanza `NotFoundException`. */
    async obtener(id: string): Promise<ReporteGenerado> {
        const f = await this.prisma.reporte.findUnique({ where: { id } });
        if (!f) {
            throw new NotFoundException(`Reporte no encontrado: ${id}`);
        }
        return {
            id: f.id,
            analisisId: f.analisisId,
            institucionId: f.institucionId,
            horizonte: f.horizonte as Horizonte,
            contenido: f.contenido as unknown as ReporteContenido,
            generadoEn: f.generadoEn,
        };
    }

    /**
     * Lee los resultados semanales acumulados del rango, opcionalmente acotados a
     * una institucion, con sus dimensiones, explicaciones y evidencias, y los
     * mapea a la forma cruda que consume el constructor de contenido.
     */
    private async leerResultados(
        analisisId: string,
        institucionId: string | null,
        desde: number,
        hasta: number,
    ): Promise<ResultadoCrudo[]> {
        const filas = await this.prisma.resultadoAnalisis.findMany({
            where: {
                ciclo: {
                    analisisId,
                    numeroSemana: { gte: desde, lte: hasta },
                    ...(institucionId !== null ? { institucionId } : {}),
                },
            },
            include: {
                ciclo: { select: { numeroSemana: true, institucionId: true } },
                dimensiones: { include: { explicaciones: true } },
                evidences: true,
            },
        });

        return filas.map((r): ResultadoCrudo => ({
            id: r.id,
            numeroSemana: r.ciclo.numeroSemana,
            institucionId: r.ciclo.institucionId,
            dimensiones: r.dimensiones.map((d) => ({
                nombre: d.nombre,
                valor: d.valor,
                minimo: d.minimo,
                maximo: d.maximo,
                scoreCalibradoMl: d.scoreCalibradoMl,
                explicaciones: d.explicaciones.map((e) => ({
                    que: e.que,
                    porQue: e.porQue,
                    cuandoEmpezo: e.cuandoEmpezo,
                    comoEvoluciono: e.comoEvoluciono,
                })),
            })),
            evidencias: r.evidences.map((ev): EvidenciaCruda => ({
                id: ev.id,
                tipo: ev.tipo,
                contenido: ev.contenido,
                numeroSemana: ev.numeroSemana,
                contributividad: ev.contributividad,
                refContenido: ev.refContenido,
                publicacionesAsociadas: aListaStrings(ev.publicacionesAsociadas),
                eventosAsociados: aListaStrings(ev.eventosAsociados),
                indicadoresUtilizados: aListaStrings(ev.indicadoresUtilizados),
                conteo: ev.conteo,
                variacionPct: ev.variacionPct,
            })),
        }));
    }

    /** Lee los patrones/tendencias del analisis, opcionalmente por institucion. */
    private async leerPatrones(
        analisisId: string,
        institucionId: string | null,
    ): Promise<PatronCrudo[]> {
        const filas = await this.prisma.patron.findMany({
            where: {
                analisisId,
                ...(institucionId !== null ? { comunidad: { institucionId } } : {}),
            },
            select: { tipo: true, descripcion: true, comunidadId: true },
        });
        return filas.map((p) => ({
            tipo: p.tipo,
            descripcion: p.descripcion,
            comunidadId: p.comunidadId,
        }));
    }

    /**
     * Lee la cronología de contenido (métricas por semana) de una institución
     * dentro del rango, desde `ResultadoAnalisis.datosTemporal.metricasContenido`.
     */
    private async leerCronologia(
        analisisId: string,
        institucionId: string,
        desde: number,
        hasta: number,
    ): Promise<MetricaSemanaContenido[]> {
        const ciclos = await this.prisma.cicloSemanal.findMany({
            where: {
                analisisId,
                institucionId,
                numeroSemana: { gte: desde, lte: hasta },
                estado: 'COMPLETADO',
            },
            orderBy: { numeroSemana: 'asc' },
            include: { resultados: { select: { datosTemporal: true } } },
        });
        const out: MetricaSemanaContenido[] = [];
        for (const ciclo of ciclos) {
            for (const r of ciclo.resultados) {
                const dt = r.datosTemporal as { metricasContenido?: MetricaSemanaContenido } | null;
                const m = dt?.metricasContenido;
                if (!m) continue;
                out.push({ ...m, numeroSemana: ciclo.numeroSemana });
            }
        }
        return out;
    }
}
