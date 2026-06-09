/**
 * Copia inmutable del escenario al crear un `Analisis`.
 *
 * Al crear un `Analisis`, su `Escenario` debe quedar fijado como contexto
 * INMUTABLE durante todo el ciclo de vida (Req. 8.6, 29.4, 29.6). Este módulo
 * ofrece un helper que, dada una `SeleccionEscenario` (escenario de la
 * `Biblioteca_Escenarios` o personalizado en texto libre), produce los campos
 * que `gds_analisis` debe persistir:
 *
 *  - `escenario`               → copia inmutable del texto del escenario.
 *  - `escenarioId`             → referencia al escenario de la biblioteca, o `null`.
 *  - `escenarioVersion`        → versión usada para trazabilidad, o `null`.
 *  - `escenarioEsPersonalizado`→ `true` si el analista definió un escenario
 *                                personalizado en texto libre; `false` si
 *                                seleccionó uno de la biblioteca.
 *
 * La resolución se delega en `MotorEscenarios.fijarParaAnalisis`, que toma la
 * copia por valor del contexto. Editar luego la biblioteca (generando nuevas
 * versiones) NO altera estos campos: el `Analisis` conserva la copia tomada en
 * el momento de su creación.
 *
 * _Requirements: 29.4, 29.6, 8.6_
 */
import type {
    EscenarioFijado,
    MotorEscenarios,
    SeleccionEscenario,
} from "./escenarios.types";

/**
 * Campos del escenario inmutable que se persisten en `gds_analisis`.
 * Coinciden con las columnas del modelo Prisma `Analisis`
 * (`escenario`, `escenario_es_personalizado`, `escenario_id`,
 * `escenario_version`).
 */
export interface ContextoEscenarioAnalisis {
    /** Copia inmutable del texto del escenario fijada en el `Analisis`. */
    escenario: string;
    /** Referencia al `Escenario_Reutilizable` de la biblioteca, o `null`. */
    escenarioId: string | null;
    /** Versión del escenario usada, para trazabilidad, o `null`. */
    escenarioVersion: number | null;
    /** `true` si el escenario fue definido como personalizado (texto libre). */
    escenarioEsPersonalizado: boolean;
}

/**
 * ¿La selección corresponde a un escenario personalizado (texto libre)?
 *
 * `fijarParaAnalisis` prioriza `escenarioId`; por tanto, sólo se considera
 * personalizado cuando NO hay `escenarioId` y sí hay texto `personalizado`.
 * Un personalizado guardado en biblioteca (`guardarEnBiblioteca`) sigue siendo
 * personalizado: tendrá `escenarioId`/`version` de trazabilidad pero su origen
 * es texto libre del analista.
 */
function esSeleccionPersonalizada(seleccion: SeleccionEscenario): boolean {
    return !seleccion.escenarioId && seleccion.personalizado != null;
}

/**
 * Convierte un `EscenarioFijado` (salida del motor) + la selección original en
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
 * Usa `MotorEscenarios.fijarParaAnalisis`, que copia el contexto por valor y
 * registra `(escenarioId, version)` para trazabilidad. El resultado es
 * independiente de cualquier edición posterior de la biblioteca.
 *
 * @throws si la selección no incluye `escenarioId` ni `personalizado`, o si el
 *         `escenarioId` no existe en la biblioteca (propagado por el motor).
 */
export async function resolverContextoEscenarioAnalisis(
    motor: MotorEscenarios,
    seleccion: SeleccionEscenario,
): Promise<ContextoEscenarioAnalisis> {
    const fijado = await motor.fijarParaAnalisis(seleccion);
    return aContextoEscenarioAnalisis(fijado, seleccion);
}
