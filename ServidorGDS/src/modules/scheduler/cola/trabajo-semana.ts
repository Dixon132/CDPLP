/**
 * Identidad de un trabajo de la `Cola_Trabajos`: la triada
 * `(analisisId, institucionId, numeroSemana)` y sus derivados deterministas
 * (`clave` de concurrencia/idempotencia y `jobId` de BullMQ) (tarea 16.2).
 *
 * La identidad es la PIEDRA ANGULAR de tres invariantes del motor de ciclos:
 *  - **Idempotencia** (Req. 27.2, 38.3): un `jobId` DETERMINISTA hace que BullMQ
 *    deduplique reintentos/encolados repetidos de la misma `Semana_Simulada` de
 *    una `Institucion`, sin crear trabajos duplicados.
 *  - **Bloqueo de concurrencia** (Req. 27.3, 38.2): la `clave` `(A,I,N)` es el
 *    recurso sobre el que se adquiere el cerrojo que impide procesar dos veces a
 *    la vez la misma semana de la misma institucion.
 *  - **Aislamiento por institucion** (Req. 9.5, 38.4): como la identidad incluye
 *    `institucionId`, cada `(A,I,N)` es un trabajo independiente; el fallo de una
 *    institucion no contamina la clave de otra.
 *
 * Diseno: design.md > "Invariantes y mecanismos del motor".
 * _Requirements: 9.1, 9.5, 27.2, 27.3, 38.2, 38.3_
 */

/** Payload de un trabajo de la `Cola_Trabajos`: la `Semana_Simulada` a procesar. */
export interface DatosTrabajoSemana {
    /** `Analisis` de origen. */
    analisisId: string;
    /** `Institucion` cuya `Comunidad_Digital` se procesa (aislamiento, Req. 9.5). */
    institucionId: string;
    /** Numero de `Semana_Simulada` (entero >= 1), procesado en orden creciente. */
    numeroSemana: number;
}

/** Prefijo del `jobId`/clave; coincide con el nombre de la cola para trazabilidad. */
export const PREFIJO_TRABAJO_SEMANA = 'procesar-semana' as const;

/**
 * Normaliza/valida la triada de identidad. Lanza si algun componente es invalido
 * para evitar `jobId`/claves ambiguas (p. ej. ids vacios o semanas no enteras),
 * lo que comprometeria la deduplicacion y el bloqueo.
 */
function validarDatos(datos: DatosTrabajoSemana): void {
    if (!datos.analisisId || typeof datos.analisisId !== 'string') {
        throw new Error('trabajo-semana: analisisId requerido (string no vacio).');
    }
    if (!datos.institucionId || typeof datos.institucionId !== 'string') {
        throw new Error('trabajo-semana: institucionId requerido (string no vacio).');
    }
    if (!Number.isInteger(datos.numeroSemana) || datos.numeroSemana < 1) {
        throw new Error(
            `trabajo-semana: numeroSemana invalido (${datos.numeroSemana}); debe ser un entero >= 1.`,
        );
    }
}

/**
 * Clave de concurrencia/idempotencia `(A,I,N)`, estable y unica por
 * `Semana_Simulada` de una `Institucion`. Es el recurso del cerrojo de
 * concurrencia y la clave del registro de estado (Req. 27.3, 38.2).
 *
 * Se usa un separador (`::`) que no puede aparecer en los ids para evitar
 * colisiones entre, p. ej., `("a:b", "c", 1)` y `("a", "b:c", 1)`.
 */
export function claveTrabajo(datos: DatosTrabajoSemana): string {
    validarDatos(datos);
    return `${datos.analisisId}::${datos.institucionId}::${datos.numeroSemana}`;
}

/**
 * `jobId` DETERMINISTA de BullMQ para `(A,I,N)` (Req. 27.2, 38.3).
 *
 * BullMQ ignora un `add` cuyo `jobId` ya existe en la cola: encolar dos veces la
 * misma `Semana_Simulada` de la misma `Institucion` NO crea un segundo trabajo,
 * garantizando idempotencia a nivel de encolado. El mismo `jobId` se reutiliza en
 * los reintentos del propio BullMQ.
 */
export function jobIdSemana(datos: DatosTrabajoSemana): string {
    validarDatos(datos);
    return `${PREFIJO_TRABAJO_SEMANA}_${datos.analisisId}_${datos.institucionId}_${datos.numeroSemana}`;
}
