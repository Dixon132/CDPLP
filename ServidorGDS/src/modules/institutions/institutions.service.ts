/**
 * `InstitutionsService` (Gestor_Instituciones): CRUD de instituciones
 * educativas geolocalizadas, auditoria de cambios y restriccion atomica de
 * borrado.
 *
 * Provider `@Injectable()` que persiste en el modelo Prisma `Institucion`
 * (tabla `gds_institucion`) de la base de datos DEDICADA del servicio a traves
 * del `PrismaService` global (Req. 25.1, 25.3).
 *
 * Responsabilidades:
 *  - Crear/persistir una `Institucion` validada (Req. 7.1, 7.2, 7.3, 7.4).
 *  - Editar y persistir cambios, registrandolos para auditoria (Req. 7.5).
 *  - Rechazar de forma ATOMICA el borrado de una institucion referenciada por
 *    un `Analisis` (comunidad) u otra entidad, entregando el mensaje de
 *    dependencia dentro de la misma transaccion (Req. 7.6).
 *  - Exponer de forma PROACTIVA las restricciones de eliminacion y el mensaje
 *    de dependencia, aun cuando no se intente eliminar (Req. 7.8).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */
import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CrearInstitucionDto } from './dto/crear-institucion.dto';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import {
    construirDependencias,
    mensajeDependencia,
    type CategoriaInstitucion,
    type DependenciasInstitucion,
    type Institucion,
    type RestriccionEliminacion,
} from './institutions.types';

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

@Injectable()
export class InstitutionsService {
    private readonly logger = new Logger(InstitutionsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Crea y persiste una `Institucion` validada (Req. 7.1, 7.2, 7.3, 7.4). */
    async crear(dto: CrearInstitucionDto, actorId?: number | string): Promise<Institucion> {
        const row = await this.prisma.institucion.create({
            data: {
                nombre: dto.nombre,
                categoria: dto.categoria,
                latitud: dto.latitud,
                longitud: dto.longitud,
                radioMetros: dto.radioMetros,
                logoUrl: dto.logoUrl ?? null,
                descripcion: dto.descripcion ?? null,
            },
        });
        const institucion = aDominio(row);
        this.auditar('crear', institucion.id, actorId, { ...dto });
        return institucion;
    }

    /** Lista todas las instituciones ordenadas por nombre. */
    async listar(): Promise<Institucion[]> {
        const rows = await this.prisma.institucion.findMany({
            orderBy: [{ nombre: 'asc' }],
        });
        return rows.map(aDominio);
    }

    /** Recupera una `Institucion` por su `id` o lanza `NotFoundException`. */
    async obtener(id: string): Promise<Institucion> {
        const row = await this.prisma.institucion.findUnique({ where: { id } });
        if (!row) {
            throw new NotFoundException(`Institucion no encontrada: ${id}`);
        }
        return aDominio(row);
    }

    /** Edita una `Institucion`, persiste los cambios y los audita (Req. 7.5). */
    async actualizar(
        id: string,
        dto: ActualizarInstitucionDto,
        actorId?: number | string,
    ): Promise<Institucion> {
        // Confirma la existencia para devolver 404 antes de actualizar.
        await this.obtener(id);

        const data: Prisma.InstitucionUpdateInput = {};
        if (dto.nombre !== undefined) data.nombre = dto.nombre;
        if (dto.categoria !== undefined) data.categoria = dto.categoria;
        if (dto.latitud !== undefined) data.latitud = dto.latitud;
        if (dto.longitud !== undefined) data.longitud = dto.longitud;
        if (dto.radioMetros !== undefined) data.radioMetros = dto.radioMetros;
        if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl ?? null;
        if (dto.descripcion !== undefined) data.descripcion = dto.descripcion ?? null;

        const row = await this.prisma.institucion.update({ where: { id }, data });
        const institucion = aDominio(row);
        this.auditar('actualizar', institucion.id, actorId, { ...dto });
        return institucion;
    }

    /**
     * Elimina una `Institucion` de forma ATOMICA. Dentro de una unica
     * transaccion comprueba las dependencias y, si existe alguna, RECHAZA el
     * borrado entregando el mensaje de dependencia (`ConflictException`); en caso
     * contrario, borra (Req. 7.6). Solo se audita el borrado efectivo.
     */
    async eliminar(id: string, actorId?: number | string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const existente = await tx.institucion.findUnique({ where: { id } });
            if (!existente) {
                throw new NotFoundException(`Institucion no encontrada: ${id}`);
            }

            const dependencias = await this.contarDependenciasEn(tx, id);
            if (dependencias.total > 0) {
                throw new ConflictException({
                    error: 'institucion_con_dependencias',
                    institucionId: id,
                    dependencias,
                    message: mensajeDependencia(id, dependencias),
                });
            }

            await tx.institucion.delete({ where: { id } });
        });

        this.auditar('eliminar', id, actorId);
    }

    /**
     * Expone de forma PROACTIVA las restricciones de eliminacion de una
     * `Institucion` y su mensaje de dependencia, sin intentar eliminarla
     * (Req. 7.8).
     */
    async restriccionesEliminacion(id: string): Promise<RestriccionEliminacion> {
        // Confirma primero la existencia para devolver 404 si no existe.
        await this.obtener(id);
        const dependencias = await this.contarDependenciasEn(this.prisma, id);
        return {
            institucionId: id,
            puedeEliminar: dependencias.total === 0,
            dependencias,
            mensaje: mensajeDependencia(id, dependencias),
        };
    }

    /** Cuenta las referencias entrantes a una institucion (Req. 7.6, 7.8). */
    private async contarDependenciasEn(
        db: Prisma.TransactionClient,
        id: string,
    ): Promise<DependenciasInstitucion> {
        const [comunidades, ciclos, evidencias, reportes, embeddings] = await Promise.all([
            db.comunidad.count({ where: { institucionId: id } }),
            db.cicloSemanal.count({ where: { institucionId: id } }),
            db.evidence.count({ where: { institucionId: id } }),
            db.reporte.count({ where: { institucionId: id } }),
            db.embedding.count({ where: { institucionId: id } }),
        ]);
        return construirDependencias({ comunidades, ciclos, evidencias, reportes, embeddings });
    }

    /** Registra un cambio sobre una `Institucion` para su auditoria (Req. 7.5). */
    private auditar(
        accion: 'crear' | 'actualizar' | 'eliminar',
        institucionId: string,
        actorId?: number | string,
        cambios?: Record<string, unknown>,
    ): void {
        this.logger.log(
            `[auditoria][institucion] accion=${accion} id=${institucionId} ` +
            `actor=${actorId ?? 'desconocido'} ts=${new Date().toISOString()}` +
            (cambios ? ` cambios=${JSON.stringify(cambios)}` : ''),
        );
    }
}
