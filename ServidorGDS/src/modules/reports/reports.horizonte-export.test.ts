/**
 * Pruebas unitarias DEDICADAS de la tarea 23.3: generacion por HORIZONTE
 * (semanal/mensual/trimestral/semestral/final) a traves del `ReportsService`
 * y la EXPORTACION descargable (PDF/Excel) por cada horizonte, verificando que
 * cada formato preserva el horizonte, las explicaciones y las evidencias
 * ANONIMIZADAS (Req. 19.1, 19.2, 19.5).
 *
 * Complementan a `reports.generador.test.ts` (logica pura), `reports.service.test.ts`
 * (E/S del servicio) y `reports.export.test.ts` (render base) cubriendo de forma
 * exhaustiva CADA uno de los cinco horizontes en generacion y en exportacion.
 * Jest (sin vitest), doble en memoria del `PrismaService`.
 *
 * _Requirements: 19.1, 19.2, 19.5_
 */
import ExcelJS from 'exceljs';

import type { PrismaService } from '../../prisma/prisma.service';
import { renderReporteExcel, renderReportePdf } from './reports.export';
import { ReportsExportService } from './reports.export.service';
import { construirContenido, rangoSemanas } from './reports.generador';
import { ReportsService } from './reports.service';
import type { ReportsService as ReportsServiceType } from './reports.service';
import {
    EntradaContenido,
    Horizonte,
    HORIZONTES,
    ReporteContenido,
    ReporteGenerado,
} from './reports.types';

// ---------------------------------------------------------------------------
// Dobles de datos: un `PrismaService` en memoria con 24 semanas de resultados,
// suficiente para ejercer TODOS los horizontes (semanal..semestral + final).
// ---------------------------------------------------------------------------
interface ResultadoFake {
    id: string;
    ciclo: { analisisId: string; numeroSemana: number; institucionId: string };
    dimensiones: {
        nombre: string;
        valor: number;
        minimo: number;
        maximo: number;
        scoreCalibradoMl: number | null;
        explicaciones: {
            que: string;
            porQue: string;
            cuandoEmpezo: string | null;
            comoEvoluciono: string | null;
        }[];
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

const SEMANAS_TOTALES = 24;

/** Resultado semanal sintetico con explicacion y evidencia anonimizada trazable. */
function resultadoFake(numeroSemana: number, institucionId = 'inst-1'): ResultadoFake {
    const valor = 10 + numeroSemana * 2; // monotono creciente => cambio "sube"
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
                    {
                        que: `aumento del estres colectivo en la semana ${numeroSemana}`,
                        porQue: 'cercania de evaluaciones',
                        cuandoEmpezo: `semana ${numeroSemana}`,
                        comoEvoluciono: 'al alza',
                    },
                ],
            },
        ],
        evidences: [
            {
                id: `ev-${numeroSemana}`,
                tipo: 'variacion',
                contenido: `contenido anonimizado de la semana ${numeroSemana}`,
                numeroSemana,
                contributividad: 'CONTRIBUTIVO',
                refContenido: `post:anon-${numeroSemana}`,
                publicacionesAsociadas: [`post:anon-${numeroSemana}`],
                eventosAsociados: ['paro_universitario'],
                indicadoresUtilizados: ['estres_academico'],
                conteo: numeroSemana,
                variacionPct: null,
            },
        ],
    };
}

function todosLosResultados(): ResultadoFake[] {
    return Array.from({ length: SEMANAS_TOTALES }, (_, i) => resultadoFake(i + 1));
}

/** `PrismaService` doble que ejerce la MISMA logica de lectura del servicio. */
function crearPrisma(resultados: ResultadoFake[]): { prisma: PrismaService; reportes: any[] } {
    const reportes: any[] = [];
    let seq = 0;
    const prisma = {
        analisis: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === 'an-1' ? { id: 'an-1', semanasTotales: SEMANAS_TOTALES } : null,
        },
        comunidad: {
            findFirst: async ({ where }: { where: { analisisId: string; institucionId: string } }) =>
                where.analisisId === 'an-1' && where.institucionId === 'inst-1'
                    ? { id: 'com-1' }
                    : null,
        },
        resultadoAnalisis: {
            findMany: async ({ where }: { where: any }) => {
                const f = where.ciclo;
                return resultados.filter((r) => {
                    if (r.ciclo.analisisId !== f.analisisId) return false;
                    if (
                        r.ciclo.numeroSemana < f.numeroSemana.gte ||
                        r.ciclo.numeroSemana > f.numeroSemana.lte
                    )
                        return false;
                    if (f.institucionId !== undefined && r.ciclo.institucionId !== f.institucionId)
                        return false;
                    return true;
                });
            },
        },
        patron: {
            findMany: async () => [
                { tipo: 'tendencia', descripcion: 'alza sostenida', comunidadId: 'com-1' },
            ],
        },
        reporte: {
            create: async ({ data }: { data: any }) => {
                const fila = {
                    id: `rep-${++seq}`,
                    generadoEn: new Date('2025-02-02T00:00:00.000Z'),
                    ...data,
                };
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

// ---------------------------------------------------------------------------
// Generacion por horizonte (Req. 19.1, 19.2) a traves del servicio.
// ---------------------------------------------------------------------------
describe('ReportsService.generar por horizonte (Req. 19.1)', () => {
    // Rango esperado del periodo 1 (o FINAL) sobre 24 semanas.
    const casos: { horizonte: Horizonte; periodo?: number; rango: { desde: number; hasta: number } }[] = [
        { horizonte: Horizonte.SEMANAL, periodo: 1, rango: { desde: 1, hasta: 1 } },
        { horizonte: Horizonte.MENSUAL, periodo: 1, rango: { desde: 1, hasta: 4 } },
        { horizonte: Horizonte.TRIMESTRAL, periodo: 1, rango: { desde: 1, hasta: 12 } },
        { horizonte: Horizonte.SEMESTRAL, periodo: 1, rango: { desde: 1, hasta: 24 } },
        { horizonte: Horizonte.FINAL, rango: { desde: 1, hasta: 24 } },
    ];

    it.each(casos)(
        'genera y persiste el reporte $horizonte con su rango de semanas correcto',
        async ({ horizonte, periodo, rango }) => {
            const { prisma, reportes } = crearPrisma(todosLosResultados());
            const service = new ReportsService(prisma);

            const rep = await service.generar({ analisisId: 'an-1', horizonte, periodo });

            expect(rep.horizonte).toBe(horizonte);
            expect(rep.contenido.horizonte).toBe(horizonte);
            expect(rep.contenido.rango).toEqual(rango);
            // Las nueve secciones colectivas estan presentes (Req. 19.2).
            expect(rep.contenido.indicadores.length).toBeGreaterThan(0);
            expect(rep.contenido.cambios.length).toBeGreaterThan(0);
            expect(rep.contenido.explicaciones.length).toBeGreaterThan(0);
            expect(rep.contenido.evidencias.length).toBeGreaterThan(0);
            expect(rep.contenido.tendencias.length).toBeGreaterThan(0);
            expect(rep.contenido.detonantes.length).toBeGreaterThan(0);
            expect(rep.contenido.conclusiones.length).toBeGreaterThan(0);
            expect(rep.contenido.recomendaciones.length).toBeGreaterThan(0);
            expect(rep.contenido.resumen.length).toBeGreaterThan(0);
            // Toda conclusion referencia evidencia por id (trazabilidad).
            for (const concl of rep.contenido.conclusiones) {
                expect(concl.evidenciaIds.length).toBeGreaterThan(0);
            }
            // Persistido con el horizonte correcto.
            expect(reportes).toHaveLength(1);
            expect(reportes[0].horizonte).toBe(horizonte);
        },
    );

    it('el numero de semanas cubiertas crece con el horizonte', async () => {
        const { prisma } = crearPrisma(todosLosResultados());
        const service = new ReportsService(prisma);

        const semanal = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.SEMANAL,
            periodo: 1,
        });
        const mensual = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.MENSUAL,
            periodo: 1,
        });
        const trimestral = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.TRIMESTRAL,
            periodo: 1,
        });
        const semestral = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.SEMESTRAL,
            periodo: 1,
        });
        const final = await service.generar({ analisisId: 'an-1', horizonte: Horizonte.FINAL });

        expect(semanal.contenido.semanasCubiertas).toEqual([1]);
        expect(mensual.contenido.semanasCubiertas).toEqual([1, 2, 3, 4]);
        expect(trimestral.contenido.semanasCubiertas).toHaveLength(12);
        expect(semestral.contenido.semanasCubiertas).toHaveLength(24);
        expect(final.contenido.semanasCubiertas).toHaveLength(24);
    });

    it('los periodos contiguos de un mismo horizonte no se solapan (MENSUAL 1 y 2)', async () => {
        const { prisma } = crearPrisma(todosLosResultados());
        const service = new ReportsService(prisma);

        const p1 = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.MENSUAL,
            periodo: 1,
        });
        const p2 = await service.generar({
            analisisId: 'an-1',
            horizonte: Horizonte.MENSUAL,
            periodo: 2,
        });
        expect(p1.contenido.semanasCubiertas).toEqual([1, 2, 3, 4]);
        expect(p2.contenido.semanasCubiertas).toEqual([5, 6, 7, 8]);
        const interseccion = p1.contenido.semanasCubiertas.filter((s) =>
            p2.contenido.semanasCubiertas.includes(s),
        );
        expect(interseccion).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Exportacion por horizonte (Req. 19.5): PDF/Excel preservan el horizonte y la
// evidencia/explicacion anonimizada, para CADA uno de los cinco horizontes.
// ---------------------------------------------------------------------------

/** Etiqueta legible esperada del horizonte (como la pinta el render). */
const ETIQUETA_LEGIBLE: Record<Horizonte, string> = {
    [Horizonte.SEMANAL]: 'Semanal',
    [Horizonte.MENSUAL]: 'Mensual',
    [Horizonte.TRIMESTRAL]: 'Trimestral',
    [Horizonte.SEMESTRAL]: 'Semestral',
    [Horizonte.FINAL]: 'Final',
};

/** Construye un `ReporteContenido` realista por horizonte usando la logica pura. */
function contenidoDeHorizonte(horizonte: Horizonte): ReporteContenido {
    const periodo = 1;
    const rango = rangoSemanas(horizonte, periodo, SEMANAS_TOTALES);
    const resultados = todosLosResultados()
        .map((r) => ({
            id: r.id,
            numeroSemana: r.ciclo.numeroSemana,
            institucionId: r.ciclo.institucionId,
            dimensiones: r.dimensiones,
            evidencias: r.evidences.map((ev) => ({
                id: ev.id,
                tipo: ev.tipo,
                contenido: ev.contenido,
                numeroSemana: ev.numeroSemana,
                contributividad: ev.contributividad,
                refContenido: ev.refContenido,
                publicacionesAsociadas: ev.publicacionesAsociadas as string[],
                eventosAsociados: ev.eventosAsociados as string[],
                indicadoresUtilizados: ev.indicadoresUtilizados as string[],
                conteo: ev.conteo,
                variacionPct: ev.variacionPct,
            })),
        }))
        .filter((r) => r.numeroSemana >= rango.desde && r.numeroSemana <= rango.hasta);

    const entrada: EntradaContenido = {
        analisisId: 'an-1',
        institucionId: 'inst-1',
        horizonte,
        periodo,
        rango,
        resultados,
        patrones: [{ tipo: 'tendencia', descripcion: 'alza sostenida', comunidadId: 'com-1' }],
        ahora: new Date('2025-02-02T00:00:00.000Z'),
    };
    return construirContenido(entrada);
}

describe('renderReportePdf por horizonte (Req. 19.5)', () => {
    it.each(HORIZONTES)('produce un PDF valido no vacio para el horizonte %s', async (horizonte) => {
        const buffer = await renderReportePdf(contenidoDeHorizonte(horizonte));
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
        expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        // El titulo del documento (metadatos PDF) referencia el horizonte legible.
        const texto = buffer.toString('latin1');
        expect(texto).toContain(ETIQUETA_LEGIBLE[horizonte]);
    });
});

describe('renderReporteExcel por horizonte (Req. 19.5)', () => {
    it.each(HORIZONTES)(
        'preserva el horizonte, explicaciones y evidencias anonimizadas para %s',
        async (horizonte) => {
            const contenido = contenidoDeHorizonte(horizonte);
            const buffer = await renderReporteExcel(contenido);
            expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');

            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

            // Resumen: la fila "Horizonte" lleva la etiqueta legible del horizonte.
            const resumen = wb.getWorksheet('Resumen')!;
            const valoresResumen: string[] = [];
            resumen.eachRow((row) => valoresResumen.push(String(row.getCell(2).value)));
            expect(valoresResumen).toContain(ETIQUETA_LEGIBLE[horizonte]);

            // Las hojas de explicaciones y evidencias existen y conservan datos.
            const explicaciones = wb.getWorksheet('Explicaciones')!;
            expect(explicaciones.rowCount).toBeGreaterThan(1);
            expect(String(explicaciones.getRow(2).getCell(3).value)).toContain('estres');

            const evidencias = wb.getWorksheet('Evidencias')!;
            expect(evidencias.rowCount).toBeGreaterThan(1);
            // El contenido de la evidencia se vuelca anonimizado (sin id crudo).
            const primerContenidoEvidencia = String(evidencias.getRow(2).getCell(6).value);
            expect(primerContenidoEvidencia).toContain('contenido anonimizado');

            // Toda conclusion conserva su referencia a evidencia por id.
            const conclusiones = wb.getWorksheet('Conclusiones')!;
            expect(conclusiones.rowCount).toBeGreaterThan(1);
            expect(String(conclusiones.getRow(2).getCell(2).value).length).toBeGreaterThan(0);
        },
    );
});

describe('ReportsExportService por horizonte (Req. 19.5)', () => {
    function crearServicio(reporte: ReporteGenerado): ReportsExportService {
        const reports = {
            obtener: async (id: string) => {
                if (reporte.id !== id) throw new Error(`Reporte no encontrado: ${id}`);
                return reporte;
            },
        } as unknown as ReportsServiceType;
        return new ReportsExportService(reports);
    }

    function reporteDe(horizonte: Horizonte): ReporteGenerado {
        return {
            id: 'rep-1',
            analisisId: 'an-1',
            institucionId: 'inst-1',
            horizonte,
            contenido: contenidoDeHorizonte(horizonte),
            generadoEn: new Date('2025-02-02T00:00:00.000Z'),
        };
    }

    it.each(HORIZONTES)(
        'exporta a PDF un reporte %s con el horizonte en el nombre de archivo',
        async (horizonte) => {
            const service = crearServicio(reporteDe(horizonte));
            const out = await service.exportar('rep-1', 'pdf');
            expect(out.contentType).toBe('application/pdf');
            expect(out.filename).toContain(`reporte_${horizonte.toLowerCase()}_`);
            expect(out.filename).toMatch(/\.pdf$/);
            expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        },
    );

    it.each(HORIZONTES)(
        'exporta a Excel un reporte %s con el horizonte en el nombre de archivo',
        async (horizonte) => {
            const service = crearServicio(reporteDe(horizonte));
            const out = await service.exportar('rep-1', 'excel');
            expect(out.contentType).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(out.filename).toContain(`reporte_${horizonte.toLowerCase()}_`);
            expect(out.filename).toMatch(/\.xlsx$/);
            expect(out.buffer.subarray(0, 2).toString('latin1')).toBe('PK');
        },
    );
});
