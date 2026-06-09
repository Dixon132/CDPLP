/**
 * Puerto de persistencia de la `Memoria_Semantica` sobre `gds_embedding`
 * (pgvector) - tarea 9.1.
 *
 * Capa de acceso a datos DELGADA y **append-only**: expone unicamente la
 * INSERCION acumulativa de un lote de embeddings y consultas de
 * verificacion/trazabilidad (conteo y listado de refs). DELIBERADAMENTE **no**
 * existe ninguna operacion de borrado: el corpus de la `Memoria_Semantica` se
 * acumula y nunca se eliminan vectores previos (Req. 36.2). El unico borrado
 * admisible es la cascada al eliminar el `Analisis` raiz, gobernada por el
 * esquema Prisma (`onDelete: Cascade`), fuera de este puerto.
 *
 * La columna `vector` de `gds_embedding` usa el tipo nativo `vector` de pgvector
 * (`Unsupported("vector(1024)")`), que Prisma no puede escribir por su API
 * tipada; la insercion se realiza por SQL nativo parametrizado, serializando el
 * vector como literal `'[v0,v1,...]'::vector`.
 *
 * _Requirements: 36.1, 36.2, 36.5_
 */
import { Prisma, type PrismaClient } from "@prisma/client";

import type { ModeloEmbedding } from "./memoriaSemantica";

/**
 * Registro completo de un embedding listo para persistir: las referencias
 * trazables (de {@link import("./memoriaSemantica").VectorMemoria}) mas el
 * `vector` numerico ya calculado por el `Servicio_IA`.
 */
export interface RegistroEmbedding {
    /** Id estable del fragmento; clave primaria de la fila `gds_embedding`. */
    refId: string;
    analisisId: string;
    comunidadId: string;
    institucionId: string;
    resultadoId: string;
    numeroSemana: number;
    refContenido: string;
    modelo: ModeloEmbedding;
    /** Vector de embedding producido por el `Servicio_IA`. */
    vector: number[];
}

/** Filtro de trazabilidad COLECTIVO para conteo/listado (nunca individual). */
export interface FiltroTrazabilidad {
    analisisId?: string;
    comunidadId?: string;
    institucionId?: string;
    numeroSemana?: number;
}

/** Proyeccion de las refs trazables de un vector persistido (sin el vector). */
export interface RefEmbedding {
    refId: string;
    analisisId: string;
    comunidadId: string;
    institucionId: string;
    resultadoId: string;
    numeroSemana: number;
    refContenido: string;
    modelo: string;
}

/**
 * Puerto de persistencia **append-only** de la `Memoria_Semantica`.
 *
 * Contrato estable que el `MemoriaSemanticaService` (indexador) consume sin
 * conocer detalles de Prisma/pgvector. No declara ninguna operacion de borrado
 * (Req. 36.2).
 */
export interface AlmacenEmbeddings {
    /**
     * Inserta un lote de embeddings ACUMULANDO sobre los previos, sin borrar
     * ninguno (Req. 36.2). Operacion idempotente respecto al `refId` (clave
     * primaria estable del fragmento).
     */
    insertar(registros: RegistroEmbedding[]): Promise<void>;
    /** Cuenta los embeddings persistidos que cumplen el filtro (verificacion). */
    contar(filtro?: FiltroTrazabilidad): Promise<number>;
    /** Lista las refs trazables (sin el vector) que cumplen el filtro. */
    listarRefs(filtro?: FiltroTrazabilidad): Promise<RefEmbedding[]>;
    /**
     * Lado de LECTURA del `Embeddings_Search` (tarea 9.2): dado el conjunto de
     * `refIds` que la busqueda por similitud del `Servicio_IA` devolvio
     * (ordenados por similitud), recupera sus refs trazables RESTRINGIDAS al
     * ambito COLECTIVO del `filtro` (`analisisId` y, opcionalmente,
     * `comunidadId`). `gds_embedding` es la fuente de verdad de la trazabilidad
     * en la BD dedicada del `ServidorGDS`, de modo que esta lectura GARANTIZA que
     * solo se exponen vectores del `Analisis`/`Comunidad_Digital` indicados y
     * nunca resultados fuera del ambito colectivo (Req. 36.6, 39.4). Es solo
     * lectura: no altera el corpus append-only.
     */
    recuperarRefs(refIds: string[], filtro: FiltroTrazabilidad): Promise<RefEmbedding[]>;
}

/** Token DI (NestJS) del puerto de persistencia {@link AlmacenEmbeddings}. */
export const ALMACEN_EMBEDDINGS = Symbol("GDS:ALMACEN_EMBEDDINGS");

/** Serializa un vector numerico al literal de pgvector `'[v0,v1,...]'`. */
export function aLiteralVector(vector: number[]): string {
    return `[${vector.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
}

/**
 * Implementacion del puerto sobre la BD dedicada via Prisma + SQL nativo.
 *
 * Solo necesita el subconjunto del `PrismaClient` usado aqui (`embedding` para
 * las consultas tipadas y `$executeRaw` para la insercion del `vector`), lo que
 * permite inyectar dobles deterministas en pruebas sin acoplar al cliente
 * completo.
 */
export type ClienteEmbeddings = Pick<PrismaClient, "embedding" | "$executeRaw">;

export class AlmacenEmbeddingsPrisma implements AlmacenEmbeddings {
    constructor(private readonly cliente: ClienteEmbeddings) { }

    async insertar(registros: RegistroEmbedding[]): Promise<void> {
        if (registros.length === 0) {
            return;
        }
        // Insercion parametrizada fila a fila. El `vector` se castea desde su
        // literal textual al tipo nativo `vector` de pgvector. `ON CONFLICT`
        // sobre la clave primaria estable garantiza idempotencia del lote sin
        // eliminar vectores previos (append-only acumulativo, Req. 36.2).
        for (const r of registros) {
            const literal = aLiteralVector(r.vector);
            await this.cliente.$executeRaw`
                INSERT INTO gds_embedding
                    (id, analisis_id, comunidad_id, institucion_id, resultado_id,
                     numero_semana, ref_contenido, modelo, dim, vector)
                VALUES
                    (${r.refId}, ${r.analisisId}, ${r.comunidadId}, ${r.institucionId},
                     ${r.resultadoId}, ${r.numeroSemana}, ${r.refContenido}, ${r.modelo},
                     ${r.vector.length}, ${literal}::vector)
                ON CONFLICT (id) DO NOTHING
            `;
        }
    }

    async contar(filtro?: FiltroTrazabilidad): Promise<number> {
        return this.cliente.embedding.count({ where: aWhere(filtro) });
    }

    async listarRefs(filtro?: FiltroTrazabilidad): Promise<RefEmbedding[]> {
        const filas = await this.cliente.embedding.findMany({
            where: aWhere(filtro),
            select: SELECCION_REF,
        });
        return filas.map(mapearFilaRef);
    }

    async recuperarRefs(
        refIds: string[],
        filtro: FiltroTrazabilidad,
    ): Promise<RefEmbedding[]> {
        // Sin candidatos no hay nada que recuperar (no-op sin tocar la BD).
        if (refIds.length === 0) {
            return [];
        }
        // Lectura acotada al ambito COLECTIVO del filtro Y al conjunto de refIds
        // candidatos. La interseccion garantiza que solo se devuelven vectores
        // del Analisis/Comunidad indicados (Req. 36.6, 39.4).
        const filas = await this.cliente.embedding.findMany({
            where: { ...aWhere(filtro), id: { in: refIds } },
            select: SELECCION_REF,
        });
        return filas.map(mapearFilaRef);
    }
}

/** Proyeccion comun de columnas para reconstruir un {@link RefEmbedding}. */
const SELECCION_REF = {
    id: true,
    analisisId: true,
    comunidadId: true,
    institucionId: true,
    resultadoId: true,
    numeroSemana: true,
    refContenido: true,
    modelo: true,
} as const;

/** Mapea una fila proyectada de `gds_embedding` a un {@link RefEmbedding}. */
function mapearFilaRef(f: {
    id: string;
    analisisId: string;
    comunidadId: string;
    institucionId: string;
    resultadoId: string;
    numeroSemana: number;
    refContenido: string;
    modelo: string;
}): RefEmbedding {
    return {
        refId: f.id,
        analisisId: f.analisisId,
        comunidadId: f.comunidadId,
        institucionId: f.institucionId,
        resultadoId: f.resultadoId,
        numeroSemana: f.numeroSemana,
        refContenido: f.refContenido,
        modelo: f.modelo,
    };
}

/** Traduce el filtro de dominio a la clausula `where` de Prisma. */
function aWhere(filtro?: FiltroTrazabilidad): Prisma.EmbeddingWhereInput {
    if (!filtro) {
        return {};
    }
    const where: Prisma.EmbeddingWhereInput = {};
    if (filtro.analisisId !== undefined) where.analisisId = filtro.analisisId;
    if (filtro.comunidadId !== undefined) where.comunidadId = filtro.comunidadId;
    if (filtro.institucionId !== undefined) where.institucionId = filtro.institucionId;
    if (filtro.numeroSemana !== undefined) where.numeroSemana = filtro.numeroSemana;
    return where;
}
