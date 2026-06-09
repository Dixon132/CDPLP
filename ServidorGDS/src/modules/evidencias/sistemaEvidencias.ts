/**
 * `Sistema_Evidencias` - implementacion sobre la base de datos dedicada del
 * servicio (`gds_evidences` + `gds_evidence_ref`) via el `prismaClient`
 * reutilizable.
 *
 * Mantiene la interfaz `SistemaEvidencias` estable y desacoplada: los
 * consumidores solo manejan `string` ids (Req. 30.2, 30.6). El recorrido
 * auditable conclusion -> evidencia -> dato original se sirve anonimizado
 * (Req. 30.4, 30.5).
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
 */
import type { Evidence as EvidenceRow, Prisma, PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "../../utils/prismaClient";
import {
    Contributividad,
    type Evidencia,
    type RecorridoAuditoria,
    type SistemaEvidencias,
    type TipoEvidencia,
} from "./interfaces";

/** Acceso minimo al cliente Prisma necesario para el almacen de evidencias. */
type ClienteEvidencias = Pick<PrismaClient, "evidence">;

// ---------------------------------------------------------------------------
// Mapeos puros (sin E/S) entre la fila Prisma y el dominio `Evidencia`.
// Se exportan para poder validarlos de forma determinista en pruebas unitarias.
// ---------------------------------------------------------------------------

/** Normaliza un valor `Json` de Prisma a un arreglo de strings. */
function aListaStrings(valor: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === "string");
}

/** Normaliza un valor `Json` de Prisma a un arreglo de numeros. */
function aListaNumeros(valor: Prisma.JsonValue | null | undefined): number[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is number => typeof v === "number");
}

/** Normaliza un valor `Json` de Prisma a `Record<string, number>`. */
function aMapaNumerico(valor: Prisma.JsonValue | null | undefined): Record<string, number> {
    if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return {};
    const salida: Record<string, number> = {};
    for (const [clave, v] of Object.entries(valor)) {
        if (typeof v === "number") salida[clave] = v;
    }
    return salida;
}

/** Convierte un string persistido en el enum `Contributividad` (con respaldo seguro). */
function aContributividad(valor: string): Contributividad {
    return valor === Contributividad.NO_CONTRIBUTIVO
        ? Contributividad.NO_CONTRIBUTIVO
        : Contributividad.CONTRIBUTIVO;
}

/** Mapea una fila `gds_evidences` al modelo de dominio `Evidencia`. */
export function mapRowToEvidencia(row: EvidenceRow): Evidencia {
    const metricas: { conteo?: number; variacionPct?: number } = {};
    if (row.conteo !== null && row.conteo !== undefined) metricas.conteo = row.conteo;
    if (row.variacionPct !== null && row.variacionPct !== undefined) {
        metricas.variacionPct = row.variacionPct;
    }

    return {
        id: row.id,
        resultadoId: row.resultadoId,
        analisisId: row.analisisId,
        comunidadId: row.comunidadId,
        institucionId: row.institucionId,
        numeroSemana: row.numeroSemana,
        refContenido: row.refContenido,
        contributividad: aContributividad(row.contributividad),
        tipo: row.tipo as TipoEvidencia,
        contenido: row.contenido,
        publicacionesAsociadas: aListaStrings(row.publicacionesAsociadas),
        comentariosAsociados: aListaStrings(row.comentariosAsociados),
        eventosAsociados: aListaStrings(row.eventosAsociados),
        semanasInvolucradas: aListaNumeros(row.semanasInvolucradas),
        indicadoresUtilizados: aListaStrings(row.indicadoresUtilizados),
        explicacionIA: row.explicacionIa ?? "",
        metricasUtilizadas: aMapaNumerico(row.metricasUtilizadas),
        ...(Object.keys(metricas).length > 0 ? { metricas } : {}),
    };
}

/** Mapea una `Evidencia` (sin id) a la entrada de creacion de Prisma. */
export function mapEvidenciaToCreateInput(
    e: Omit<Evidencia, "id">,
): Prisma.EvidenceUncheckedCreateInput {
    return {
        resultadoId: e.resultadoId,
        analisisId: e.analisisId,
        comunidadId: e.comunidadId,
        institucionId: e.institucionId,
        numeroSemana: e.numeroSemana,
        refContenido: e.refContenido,
        contributividad: e.contributividad,
        tipo: e.tipo,
        contenido: e.contenido,
        publicacionesAsociadas: e.publicacionesAsociadas,
        comentariosAsociados: e.comentariosAsociados,
        eventosAsociados: e.eventosAsociados,
        semanasInvolucradas: e.semanasInvolucradas,
        indicadoresUtilizados: e.indicadoresUtilizados,
        explicacionIa: e.explicacionIA,
        metricasUtilizadas: e.metricasUtilizadas,
        conteo: e.metricas?.conteo ?? null,
        variacionPct: e.metricas?.variacionPct ?? null,
    };
}

/**
 * Implementacion del `Sistema_Evidencias` respaldada por Prisma sobre la BD
 * dedicada del servicio.
 */
export class SistemaEvidenciasPrisma implements SistemaEvidencias {
    private readonly cliente: ClienteEvidencias;

    constructor(cliente: ClienteEvidencias = defaultPrisma) {
        this.cliente = cliente;
    }

    /** Almacena una `Evidencia` con identificadores trazables (Req. 30.1, 30.3). */
    async almacenar(e: Omit<Evidencia, "id">): Promise<Evidencia> {
        const row = await this.cliente.evidence.create({
            data: mapEvidenciaToCreateInput(e),
        });
        return mapRowToEvidencia(row);
    }

    /**
     * Sirve evidencias por id preservando el orden solicitado (interfaz estable
     * independiente de la implementacion, Req. 30.2, 30.6).
     */
    async obtener(ids: string[]): Promise<Evidencia[]> {
        if (ids.length === 0) return [];
        const rows = await this.cliente.evidence.findMany({
            where: { id: { in: ids } },
        });
        const porId = new Map(rows.map((r) => [r.id, mapRowToEvidencia(r)]));
        return ids
            .map((id) => porId.get(id))
            .filter((ev): ev is Evidencia => ev !== undefined);
    }

    /**
     * Expone el recorrido conclusion -> evidencia -> dato original, siempre
     * anonimizado (Req. 30.4, 30.5).
     */
    async auditar(evidenciaId: string): Promise<RecorridoAuditoria> {
        const row = await this.cliente.evidence.findUnique({
            where: { id: evidenciaId },
        });
        if (row === null) {
            throw new Error(`Evidencia no encontrada: ${evidenciaId}`);
        }
        const evidencia = mapRowToEvidencia(row);
        return {
            evidencia,
            datoOriginal: {
                numeroSemana: evidencia.numeroSemana,
                comunidadId: evidencia.comunidadId,
                refContenido: evidencia.refContenido,
            },
        };
    }
}

/** Instancia reutilizable del `Sistema_Evidencias` sobre el `prismaClient` del servicio. */
export const sistemaEvidencias: SistemaEvidencias = new SistemaEvidenciasPrisma();
