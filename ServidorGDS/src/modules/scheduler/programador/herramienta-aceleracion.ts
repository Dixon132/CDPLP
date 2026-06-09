/**
 * `HerramientaAceleracion` - utilidad administrativa para AVANZAR la simulacion
 * de un `Analisis` (tarea 16.3).
 *
 * Ofrece las tres acciones del salto temporal (Req. 18.2): avanzar una semana,
 * avanzar un mes (4 `Semana_Simulada`) y avanzar hasta el final del `Analisis`.
 * En todos los casos ENCOLA los ciclos pendientes en orden estrictamente
 * creciente en la MISMA `Cola_Trabajos`, aplicando la misma logica que el
 * procesamiento en tiempo real, sin omitir etapas ni tomar una ruta alternativa
 * por modo (Req. 18.1, 18.3): la unica diferencia entre las tres acciones es
 * CUANTAS semanas se avanzan.
 *
 * Como cada `Semana_Simulada` se procesa y persiste atomicamente por
 * `procesarSemana` (tarea 16.1) y el encolado es idempotente por `jobId`
 * determinista (tarea 16.2), un salto interrumpido conserva las semanas ya
 * procesadas y se reanuda desde la siguiente pendiente al volver a invocar la
 * herramienta (Req. 18.5, equivalencia de salto y paso a paso, Req. 18.4).
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import { encolarAvance, type ResultadoAvance } from './encolar-avance';
import { SEMANAS_POR_MES } from './planificador-avance';
import type { Reloj } from '../cola/puertos-cola';
import { RelojSistema } from '../cola/adaptadores-memoria';
import type { EncoladorSemana, PlanAnalisis } from './puertos-programador';

/** Dependencias (puertos) de la `HerramientaAceleracion`. */
export interface DependenciasHerramientaAceleracion {
    /** Estado de avance del `Analisis`. */
    plan: PlanAnalisis;
    /** Frontera de encolado en la `Cola_Trabajos` (`ColaProcesarSemanaService`). */
    encolador: EncoladorSemana;
    /** Reloj inyectable (deterministas en pruebas, Req. 18.4). Por defecto, del sistema. */
    reloj?: Reloj;
}

export class HerramientaAceleracion {
    private readonly reloj: Reloj;

    constructor(
        private readonly deps: DependenciasHerramientaAceleracion,
    ) {
        this.reloj = deps.reloj ?? new RelojSistema();
    }

    /** Avanza exactamente la siguiente `Semana_Simulada` pendiente por institucion. */
    avanzarUnaSemana(analisisId: string): Promise<ResultadoAvance> {
        return this.avanzar(analisisId, 1);
    }

    /** Avanza un mes simulado (hasta `SEMANAS_POR_MES` semanas pendientes por institucion). */
    avanzarUnMes(analisisId: string): Promise<ResultadoAvance> {
        return this.avanzar(analisisId, SEMANAS_POR_MES);
    }

    /** Avanza hasta el final: encola todas las `Semana_Simulada` pendientes en orden. */
    avanzarHastaElFinal(analisisId: string): Promise<ResultadoAvance> {
        return this.avanzar(analisisId, Number.POSITIVE_INFINITY);
    }

    /**
     * Camino UNICO de las tres acciones: encola los ciclos pendientes en la misma
     * cola reutilizando `procesarSemana`. `cantidadSemanas` es lo unico que varia.
     */
    private avanzar(
        analisisId: string,
        cantidadSemanas: number,
    ): Promise<ResultadoAvance> {
        return encolarAvance(
            { plan: this.deps.plan, encolador: this.deps.encolador, reloj: this.reloj },
            analisisId,
            cantidadSemanas,
        );
    }
}
