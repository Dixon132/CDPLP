/**
 * Submodulo `scheduler/programador` - `Programador_Temporal` y
 * `Herramienta_Aceleracion` (tarea 16.3).
 *
 * Ambos disparadores encolan `procesarSemana` por `Semana_Simulada` pendientes en
 * orden estrictamente creciente (una semana / un mes / hasta el final) por la
 * MISMA `Cola_Trabajos`, sin ruta alternativa por modo (Req. 12.4, 12.5, 18.1,
 * 18.2, 18.3).
 */
export {
    SEMANAS_POR_MES,
    planificarAvance,
} from './planificador-avance';
export type {
    EstadoInstitucion,
    PlanAvanceEntrada,
} from './planificador-avance';

export { encolarAvance } from './encolar-avance';
export type {
    DependenciasAvance,
    ResultadoAvance,
} from './encolar-avance';

export {
    PLAN_ANALISIS,
    ENCOLADOR_SEMANA,
    PROGRAMADOR_TEMPORAL,
    HERRAMIENTA_ACELERACION,
} from './puertos-programador';
export type {
    PlanAnalisis,
    EncoladorSemana,
} from './puertos-programador';

export { PlanAnalisisEnMemoria } from './adaptadores-programador';
export type { ConfiguracionAnalisisMemoria } from './adaptadores-programador';

export { HerramientaAceleracion } from './herramienta-aceleracion';
export type { DependenciasHerramientaAceleracion } from './herramienta-aceleracion';

export { ProgramadorTemporal } from './programador-temporal';
export type { DependenciasProgramadorTemporal } from './programador-temporal';

export { ProgramadorModule } from './programador.module';
