/**
 * Puerto de persistencia de la calibracion de la `Capa_ML` sobre
 * `gds_calibracion` (tarea 9.4).
 *
 * Capa de acceso a datos DELGADA (thin repository) sobre el `prismaClient`
 * reutilizable del servicio. Persiste cada calibracion (`version`,
 * `artefacto_ref`, `metricas`) anclada a su `Analisis` (cascade) y permite
 * recuperar la ULTIMA calibracion valida registrada, que el servicio de
 * integracion conserva ante un fallo del `Servicio_IA` (Req. 31.3, 36.4).
 *
 * _Requirements: 31.3, 31.4, 36.4_
 */
import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "../../utils/prismaClient";
import {
    METRICA_CORPUS_SEMANAS,
    type RegistroCalibracion,
} from "./calibracion";

/**
 * Acceso minimo al cliente Prisma necesario para la calibracion. Permite
 * inyectar dobles deterministas en pruebas sin acoplar al `PrismaClient` global.
 */
export type ClienteCalibracion = Pick<PrismaClient, "calibracion">;

/** Fila de `gds_calibracion` tal como la devuelve Prisma. */
interface FilaCalibracion {
    id: string;
    analisisId: string;
    version: string;
    artefactoRef: string;
    metricas: Prisma.JsonValue;
    calibradoEn: Date;
}

/**
 * Normaliza un valor `Json` de Prisma a un mapa de metricas numericas. Descarta
 * entradas no numericas y valores no finitos para preservar el contrato
 * `Record<string, number>` del dominio.
 */
export function aMetricas(valor: Prisma.JsonValue | null | undefined): Record<string, number> {
    if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
        return {};
    }
    const salida: Record<string, number> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v)) {
            salida[clave] = v;
        }
    }
    return salida;
}

/** Mapea una fila de `gds_calibracion` al dominio {@link RegistroCalibracion}. */
export function mapFilaToRegistro(fila: FilaCalibracion): RegistroCalibracion {
    return {
        id: fila.id,
        analisisId: fila.analisisId,
        version: fila.version,
        artefactoRef: fila.artefactoRef,
        metricas: aMetricas(fila.metricas),
        calibradoEn: fila.calibradoEn,
    };
}

/** Extrae el numero de semanas acumuladas registrado en una calibracion. */
export function semanasDeRegistro(registro: RegistroCalibracion | null): number | null {
    if (!registro) {
        return null;
    }
    const valor = registro.metricas[METRICA_CORPUS_SEMANAS];
    return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/**
 * Puerto de persistencia de la calibracion. Contrato estable que el
 * `ServicioCalibracion` (tarea 9.4) consume sin conocer detalles de Prisma.
 */
export interface CalibracionRepositorio {
    /** Persiste una calibracion en `gds_calibracion` y devuelve el registro creado. */
    guardar(registro: RegistroCalibracion): Promise<RegistroCalibracion>;
    /**
     * Devuelve la ULTIMA calibracion valida registrada para el `Analisis`
     * (por `calibrado_en` descendente), o `null` si no hay ninguna.
     */
    ultima(analisisId: string): Promise<RegistroCalibracion | null>;
}

/** Implementacion del puerto sobre la BD dedicada del servicio via Prisma. */
export class CalibracionRepositorioPrisma implements CalibracionRepositorio {
    private readonly cliente: ClienteCalibracion;

    constructor(cliente: ClienteCalibracion = defaultPrisma) {
        this.cliente = cliente;
    }

    async guardar(registro: RegistroCalibracion): Promise<RegistroCalibracion> {
        const fila = await this.cliente.calibracion.create({
            data: {
                analisisId: registro.analisisId,
                version: registro.version,
                artefactoRef: registro.artefactoRef,
                metricas: registro.metricas,
            },
        });
        return mapFilaToRegistro(fila as FilaCalibracion);
    }

    async ultima(analisisId: string): Promise<RegistroCalibracion | null> {
        const fila = await this.cliente.calibracion.findFirst({
            where: { analisisId },
            orderBy: { calibradoEn: "desc" },
        });
        return fila ? mapFilaToRegistro(fila as FilaCalibracion) : null;
    }
}

/** Instancia reutilizable del puerto sobre el `prismaClient` del servicio. */
export const calibracionRepositorio: CalibracionRepositorio =
    new CalibracionRepositorioPrisma();
