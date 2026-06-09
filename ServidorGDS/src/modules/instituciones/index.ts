/**
 * Modulo `instituciones` - Gestor_Instituciones (CRUD + geolocalizacion +
 * restriccion de borrado) y sus rutas Express.
 *
 * Expone:
 *  - Tipos del dominio (`Institucion`, `DependenciasInstitucion`, ...).
 *  - Errores tipados del dominio.
 *  - Validacion (zod) de los datos de institucion.
 *  - El `Gestor_Instituciones` y su fabrica.
 *  - El repositorio Prisma y la auditoria por defecto.
 *  - El router (`/api/gds/instituciones`).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */
export const MODULE_NAME = "instituciones" as const;

export {
    CATEGORIAS_INSTITUCION,
} from "./instituciones.types";
export type {
    CategoriaInstitucion,
    Institucion,
    DatosInstitucion,
    CambiosInstitucion,
    DependenciasInstitucion,
    RestriccionEliminacion,
    InstitucionesRepositorio,
    RegistroAuditoria,
    EventoAuditoria,
} from "./instituciones.types";

export {
    ValidacionInstitucionError,
    InstitucionNoEncontradaError,
    InstitucionConDependenciasError,
} from "./instituciones.errores";
export type { DetalleValidacion } from "./instituciones.errores";

export {
    DatosInstitucionSchema,
    CambiosInstitucionSchema,
    validarDatosInstitucion,
    validarCambiosInstitucion,
} from "./instituciones.schema";

export {
    construirDependencias,
    mensajeDependencia,
} from "./instituciones.dependencias";

export { PrismaInstitucionesRepositorio } from "./institucionesRepositorio";
export { RegistroAuditoriaConsola } from "./auditoria";
export {
    GestorInstituciones,
    crearGestorInstituciones,
} from "./gestorInstituciones";

export {
    crearRouterInstituciones,
    default as institucionesRouter,
} from "./instituciones.routes";
