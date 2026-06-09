/**
 * Modulo `escenarios` - Motor_Escenarios / Biblioteca_Escenarios.
 *
 * Expone:
 *  - Tipos del dominio (`EscenarioReutilizable`, `EscenarioFijado`, etc.).
 *  - El `Motor_Escenarios` (`MotorEscenariosImpl` / `crearMotorEscenarios`).
 *  - El repositorio Prisma de la `Biblioteca_Escenarios`.
 *  - Los escenarios predefinidos y su función de siembra.
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */
export const MODULE_NAME = "escenarios" as const;

export type {
    IntensidadEscenario,
    EscenarioReutilizable,
    DefinicionEscenario,
    EscenarioSinId,
    EscenarioFijado,
    SeleccionEscenario,
    BibliotecaEscenariosRepositorio,
    MotorEscenarios,
} from "./escenarios.types";

export { PrismaBibliotecaRepositorio } from "./bibliotecaRepositorio";
export { MotorEscenariosImpl, crearMotorEscenarios } from "./motorEscenarios";
export {
    ESCENARIOS_PREDEFINIDOS,
    sembrarEscenariosPredefinidos,
} from "./escenarios.predefinidos";
export type { ContextoEscenarioAnalisis } from "./contextoEscenarioAnalisis";
export {
    aContextoEscenarioAnalisis,
    resolverContextoEscenarioAnalisis,
} from "./contextoEscenarioAnalisis";
