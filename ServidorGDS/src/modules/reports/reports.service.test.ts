/**
 * Pruebas unitarias del `ReportsService` (`Generador_Reportes`) sobre un doble
 * en memoria del `PrismaService` que ejerce la MISMA logica del servicio
 * (lectura por rango, generacion por horizonte, persistencia y recuperacion),
 * sin red ni BD. Jest (sin vitest).
 *
 * _Requirements: 19.1, 19.3, 19.4_
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { Horizonte } from './reports.types';

interface CicloFake {
    numeroSemana: number;
    institucionId: string;
}
interface ResultadoFake {
    id: string;
    ciclo: CicloFake & { analisisId: string };
    dimensiones: {
        nombre: string;
        valor: number;
        minimo: number;
        maximo: number;
        scoreCalibradoMl: number | null;
        explicaciones: { que: string; porQue: string; cuandoEmpezo: string | null; comoEvoluciono: string | null }[];
    }[];
    evidences: {
        id: string;
        tipo: string;
        contenido: string;
        numeroSemana: number;
        contributividad: string;
        refContenido: string;
        publicacionesAsociadas: unknown;
        eventosAsociados: unknown;
        indicadoresUtilizados: unknown;
        conteo: number | null;
        variacionPct: number | null;
    }[];
}

interface SemillaPrisma {
    analisis?: { id: string; semanasTotales: number } | null;
    comunidades?: { analisisId: string; institucionId: string; id: string }[];
    resultados?: ResultadoFake[];
    patrones?: { tipo: string; descripcion: string; comunidadId: string; analisisId: string; institucionId: string }[];
}

/** Construye un `PrismaService` doble con la semilla indicada. */
function crearPrisma(semilla: SemillaPrisma): { prisma: PrismaService; reportes: any[] } {
    const reportes: any[] = [];
    let seq = 0;

    const prisma = {
        analisis: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                semilla.analisis && semilla.analisis.id === where.id ? semilla.analisis : null,
        },
        comunidad: {
            findFirst: async ({ where }: { where: { analisisId: string; institucionId: string } }) =>
                (semilla.comunidades ?? []).find(
                    (c) => c.analisisId === where.analisisId && c.institucionId === where.institucionId,
                ) ?? null,
        },
        resultadoAnalisis: {
            findMany: async ({ where }: { where: any }) => {
                const f = where.ciclo;
                return (semilla.resultados ?? []).filter((r) => {
                    if (r.ciclo.analisisId !== f.analisisId) return false;
                    if (r.ciclo.numeroSemana < f.numeroSemana.gte || r.ciclo.numeroSemana > f.numeroSemana.lte)
                        return false;
                    if (f.institucionId !== undefined && r.ciclo.institucionId !== f.institucionId) return false;
                    return true;
                });
            },
        },
        patron: {
            findMany: async ({ where }: { where: any }) =>
                (semilla.patrones ?? [])
                    .filter((p) => p.analisisId === where.analisisId)
                    .filter((p) => !where.comunidad || p.institucionId === where.comunidad.institucionId)
                    .map((p) => ({ tipo: p.tipo, descripcion: p.descripcion, comunidadId: p.comunidadId })),
        },
        reporte: {
            create: async ({ data }: { data: any }) => {
                const fila = { id: `rep-${++seq}`, generadoEn: new Date('2025-02-02T00:00:00.000Z'), ...data };
                reportes.push(fila);
                return fila;
            },
            findMany: async ({ where }: { where: { analisisId: string } }) =>
                reportes.filter((r) => r.analisisId === where.analisisId),
            findUnique: async ({ where }: { where: { id: string } }) =>
                reportes.find((r) => r.id === where.id) ?? null,
        },
    } as unknown as PrismaService;

    return { prisma, reportes };
}

function resultadoFake(numeroSemana: number, valor: number, institucionId = 'inst-1'): ResultadoFake {
    return {
        id: `res-${institucionId}-${numeroSemana}`,
        ciclo: { analisisId: 'an-1', numeroSemana, institucionId },
        dimensiones: [
            {
                nombre: 'estres_academico',
                valor,
                minimo: 0,
                maximo: 100,
                scoreCalibradoMl: valor / 100,
                explicaciones: [
                    { que: 'q', porQue: 'p', cuandoEmpezo: `s${numeroSemana}`, comoEvoluciono: 'al alza' },
                ],
            },
        ],
        evidences: [
            {
                id: `ev-${institucionId}-${numeroSemana}`,
                tipo: 'variacion',
                contenido: 'anon',
                numeroSemana,
                contributividad: 'CONTRIBUTIVO',
                refContenido: `post:${numeroSemana}`,
                publicacionesAsociadas: [`post:${numeroSemana}`],
                eventosAsociados: ['paro'],
                indicadoresUtilizados: ['estres_academico'],
                conteo: numeroSemana,
                variacionPct: null,
            },
        ],
    };
}

function semillaCompleta(): SemillaPrisma {
    return {
        analisis: { id: 'an-1', semanasTotales: 24 },
        comunidades: [{ analisisId: 'an-1', institucionId: 'inst-1', id: 'com-1' }],
        resultados: [resultadoFake(1, 20), resultadoFake(2, 30), resultadoFake(4, 50)],
        patrones: [
            { tipo: 'tendencia', descripcion: 'alza', comunidadId: 'com-1', analisisId: 'an-1', institucionId: 'inst-1' },
        ],
    };
}

describe('ReportsService.generar', () => {
    it('genera y persiste un reporte mensual desde los resultados acumulados (Req. 19.1, 19.3)', async () => {
        const { prisma, reportes } = crearPrisma(semillaCompleta());
        const service = new ReportsService(prisma);

        const rep = await service.generar({ analisisId: 'an-1', horizonte: Horizonte.MENSUAL, periodo: 1 });

        expect(rep.id).toBe('rep-1');
        expect(rep.horizonte).toBe(Horizonte.MENSUAL);
        expect(rep.contenido.rango).toEqual({ desde: 1, hasta: 4 });
        expect(rep.contenido.semanasCubiertas).toEqual([1, 2, 4]);
        expect(rep.contenido.indicadores[0].dimension).toBe('estres_academico');
        expect(reportes).toHaveLength(1);
        expect(reportes[0].horizonte).toBe(Horizonte.MENSUAL);
    });

    it('genera el informe FINAL cubriendo todo el analisis', async () => {
        const { prisma } = crearPrisma(semillaCompleta());
        const service = new ReportsService(prisma);

        const rep = await service.generar({ analisisId: 'an-1', horizonte: Horizonte.FINAL });
        expect(rep.contenido.rango).toEqual({ desde: 1, hasta: 24 });
        expect(rep.contenido.semanasCubiertas).toEqual([1, 2, 4]);
    });

    it('asocia el reporte a una Institucion especifica cuando se indica (Req. 19.4)', async () => {
        const semilla = semillaCompleta();
        semilla.comunidades!.push({ analisisId: 'an-1', institucionId: 'inst-2', id: 'com-2' });
        semilla.resultados!.push(resultadoFake(1, 80, 'inst-2'));
        const { prisma } = crearPrisma(semilla);
        const service = new ReportsService(prisma);

        const rep = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.MENSUAL,
            periodo: 1,
            institucionId: 'inst-2',
        });
        expect(rep.institucionId).toBe('inst-2');
        // Solo la evidencia de inst-2 entra en el reporte acotado.
        expect(rep.contenido.evidencias.map((e) => e.id)).toEqual(['ev-inst-2-1']);
    });

    it('rechaza una institucion que no participa en el analisis (Req. 19.4)', async () => {
        const { prisma } = crearPrisma(semillaCompleta());
        const service = new ReportsService(prisma);
        await expect(
            service.generar({ analisisId: 'an-1', horizonte: Horizonte.MENSUAL, institucionId: 'inst-9' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFound si el analisis no existe', async () => {
        const { prisma } = crearPrisma({ analisis: null });
        const service = new ReportsService(prisma);
        await expect(
            service.generar({ analisisId: 'inexistente', horizonte: Horizonte.FINAL }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza un periodo que excede el analisis', async () => {
        const { prisma } = crearPrisma({ analisis: { id: 'an-1', semanasTotales: 4 } });
        const service = new ReportsService(prisma);
        await expect(
            service.generar({ analisisId: 'an-1', horizonte: Horizonte.MENSUAL, periodo: 3 }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('ReportsService.listar / obtener', () => {
    it('lista y recupera reportes persistidos', async () => {
        const { prisma } = crearPrisma(semillaCompleta());
        const service = new ReportsService(prisma);

        const rep = await service.generar({ analisisId: 'an-1', horizonte: Horizonte.SEMANAL, periodo: 1 });
        const lista = await service.listar('an-1');
        expect(lista.map((r) => r.id)).toContain(rep.id);

        const obtenido = await service.obtener(rep.id);
        expect(obtenido.id).toBe(rep.id);
        expect(obtenido.contenido.horizonte).toBe(Horizonte.SEMANAL);
    });

    it('lanza NotFound al obtener un reporte inexistente', async () => {
        const { prisma } = crearPrisma(semillaCompleta());
        const service = new ReportsService(prisma);
        await expect(service.obtener('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });
});
