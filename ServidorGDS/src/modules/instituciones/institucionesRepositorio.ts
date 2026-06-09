/**
 * Implementacion Prisma del puerto `InstitucionesRepositorio`.
 *
 * Persiste la `Institucion` en el modelo `Institucion` (tabla `gds_institucion`)
 * de la base de datos PostgreSQL DEDICADA del servicio, a traves del cliente
 * Prisma reutilizable (`src/utils/prismaClient.ts`).
 *
 * Borrado ATOMICO con rechazo + mensaje de dependencia (Req. 7.6): el conteo
 * de referencias y la decision de borrar/rechazar ocurren dentro de una UNICA
 * transaccion (`$transaction`), de modo que el rechazo de la eliminacion y la
 * entrega del mensaje de dependencia se ejecutan como una sola operacion
 * consistente.
 *
 * _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 25.1, 25.3_
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../utils/prismaClient";
import type {
    CambiosInstitucion,
    CategoriaInstitucion,
    DatosInstitucion,
    DependenciasInstitucion,
    Institucion,
    InstitucionesRepositorio,
} from "./instituciones.types";
import {
    InstitucionConDependenciasError,
    InstitucionNoEncontradaError,
} from "./instituciones.errores";
import {
    construirDependencias,
    mensajeDependencia,
} from "./instituciones.dependencias";

/** Forma minima de una fila `Institucion` de Prisma usada por el mapeo. */
interface FilaInstitucion {
    id: string;
    nombre: string;
    categoria: string;
    latitud: number;
    longitud: number;
    radioMetros: number;
    logoUrl: string | null;
    descripcion: string | null;
}

/** Convierte una fila de Prisma en el tipo de dominio `Institucion`. */
function aDominio(row: FilaInstitucion): Institucion {
    return {
        id: row.id,
        nombre: row.nombre,
        categoria: row.categoria as CategoriaInstitucion,
        latitud: row.latitud,
        longitud: row.longitud,
        radioMetros: row.radioMetros,
        logoUrl: row.logoUrl,
        descripcion: row.descripcion,
    };
}

/** Cuenta las referencias entrantes a una institucion dentro de una transaccion. */
async function contarDependenciasEn(
    tx: Prisma.TransactionClient,
    id: string,
): Promise<DependenciasInstitucion> {
    const [comunidades, ciclos, evidencias, reportes] = await Promise.all([
        tx.comunidad.count({ where: { institucionId: id } }),
        tx.cicloSemanal.count({ where: { institucionId: id } }),
        tx.evidence.count({ where: { institucionId: id } }),
        tx.reporte.count({ where: { institucionId: id } }),
    ]);
    return construirDependencias({ comunidades, ciclos, evidencias, reportes });
}

export class PrismaInstitucionesRepositorio implements InstitucionesRepositorio {
    constructor(private readonly db: PrismaClient = prisma) { }

    async crear(datos: DatosInstitucion): Promise<Institucion> {
        const row = await this.db.institucion.create({
            data: {
                nombre: datos.nombre,
                categoria: datos.categoria,
                latitud: datos.latitud,
                longitud: datos.longitud,
                radioMetros: datos.radioMetros,
                logoUrl: datos.logoUrl,
                descripcion: datos.descripcion,
            },
        });
        return aDominio(row);
    }

    async listar(): Promise<Institucion[]> {
        const rows = await this.db.institucion.findMany({
            orderBy: [{ nombre: "asc" }],
        });
        return rows.map(aDominio);
    }

    async obtenerPorId(id: string): Promise<Institucion | null> {
        const row = await this.db.institucion.findUnique({ where: { id } });
        return row ? aDominio(row) : null;
    }

    async actualizar(
        id: string,
        cambios: CambiosInstitucion,
    ): Promise<Institucion> {
        const existente = await this.db.institucion.findUnique({ where: { id } });
        if (!existente) {
            throw new InstitucionNoEncontradaError(id);
        }
        const row = await this.db.institucion.update({
            where: { id },
            data: {
                ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
                ...(cambios.categoria !== undefined
                    ? { categoria: cambios.categoria }
                    : {}),
                ...(cambios.latitud !== undefined ? { latitud: cambios.latitud } : {}),
                ...(cambios.longitud !== undefined
                    ? { longitud: cambios.longitud }
                    : {}),
                ...(cambios.radioMetros !== undefined
                    ? { radioMetros: cambios.radioMetros }
                    : {}),
                ...(cambios.logoUrl !== undefined ? { logoUrl: cambios.logoUrl } : {}),
                ...(cambios.descripcion !== undefined
                    ? { descripcion: cambios.descripcion }
                    : {}),
            },
        });
        return aDominio(row);
    }

    async contarDependencias(id: string): Promise<DependenciasInstitucion> {
        return contarDependenciasEn(this.db, id);
    }

    async eliminarAtomico(id: string): Promise<void> {
        // Rechazo del borrado + entrega del mensaje de dependencia como UNA sola
        // operacion atomica (Req. 7.6): todo dentro de la misma transaccion.
        await this.db.$transaction(async (tx) => {
            const existente = await tx.institucion.findUnique({ where: { id } });
            if (!existente) {
                throw new InstitucionNoEncontradaError(id);
            }

            const dependencias = await contarDependenciasEn(tx, id);
            if (dependencias.total > 0) {
                throw new InstitucionConDependenciasError(
                    id,
                    dependencias,
                    mensajeDependencia(id, dependencias),
                );
            }

            await tx.institucion.delete({ where: { id } });
        });
    }
}
