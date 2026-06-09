/**
 * `Motor_Explicativo` - genera EXPLICACIONES en lenguaje natural respaldadas por
 * EVIDENCIA cuantificable para cada VARIACION de una dimension del
 * `Indice_Riesgo` (Req. 16.4, 17.3, 20.1-20.4).
 *
 * Cada explicacion producida cumple, por construccion:
 *  - **Estructura NL completa** (Req. 20.1): indica QUE ocurre, POR QUE, CUANDO
 *    EMPEZO y COMO EVOLUCIONO la dimension.
 *  - **Evidencia cuantificable** (Req. 20.2): incorpora conteos de publicaciones
 *    y comentarios y la VARIACION PORCENTUAL respecto al periodo anterior.
 *  - **Referencia trazable** (Req. 20.4, 30.1): lista los identificadores de
 *    `Evidencia` (`evidenciaIds`) que sustentan la conclusion, sin acoplarse a
 *    la implementacion del `Sistema_Evidencias` (solo `string` ids, Req. 30.2,
 *    30.6).
 *  - **Nivel exclusivamente colectivo** (Req. 20.5): se refiere a la dimension
 *    de una `Comunidad_Digital`, nunca a un `Usuario_Sintetico`.
 *
 * **Bloqueo de conclusiones sin evidencia** (Req. 20.3): el motor NUNCA emite
 * una afirmacion de riesgo sin evidencia referenciable. Si la lista de
 * `evidenciaIds` esta vacia (o solo contiene ids en blanco), `explicar` LANZA un
 * {@link ConclusionSinEvidenciaError} en vez de producir una conclusion. El
 * predicado {@link tieneEvidenciaReferenciable} permite al llamador comprobarlo
 * antes (p. ej. para omitir la dimension del reporte).
 *
 * Diseno (separacion pura/efectos): toda la logica
 * ({@link construirExplicacion} y auxiliares) es PURA y DETERMINISTA, sin estado
 * ni efectos secundarios. El servicio {@link ServicioMotorExplicativo} es un
 * envoltorio delgado que implementa la interfaz estable {@link MotorExplicativo}
 * del diseno; sustituir su implementacion interna (p. ej. NL del `Servicio_IA`)
 * no altera la firma ni el contrato observable (Req. 30.6, 31.6).
 *
 * Diseno: design.md > "MotorExplicativo".
 * _Requirements: 16.4, 17.3, 20.1, 20.2, 20.3, 20.4_
 */
import type { DimensionRiesgo } from "./indiceRiesgo";

/**
 * Umbral minimo de magnitud (|valor - anterior|) para considerar que una
 * dimension VARIA. Por debajo del umbral la dimension se considera ESTABLE.
 * Coherente con `UMBRAL_VARIACION` del `Motor_Temporal`.
 */
export const UMBRAL_VARIACION_EXPLICATIVO = 1e-9;

/** Direccion de la variacion de una dimension entre dos periodos. */
export type DireccionVariacion = "sube" | "baja" | "estable";

/**
 * Contexto OPCIONAL adicional que enriquece la explicacion con la evolucion
 * temporal y las causas observadas. Procede del `Motor_Temporal`
 * (`EvolucionTemporal`) y del `Servicio_NLP` (causas/eventos/temas). Todos sus
 * campos son opcionales: la explicacion sigue siendo completa sin ellos, usando
 * solo `dim`/`anterior`, pero con su contexto resulta mas precisa (Req. 16.3,
 * 16.4, 20.1).
 */
export interface ContextoExplicacion {
    /**
     * Serie temporal COLECTIVA de la dimension (un valor por `Semana_Simulada`,
     * en orden creciente), de la que se deriva "como evoluciono" (Req. 16.3).
     */
    serie?: readonly number[];
    /** `Semana_Simulada` en que se observo el inicio de la variacion (Req. 20.1). */
    semanaInicio?: number;
    /** `Semana_Simulada` actual a la que corresponde `dim`. */
    semanaActual?: number;
    /**
     * Causas de contexto (eventos del `Escenario` y/o temas dominantes del
     * `Servicio_NLP`) que explican "por que" varia la dimension (Req. 16.3,
     * 20.1). Puede ser vacio.
     */
    causas?: readonly string[];
    /** Conteo de publicaciones que sustentan la conclusion (Req. 20.2). */
    conteoPublicaciones?: number;
    /** Conteo de comentarios que sustentan la conclusion (Req. 20.2). */
    conteoComentarios?: number;
}

/**
 * Evidencia CUANTIFICABLE que respalda una explicacion (Req. 20.2). Conteos de
 * publicaciones/comentarios y la variacion (absoluta y porcentual) respecto al
 * periodo anterior. Siempre son numeros finitos.
 */
export interface EvidenciaCuantificable {
    /** Conteo de publicaciones que sustentan la conclusion. */
    conteoPublicaciones: number;
    /** Conteo de comentarios que sustentan la conclusion. */
    conteoComentarios: number;
    /** Variacion absoluta `valor - anterior` (0 si no hay periodo anterior). */
    delta: number;
    /** Variacion porcentual respecto al periodo anterior (0 si no aplica). */
    variacionPct: number;
}

/**
 * `Explicacion` en lenguaje natural de la variacion de UNA dimension, a nivel
 * COLECTIVO (Req. 20.1, 20.5). Reune los cuatro componentes NL exigidos
 * (que/por que/cuando empezo/como evoluciono), la evidencia cuantificable y los
 * identificadores de `Evidencia` que la sustentan.
 */
export interface Explicacion {
    /** Clave estable de la dimension explicada. */
    dimension: string;
    /** Nombre legible de la dimension. */
    nombre: string;
    /** Direccion de la variacion observada. */
    direccion: DireccionVariacion;
    /** QUE ocurre (Req. 20.1). */
    que: string;
    /** POR QUE (causas de contexto) (Req. 20.1). */
    porQue: string;
    /** CUANDO EMPEZO (Req. 20.1). */
    cuandoEmpezo: string;
    /** COMO EVOLUCIONO (Req. 20.1). */
    comoEvoluciono: string;
    /** Texto NL completo que concatena los cuatro componentes (Req. 20.1). */
    textoNL: string;
    /** Evidencia cuantificable de respaldo (Req. 20.2). */
    evidencia: EvidenciaCuantificable;
    /** Ids trazables de `Evidencia` que sustentan la conclusion (Req. 20.4, 30.1). */
    evidenciaIds: string[];
}

/**
 * `Motor_Explicativo` (interfaz estable del diseno).
 *
 * Reemplazable sin tocar el `Pipeline_Analisis` ni el `Sistema_Evidencias`:
 * referencia `Evidencia` SOLO por `string` id (Req. 30.2, 30.6) y explica a
 * nivel colectivo (Req. 20.5).
 */
export interface MotorExplicativo {
    /**
     * Explica la variacion de la dimension `dim` respecto a su valor `anterior`
     * (o `null` si es la primera medicion), respaldada por `evidenciaIds`
     * (Req. 17.3, 20.x). El `contexto` opcional enriquece la explicacion con la
     * evolucion temporal y las causas observadas.
     *
     * @throws {ConclusionSinEvidenciaError} si `evidenciaIds` no contiene ningun
     *   id referenciable (Req. 20.3): no se emite ninguna conclusion sin
     *   evidencia.
     */
    explicar(
        dim: DimensionRiesgo,
        anterior: DimensionRiesgo | null,
        evidenciaIds: string[],
        contexto?: ContextoExplicacion,
    ): Explicacion;
}

/**
 * Error lanzado al intentar explicar una conclusion SIN evidencia referenciable
 * (Req. 20.3, 16.4): el `Motor_Explicativo` bloquea toda afirmacion de riesgo
 * que no este respaldada por al menos una `Evidencia` trazable.
 */
export class ConclusionSinEvidenciaError extends Error {
    constructor(public readonly dimension: string) {
        super(
            `Conclusion bloqueada para la dimension "${dimension}": ` +
            "toda afirmacion de riesgo debe referenciar evidencia trazable (Req. 20.3).",
        );
        this.name = "ConclusionSinEvidenciaError";
    }
}

/**
 * Normaliza una lista de ids de evidencia: descarta entradas vacias o en blanco
 * y elimina duplicados conservando el orden de aparicion. Funcion PURA.
 */
export function normalizarEvidenciaIds(evidenciaIds: readonly string[]): string[] {
    const vistos = new Set<string>();
    const salida: string[] = [];
    for (const id of evidenciaIds ?? []) {
        if (typeof id !== "string") {
            continue;
        }
        const limpio = id.trim();
        if (limpio.length === 0 || vistos.has(limpio)) {
            continue;
        }
        vistos.add(limpio);
        salida.push(limpio);
    }
    return salida;
}

/**
 * Indica si una conclusion tiene AL MENOS UNA evidencia referenciable
 * (Req. 20.3, 20.4). Permite al llamador comprobar la condicion antes de
 * invocar {@link MotorExplicativo.explicar} (que de lo contrario lanzaria
 * {@link ConclusionSinEvidenciaError}). Funcion PURA.
 */
export function tieneEvidenciaReferenciable(evidenciaIds: readonly string[]): boolean {
    return normalizarEvidenciaIds(evidenciaIds).length > 0;
}

/** Determina la direccion de la variacion segun el delta y el umbral. */
function direccionDe(delta: number): DireccionVariacion {
    if (delta > UMBRAL_VARIACION_EXPLICATIVO) {
        return "sube";
    }
    if (delta < -UMBRAL_VARIACION_EXPLICATIVO) {
        return "baja";
    }
    return "estable";
}

/** Verbo en pasado coherente con la direccion, para el texto NL. */
function verboDe(direccion: DireccionVariacion): string {
    switch (direccion) {
        case "sube":
            return "aumento";
        case "baja":
            return "disminuyo";
        default:
            return "se mantuvo estable";
    }
}

/** Redondea a 2 decimales para textos legibles y estables. */
function redondear2(valor: number): number {
    return Number(valor.toFixed(2));
}

/**
 * Calcula la VARIACION CUANTIFICABLE de la dimension respecto al periodo
 * anterior (Req. 20.2). El delta es `valor - anterior.valor`; la variacion
 * porcentual se calcula respecto al valor anterior cuando es no nulo, o respecto
 * a la amplitud del rango `[minimo, maximo]` cuando el anterior es ~0 (para
 * evitar division por cero manteniendo una medida finita y comparable). Sin
 * periodo anterior, ambos son 0 (primera medicion). Funcion PURA.
 */
export function calcularEvidenciaCuantificable(
    dim: DimensionRiesgo,
    anterior: DimensionRiesgo | null,
    contexto: ContextoExplicacion = {},
): EvidenciaCuantificable {
    const conteoPublicaciones = Math.max(0, Math.trunc(contexto.conteoPublicaciones ?? 0));
    const conteoComentarios = Math.max(0, Math.trunc(contexto.conteoComentarios ?? 0));

    if (anterior === null) {
        return { conteoPublicaciones, conteoComentarios, delta: 0, variacionPct: 0 };
    }

    const delta = dim.valor - anterior.valor;
    const amplitud = Math.abs(dim.maximo - dim.minimo);
    const base =
        Math.abs(anterior.valor) > UMBRAL_VARIACION_EXPLICATIVO
            ? Math.abs(anterior.valor)
            : amplitud > UMBRAL_VARIACION_EXPLICATIVO
                ? amplitud
                : 1;
    const variacionPct = (delta / base) * 100;

    return {
        conteoPublicaciones,
        conteoComentarios,
        delta: redondear2(delta),
        variacionPct: redondear2(variacionPct),
    };
}

/**
 * Construye la {@link Explicacion} completa de la variacion de una dimension de
 * forma PURA y DETERMINISTA (Req. 20.1, 20.2, 20.4). La misma entrada produce
 * siempre la misma salida; no muta sus argumentos.
 *
 * Garantiza la presencia de evidencia referenciable: si no hay ningun
 * `evidenciaId` valido, LANZA {@link ConclusionSinEvidenciaError} (Req. 20.3).
 *
 * @param dim Dimension colectiva de la `(comunidad, semana)` actual.
 * @param anterior Valor de la misma dimension en la semana previa, o `null`.
 * @param evidenciaIds Ids trazables de `Evidencia` que la sustentan (Req. 20.4).
 * @param contexto Contexto temporal/causal opcional (Req. 16.3, 20.1).
 */
export function construirExplicacion(
    dim: DimensionRiesgo,
    anterior: DimensionRiesgo | null,
    evidenciaIds: readonly string[],
    contexto: ContextoExplicacion = {},
): Explicacion {
    const ids = normalizarEvidenciaIds(evidenciaIds);
    if (ids.length === 0) {
        // Req. 20.3: ninguna afirmacion de riesgo sin evidencia referenciable.
        throw new ConclusionSinEvidenciaError(dim.clave);
    }

    const evidencia = calcularEvidenciaCuantificable(dim, anterior, contexto);
    const direccion = direccionDe(anterior === null ? 0 : dim.valor - anterior.valor);
    const verbo = verboDe(direccion);
    const valorTxt = redondear2(dim.valor);

    // QUE ocurre (Req. 20.1)
    const que =
        anterior === null
            ? `La dimension colectiva "${dim.nombre}" registra un valor inicial de ${valorTxt} ` +
            `(rango [${dim.minimo}, ${dim.maximo}]) en la comunidad.`
            : `La dimension colectiva "${dim.nombre}" ${verbo} hasta ${valorTxt} ` +
            `(rango [${dim.minimo}, ${dim.maximo}]) en la comunidad.`;

    // POR QUE (causas de contexto) (Req. 20.1, 16.3)
    const causas = (contexto.causas ?? []).filter((c) => c.trim().length > 0);
    const porQue =
        causas.length > 0
            ? `La variacion se correlaciona con ${causas.length === 1 ? "el factor" : "los factores"}: ` +
            `${causas.join(", ")}.`
            : "No se identifico un evento o tema detonante especifico; la conclusion se sustenta " +
            "en la evidencia cuantitativa acumulada.";

    // CUANDO EMPEZO (Req. 20.1)
    const semanaInicio =
        typeof contexto.semanaInicio === "number" && Number.isFinite(contexto.semanaInicio)
            ? contexto.semanaInicio
            : null;
    const semanaActual =
        typeof contexto.semanaActual === "number" && Number.isFinite(contexto.semanaActual)
            ? contexto.semanaActual
            : null;
    const cuandoEmpezo =
        semanaInicio !== null
            ? `La variacion comenzo a observarse en la semana ${semanaInicio}.`
            : anterior === null
                ? "Corresponde a la primera medicion registrada de la dimension."
                : semanaActual !== null
                    ? `La variacion se observa respecto a la semana ${semanaActual - 1}.`
                    : "La variacion se observa respecto al periodo inmediatamente anterior.";

    // COMO EVOLUCIONO (Req. 20.1, 16.3, 20.2)
    const comoEvoluciono = describirEvolucion(dim, anterior, evidencia, contexto);

    const textoNL = `${que} ${porQue} ${cuandoEmpezo} ${comoEvoluciono}`;

    return {
        dimension: dim.clave,
        nombre: dim.nombre,
        direccion,
        que,
        porQue,
        cuandoEmpezo,
        comoEvoluciono,
        textoNL,
        evidencia,
        evidenciaIds: ids,
    };
}

/**
 * Describe COMO EVOLUCIONO la dimension a partir de la serie temporal (si se
 * provee) y de la evidencia cuantificable (variacion % y conteos) (Req. 20.1,
 * 20.2, 16.3). Funcion PURA.
 */
function describirEvolucion(
    dim: DimensionRiesgo,
    anterior: DimensionRiesgo | null,
    evidencia: EvidenciaCuantificable,
    contexto: ContextoExplicacion,
): string {
    const conteos =
        `Respaldo cuantitativo: ${evidencia.conteoPublicaciones} publicacion(es) y ` +
        `${evidencia.conteoComentarios} comentario(s).`;

    const serie = (contexto.serie ?? []).filter((v) => Number.isFinite(v));
    if (serie.length >= 2) {
        const primero = redondear2(serie[0]);
        const ultimo = redondear2(serie[serie.length - 1]);
        return (
            `A lo largo de ${serie.length} semanas evoluciono de ${primero} a ${ultimo} ` +
            `(variacion ${formatoPct(evidencia.variacionPct)} respecto al periodo anterior). ${conteos}`
        );
    }

    if (anterior === null) {
        return `Es la linea base inicial; aun no hay evolucion previa con la cual compararla. ${conteos}`;
    }

    return (
        `Respecto a la semana anterior (${redondear2(anterior.valor)}) la variacion fue de ` +
        `${evidencia.delta >= 0 ? "+" : ""}${evidencia.delta} ` +
        `(${formatoPct(evidencia.variacionPct)}). ${conteos}`
    );
}

/** Formatea una variacion porcentual con signo explicito. */
function formatoPct(pct: number): string {
    return `${pct >= 0 ? "+" : ""}${pct}%`;
}

/**
 * Implementacion base del `Motor_Explicativo`. Envoltorio delgado y sin estado
 * sobre {@link construirExplicacion}; toda la logica vive en la funcion pura
 * para mantenerla aislada y testeable, y para que sustituir la generacion NL
 * (p. ej. por el `Servicio_IA`) no altere el contrato observable (Req. 30.6).
 */
export class ServicioMotorExplicativo implements MotorExplicativo {
    explicar(
        dim: DimensionRiesgo,
        anterior: DimensionRiesgo | null,
        evidenciaIds: string[],
        contexto: ContextoExplicacion = {},
    ): Explicacion {
        return construirExplicacion(dim, anterior, evidenciaIds, contexto);
    }

    /**
     * Explica unicamente las dimensiones que VARIAN respecto a la semana
     * anterior (Req. 17.3) y para las que existe evidencia referenciable
     * (Req. 20.3). Las dimensiones estables o sin evidencia se OMITEN en vez de
     * generar afirmaciones vacias. Conveniencia para el `Pipeline_Analisis`.
     *
     * @param actuales Dimensiones de la semana actual.
     * @param anteriores Dimensiones de la semana previa, indexadas por clave
     *   (o `null` para la primera semana).
     * @param evidenciaPorDimension Ids de evidencia trazable por clave de dimension.
     * @param contextoPorDimension Contexto temporal/causal opcional por dimension.
     */
    explicarVariaciones(
        actuales: readonly DimensionRiesgo[],
        anteriores: Readonly<Record<string, DimensionRiesgo>> | null,
        evidenciaPorDimension: Readonly<Record<string, readonly string[]>>,
        contextoPorDimension: Readonly<Record<string, ContextoExplicacion>> = {},
    ): Explicacion[] {
        const explicaciones: Explicacion[] = [];
        for (const dim of actuales) {
            const anterior = anteriores?.[dim.clave] ?? null;
            const varia =
                anterior === null ||
                Math.abs(dim.valor - anterior.valor) > UMBRAL_VARIACION_EXPLICATIVO;
            if (!varia) {
                continue; // Req. 17.3: solo se explica cuando hay variacion.
            }
            const ids = evidenciaPorDimension[dim.clave] ?? [];
            if (!tieneEvidenciaReferenciable(ids)) {
                continue; // Req. 20.3: sin evidencia no se emite conclusion.
            }
            explicaciones.push(
                construirExplicacion(dim, anterior, ids, contextoPorDimension[dim.clave] ?? {}),
            );
        }
        return explicaciones;
    }
}

/** Instancia reutilizable lista para inyectarse en el `Pipeline_Analisis`. */
export const servicioMotorExplicativo = new ServicioMotorExplicativo();
