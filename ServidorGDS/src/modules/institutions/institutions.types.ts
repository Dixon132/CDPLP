/**
 * Tipos del modulo `Institutions` (Gestor_Instituciones) en NestJS.
 *
 * Una `Institucion` es una entidad educativa (universidad, colegio, instituto
 * o escuela) geolocalizada (latitud/longitud + radio de influencia en metros),
 * con un logo opcional y una descripcion. Es la base de las `Comunidad_Digital`
 * de un `Analisis`.
 *
 * Persistencia: modelo Prisma `Institucion` (tabla `gds_institucion`) sobre la
 * base de datos DEDICADA del servicio. Todas las FK entrantes
 * (`gds_comunidad_digital`, `gds_ciclo_semanal`, `gds_evidences`, `gds_reporte`,
 * `gds_embedding`) son RESTRICT: una institucion referenciada por un `Analisis`
 * NO puede borrarse (Req. 7.6, 7.8).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */

/** Conjunto cerrado de categorias admitidas para una `Institucion` (Req. 7.2). */
export const CATEGORIAS_INSTITUCION = [
    'universidad',
    'colegio',
    'instituto',
    'escuela',
] as const;

/** Categoria de una `Institucion`, restringida al conjunto admitido. */
export type CategoriaInstitucion = (typeof CATEGORIAS_INSTITUCION)[number];

/**
 * `Institucion` tal como vive en la base de datos dedicada. Refleja el modelo
 * Prisma `Institucion` (mapeado a `gds_institucion`).
 */
export interface Institucion {
    id: string;
    /** Nombre legible de la institucion. */
    nombre: string;
    /** Categoria dentro de {universidad, colegio, instituto, escuela} (Req. 7.2). */
    categoria: CategoriaInstitucion;
    /** Latitud geografica en grados decimales [-90, 90] (Req. 7.3). */
    latitud: number;
    /** Longitud geografica en grados decimales [-180, 180] (Req. 7.3). */
    longitud: number;
    /** Radio de influencia en metros (entero positivo) (Req. 7.3). */
    radioMetros: number;
    /** Referencia al archivo del logo, si se adjunto (Req. 7.4). */
    logoUrl: string | null;
    /** Descripcion libre de la institucion. */
    descripcion: string | null;
}

/**
 * Conteo de referencias entrantes que impiden el borrado de una `Institucion`.
 * Una institucion solo puede eliminarse cuando `total === 0` (Req. 7.6).
 */
export interface DependenciasInstitucion {
    /** Comunidades digitales (de algun `Analisis`) que la referencian (Req. 7.6). */
    comunidades: number;
    /** Ciclos semanales que la referencian. */
    ciclos: number;
    /** Evidencias que la referencian. */
    evidencias: number;
    /** Reportes que la referencian. */
    reportes: number;
    /** Embeddings (Memoria_Semantica) que la referencian. */
    embeddings: number;
    /** Suma de todas las referencias entrantes. */
    total: number;
}

/**
 * Restriccion de eliminacion expuesta de forma PROACTIVA, aun cuando no se
 * intente eliminar la institucion (Req. 7.8).
 */
export interface RestriccionEliminacion {
    institucionId: string;
    /** `true` solo si no existe ninguna dependencia (`dependencias.total === 0`). */
    puedeEliminar: boolean;
    dependencias: DependenciasInstitucion;
    /** Mensaje legible de dependencia (vacio cuando se puede eliminar). */
    mensaje: string;
}

/**
 * Construye un `DependenciasInstitucion` calculando el `total`.
 * Reutilizado por el rechazo atomico del borrado (Req. 7.6) y por la
 * exposicion proactiva de restricciones (Req. 7.8).
 */
export function construirDependencias(parciales: {
    comunidades: number;
    ciclos: number;
    evidencias: number;
    reportes: number;
    embeddings: number;
}): DependenciasInstitucion {
    const { comunidades, ciclos, evidencias, reportes, embeddings } = parciales;
    return {
        comunidades,
        ciclos,
        evidencias,
        reportes,
        embeddings,
        total: comunidades + ciclos + evidencias + reportes + embeddings,
    };
}

/**
 * Mensaje legible de dependencia. Cadena vacia cuando no hay dependencias
 * (la institucion puede eliminarse).
 */
export function mensajeDependencia(
    institucionId: string,
    deps: DependenciasInstitucion,
): string {
    if (deps.total === 0) {
        return '';
    }
    const partes: string[] = [];
    if (deps.comunidades > 0) {
        partes.push(`${deps.comunidades} comunidad(es) de analisis`);
    }
    if (deps.ciclos > 0) partes.push(`${deps.ciclos} ciclo(s) semanal(es)`);
    if (deps.evidencias > 0) partes.push(`${deps.evidencias} evidencia(s)`);
    if (deps.reportes > 0) partes.push(`${deps.reportes} reporte(s)`);
    if (deps.embeddings > 0) partes.push(`${deps.embeddings} embedding(s)`);

    return (
        `No se puede eliminar la institucion ${institucionId}: esta referenciada por ` +
        `${partes.join(', ')}. Elimine primero los analisis/datos dependientes.`
    );
}
