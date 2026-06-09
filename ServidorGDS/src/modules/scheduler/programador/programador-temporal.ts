/**
 * `ProgramadorTemporal` - disparador del avance en TIEMPO REAL SIMULADO de un
 * `Analisis` (tarea 16.3).
 *
 * Modela el avance del `Analisis` como tiempo real simulado: cada
 * `Semana_Simulada` se procesa de forma equivalente a una semana de espera real
 * (Req. 18.1). El `Programador_Temporal` no procesa por su cuenta: cuando vence
 * el intervalo de una semana simulada (lo dispara un Cron/node-schedule o el
 * `GestorEjecucion` en modo Tiempo_Real, tarea 17), su `tick` ENCOLA la siguiente
 * `Semana_Simulada` pendiente en la MISMA `Cola_Trabajos`, reutilizando el unico
 * `procesarSemana`.
 *
 * Es el mismo camino de encolado que la `Herramienta_Aceleracion`, con
 * `cantidadSemanas = 1`: no hay ruta alternativa por modo (Req. 18.4, 32.7). Por
 * eso procesar paso a paso (un `tick` por intervalo) produce el mismo resultado
 * que un salto temporal sobre las mismas semanas.
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import { encolarAvance, type ResultadoAvance } from './encolar-avance';
import type { Reloj } from '../cola/puertos-cola';
import { RelojSistema } from '../cola/adaptadores-memoria';
import type { EncoladorSemana, PlanAnalisis } from './puertos-programador';

/** Dependencias (puertos) del `ProgramadorTemporal`. */
export interface DependenciasProgramadorTemporal {
    /** Estado de avance del `Analisis`. */
    plan: PlanAnalisis;
    /** Frontera de encolado en la `Cola_Trabajos` (`ColaProcesarSemanaService`). */
    encolador: EncoladorSemana;
    /** Reloj inyectable (deterministas en pruebas, Req. 18.4). Por defecto, del sistema. */
    reloj?: Reloj;
}

export class ProgramadorTemporal {
    private readonly reloj: Reloj;

    constructor(
        private readonly deps: DependenciasProgramadorTemporal,
    ) {
        this.reloj = deps.reloj ?? new RelojSistema();
    }

    /**
     * Vencido el intervalo de una `Semana_Simulada`, encola la siguiente semana
     * pendiente (una sola) por institucion, en orden estrictamente creciente.
     *
     * Devuelve los trabajos encolados; vacio si el `Analisis` ya esta completo.
     */
    tick(analisisId: string): Promise<ResultadoAvance> {
        return encolarAvance(
            { plan: this.deps.plan, encolador: this.deps.encolador, reloj: this.reloj },
            analisisId,
            1,
        );
    }
}
