/**
 * Submodulo `scheduler/gestor` - `GestorEjecucion` y su API HTTP (tarea 17.1).
 *
 * Orquesta los tres `Modo_Ejecucion` (Manual / Automatico / Tiempo_Real) y el
 * ciclo de pausa/reanudacion de un `Analisis`, reutilizando la
 * `Herramienta_Aceleracion` y el `Programador_Temporal` (que encolan por la misma
 * `Cola_Trabajos` el UNICO `procesarSemana`). El modo solo cambia QUIEN dispara y
 * CUANDO, garantizando la equivalencia de resultado entre modos (Req. 32.7).
 */
export {
    GestorEjecucionService,
} from './gestor-ejecucion';
export type {
    DependenciasGestorEjecucion,
    ResultadoEjecucion,
} from './gestor-ejecucion';

export {
    ALMACEN_ESTADO_EJECUCION,
    GESTOR_EJECUCION,
    TEMPORIZADOR_EJECUCION,
    INTERVALO_TIEMPO_REAL_POR_DEFECTO,
    INTERVALO_TIEMPO_REAL_DEFECTO_MS,
} from './puertos-gestor';
export type {
    AlmacenEstadoEjecucion,
    EstadoEjecucionAnalisis,
    Temporizador,
    CancelarTemporizador,
} from './puertos-gestor';

export { AlmacenEstadoEjecucionEnMemoria } from './almacen-estado-ejecucion';

export { TemporizadorIntervalo, TemporizadorManual } from './temporizador';

export { SeleccionarModoDto } from './dto/seleccionar-modo.dto';

export { GestorEjecucionController } from './gestor-ejecucion.controller';

export { GestorEjecucionModule } from './gestor-ejecucion.module';
