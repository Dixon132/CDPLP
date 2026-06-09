/**
 * `planificarAvance` - planificador PURO de las `Semana_Simulada` a encolar para
 * avanzar un `Analisis` (tarea 16.3).
 *
 * Es la pieza compartida (sin efectos secundarios) que decide QUE trabajos
 * `(A,I,N)` se encolan y EN QUE ORDEN, tanto para el `Programador_Temporal`
 * (avance de una semana) como para la `Herramienta_Aceleracion` (una semana / un
 * mes / hasta el final). Al aislarla como funcion pura puede verificarse de forma
 * sincrona y determinista (sin cola ni BD) que:
 *
 *  - solo se encolan `Semana_Simulada` PENDIENTES: las que van de
 *    `ultimaSemanaCompletada + 1` hasta el tope correspondiente (Req. 12.4);
 *  - el orden es ESTRICTAMENTE CRECIENTE y CONTIGUO por institucion, sin saltos
 *    ni huecos, sin reprocesar semanas ya completadas (Req. 12.4, 18.3);
 *  - la emision global es por semana ascendente (semana-externo, institucion-
 *    interno), coherente con el diagrama del motor de cola (design.md);
 *  - "avanzar una semana / un mes / hasta el final" se modela con una unica
 *    `cantidadSemanas` (1, 4 o infinito) (Req. 18.2);
 *  - NO existe ruta alternativa por modo: todos los disparadores producen la
 *    misma lista de trabajos para el mismo estado de avance (Req. 18.1, 18.4).
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import type { DatosTrabajoSemana } from '../cola/trabajo-semana';

/** Numero de `Semana_Simulada` que componen un "mes" simulado (Req. 18.2). */
export const SEMANAS_POR_MES = 4 as const;

/** Estado de avance de una `Institucion` dentro del `Analisis`. */
export interface EstadoInstitucion {
    /** `Institucion` cuya `Comunidad_Digital` se procesa. */
    institucionId: string;
    /**
     * Numero de la ultima `Semana_Simulada` COMPLETADA (0 si ninguna). La
     * siguiente pendiente es `ultimaSemanaCompletada + 1`.
     */
    ultimaSemanaCompletada: number;
}

/** Entrada del planificador: estado de avance del `Analisis` + cuanto avanzar. */
export interface PlanAvanceEntrada {
    /** `Analisis` a avanzar. */
    analisisId: string;
    /** Total de `Semana_Simulada` del `Analisis` (entero >= 1). */
    totalSemanas: number;
    /** Estado de avance por `Institucion`. */
    instituciones: EstadoInstitucion[];
    /**
     * Cantidad de `Semana_Simulada` a avanzar por institucion: `1` (una semana),
     * `SEMANAS_POR_MES` (un mes) o `Number.POSITIVE_INFINITY` (hasta el final).
     * Debe ser >= 1.
     */
    cantidadSemanas: number;
}

/**
 * Calcula la lista ORDENADA de trabajos `(A,I,N)` a encolar para avanzar el
 * `Analisis` segun `cantidadSemanas`.
 *
 * Reglas:
 *  - Para cada `Institucion`, las pendientes son `[ultima+1 .. min(ultima+cantidad, total)]`.
 *  - La emision es por semana ASCENDENTE (externo) y, dentro de cada semana, por
 *    el orden de `instituciones` (interno): garantiza orden estrictamente
 *    creciente de `numeroSemana` en la secuencia resultante.
 *  - Si una institucion ya completo todas sus semanas, no aporta trabajos.
 *
 * Lanza si `totalSemanas` o `cantidadSemanas` son invalidos, o si alguna
 * `ultimaSemanaCompletada` es negativa o supera `totalSemanas` (estado corrupto).
 */
export function planificarAvance(
    entrada: PlanAvanceEntrada,
): DatosTrabajoSemana[] {
    const { analisisId, totalSemanas, instituciones, cantidadSemanas } = entrada;

    if (!Number.isInteger(totalSemanas) || totalSemanas < 1) {
        throw new Error(
            `planificarAvance: totalSemanas invalido (${totalSemanas}); debe ser un entero >= 1.`,
        );
    }
    // `cantidadSemanas` admite Infinity (hasta el final); si es finito, entero >= 1.
    if (
        !(cantidadSemanas === Number.POSITIVE_INFINITY) &&
        (!Number.isInteger(cantidadSemanas) || cantidadSemanas < 1)
    ) {
        throw new Error(
            `planificarAvance: cantidadSemanas invalida (${cantidadSemanas}); debe ser un entero >= 1 o Infinity.`,
        );
    }

    // Rango [desde, hasta] de cada institucion (semanas pendientes acotadas).
    const rangos = instituciones.map((inst) => {
        const ultima = inst.ultimaSemanaCompletada;
        if (!Number.isInteger(ultima) || ultima < 0 || ultima > totalSemanas) {
            throw new Error(
                `planificarAvance: ultimaSemanaCompletada invalida (${ultima}) para institucion ${inst.institucionId}; debe ser un entero en [0, ${totalSemanas}].`,
            );
        }
        const desde = ultima + 1;
        const hasta = Math.min(ultima + cantidadSemanas, totalSemanas);
        return { institucionId: inst.institucionId, desde, hasta };
    });

    // Limite global de iteracion por semana (externo). Si no hay pendientes, vacio.
    const maxHasta = rangos.reduce((m, r) => Math.max(m, r.hasta), 0);
    const minDesde = rangos.reduce(
        (m, r) => (r.desde <= r.hasta ? Math.min(m, r.desde) : m),
        Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(minDesde) || maxHasta < minDesde) {
        return [];
    }

    const trabajos: DatosTrabajoSemana[] = [];
    for (let numeroSemana = minDesde; numeroSemana <= maxHasta; numeroSemana++) {
        for (const rango of rangos) {
            if (numeroSemana >= rango.desde && numeroSemana <= rango.hasta) {
                trabajos.push({
                    analisisId,
                    institucionId: rango.institucionId,
                    numeroSemana,
                });
            }
        }
    }
    return trabajos;
}
