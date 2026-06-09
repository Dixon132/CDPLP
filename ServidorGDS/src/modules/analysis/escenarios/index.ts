/**
 * Submodulo `analysis/escenarios` - `Motor_Escenarios` / `Biblioteca_Escenarios`
 * migrado a NestJS (tarea 3.5).
 *
 * Expone los tipos del dominio, el `MotorEscenariosService`, el repositorio
 * Prisma de la `Biblioteca_Escenarios`, los escenarios predefinidos y el helper
 * de copia inmutable del escenario para `gds_analisis`.
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7_
 */
export type {
    IntensidadEscenario,
    EscenarioReutilizable,
    DefinicionEscenario,
    EscenarioSinId,
    EscenarioFijado,
    SeleccionEscenario,
    BibliotecaEscenariosRepositorio,
    MotorEscenarios,
} from './escenarios.types';
export {
    BIBLIOTECA_ESCENARIOS_REPOSITORIO,
    MOTOR_ESCENARIOS,
} from './escenarios.types';

export { BibliotecaRepositorioPrisma, aDominio } from './biblioteca-repositorio';
export { MotorEscenariosService } from './motor-escenarios.service';
export { EscenariosController } from './escenarios.controller';
export { CrearEscenarioDto, INTENSIDADES_ESCENARIO } from './dto/crear-escenario.dto';
export { EditarEscenarioDto } from './dto/editar-escenario.dto';
export {
    ESCENARIOS_PREDEFINIDOS,
    sembrarEscenariosPredefinidos,
} from './escenarios.predefinidos';
export type { ContextoEscenarioAnalisis } from './contexto-escenario-analisis';
export {
    aContextoEscenarioAnalisis,
    resolverContextoEscenarioAnalisis,
} from './contexto-escenario-analisis';
