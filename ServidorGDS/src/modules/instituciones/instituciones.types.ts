/**
 * Tipos del `Gestor_Instituciones`.
 *
 * Una `Institucion` es una entidad educativa (universidad, colegio, instituto
 * o escuela) geolocalizada (latitud/longitud + radio de influencia en metros),
 * con un logo opcional y una descripcion. Es la base de las comunidades
 * digitales de un `Analisis`.
 *
 * La persistencia se modela en Prisma como `Institucion` (tabla
 * `gds_institucion`) sobre la base de datos DEDICADA del servicio. La FK
 * `gds_comunidad_digital` -> `gds_institucion` es RESTRICTIVA: una institucion
 * referenciada por un `Analisis` (a traves de su `Comunidad`) NO puede borrarse
 * (Req. 7.6, 7.8).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */

/** Conjunto cerrado de categorias admitidas para una `Institucion` (Req. 7.2). */
export const CATEGORIAS_INSTITUCION = [
    "universidad",
    "colegio",
    "instituto",
    "escuela",
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

/** Datos de alta de una `Institucion` (sin `id`, lo asigna la persistencia). */
export type DatosInstitucion = Omit<Institucion, "id">;

/**
 * Cambios de edicion de una `Institucion`. Todos los campos son opcionales:
 * se actualiza unicamente lo provisto (Req. 7.5).
 */
export type CambiosInstitucion = Partial<DatosInstitucion>;

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
 * Puerto de persistencia del `Gestor_Instituciones`. Desacopla la logica de
 * Prisma y permite probar el gestor con dobles en memoria.
 */
export interface InstitucionesRepositorio {
    /** Crea una `Institucion` y le asigna un `id` (Req. 7.1). */
    crear(datos: DatosInstitucion): Promise<Institucion>;
    /** Lista todas las instituciones. */
    listar(): Promise<Institucion[]>;
    /** Recupera una `Institucion` por su `id`, o `null` si no existe. */
    obtenerPorId(id: string): Promise<Institucion | null>;
    /** Persiste los cambios de una `Institucion` (Req. 7.5). */
    actualizar(id: string, cambios: CambiosInstitucion): Promise<Institucion>;
    /** Cuenta las referencias entrantes a la `Institucion` (Req. 7.6, 7.8). */
    contarDependencias(id: string): Promise<DependenciasInstitucion>;
    /**
     * Elimina la `Institucion` de forma ATOMICA: dentro de una unica
     * transaccion comprueba las dependencias y, si existe alguna, RECHAZA el
     * borrado entregando el mensaje de dependencia; en caso contrario, borra.
     * Debe lanzar `InstitucionConDependenciasError` si esta referenciada y
     * `InstitucionNoEncontradaError` si no existe (Req. 7.6).
     */
    eliminarAtomico(id: string): Promise<void>;
}

/**
 * Puerto de auditoria: registra los cambios sobre una `Institucion` para su
 * trazabilidad (Req. 7.5). Desacoplado para no fijar un destino concreto
 * (log, tabla de auditoria, bus de eventos, ...).
 */
export interface RegistroAuditoria {
    registrar(evento: EventoAuditoria): void | Promise<void>;
}

/** Evento de auditoria de una operacion sobre una `Institucion`. */
export interface EventoAuditoria {
    accion: "crear" | "actualizar" | "eliminar";
    institucionId: string;
    /** Id del actor (usuario del JWT) que ejecuto la operacion, si se conoce. */
    actorId?: number | string;
    /** Detalle de los cambios aplicados (para crear/actualizar). */
    cambios?: Record<string, unknown>;
    /** Marca de tiempo ISO-8601 de la operacion. */
    timestamp: string;
}
