/**
 * Tipos del `Motor_Escenarios` y la `Biblioteca_Escenarios`.
 *
 * La `Biblioteca_Escenarios` (tabla `gds_scenarios`) almacena
 * `Escenario_Reutilizable` predefinidos y personalizados, reutilizables entre
 * distintos `Analisis` y VERSIONADOS. Al crear un `Analisis` a partir de un
 * escenario, se fija una COPIA INMUTABLE de su contexto + `(id, version)` para
 * trazabilidad; editar luego la biblioteca NO afecta a los análisis ya creados.
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */

/** Grado de impacto del escenario sobre la comunidad simulada. */
export type IntensidadEscenario = "baja" | "media" | "alta";

/**
 * `Escenario_Reutilizable` tal como vive en la `Biblioteca_Escenarios`.
 * Refleja el modelo Prisma `Scenario` (mapeado a `gds_scenarios`).
 */
export interface EscenarioReutilizable {
    id: string;
    /** Nombre legible, p. ej. "Guerra del Gas", "Conflicto Universitario". */
    nombre: string;
    descripcion: string;
    /** Texto libre del escenario: contexto principal de cada generación. */
    contexto: string;
    /** Grado de impacto del escenario. */
    intensidad: IntensidadEscenario;
    /** Nº de semanas estimado de vigencia/impacto. */
    duracionEsperada: number;
    /** Eventos que disparan o intensifican el escenario. */
    eventosDetonantes: string[];
    /** Colectivos/roles que participan. */
    actoresInvolucrados: string[];
    /** Categoría, p. ej. "sociopolítico", "sanitario", "académico". */
    categoria: string;
    /** Etiquetas para búsqueda/clasificación en la biblioteca. */
    tags: string[];
    /** Ajustes de comportamiento de los `Usuario_Sintetico`. */
    configuracionComportamiento: Record<string, unknown>;
    /** Parámetros adicionales del escenario. */
    parametros: Record<string, unknown>;
    /** Se incrementa al editar; no muta versiones previas (Req. 29.5, 29.6). */
    version: number;
    /** Predefinidos vs personalizados (Req. 29.7). */
    esPredefinido: boolean;
}

/**
 * Definición de un escenario para `guardar`: sin `id` (lo asigna la
 * persistencia) ni `version` (la gestiona el motor: arranca en 1).
 */
export type DefinicionEscenario = Omit<EscenarioReutilizable, "id" | "version">;

/**
 * Escenario sin `id`: la persistencia asigna el identificador al crear.
 * Incluye `version` porque el motor decide la versión a persistir.
 */
export type EscenarioSinId = Omit<EscenarioReutilizable, "id">;

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
    /** Versión usada, para trazabilidad. */
    version: number | null;
}

/**
 * Selección de escenario al crear un `Analisis`: de la biblioteca
 * (`escenarioId`) o personalizado en texto libre (`personalizado`), con la
 * opción de guardarlo en la biblioteca para reutilizarlo (Req. 29.2, 29.3).
 */
export interface SeleccionEscenario {
    escenarioId?: string;
    personalizado?: string;
    guardarEnBiblioteca?: boolean;
}

/**
 * Puerto de persistencia de la `Biblioteca_Escenarios`. Permite desacoplar el
 * `Motor_Escenarios` de Prisma y probar la lógica pura con dobles en memoria.
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
    /** Edita un escenario creando una NUEVA versión; no muta versiones previas (Req. 29.5). */
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
}
