/**
 * Copia inmutable del escenario al crear un `Analisis`.
 *
 * Al crear un `Analisis`, su `Escenario` debe quedar fijado como contexto
 * INMUTABLE durante todo el ciclo de vida (Req. 8.6, 29.4, 29.6). Este modulo
 * ofrece un helper que, dada una `SeleccionEscenario` (escenario de la
 * `Biblioteca_Escenarios` o personalizado en texto libre), produce los campos
 * que `gds_analisis` debe persistir:
 *
 *  - `escenario`               -> copia inmutable del texto del escenario.
 *  - `escenarioId`             -> referencia al escenario de la biblioteca, o `null`.
 *  - `escenarioVersion`        -> version usada para trazabilidad, o `null`.
 *  - `escenarioEsPersonalizado`-> `true` si el analista definio un escenario
 *                                personalizado en texto libre; `false` si
 *                                selecciono uno de la biblioteca.
 *
 * La resolucion se delega en `MotorEscenarios.fijarParaAnalisis`, que toma la
 * copia por valor del contexto. Editar luego la biblioteca (generando nuevas
 * versiones) NO altera estos campos: el `Analisis` conserva la copia tomada en
 * el momento de su creacion.
 *
 * _Requirements: 29.4, 29.6, 8.6_
 */
import type {
    EscenarioFijado,
    MotorEscenarios,
    SeleccionEscenario,
} from './escenarios.types';

/**
 * Campos del escenario inmutable que se persisten en `gds_analisis`.
 * Coinciden con las columnas del modelo Prisma `Analisis`.
 */
export interface ContextoEscenarioAnalisis {
    /** Copia inmutable del texto del escenario fijada en el `Analisis`. */
    escenario: string;
    /** Referencia al `Escenario_Reutilizable` de la biblioteca, o `null`. */
    escenarioId: string | null;
    /** Version del escenario usada, para trazabilidad, o `null`. */
    escenarioVersion: number | null;
    /** `true` si el escenario fue definido como personalizado (texto libre). */
    escenarioEsPersonalizado: boolean;
}

/**
 * La seleccion corresponde a un escenario personalizado (texto libre)?
 *
 * `fijarParaAnalisis` prioriza `escenarioId`; por tanto, solo se considera
 * personalizado cuando NO hay `escenarioId` y si hay texto `personalizado`.
 */
function esSeleccionPersonalizada(seleccion: SeleccionEscenario): boolean {
    return !seleccion.escenarioId && seleccion.personalizado != null;
}

/**
 * Convierte un `EscenarioFijado` (salida del motor) + la seleccion original en
 * los campos inmutables que persiste `gds_analisis`.
 */
export function aContextoEscenarioAnalisis(
    fijado: EscenarioFijado,
    seleccion: SeleccionEscenario,
): ContextoEscenarioAnalisis {
    return {
        escenario: fijado.contexto,
        escenarioId: fijado.escenarioId,
        escenarioVersion: fijado.version,
        escenarioEsPersonalizado: esSeleccionPersonalizada(seleccion),
    };
}

/**
 * Resuelve, a partir de una `SeleccionEscenario`, la COPIA INMUTABLE del
 * escenario a persistir en `gds_analisis` al crear el `Analisis`.
 *
 * @throws si la seleccion no incluye `escenarioId` ni `personalizado`, o si el
 *         `escenarioId` no existe en la biblioteca (propagado por el motor).
 */
export async function resolverContextoEscenarioAnalisis(
    motor: MotorEscenarios,
    seleccion: SeleccionEscenario,
): Promise<ContextoEscenarioAnalisis> {
    const fijado = await motor.fijarParaAnalisis(seleccion);
    return aContextoEscenarioAnalisis(fijado, seleccion);
}
