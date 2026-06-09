/**
 * `Sistema_Evidencias` - provider NestJS sobre la base de datos dedicada del
 * servicio (`gds_evidences`) a traves del `PrismaService` global.
 *
 * Migracion base (tarea 3.5): se traslada la implementacion previa al modulo de
 * dominio `audit`, manteniendo la interfaz `SistemaEvidencias` estable y
 * desacoplada (los consumidores solo manejan `string` ids; Req. 30.2, 30.6) y
 * conectandola al `PrismaService` inyectable en lugar del cliente singleton
 * heredado. El recorrido auditable conclusion -> evidencia -> dato original se
 * sirve anonimizado (Req. 30.4, 30.5).
 *
 * _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
 */
import { Injectable } from '@nestjs/common';
import type { Evidence as EvidenceRow, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
    Contributividad,
    type Evidencia,
    type OrigenConclusion,
    type RecorridoAuditoria,
    type RecorridoConclusion,
    type SistemaEvidencias,
    type TipoEvidencia,
} from './sistema-evidencias.interfaces';

// ---------------------------------------------------------------------------
// Mapeos puros (sin E/S) entre la fila Prisma y el dominio `Evidencia`.
// Se exportan para poder validarlos de forma determinista en pruebas unitarias.
// ---------------------------------------------------------------------------

/** Normaliza un valor `Json` de Prisma a un arreglo de strings. */
function aListaStrings(valor: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === 'string');
}

/** Normaliza un valor `Json` de Prisma a un arreglo de numeros. */
function aListaNumeros(valor: Prisma.JsonValue | null | undefined): number[] {
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is number => typeof v === 'number');
}

/** Normaliza un valor `Json` de Prisma a `Record<string, number>`. */
function aMapaNumerico(valor: Prisma.JsonValue | null | undefined): Record<string, number> {
    if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return {};
    const salida: Record<string, number> = {};
    for (const [clave, v] of Object.entries(valor)) {
        if (typeof v === 'number') salida[clave] = v;
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
        explicacionIA: row.explicacionIa ?? '',
        metricasUtilizadas: aMapaNumerico(row.metricasUtilizadas),
        ...(Object.keys(metricas).length > 0 ? { metricas } : {}),
    };
}

/** Mapea una `Evidencia` (sin id) a la entrada de creacion de Prisma. */
export function mapEvidenciaToCreateInput(
    e: Omit<Evidencia, 'id'>,
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
 * Implementacion del `Sistema_Evidencias` respaldada por el `PrismaService`
 * sobre la BD dedicada del servicio.
 */
@Injectable()
export class SistemaEvidenciasService implements SistemaEvidencias {
    constructor(private readonly prisma: PrismaService) { }

    /** Almacena una `Evidencia` con identificadores trazables (Req. 30.1, 30.3). */
    async almacenar(e: Omit<Evidencia, 'id'>): Promise<Evidencia> {
        const row = await this.prisma.evidence.create({
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
        const rows = await this.prisma.evidence.findMany({
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
        const row = await this.prisma.evidence.findUnique({
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

    /**
     * Enlaza POR ID una conclusion/indicador/dimension/patron/explicacion con
     * las `Evidencia` que la sustentan, materializando `gds_evidence_ref`
     * (Req. 30.1, 30.2). El enlace es idempotente sobre la terna
     * (origenTipo, origenId, evidenciaId): no se crean duplicados.
     */
    async vincular(origen: OrigenConclusion, evidenciaIds: string[]): Promise<void> {
        // Deduplicar la entrada conservando el orden de aparicion.
        const unicos = [...new Set(evidenciaIds)];
        if (unicos.length === 0) return;

        const existentes = await this.prisma.evidenceRef.findMany({
            where: {
                origenTipo: origen.origenTipo,
                origenId: origen.origenId,
                evidenciaId: { in: unicos },
            },
            select: { evidenciaId: true },
        });
        const yaEnlazadas = new Set(existentes.map((r) => r.evidenciaId));
        const nuevas = unicos.filter((id) => !yaEnlazadas.has(id));
        if (nuevas.length === 0) return;

        await this.prisma.evidenceRef.createMany({
            data: nuevas.map((evidenciaId) => ({
                origenTipo: origen.origenTipo,
                origenId: origen.origenId,
                evidenciaId,
            })),
        });
    }

    /**
     * Sirve las `Evidencia` que sustentan un nodo de origen, resueltas via
     * `gds_evidence_ref` (interfaz estable, Req. 30.2, 30.6).
     */
    async obtenerPorOrigen(origen: OrigenConclusion): Promise<Evidencia[]> {
        const refs = await this.prisma.evidenceRef.findMany({
            where: { origenTipo: origen.origenTipo, origenId: origen.origenId },
            select: { evidenciaId: true },
        });
        const ids = refs.map((r) => r.evidenciaId);
        return this.obtener(ids);
    }

    /**
     * Expone el recorrido COMPLETO conclusion -> evidencia -> dato original
     * (Req. 30.4), siempre anonimizado (Req. 30.5), partiendo del nodo de
     * origen y resolviendo cada `Evidencia` referenciada en `gds_evidence_ref`.
     */
    async auditarConclusion(origen: OrigenConclusion): Promise<RecorridoConclusion> {
        const evidencias = await this.obtenerPorOrigen(origen);
        const recorridos: RecorridoAuditoria[] = evidencias.map((evidencia) => ({
            evidencia,
            datoOriginal: {
                numeroSemana: evidencia.numeroSemana,
                comunidadId: evidencia.comunidadId,
                refContenido: evidencia.refContenido,
            },
        }));
        return { origen, recorridos };
    }
}
