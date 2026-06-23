/**
 * `AnalysisService` (Gestor_Analisis): creacion y administracion de `Analisis`.
 *
 * Provider `@Injectable()` que persiste en el modelo Prisma `Analisis` (tabla
 * `gds_analisis`) de la base de datos DEDICADA del servicio a traves del
 * `PrismaService` global (Req. 25.1). Responsabilidades:
 *
 *  - CREAR un `Analisis` (estudio longitudinal) con nombre, >=1 `Institucion`,
 *    radio de analisis, escenario y configuracion temporal de hasta 24
 *    `Semana_Simulada`, persistiendolo junto a una `Comunidad_Digital` por
 *    institucion DENTRO de una transaccion atomica (Req. 8.1, 8.3, 25.5).
 *  - RECHAZAR la creacion sin al menos una `Institucion`, con mensaje de
 *    validacion (Req. 8.4), y verificar que las instituciones existen.
 *  - FIJAR el `Escenario` como contexto INMUTABLE del `Analisis` en el momento
 *    de la creacion, mediante el `Motor_Escenarios` (`fijarParaAnalisis`), y
 *    registrar `(escenario_id, escenario_version)` para trazabilidad (Req. 8.6,
 *    29.4, 29.6).
 *  - DISPARAR el ciclo inicial (semana 1) por cada `Institucion` mediante el
 *    `DisparadorCicloInicial` (Cola_Trabajos), tras una creacion correcta
 *    (Req. 8.5).
 *  - ELIMINAR un `Analisis` en CASCADA transaccional, aislado por analisis y
 *    sin afectar a otros (Req. 25.4, 25.6, 25.7).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 25.4, 25.6, 25.7, 29.4, 29.6_
 */
import { randomBytes } from 'node:crypto';

import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
    derivarZona,
    zonaAColumnas,
} from '../communities/zonaGeografica';
import {
    MOTOR_ESCENARIOS,
    type EscenarioFijado,
    type MotorEscenarios,
    type SeleccionEscenario,
} from './escenarios/escenarios.types';
import {
    DISPARADOR_CICLO_INICIAL,
    type Analisis,
    type DisparadorCicloInicial,
    type EstadoAnalisis,
    type EstadoEjecucion,
    type ModoEjecucion,
} from './analysis.types';
import { CrearAnalisisDto } from './dto/crear-analisis.dto';

/** Forma minima de una fila `Analisis` de Prisma usada por el mapeo. */
interface FilaAnalisis {
    id: string;
    nombre: string;
    escenario: string;
    escenarioEsPersonalizado: boolean;
    escenarioId: string | null;
    escenarioVersion: number | null;
    semanasTotales: number;
    radioAnalisis: number;
    saltAnon: string;
    modoEjecucion: string;
    intervaloTiempoRealMs: number | null;
    estadoEjecucion: string;
    estado: string;
    comunidades?: { institucionId: string }[];
}

/** Convierte una fila de Prisma (con sus comunidades) al dominio `Analisis`. */
function aDominio(row: FilaAnalisis): Analisis {
    return {
        id: row.id,
        nombre: row.nombre,
        escenario: row.escenario,
        escenarioEsPersonalizado: row.escenarioEsPersonalizado,
        escenarioId: row.escenarioId,
        escenarioVersion: row.escenarioVersion,
        semanasTotales: row.semanasTotales,
        radioAnalisis: row.radioAnalisis,
        saltAnon: row.saltAnon,
        modoEjecucion: row.modoEjecucion as ModoEjecucion,
        intervaloTiempoRealMs: row.intervaloTiempoRealMs,
        estadoEjecucion: row.estadoEjecucion as EstadoEjecucion,
        estado: row.estado as EstadoAnalisis,
        institucionIds: (row.comunidades ?? []).map((c) => c.institucionId),
    };
}

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(MOTOR_ESCENARIOS)
        private readonly motorEscenarios: MotorEscenarios,
        @Inject(DISPARADOR_CICLO_INICIAL)
        private readonly disparador: DisparadorCicloInicial,
    ) { }

    /**
     * Crea y persiste un `Analisis` con su escenario inmutable y una
     * `Comunidad_Digital` por `Institucion`, y dispara la semana 1 por cada una
     * (Req. 8.1, 8.3, 8.5, 8.6, 29.4, 29.6).
     */
    async crear(dto: CrearAnalisisDto, actorId?: number | string): Promise<Analisis> {
        // 1) RECHAZO de creacion sin al menos una `Institucion` (Req. 8.4).
        if (!dto.institucionIds || dto.institucionIds.length === 0) {
            throw new BadRequestException(
                'Un Analisis requiere al menos una Institucion seleccionada.',
            );
        }

        // Lista de instituciones unicas, preservando el orden de seleccion.
        const institucionIds = [...new Set(dto.institucionIds)];

        // 2) Verificar que TODAS las instituciones existen (integridad referencial).
        const instituciones = await this.prisma.institucion.findMany({
            where: { id: { in: institucionIds } },
            select: { id: true, latitud: true, longitud: true },
        });
        if (instituciones.length !== institucionIds.length) {
            const encontradas = new Set(instituciones.map((i) => i.id));
            const faltantes = institucionIds.filter((id) => !encontradas.has(id));
            throw new BadRequestException(
                `Institucion(es) inexistente(s): ${faltantes.join(', ')}.`,
            );
        }

        // 3) FIJAR el escenario como contexto INMUTABLE (copia + trazabilidad)
        //    mediante el Motor_Escenarios (Req. 8.6, 29.4, 29.6).
        const seleccion: SeleccionEscenario = {
            ...(dto.escenarioId !== undefined ? { escenarioId: dto.escenarioId } : {}),
            ...(dto.personalizado !== undefined
                ? { personalizado: dto.personalizado }
                : {}),
            ...(dto.guardarEnBiblioteca !== undefined
                ? { guardarEnBiblioteca: dto.guardarEnBiblioteca }
                : {}),
        };
        let fijado: EscenarioFijado;
        try {
            fijado = await this.motorEscenarios.fijarParaAnalisis(seleccion);
        } catch (err) {
            // Seleccion de escenario invalida (ni biblioteca ni personalizado, o
            // escenario inexistente): se traduce a un error de validacion (Req. 8.2).
            throw new BadRequestException(
                err instanceof Error ? err.message : 'Seleccion de escenario invalida.',
            );
        }

        const modoEjecucion: ModoEjecucion = dto.modoEjecucion ?? 'MANUAL';
        const saltAnon = randomBytes(16).toString('hex');

        // 4) PERSISTIR el `Analisis` + una `Comunidad_Digital` por institucion en
        //    una TRANSACCION atomica (Req. 25.5). La `Zona_Geografica` de cada
        //    comunidad se DERIVA de las coordenadas de la institucion + el radio
        //    del analisis (Req. 33.1).
        const analisisId = await this.prisma.$transaction(async (tx) => {
            const creado = await tx.analisis.create({
                data: {
                    nombre: dto.nombre,
                    escenario: fijado.contexto,
                    escenarioEsPersonalizado: dto.personalizado !== undefined,
                    escenarioId: fijado.escenarioId,
                    escenarioVersion: fijado.version,
                    semanasTotales: dto.semanasTotales,
                    radioAnalisis: dto.radioAnalisis,
                    saltAnon,
                    modoEjecucion,
                    intervaloTiempoRealMs: dto.intervaloTiempoRealMs ?? null,
                    estadoEjecucion: 'DETENIDO',
                    estado: 'ACTIVO',
                },
            });

            for (const institucion of instituciones) {
                const zona = derivarZona(
                    { latitud: institucion.latitud, longitud: institucion.longitud },
                    dto.radioAnalisis,
                );
                await tx.comunidad.create({
                    data: {
                        analisisId: creado.id,
                        institucionId: institucion.id,
                        ...zonaAColumnas(zona),
                    },
                });
            }

            return creado.id;
        });

        this.auditar('crear', analisisId, actorId, {
            nombre: dto.nombre,
            institucionIds,
            semanasTotales: dto.semanasTotales,
            escenarioId: fijado.escenarioId,
            escenarioVersion: fijado.version,
        });

        // 5) DISPARAR el ciclo inicial (semana 1) por cada `Institucion` tras la
        //    creacion correcta (Req. 8.5). Se hace FUERA de la transaccion: el
        //    `Analisis` ya esta persistido y consistente; el encolado es un
        //    efecto idempotente por `(A,I,1)` (Req. 38.3).
        for (const institucionId of institucionIds) {
            try {
                await this.disparador.dispararSemanaInicial(analisisId, institucionId);
            } catch (err) {
                // Si Redis/BullMQ no esta disponible, el analisis ya fue creado
                // correctamente. Se loguea el fallo sin romper la respuesta al
                // usuario; el ciclo puede redispararse manualmente despues.
                this.logger.warn(
                    `No se pudo encolar semana 1 para (${analisisId}, ${institucionId}): ${err instanceof Error ? err.message : err}`,
                );
            }
        }

        return this.obtener(analisisId);
    }

    /** Lista todos los `Analisis` con sus instituciones, ordenados por nombre. */
    async listar(): Promise<Analisis[]> {
        const rows = await this.prisma.analisis.findMany({
            orderBy: [{ nombre: 'asc' }],
            include: { comunidades: { select: { institucionId: true } } },
        });
        return rows.map(aDominio);
    }

    /**
     * Estado/progreso de un `Analisis` para la UI: modo, estado de ejecucion,
     * semana actual (ultima COMPLETADA) y total, mas conteo de instituciones.
     */
    async obtenerEstado(analisisId: string) {
        const analisis = await this.prisma.analisis.findUnique({
            where: { id: analisisId },
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
        if (!analisis) {
            throw new NotFoundException(`Analisis no encontrado: ${analisisId}`);
        }
        const semanaActual = analisis.ciclos[0]?.numeroSemana ?? 0;
        return {
            id: analisis.id,
            nombre: analisis.nombre,
            escenario: analisis.escenario,
            escenarioEsPersonalizado: analisis.escenarioEsPersonalizado,
            modoEjecucion: analisis.modoEjecucion,
            estadoEjecucion: analisis.estadoEjecucion,
            intervaloTiempoRealMs: analisis.intervaloTiempoRealMs,
            semanaActual,
            semanasTotales: analisis.semanasTotales,
            radioAnalisis: analisis.radioAnalisis,
            instituciones: analisis.comunidades.length,
            progreso: analisis.semanasTotales > 0
                ? Math.round((semanaActual / analisis.semanasTotales) * 100)
                : 0,
        };
    }

    /** Recupera un `Analisis` por su `id` o lanza `NotFoundException`. */
    async obtener(id: string): Promise<Analisis> {
        const row = await this.prisma.analisis.findUnique({
            where: { id },
            include: { comunidades: { select: { institucionId: true } } },
        });
        if (!row) {
            throw new NotFoundException(`Analisis no encontrado: ${id}`);
        }
        return aDominio(row);
    }

    /**
     * Lista las comunidades (instituciones + zona geografica) de un `Analisis`.
     * Devuelve los datos que el frontend necesita para la vista de trazabilidad
     * (Req. 22.4): id de comunidad, id/nombre de la institucion, y la zona.
     */
    async listarComunidades(analisisId: string) {
        const analisis = await this.prisma.analisis.findUnique({
            where: { id: analisisId },
            select: { id: true },
        });
        if (!analisis) {
            throw new NotFoundException(`Analisis no encontrado: ${analisisId}`);
        }

        const comunidades = await this.prisma.comunidad.findMany({
            where: { analisisId },
            include: {
                institucion: {
                    select: { id: true, nombre: true, categoria: true, latitud: true, longitud: true },
                },
            },
        });

        return comunidades.map((c) => ({
            id: c.id,
            institucionId: c.institucionId,
            nombre: c.institucion?.nombre ?? '',
            categoria: c.institucion?.categoria ?? '',
            latitud: c.zonaLatitud,
            longitud: c.zonaLongitud,
            radioMetros: c.zonaRadioMetros,
        }));
    }

    /**
     * Elimina un `Analisis` aplicando el borrado en CASCADA de su subgrafo
     * (comunidades, ciclos, resultados, memorias, embeddings, patrones,
     * evidencias, reportes, calibraciones) DENTRO de una transaccion, AISLADO
     * por analisis y sin afectar datos de otros (Req. 25.4, 25.7).
     *
     * Si la cascada falla a mitad, la transaccion se revierte por completo: el
     * `Analisis` y todos sus datos dependientes quedan INTACTOS (Req. 25.6).
     */
    async eliminar(id: string, actorId?: number | string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const existente = await tx.analisis.findUnique({ where: { id } });
            if (!existente) {
                throw new NotFoundException(`Analisis no encontrado: ${id}`);
            }
            // El esquema define onDelete: Cascade desde `gds_analisis` hacia todo
            // su subgrafo, de modo que un unico delete arrastra de forma atomica y
            // aislada los datos del analisis (y solo de este).
            await tx.analisis.delete({ where: { id } });
        });

        this.auditar('eliminar', id, actorId);
    }

    /**
     * Obtiene la evolución temporal por dimensión para una institución dentro de
     * un análisis (Req. 22.2). Devuelve un punto por (semana, dimensión).
     *
     * NOTA: el campo `valor` de `DimensionRiesgo` queda en 1.0 cuando el NLP no
     * está disponible (fallback determinista). El score real del IndiceRiesgo se
     * persiste en el texto de la explicación. Extraemos de ahí hasta que el
     * pipeline persista correctamente en `valor`.
     */
    async obtenerEvolucion(analisisId: string, institucionId: string) {
        const ciclos = await this.prisma.cicloSemanal.findMany({
            where: { analisisId, institucionId, estado: 'COMPLETADO' },
            orderBy: { numeroSemana: 'asc' },
            include: {
                resultados: {
                    include: {
                        dimensiones: {
                            include: { explicaciones: { take: 1 } },
                        },
                    },
                },
            },
        });
        const puntos: Array<{ semana: number; dimension: string; valor: number }> = [];
        for (const ciclo of ciclos) {
            for (const resultado of ciclo.resultados) {
                for (const dim of resultado.dimensiones) {
                    puntos.push({
                        semana: ciclo.numeroSemana,
                        dimension: dim.nombre,
                        valor: this.extraerScoreReal(dim),
                    });
                }
            }
        }
        return puntos;
    }

    /**
     * Obtiene los resultados semanales navegables de una institución (Req. 22.1).
     */
    async obtenerResultados(analisisId: string, institucionId: string) {
        const ciclos = await this.prisma.cicloSemanal.findMany({
            where: { analisisId, institucionId, estado: 'COMPLETADO' },
            orderBy: { numeroSemana: 'asc' },
            include: {
                resultados: {
                    include: {
                        dimensiones: {
                            include: { explicaciones: { take: 1 } },
                        },
                    },
                },
            },
        });
        return ciclos.map((ciclo) => {
            const dimensiones = ciclo.resultados.flatMap((r) =>
                r.dimensiones.map((d) => ({
                    dimension: d.nombre,
                    semana: ciclo.numeroSemana,
                    valor: this.extraerScoreReal(d),
                })),
            );
            return {
                semana: ciclo.numeroSemana,
                resumen: `Semana ${ciclo.numeroSemana} completada`,
                dimensiones,
            };
        });
    }

    /**
     * Obtiene la CRONOLOGÍA de contenido por semana de una institución: por cada
     * semana completada, cuántas publicaciones se tomaron en cuenta (filtro de
     * relevancia), aportes de post/comentarios/imagen y hashtags más concurrentes.
     * Lee las métricas persistidas en `ResultadoAnalisis.datosTemporal`.
     */
    async obtenerCronologia(analisisId: string, institucionId: string) {
        const ciclos = await this.prisma.cicloSemanal.findMany({
            where: { analisisId, institucionId, estado: 'COMPLETADO' },
            orderBy: { numeroSemana: 'asc' },
            include: { resultados: { select: { datosTemporal: true } } },
        });
        const semanas: Array<Record<string, unknown>> = [];
        for (const ciclo of ciclos) {
            for (const r of ciclo.resultados) {
                const dt = r.datosTemporal as { metricasContenido?: Record<string, unknown> } | null;
                const m = dt?.metricasContenido;
                if (!m) continue;
                semanas.push({ ...m, numeroSemana: ciclo.numeroSemana });
            }
        }
        return semanas;
    }

    /**
     * Extrae el score real de una dimensión. Prioriza el texto de la explicación
     * (donde el IndiceRiesgo persiste el cálculo real) sobre el campo `valor`
     * (que queda en 1.0 cuando el NLP falla por fallback determinista).
     */
    private extraerScoreReal(dim: { valor: number; scoreCalibradoMl: number | null; explicaciones: Array<{ que: string }> }): number {
        if (dim.explicaciones.length > 0) {
            const match = dim.explicaciones[0].que.match(/se situa en ([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }
        const score = dim.scoreCalibradoMl ?? dim.valor;
        return score === 1 ? dim.valor : score;
    }

    /**
     * Obtiene la explicación de un resultado semanal (Req. 22.3).
     */
    async obtenerExplicacion(analisisId: string, institucionId: string, semana: number) {
        const ciclo = await this.prisma.cicloSemanal.findUnique({
            where: { analisisId_institucionId_numeroSemana: { analisisId, institucionId, numeroSemana: semana } },
            include: {
                resultados: {
                    include: {
                        dimensiones: {
                            include: { explicaciones: true },
                        },
                    },
                },
            },
        });
        if (!ciclo) return { texto: '', factores: [], confianza: 0 };
        const explicaciones = ciclo.resultados.flatMap((r) =>
            r.dimensiones.flatMap((d) =>
                d.explicaciones.map((e) => ({
                    dimension: d.nombre,
                    que: e.que,
                    porQue: (e as { porQue?: string }).porQue ?? '',
                    confianza: (e as { confianza?: number }).confianza ?? 0,
                })),
            ),
        );
        return {
            texto: explicaciones.map((e) => `${e.dimension}: ${e.que}`).join('. '),
            factores: explicaciones,
            confianza: explicaciones.length > 0
                ? explicaciones.reduce((s, e) => s + e.confianza, 0) / explicaciones.length
                : 0,
        };
    }

    /**
     * Obtiene las evidencias de un resultado semanal (Req. 22.5).
     */
    async obtenerEvidencias(analisisId: string, institucionId: string, semana: number) {
        const ciclo = await this.prisma.cicloSemanal.findUnique({
            where: { analisisId_institucionId_numeroSemana: { analisisId, institucionId, numeroSemana: semana } },
            include: {
                resultados: {
                    include: { evidences: true },
                },
            },
        });
        if (!ciclo) return [];
        // Saneo defensivo: evidencias persistidas con el formato anterior podian
        // incluir terminos crudos del contenido (en otro idioma). Se recorta esa
        // enumeracion para no mostrar texto en idioma extranjero al usuario.
        const limpiar = (texto: string): string =>
            texto
                .replace(/,?\s*sustentad[oa]s?\s+por\s+t[eé]rminos\s+recurrentes:[^.]*/gi, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
        return ciclo.resultados.flatMap((r) =>
            r.evidences.map((e) => ({
                id: e.id,
                tipo: e.tipo,
                descripcion: limpiar(e.contenido),
                refContenido: e.refContenido,
                semana: e.numeroSemana,
                contributiva: e.contributividad === 'CONTRIBUTIVO',
                indicadores: e.indicadoresUtilizados,
                explicacion: e.explicacionIa,
            })),
        );
    }

    /** Registra un cambio sobre un `Analisis` para su auditoria. */
    private auditar(
        accion: 'crear' | 'eliminar',
        analisisId: string,
        actorId?: number | string,
        cambios?: Record<string, unknown>,
    ): void {
        this.logger.log(
            `[auditoria][analisis] accion=${accion} id=${analisisId} ` +
            `actor=${actorId ?? 'desconocido'} ts=${new Date().toISOString()}` +
            (cambios ? ` cambios=${JSON.stringify(cambios)}` : ''),
        );
    }
}
