/**
 * Tipos del `Motor_Escenarios` y la `Biblioteca_Escenarios`.
 *
 * La `Biblioteca_Escenarios` (tabla `gds_scenarios`) almacena
 * `Escenario_Reutilizable` predefinidos y personalizados, reutilizables entre
 * distintos `Analisis` y VERSIONADOS. Al crear un `Analisis` a partir de un
 * escenario, se fija una COPIA INMUTABLE de su contexto + `(id, version)` para
 * trazabilidad; editar luego la biblioteca NO afecta a los analisis ya creados.
 *
 * Migracion NestJS (tarea 3.5): tipos trasladados al modulo de dominio
 * `analysis` (submodulo `escenarios`). El full impl corresponde a la tarea 21.2.
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */

/** Grado de impacto del escenario sobre la comunidad simulada. */
export type IntensidadEscenario = 'baja' | 'media' | 'alta';

/**
 * `Escenario_Reutilizable` tal como vive en la `Biblioteca_Escenarios`.
 * Refleja el modelo Prisma `Scenario` (mapeado a `gds_scenarios`).
 */
export interface EscenarioReutilizable {
    id: string;
    /** Nombre legible, p. ej. "Guerra del Gas", "Conflicto Universitario". */
    nombre: string;
    descripcion: string;
    /** Texto libre del escenario: contexto principal de cada generacion. */
    contexto: string;
    /** Grado de impacto del escenario. */
    intensidad: IntensidadEscenario;
    /** N.o de semanas estimado de vigencia/impacto. */
    duracionEsperada: number;
    /** Eventos que disparan o intensifican el escenario. */
    eventosDetonantes: string[];
    /** Colectivos/roles que participan. */
    actoresInvolucrados: string[];
    /** Categoria, p. ej. "sociopolitico", "sanitario", "academico". */
    categoria: string;
    /** Etiquetas para busqueda/clasificacion en la biblioteca. */
    tags: string[];
    /** Ajustes de comportamiento de los `Usuario_Sintetico`. */
    configuracionComportamiento: Record<string, unknown>;
    /** Parametros adicionales del escenario. */
    parametros: Record<string, unknown>;
    /** Se incrementa al editar; no muta versiones previas (Req. 29.5, 29.6). */
    version: number;
    /** Predefinidos vs personalizados (Req. 29.7). */
    esPredefinido: boolean;
}

/**
 * Definicion de un escenario para `guardar`: sin `id` (lo asigna la
 * persistencia) ni `version` (la gestiona el motor: arranca en 1).
 */
export type DefinicionEscenario = Omit<EscenarioReutilizable, 'id' | 'version'>;

/**
 * Escenario sin `id`: la persistencia asigna el identificador al crear.
 * Incluye `version` porque el motor decide la version a persistir.
 */
export type EscenarioSinId = Omit<EscenarioReutilizable, 'id'>;

/**
 * Resultado de fijar un escenario en un `Analisis`: copia inmutable del
 * contexto + `(escenarioId, version)` para trazabilidad (Req. 29.4, 29.6).
 * Para un escenario personalizado no guardado en biblioteca, `escenarioId` y
 * `version` son `null`.
 */
export interface EscenarioFijado {
    /** Copia inmutable del texto del escenario fijada en el `Analisis`. */
    contexto: string;
    /** Referencia al escenario de la biblioteca, si aplica. */
    escenarioId: string | null;
    /** Version usada, para trazabilidad. */
    version: number | null;
}

/**
 * Seleccion de escenario al crear un `Analisis`: de la biblioteca
 * (`escenarioId`) o personalizado en texto libre (`personalizado`), con la
 * opcion de guardarlo en la biblioteca para reutilizarlo (Req. 29.2, 29.3).
 */
export interface SeleccionEscenario {
    escenarioId?: string;
    personalizado?: string;
    guardarEnBiblioteca?: boolean;
}

/**
 * Puerto de persistencia de la `Biblioteca_Escenarios`. Permite desacoplar el
 * `Motor_Escenarios` de Prisma y probar la logica pura con dobles en memoria.
 */
export interface BibliotecaEscenariosRepositorio {
    /** Crea un escenario y le asigna un `id`. */
    crear(def: EscenarioSinId): Promise<EscenarioReutilizable>;
    /** Lista todos los escenarios (predefinidos y personalizados). */
    listar(): Promise<EscenarioReutilizable[]>;
    /** Recupera un escenario por su `id`, o `null` si no existe. */
    obtenerPorId(id: string): Promise<EscenarioReutilizable | null>;
}

/**
 * `Motor_Escenarios`: define, guarda, lista, edita (versionando) y fija
 * escenarios para un `Analisis`.
 */
export interface MotorEscenarios {
    /** Define y persiste un `Escenario_Reutilizable` (Req. 29.1). */
    guardar(def: DefinicionEscenario): Promise<EscenarioReutilizable>;
    /** Lista escenarios predefinidos y personalizados disponibles (Req. 29.2, 29.7). */
    listar(): Promise<EscenarioReutilizable[]>;
    /** Recupera un `Escenario_Reutilizable` por su `id`, o `null` si no existe. */
    obtenerPorId(id: string): Promise<EscenarioReutilizable | null>;
    /** Edita un escenario creando una NUEVA version; no muta versiones previas (Req. 29.5). */
    editar(
        id: string,
        cambios: Partial<EscenarioReutilizable>,
    ): Promise<EscenarioReutilizable>;
    /**
     * Resuelve el escenario a fijar en un `Analisis`: copia inmutable del
     * contexto + `(id, version)` para trazabilidad. Acepta escenario de
     * biblioteca o personalizado (Req. 29.3, 29.4, 29.6).
     */
    fijarParaAnalisis(seleccion: SeleccionEscenario): Promise<EscenarioFijado>;
    /**
     * Siembra de forma IDEMPOTENTE los escenarios PREDEFINIDOS en la
     * `Biblioteca_Escenarios` y devuelve el conjunto de predefinidos presentes
     * tras la siembra (Req. 29.1, 29.7).
     */
    sembrarPredefinidos(): Promise<EscenarioReutilizable[]>;
}

/** Token DI del puerto de persistencia de la `Biblioteca_Escenarios`. */
export const BIBLIOTECA_ESCENARIOS_REPOSITORIO = Symbol(
    'BIBLIOTECA_ESCENARIOS_REPOSITORIO',
);

/** Token DI del `Motor_Escenarios` (interfaz estable). */
export const MOTOR_ESCENARIOS = Symbol('MOTOR_ESCENARIOS');
