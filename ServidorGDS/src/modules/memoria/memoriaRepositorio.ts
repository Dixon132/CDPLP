/**
 * Puerto de persistencia del `Motor_Memoria_Contextual` sobre `gds_memoria_*`.
 *
 * Capa de acceso a datos DELGADA (thin repository) sobre el `prismaClient`
 * reutilizable del servicio. Mapea el dominio `MemoriaNivel` a los cinco modelos
 * Prisma (`gds_memoria_semanal/mensual/trimestral/semestral/global`) y de vuelta,
 * conservando el `Escenario` original en todo nivel (Req. 28.7) y la integridad
 * referencial a `Analisis`/`Comunidad_Digital`/`Institucion` (Req. 28.9).
 *
 * Solo provee CRUD basico. La logica de consolidacion acumulativa (tarea 6.2) y
 * la construccion de contexto bajo umbral (tarea 6.3) consumen este puerto.
 *
 * _Requirements: 28.8, 28.9_
 */
import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "../../utils/prismaClient";
import { MemoriaNivel, NivelMemoria, ORDEN_NIVELES } from "./motorMemoriaContextual";

/**
 * Acceso minimo al cliente Prisma necesario para la memoria jerarquica. Permite
 * inyectar dobles deterministas en pruebas sin acoplar al `PrismaClient` global.
 */
export type ClienteMemoria = Pick<
    PrismaClient,
    | "memoriaSemanal"
    | "memoriaMensual"
    | "memoriaTrimestral"
    | "memoriaSemestral"
    | "memoriaGlobal"
>;

// ---------------------------------------------------------------------------
// Helpers de normalizacion Json -> dominio (puros, sin E/S). Se exportan para
// validarlos de forma determinista en pruebas unitarias.
// ---------------------------------------------------------------------------

/** Normaliza un valor `Json` de Prisma a un arreglo de strings. */
export function aListaStrings(valor: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === "string");
}

// ---------------------------------------------------------------------------
// Mapeos fila Prisma -> dominio `MemoriaNivel` por nivel.
//
// `institucionId`, `cambiosImportantes`, `anomalias` y `tendencias` no tienen
// columna propia en el esquema actual: el repositorio resuelve `institucionId`
// desde la `Comunidad_Digital` relacionada y deja los arreglos derivados vacios.
// La logica de consolidacion (tarea 6.2) los poblara/empaquetara.
// ---------------------------------------------------------------------------

/** Forma minima comun a las filas con escenario/resumen/tokens. */
interface FilaBaseMemoria {
    analisisId: string;
    escenario: string;
    resumen: string;
    tokensAprox: number;
}

/** Construye un `MemoriaNivel` con los campos derivados por defecto. */
function construirMemoria(
    nivel: NivelMemoria,
    fila: FilaBaseMemoria,
    extra: {
        institucionId: string;
        comunidadId: string;
        periodo: number;
        eventosRelevantes: string[];
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
        eventosRelevantes: extra.eventosRelevantes,
        cambiosImportantes: [],
        anomalias: [],
        tendencias: [],
        tokensAprox: fila.tokensAprox,
    };
}

export function mapSemanalRowToMemoria(
    row: { analisisId: string; comunidadId: string; numeroSemana: number } & FilaBaseMemoria,
    institucionId = "",
): MemoriaNivel {
    return construirMemoria(NivelMemoria.SEMANAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroSemana,
        eventosRelevantes: [],
    });
}

export function mapMensualRowToMemoria(
    row: { analisisId: string; comunidadId: string; numeroMes: number } & FilaBaseMemoria,
    institucionId = "",
): MemoriaNivel {
    return construirMemoria(NivelMemoria.MENSUAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroMes,
        eventosRelevantes: [],
    });
}

export function mapTrimestralRowToMemoria(
    row: {
        analisisId: string;
        comunidadId: string;
        numeroTrimestre: number;
        eventosRelevantes: Prisma.JsonValue;
    } & FilaBaseMemoria,
    institucionId = "",
): MemoriaNivel {
    return construirMemoria(NivelMemoria.TRIMESTRAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroTrimestre,
        eventosRelevantes: aListaStrings(row.eventosRelevantes),
    });
}

export function mapSemestralRowToMemoria(
    row: {
        analisisId: string;
        comunidadId: string;
        numeroSemestre: number;
        eventosRelevantes: Prisma.JsonValue;
    } & FilaBaseMemoria,
    institucionId = "",
): MemoriaNivel {
    return construirMemoria(NivelMemoria.SEMESTRAL, row, {
        institucionId,
        comunidadId: row.comunidadId,
        periodo: row.numeroSemestre,
        eventosRelevantes: aListaStrings(row.eventosRelevantes),
    });
}

export function mapGlobalRowToMemoria(
    row: { analisisId: string; eventosRelevantes: Prisma.JsonValue } & FilaBaseMemoria,
): MemoriaNivel {
    // `GLOBAL` no esta acotada a una comunidad ni institucion concretas.
    return construirMemoria(NivelMemoria.GLOBAL, row, {
        institucionId: "",
        comunidadId: "",
        periodo: 0,
        eventosRelevantes: aListaStrings(row.eventosRelevantes),
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
 * Puerto de persistencia de la `Memoria_Jerarquica`. Contrato estable que la
 * implementacion del `Motor_Memoria_Contextual` (tareas 6.2/6.3) consume sin
 * conocer detalles de Prisma.
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
 * Implementacion del puerto sobre la BD dedicada del servicio via Prisma.
 *
 * Resuelve `institucionId` desde la `Comunidad_Digital` relacionada para los
 * niveles acotados a comunidad (Req. 28.9).
 */
export class MemoriaRepositorioPrisma implements MemoriaRepositorio {
    private readonly cliente: ClienteMemoria;

    constructor(cliente: ClienteMemoria = defaultPrisma) {
        this.cliente = cliente;
    }

    async guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        switch (memoria.nivel) {
            case NivelMemoria.SEMANAL: {
                const row = await this.cliente.memoriaSemanal.create({
                    data: mapMemoriaToSemanalCreate(memoria),
                });
                return mapSemanalRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.MENSUAL: {
                const row = await this.cliente.memoriaMensual.create({
                    data: mapMemoriaToMensualCreate(memoria),
                });
                return mapMensualRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.TRIMESTRAL: {
                const row = await this.cliente.memoriaTrimestral.create({
                    data: mapMemoriaToTrimestralCreate(memoria),
                });
                return mapTrimestralRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.SEMESTRAL: {
                const row = await this.cliente.memoriaSemestral.create({
                    data: mapMemoriaToSemestralCreate(memoria),
                });
                return mapSemestralRowToMemoria(row, memoria.institucionId);
            }
            case NivelMemoria.GLOBAL: {
                const row = await this.cliente.memoriaGlobal.create({
                    data: mapMemoriaToGlobalCreate(memoria),
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
                const rows = await this.cliente.memoriaSemanal.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapSemanalRowToMemoria(r));
            }
            case NivelMemoria.MENSUAL: {
                const rows = await this.cliente.memoriaMensual.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapMensualRowToMemoria(r));
            }
            case NivelMemoria.TRIMESTRAL: {
                const rows = await this.cliente.memoriaTrimestral.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapTrimestralRowToMemoria(r));
            }
            case NivelMemoria.SEMESTRAL: {
                const rows = await this.cliente.memoriaSemestral.findMany({
                    where: { analisisId, comunidadId },
                });
                return rows.map((r) => mapSemestralRowToMemoria(r));
            }
            case NivelMemoria.GLOBAL: {
                const rows = await this.cliente.memoriaGlobal.findMany({
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

/** Instancia reutilizable del puerto sobre el `prismaClient` del servicio. */
export const memoriaRepositorio: MemoriaRepositorio = new MemoriaRepositorioPrisma();
