/**
 * `DashboardController`: API HTTP del Panel Principal GDS.
 *
 * Expone los endpoints de consulta del panel principal (Req. 21.1, 21.3, 21.5):
 * resumen de analisis, indicadores globales agregados y evolucion historica,
 * calculados sobre los resultados reales de la BD dedicada.
 *
 * Rutas bajo `/api/gds/dashboard/*` e `/api/gds/indicadores/*`.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Extrae el score real (0-100) de una dimension: prioriza el texto de la
 * explicacion (donde el IndiceRiesgo persiste el calculo real) sobre el campo
 * `valor` (que queda en 1.0 cuando el NLP usa el fallback determinista).
 */
function scoreReal(dim: {
    valor: number;
    scoreCalibradoMl: number | null;
    explicaciones: Array<{ que: string }>;
}): number {
    if (dim.explicaciones.length > 0) {
        const m = dim.explicaciones[0].que.match(/se situa en ([\d.]+)/);
        if (m) return parseFloat(m[1]);
    }
    const s = dim.scoreCalibradoMl ?? dim.valor;
    return s === 1 ? dim.valor : s;
}

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('resumen')
    @ApiOperation({ summary: 'Resumen agregado del panel principal (Req. 21.1).' })
    @ApiOkResponse({ description: 'Resumen con indicadores, historicos y analisis.' })
    async resumen() {
        const analisis = await this.prisma.analisis.findMany({
            orderBy: [{ nombre: 'asc' }],
            include: {
                comunidades: { select: { institucionId: true } },
                ciclos: {
                    where: { estado: 'COMPLETADO' },
                    orderBy: { numeroSemana: 'desc' },
                    take: 1,
                    select: { numeroSemana: true },
                },
            },
        });

        // Indicadores globales (promedio por dimension) e historicos (riesgo
        // promedio por semana) agregando todos los resultados del sistema.
        const resultados = await this.prisma.resultadoAnalisis.findMany({
            include: {
                ciclo: { select: { numeroSemana: true } },
                dimensiones: { include: { explicaciones: { take: 1 } } },
            },
        });

        const acumDim = new Map<string, { suma: number; n: number }>();
        const acumSemana = new Map<number, { suma: number; n: number }>();
        for (const r of resultados) {
            const semana = r.ciclo.numeroSemana;
            for (const d of r.dimensiones) {
                const v = scoreReal(d);
                const ad = acumDim.get(d.nombre) ?? { suma: 0, n: 0 };
                ad.suma += v;
                ad.n += 1;
                acumDim.set(d.nombre, ad);
                const as = acumSemana.get(semana) ?? { suma: 0, n: 0 };
                as.suma += v;
                as.n += 1;
                acumSemana.set(semana, as);
            }
        }
        const indicadores = [...acumDim.entries()]
            .map(([nombre, a]) => ({ nombre, valor: Math.round((a.suma / a.n) * 10) / 10 }))
            .sort((x, y) => y.valor - x.valor);
        const historicos = [...acumSemana.entries()]
            .map(([semana, a]) => ({
                periodo: `Semana ${semana}`,
                semana,
                valor: Math.round((a.suma / a.n) * 10) / 10,
            }))
            .sort((x, y) => x.semana - y.semana);

        return {
            indicadores,
            historicos,
            analisis: analisis.map((a) => {
                const semanaActual = a.ciclos[0]?.numeroSemana ?? 0;
                const completado =
                    a.semanasTotales > 0 && semanaActual >= a.semanasTotales;
                const estado = completado ? 'COMPLETADO' : a.estadoEjecucion;
                return {
                    id: a.id,
                    nombre: a.nombre,
                    estado,
                    semanaActual,
                    totalSemanas: a.semanasTotales,
                    instituciones: a.comunidades.length,
                    escenario: a.escenarioEsPersonalizado ? 'Personalizado' : '',
                    modoEjecucion: a.modoEjecucion,
                };
            }),
        };
    }
}

@ApiTags('indicadores')
@Controller('indicadores')
export class IndicadoresController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('globales')
    @ApiOperation({ summary: 'Indicadores globales del sistema (Req. 21.5).' })
    @ApiOkResponse({ description: 'Lista de indicadores promedio por dimension.' })
    async globales() {
        const dimensiones = await this.prisma.dimensionRiesgo.findMany({
            include: { explicaciones: { take: 1 } },
        });
        // Promedio por nombre de dimension sobre TODOS los resultados.
        const acum = new Map<string, { suma: number; n: number }>();
        for (const d of dimensiones) {
            const v = scoreReal(d);
            const a = acum.get(d.nombre) ?? { suma: 0, n: 0 };
            a.suma += v;
            a.n += 1;
            acum.set(d.nombre, a);
        }
        return [...acum.entries()]
            .map(([nombre, a]) => ({
                nombre,
                valor: a.n > 0 ? Math.round((a.suma / a.n) * 10) / 10 : 0,
            }))
            .sort((x, y) => y.valor - x.valor);
    }

    @Get('historicos')
    @ApiOperation({ summary: 'Serie historica de indicadores (riesgo promedio por semana).' })
    @ApiOkResponse({ description: 'Lista de puntos historicos.' })
    async historicos() {
        // Riesgo colectivo promedio por numero de semana, agregando todos los
        // analisis: muestra la evolucion global del sistema.
        const resultados = await this.prisma.resultadoAnalisis.findMany({
            include: {
                ciclo: { select: { numeroSemana: true } },
                dimensiones: { include: { explicaciones: { take: 1 } } },
            },
        });
        const porSemana = new Map<number, { suma: number; n: number }>();
        for (const r of resultados) {
            const semana = r.ciclo.numeroSemana;
            for (const d of r.dimensiones) {
                const a = porSemana.get(semana) ?? { suma: 0, n: 0 };
                a.suma += scoreReal(d);
                a.n += 1;
                porSemana.set(semana, a);
            }
        }
        return [...porSemana.entries()]
            .map(([semana, a]) => ({
                periodo: `Semana ${semana}`,
                semana,
                valor: a.n > 0 ? Math.round((a.suma / a.n) * 10) / 10 : 0,
            }))
            .sort((x, y) => x.semana - y.semana);
    }
}
