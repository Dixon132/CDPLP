/**
 * Errores tipados del `Gestor_Instituciones`. El router los mapea a respuestas
 * HTTP con el codigo de estado adecuado (400 / 404 / 409).
 *
 * _Requirements: 7.1, 7.5, 7.6_
 */
import type { DependenciasInstitucion } from "./instituciones.types";

/** Un campo concreto que no cumple la validacion, con su motivo. */
export interface DetalleValidacion {
    campo: string;
    motivo: string;
}

/** Datos de institucion invalidos (categoria, coordenadas, radio, ...). */
export class ValidacionInstitucionError extends Error {
    readonly detalles: DetalleValidacion[];
    constructor(detalles: DetalleValidacion[]) {
        super(
            `Datos de institucion invalidos: ${detalles
                .map((d) => `${d.campo} (${d.motivo})`)
                .join(", ")}`,
        );
        this.name = "ValidacionInstitucionError";
        this.detalles = detalles;
    }
}

/** La `Institucion` solicitada no existe en la base de datos dedicada. */
export class InstitucionNoEncontradaError extends Error {
    readonly institucionId: string;
    constructor(institucionId: string) {
        super(`Institucion no encontrada: ${institucionId}`);
        this.name = "InstitucionNoEncontradaError";
        this.institucionId = institucionId;
    }
}

/**
 * La `Institucion` esta referenciada por al menos un `Analisis` (comunidad) u
 * otra entidad dependiente y por tanto NO puede eliminarse (Req. 7.6, 7.8).
 * Transporta el conteo de dependencias y el mensaje de dependencia.
 */
export class InstitucionConDependenciasError extends Error {
    readonly institucionId: string;
    readonly dependencias: DependenciasInstitucion;
    constructor(
        institucionId: string,
        dependencias: DependenciasInstitucion,
        mensaje: string,
    ) {
        super(mensaje);
        this.name = "InstitucionConDependenciasError";
        this.institucionId = institucionId;
        this.dependencias = dependencias;
    }
}
