/**
 * `encolarAvance` - rutina COMPARTIDA que materializa el avance de un `Analisis`
 * encolando sus `Semana_Simulada` pendientes en la `Cola_Trabajos` (tarea 16.3).
 *
 * Es el unico camino de encolado del motor de ciclos disparado por tiempo: tanto
 * el `Programador_Temporal` (tiempo real simulado) como la `Herramienta_Aceleracion`
 * (una semana / un mes / hasta el final) delegan aqui. La rutina:
 *
 *  1. lee el estado de avance del `Analisis` por el puerto `PlanAnalisis`
 *     (instituciones, total de semanas, ultima completada por institucion);
 *  2. delega en `planificarAvance` (PURO) el calculo de los trabajos `(A,I,N)`
 *     pendientes en orden estrictamente creciente y contiguo (Req. 12.4, 18.3);
 *  3. los encola UNO A UNO, en ese orden, por el puerto `EncoladorSemana`
 *     (`ColaProcesarSemanaService`), preservando el orden de encolado.
 *
 * No hay ruta alternativa por modo (Req. 18.1, 18.4): la diferencia entre "una
 * semana", "un mes" y "hasta el final" es solo el parametro `cantidadSemanas`; el
 * resto del camino (planificacion -> misma cola -> mismo `procesarSemana`) es
 * identico. El encolado es idempotente gracias al `jobId` determinista de la cola
 * (Req. 27.2, 38.3): reencolar una semana ya pendiente/procesada no la duplica.
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import type { Reloj } from '../cola/puertos-cola';
import type { ResultadoEncolado } from '../cola/cola-procesar-semana.service';
import {
    planificarAvance,
    type EstadoInstitucion,
} from './planificador-avance';
import type { EncoladorSemana, PlanAnalisis } from './puertos-programador';

/** Resultado de un avance: los trabajos encolados (en orden) y su trazabilidad. */
export interface ResultadoAvance {
    /** `Analisis` avanzado. */
    analisisId: string;
    /**
     * Trabajos `(A,I,N)` encolados en esta operacion, en orden estrictamente
     * creciente de `numeroSemana`. Vacio si no quedaban semanas pendientes.
     */
    encolados: ResultadoEncolado[];
    /** Instante (del `Reloj` inyectable) en que se disparo el avance (trazable). */
    disparadoEn: Date;
}

/** Dependencias compartidas del avance disparado por tiempo. */
export interface DependenciasAvance {
    /** Estado de avance del `Analisis` (instituciones, total, ultima completada). */
    plan: PlanAnalisis;
    /** Frontera de encolado en la `Cola_Trabajos` (`ColaProcesarSemanaService`). */
    encolador: EncoladorSemana;
    /** Reloj inyectable para sellar el disparo (deterministas en pruebas, Req. 18.4). */
    reloj: Reloj;
}

/**
 * Encola las `Semana_Simulada` pendientes del `Analisis` avanzando
 * `cantidadSemanas` por institucion (1 = una semana, 4 = un mes,
 * `Number.POSITIVE_INFINITY` = hasta el final).
 *
 * Devuelve los trabajos encolados en orden. Si el `Analisis` no tiene
 * instituciones o todas completaron sus semanas, no encola nada (lista vacia).
 */
export async function encolarAvance(
    deps: DependenciasAvance,
    analisisId: string,
    cantidadSemanas: number,
): Promise<ResultadoAvance> {
    const disparadoEn = deps.reloj.ahora();

    const [instituciones, totalSemanas] = await Promise.all([
        deps.plan.institucionesDe(analisisId),
        deps.plan.totalSemanas(analisisId),
    ]);

    const estados: EstadoInstitucion[] = await Promise.all(
        instituciones.map(async (institucionId) => ({
            institucionId,
            ultimaSemanaCompletada: await deps.plan.ultimaSemanaCompletada(
                analisisId,
                institucionId,
            ),
        })),
    );

    const trabajos = planificarAvance({
        analisisId,
        totalSemanas,
        instituciones: estados,
        cantidadSemanas,
    });

    // Encolar UNO A UNO preservando el orden estrictamente creciente. No se
    // paraleliza para no alterar el orden de encolado (la idempotencia del
    // `jobId` determinista cubre reintentos del propio disparador).
    const encolados: ResultadoEncolado[] = [];
    for (const datos of trabajos) {
        encolados.push(await deps.encolador.encolar(datos));
    }

    return { analisisId, encolados, disparadoEn };
}
