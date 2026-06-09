/**
 * Puerto de persistencia del `Motor_Memoria_Contextual` sobre `gds_memoria_*`,
 * migrado al modulo `timeline` (tarea 3.5).
 *
 * Capa de acceso a datos DELGADA (thin repository) sobre el `PrismaService`
 * global del servicio. Mapea el dominio `MemoriaNivel` a los cinco modelos
 * Prisma (`gds_memoria_semanal/mensual/trimestral/semestral/global`) y de vuelta,
 * conservando el `Escenario` original en todo nivel (Req. 28.7) y la integridad
 * referencial a `Analisis`/`Comunidad_Digital`/`Institucion` (Req. 28.9).
 *
 * _Requirements: 28.8, 28.9, 25.1, 25.3_
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { MemoriaNivel, NivelMemoria, ORDEN_NIVELES } from './motor-memoria-contextual.types';

// ---------------------------------------------------------------------------
// Helpers de normalizacion Json -> dominio (puros, sin E/S).
// ---------------------------------------------------------------------------

/** Normaliza un valor `Json` de Prisma a un arreglo de strings. */
export function aListaStrings(valor: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === 'string');
}

/**
 * Forma minima comun a las filas con escenario/resumen/tokens y las cuatro
 * listas de historial completo (Req. 28.8). Cada nivel persiste su historial
 * acumulado, no solo el resumen.
 */
interface FilaBaseMemoria {
    analisisId: string;
    escenario: string;
    resumen: string;
    eventosRelevantes: Prisma.JsonValue;
    cambiosImportantes: Prisma.JsonValue;
    anomalias: Prisma.JsonValue;
    tendencias: Prisma.JsonValue;
    tokensAprox: number;
}

/** Construye un `MemoriaNivel` con el historial completo leido de la fila. */
function construirMemoria(
    nivel: NivelMemoria,
    fila: FilaBaseMemoria,
    extra: {
        institucionId: string;
        comunidadId: string;
        periodo: number;
    },
): MemoriaNivel {
    return {
        nivel,
        analisisId: fila.analisisId,
        institucionId: extra.institucionId,
        comunidadId: extra.comunidadId,
        periodo: extra.periodo,
        escenario: fila.escenario,
        resumen: fila.resumen,
        eventosRelevantes: aListaStrings(fila.eventosRelevantes),
        cambiosImportantes: aListaStrings(fila.cambiosImportantes),
        anomalias: aListaStrings(fila.anomalias),
        tendencias: aListaStrings(fila.tendencias),
        tokensAprox: fila.tokensAprox,
    };
}

export function mapSemanalRowToMemoria(
    row: { analisisId: string; comunidadId: string; numeroSemana: number } & FilaBaseMemoria,
    institucionId = '',
): MemoriaNivel {
    return construirMemoria(NivelMemoria.SEMANAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroSemana,
    });
}

export function mapMensualRowToMemoria(
    row: { analisisId: string; comunidadId: string; numeroMes: number } & FilaBaseMemoria,
    institucionId = '',
): MemoriaNivel {
    return construirMemoria(NivelMemoria.MENSUAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroMes,
    });
}

export function mapTrimestralRowToMemoria(
    row: {
        analisisId: string;
        comunidadId: string;
        numeroTrimestre: number;
    } & FilaBaseMemoria,
    institucionId = '',
): MemoriaNivel {
    return construirMemoria(NivelMemoria.TRIMESTRAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroTrimestre,
    });
}

export function mapSemestralRowToMemoria(
    row: {
        analisisId: string;
        comunidadId: string;
        numeroSemestre: number;
    } & FilaBaseMemoria,
    institucionId = '',
): MemoriaNivel {
    return construirMemoria(NivelMemoria.SEMESTRAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroSemestre,
    });
}

export function mapGlobalRowToMemoria(
    row: { analisisId: string } & FilaBaseMemoria,
): MemoriaNivel {
    // `GLOBAL` no esta acotada a una comunidad ni institucion concretas.
    return construirMemoria(NivelMemoria.GLOBAL, row, {
        institucionId: '',
        comunidadId: '',
        periodo: 0,
    });
}

// ---------------------------------------------------------------------------
// Mapeos dominio -> entrada de creacion Prisma por nivel.
// ---------------------------------------------------------------------------

export function mapMemoriaToSemanalCreate(
    m: MemoriaNivel,
): Prisma.MemoriaSemanalUncheckedCreateInput {
    return {
        analisisId: m.analisisId,
        comunidadId: m.comunidadId,
        numeroSemana: m.periodo,
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

export function mapMemoriaToMensualCreate(
    m: MemoriaNivel,
): Prisma.MemoriaMensualUncheckedCreateInput {
    return {
        analisisId: m.analisisId,
        comunidadId: m.comunidadId,
        numeroMes: m.periodo,
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

export function mapMemoriaToTrimestralCreate(
    m: MemoriaNivel,
): Prisma.MemoriaTrimestralUncheckedCreateInput {
    return {
        analisisId: m.analisisId,
        comunidadId: m.comunidadId,
        numeroTrimestre: m.periodo,
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

export function mapMemoriaToSemestralCreate(
    m: MemoriaNivel,
): Prisma.MemoriaSemestralUncheckedCreateInput {
    return {
        analisisId: m.analisisId,
        comunidadId: m.comunidadId,
        numeroSemestre: m.periodo,
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

export function mapMemoriaToGlobalCreate(
    m: MemoriaNivel,
): Prisma.MemoriaGlobalUncheckedCreateInput {
    return {
        analisisId: m.analisisId,
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

/**
 * Campos mutables (sin las claves naturales ni `analisisId`) que se reescriben
 * al "actualizar" una memoria ya existente durante la consolidacion idempotente
 * (Req. 28.1). El `Escenario` se reescribe con su valor original preservado,
 * de modo que nunca cambia entre reconsolidaciones (Req. 28.7).
 */
function camposActualizables(m: MemoriaNivel): {
    escenario: string;
    resumen: string;
    eventosRelevantes: Prisma.InputJsonValue;
    cambiosImportantes: Prisma.InputJsonValue;
    anomalias: Prisma.InputJsonValue;
    tendencias: Prisma.InputJsonValue;
    tokensAprox: number;
} {
    return {
        escenario: m.escenario,
        resumen: m.resumen,
        eventosRelevantes: m.eventosRelevantes,
        cambiosImportantes: m.cambiosImportantes,
        anomalias: m.anomalias,
        tendencias: m.tendencias,
        tokensAprox: m.tokensAprox,
    };
}

/**
 * Puerto de persistencia de la `Memoria_Jerarquica`. Contrato estable que la
 * implementacion del `Motor_Memoria_Contextual` consume sin conocer detalles de
 * Prisma.
 */
export interface MemoriaRepositorio {
    /** Persiste una `MemoriaNivel` en la tabla `gds_memoria_*` del nivel indicado. */
    guardar(memoria: MemoriaNivel): Promise<MemoriaNivel>;
    /**
     * Lista la memoria de un analisis/comunidad conservando el historial completo
     * (Req. 28.8). Si se omite `nivel`, devuelve todos los niveles disponibles.
     */
    listar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]>;
}

/**
 * Implementacion del puerto sobre la BD dedicada del servicio via
 * `PrismaService`.
 */
@Injectable()
export class MemoriaRepositorioPrisma implements MemoriaRepositorio {
    constructor(private readonly prisma: PrismaService) { }

    async guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        switch (memoria.nivel) {
            case NivelMemoria.SEMANAL: {
                const row = await this.prisma.memoriaSemanal.upsert({
                    where: {
                        analisisId_comunidadId_numeroSemana: {
                            analisisId: memoria.analisisId,
                            comunidadId: memoria.comunidadId,
                            numeroSemana: memoria.periodo,
                        },
                    },
                    create: mapMemoriaToSemanalCreate(memoria),
                    update: camposActualizables(memoria),
                });
                return mapSemanalRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.MENSUAL: {
                const row = await this.prisma.memoriaMensual.upsert({
                    where: {
                        analisisId_comunidadId_numeroMes: {
                            analisisId: memoria.analisisId,
                            comunidadId: memoria.comunidadId,
                            numeroMes: memoria.periodo,
                        },
                    },
                    create: mapMemoriaToMensualCreate(memoria),
                    update: camposActualizables(memoria),
                });
                return mapMensualRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.TRIMESTRAL: {
                const row = await this.prisma.memoriaTrimestral.upsert({
                    where: {
                        analisisId_comunidadId_numeroTrimestre: {
                            analisisId: memoria.analisisId,
                            comunidadId: memoria.comunidadId,
                            numeroTrimestre: memoria.periodo,
                        },
                    },
                    create: mapMemoriaToTrimestralCreate(memoria),
                    update: camposActualizables(memoria),
                });
                return mapTrimestralRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.SEMESTRAL: {
                const row = await this.prisma.memoriaSemestral.upsert({
                    where: {
                        analisisId_comunidadId_numeroSemestre: {
                            analisisId: memoria.analisisId,
                            comunidadId: memoria.comunidadId,
                            numeroSemestre: memoria.periodo,
                        },
                    },
                    create: mapMemoriaToSemestralCreate(memoria),
                    update: camposActualizables(memoria),
                });
                return mapSemestralRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.GLOBAL: {
                const row = await this.prisma.memoriaGlobal.upsert({
                    where: { analisisId: memoria.analisisId },
                    create: mapMemoriaToGlobalCreate(memoria),
                    update: camposActualizables(memoria),
                });
                return mapGlobalRowToMemoria(row);
            }
            default: {
                // Exhaustividad: todo `NivelMemoria` queda cubierto arriba.
                const _exhaustivo: never = memoria.nivel;
                throw new Error(`Nivel de memoria no soportado: ${String(_exhaustivo)}`);
            }
        }
    }

    async listar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        const niveles = nivel ? [nivel] : [...ORDEN_NIVELES];
        const resultados: MemoriaNivel[] = [];
        for (const n of niveles) {
            resultados.push(...(await this.listarNivel(analisisId, comunidadId, n)));
        }
        return resultados;
    }

    private async listarNivel(
        analisisId: string,
        comunidadId: string,
        nivel: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        switch (nivel) {
            case NivelMemoria.SEMANAL: {
                const rows = await this.prisma.memoriaSemanal.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapSemanalRowToMemoria(r));
            }
            case NivelMemoria.MENSUAL: {
                const rows = await this.prisma.memoriaMensual.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapMensualRowToMemoria(r));
            }
            case NivelMemoria.TRIMESTRAL: {
                const rows = await this.prisma.memoriaTrimestral.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapTrimestralRowToMemoria(r));
            }
            case NivelMemoria.SEMESTRAL: {
                const rows = await this.prisma.memoriaSemestral.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapSemestralRowToMemoria(r));
            }
            case NivelMemoria.GLOBAL: {
                const rows = await this.prisma.memoriaGlobal.findMany({
                    where: { analisisId },
                });
                return rows.map((r) => mapGlobalRowToMemoria(r));
            }
            default: {
                const _exhaustivo: never = nivel;
                throw new Error(`Nivel de memoria no soportado: ${String(_exhaustivo)}`);
            }
        }
    }
}
