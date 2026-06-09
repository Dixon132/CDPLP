/**
 * `Gestor_Instituciones`: CRUD de instituciones educativas con geolocalizacion,
 * auditoria de cambios y restriccion de borrado (Req. 7).
 *
 * Responsabilidades:
 *  - Crear/persistir una `Institucion` validada (nombre, categoria, lat/lng,
 *    radio, logo, descripcion) (Req. 7.1, 7.2, 7.3, 7.4).
 *  - Editar y persistir cambios, registrandolos para auditoria (Req. 7.5).
 *  - Rechazar de forma ATOMICA el borrado de una institucion referenciada por
 *    un `Analisis` (comunidad) entregando el mensaje de dependencia (Req. 7.6).
 *  - Exponer de forma PROACTIVA las restricciones de eliminacion y los mensajes
 *    de dependencia, aun cuando no se intente eliminar (Req. 7.8).
 *
 * La validacion y la persistencia se delegan en funciones puras de esquema y en
 * el puerto `InstitucionesRepositorio` (logica desacoplada y testeable).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */
import type {
    CambiosInstitucion,
    DependenciasInstitucion,
    Institucion,
    InstitucionesRepositorio,
    RegistroAuditoria,
    RestriccionEliminacion,
} from "./instituciones.types";
import { InstitucionNoEncontradaError } from "./instituciones.errores";
import {
    validarCambiosInstitucion,
    validarDatosInstitucion,
} from "./instituciones.schema";
import { mensajeDependencia } from "./instituciones.dependencias";
import { PrismaInstitucionesRepositorio } from "./institucionesRepositorio";
import { RegistroAuditoriaConsola } from "./auditoria";

export class GestorInstituciones {
    constructor(
        private readonly repo: InstitucionesRepositorio = new PrismaInstitucionesRepositorio(),
        private readonly auditoria: RegistroAuditoria = new RegistroAuditoriaConsola(),
    ) { }

    /** Crea y persiste una `Institucion` validada (Req. 7.1, 7.2, 7.3, 7.4). */
    async crear(
        entrada: unknown,
        actorId?: number | string,
    ): Promise<Institucion> {
        const datos = validarDatosInstitucion(entrada);
        const institucion = await this.repo.crear(datos);
        await this.auditoria.registrar({
            accion: "crear",
            institucionId: institucion.id,
            actorId,
            cambios: { ...datos },
            timestamp: new Date().toISOString(),
        });
        return institucion;
    }

    /** Lista todas las instituciones. */
    async listar(): Promise<Institucion[]> {
        return this.repo.listar();
    }

    /** Recupera una `Institucion` por su `id` o lanza `InstitucionNoEncontradaError`. */
    async obtener(id: string): Promise<Institucion> {
        const institucion = await this.repo.obtenerPorId(id);
        if (!institucion) {
            throw new InstitucionNoEncontradaError(id);
        }
        return institucion;
    }

    /** Edita una `Institucion`, persiste los cambios y los audita (Req. 7.5). */
    async actualizar(
        id: string,
        entrada: unknown,
        actorId?: number | string,
    ): Promise<Institucion> {
        const cambios: CambiosInstitucion = validarCambiosInstitucion(entrada);
        const institucion = await this.repo.actualizar(id, cambios);
        await this.auditoria.registrar({
            accion: "actualizar",
            institucionId: institucion.id,
            actorId,
            cambios: { ...cambios },
            timestamp: new Date().toISOString(),
        });
        return institucion;
    }

    /**
     * Elimina una `Institucion` de forma atomica. Si esta referenciada por un
     * `Analisis` (comunidad) u otra dependencia, el repositorio rechaza el
     * borrado y entrega el mensaje de dependencia (Req. 7.6). Solo se audita el
     * borrado efectivo.
     */
    async eliminar(id: string, actorId?: number | string): Promise<void> {
        await this.repo.eliminarAtomico(id);
        await this.auditoria.registrar({
            accion: "eliminar",
            institucionId: id,
            actorId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Expone de forma PROACTIVA las restricciones de eliminacion de una
     * `Institucion` y su mensaje de dependencia, sin intentar eliminarla
     * (Req. 7.8).
     */
    async restriccionesEliminacion(id: string): Promise<RestriccionEliminacion> {
        // Confirma primero la existencia para devolver 404 si no existe.
        await this.obtener(id);
        const dependencias: DependenciasInstitucion =
            await this.repo.contarDependencias(id);
        return {
            institucionId: id,
            puedeEliminar: dependencias.total === 0,
            dependencias,
            mensaje: mensajeDependencia(id, dependencias),
        };
    }
}

/** Crea un `Gestor_Instituciones` respaldado por Prisma (BD dedicada). */
export function crearGestorInstituciones(
    repo?: InstitucionesRepositorio,
    auditoria?: RegistroAuditoria,
): GestorInstituciones {
    return new GestorInstituciones(
        repo ?? new PrismaInstitucionesRepositorio(),
        auditoria ?? new RegistroAuditoriaConsola(),
    );
}
