/**
 * Submodulo `scheduler/cola` - porte del procesamiento de `procesarSemana` a la
 * `Cola_Trabajos` (BullMQ/Redis) (tarea 16.2).
 *
 * Expone el dominio de estados consultable, la identidad determinista de los
 * trabajos `(A,I,N)`, los puertos del motor de ciclos y sus adaptadores por
 * defecto, la logica del procesador (`EjecutorTrabajoSemana`), el worker BullMQ
 * (`ProcesarSemanaProcessor`), la frontera de encolado (`ColaProcesarSemanaService`)
 * y el modulo NestJS de cableado (`ColaSemanaModule`).
 */

export {
    EstadoTrabajo,
    ESTADOS_TRABAJO,
    ESTADOS_TERMINALES,
    esEstadoTrabajo,
    esEstadoTerminal,
} from './estados-trabajo';

export {
    PREFIJO_TRABAJO_SEMANA,
    claveTrabajo,
    jobIdSemana,
} from './trabajo-semana';
export type { DatosTrabajoSemana } from './trabajo-semana';

export {
    RELOJ_COLA,
    GENERADOR_ID_COLA,
    CERROJO_CONCURRENCIA,
    CONSULTA_RESULTADO_SEMANA,
    REGISTRO_ESTADO_TRABAJOS,
    EJECUTOR_TRABAJO_SEMANA,
} from './puertos-cola';
export type {
    Reloj,
    GeneradorId,
    ProcesadorSemanaPort,
    CerrojoConcurrencia,
    ConsultaResultadoSemana,
    RegistroEstadoTrabajo,
    RegistroEstadoTrabajos,
    TransicionEstado,
} from './puertos-cola';

export {
    RelojSistema,
    RelojFijo,
    GeneradorIdUuid,
    GeneradorIdSecuencial,
    CerrojoConcurrenciaEnMemoria,
    RegistroEstadoTrabajosEnMemoria,
    ConsultaResultadoSemanaSiempreNueva,
} from './adaptadores-memoria';

export {
    EjecutorTrabajoSemana,
} from './ejecutor-trabajo-semana';
export type {
    ContextoIntento,
    DependenciasEjecutor,
    MotivoOmision,
    ResultadoEjecucionTrabajo,
} from './ejecutor-trabajo-semana';

export { ProcesarSemanaProcessor } from './procesar-semana.processor';
export {
    ColaProcesarSemanaService,
} from './cola-procesar-semana.service';
export type { ResultadoEncolado } from './cola-procesar-semana.service';
export { ColaSemanaModule } from './cola-semana.module';
