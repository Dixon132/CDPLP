/**
 * Implementación Prisma del puerto `BibliotecaEscenariosRepositorio`.
 *
 * Persiste la `Biblioteca_Escenarios` en el modelo `Scenario` (tabla
 * `gds_scenarios`) de la base de datos PostgreSQL DEDICADA del servicio, a
 * través del cliente Prisma reutilizable (`src/utils/prismaClient.ts`).
 *
 * El versionado se modela creando una NUEVA fila por versión: editar nunca
 * muta la fila previa (Req. 29.5), de modo que las versiones anteriores
 * permanecen recuperables y la copia fijada en cualquier `Analisis` ya creado
 * queda intacta.
 *
 * _Requirements: 29.1, 29.5, 29.6, 25.1, 25.3_
 */
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import prisma from "../../utils/prismaClient";
import type {
    BibliotecaEscenariosRepositorio,
    EscenarioReutilizable,
    EscenarioSinId,
    IntensidadEscenario,
} from "./escenarios.types";

/** Forma mínima de una fila `Scenario` de Prisma usada por el mapeo. */
interface FilaScenario {
    id: string;
    nombre: string;
    descripcion: string;
    contexto: string;
    intensidad: string;
    duracionEsperada: number;
    eventosDetonantes: Prisma.JsonValue;
    actoresInvolucrados: Prisma.JsonValue;
    categoria: string;
    tags: Prisma.JsonValue;
    configuracionComportamiento: Prisma.JsonValue;
    parametros: Prisma.JsonValue;
    version: number;
    esPredefinido: boolean;
}

function aListaString(valor: Prisma.JsonValue): string[] {
    return Array.isArray(valor) ? (valor.filter((v) => typeof v === "string") as string[]) : [];
}

function aRegistro(valor: Prisma.JsonValue): Record<string, unknown> {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor)
        ? (valor as Record<string, unknown>)
        : {};
}

/** Convierte una fila de Prisma en el tipo de dominio `EscenarioReutilizable`. */
function aDominio(row: FilaScenario): EscenarioReutilizable {
    return {
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        contexto: row.contexto,
        intensidad: row.intensidad as IntensidadEscenario,
        duracionEsperada: row.duracionEsperada,
        eventosDetonantes: aListaString(row.eventosDetonantes),
        actoresInvolucrados: aListaString(row.actoresInvolucrados),
        categoria: row.categoria,
        tags: aListaString(row.tags),
        configuracionComportamiento: aRegistro(row.configuracionComportamiento),
        parametros: aRegistro(row.parametros),
        version: row.version,
        esPredefinido: row.esPredefinido,
    };
}

export class PrismaBibliotecaRepositorio
    implements BibliotecaEscenariosRepositorio {
    constructor(private readonly db: PrismaClient = prisma) { }

    async crear(def: EscenarioSinId): Promise<EscenarioReutilizable> {
        const row = await this.db.scenario.create({
            data: {
                nombre: def.nombre,
                descripcion: def.descripcion,
                contexto: def.contexto,
                intensidad: def.intensidad,
                duracionEsperada: def.duracionEsperada,
                eventosDetonantes: def.eventosDetonantes as Prisma.InputJsonValue,
                actoresInvolucrados: def.actoresInvolucrados as Prisma.InputJsonValue,
                categoria: def.categoria,
                tags: def.tags as Prisma.InputJsonValue,
                configuracionComportamiento:
                    def.configuracionComportamiento as Prisma.InputJsonValue,
                parametros: def.parametros as Prisma.InputJsonValue,
                version: def.version,
                esPredefinido: def.esPredefinido,
            },
        });
        return aDominio(row);
    }

    async listar(): Promise<EscenarioReutilizable[]> {
        const rows = await this.db.scenario.findMany({
            orderBy: [{ nombre: "asc" }, { version: "asc" }],
        });
        return rows.map(aDominio);
    }

    async obtenerPorId(id: string): Promise<EscenarioReutilizable | null> {
        const row = await this.db.scenario.findUnique({ where: { id } });
        return row ? aDominio(row) : null;
    }
}
