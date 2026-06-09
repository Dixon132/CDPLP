/**
 * `Indice_Riesgo` comunitario MULTIDIMENSIONAL (Req. 17).
 *
 * El indice NO produce un unico score: calcula MULTIPLES dimensiones
 * INDEPENDIENTES, cada una por `Comunidad_Digital` y por `Semana_Simulada`
 * (Req. 17.1, 17.2). Cada dimension mantiene su propio rango `[minimo, maximo]`
 * y evoluciona por separado; ademas integra el `score_calibrado_ml` producido
 * por la `Capa_ML` (Req. 31.2) y se expone EXCLUSIVAMENTE como agregado
 * colectivo, nunca a nivel de `Usuario_Sintetico` individual (Req. 17.4, 17.6).
 *
 * Propiedades de diseno que este modulo garantiza:
 * - **Rango** (Req. 17.1, 17.2): cada `valor` queda dentro de `[minimo, maximo]`
 *   mediante {@link clampRango}.
 * - **Independencia** (Req. 17.2): el valor de una dimension depende SOLO de su
 *   propia senal (`entrada.senales[clave]`); perturbar la senal de otra
 *   dimension no altera su valor.
 * - **Configurabilidad** (Req. 17.5): agregar dimensiones adicionales solo
 *   anade filas al resultado; no modifica el calculo de las existentes.
 * - **Solo colectivo** (Req. 17.4, 17.6): la entrada y la salida se refieren a
 *   `(comunidadId, numeroSemana)`; no existe ni se expone puntuacion individual.
 *
 * El nucleo de calculo ({@link calcularDimensiones}) es una funcion PURA y
 * DETERMINISTA, sin estado ni efectos secundarios, directamente testeable. La
 * verificacion universal por propiedades vive en las tareas 13.4 (Property 16)
 * y 13.5 (Property 17); aqui se implementa el calculo y sus pruebas unitarias.
 *
 * Integracion con el `Servicio_IA` (Req. 31.2): el `score_calibrado_ml` de cada
 * dimension lo aporta la `Capa_ML` (interfaz estable, consumida por HTTP con
 * **fallback determinista**) a traves de {@link ServicioIndiceRiesgo.calcularConMl}.
 * El nucleo {@link calcularDimensiones} permanece PURO recibiendo los scores ya
 * resueltos, de modo que la integracion ML vive en una capa de orquestacion
 * delgada y reemplazable sin acoplar el `Pipeline_Analisis` (Req. 31.6).
 *
 * Diseno: design.md > "IndiceRiesgo" y ERD (`gds_dimension_riesgo`).
 * _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6, 31.2_
 */
import {
    crearCapaMLConDegradacion,
    type CapaML,
    type EntradaIndice as EntradaIndiceMl,
} from "../ml";
import { clamp01 } from "./scoreAsociacion";

/**
 * Entrada AGREGADA Y COLECTIVA para calcular el `Indice_Riesgo` de una
 * `Comunidad_Digital` en una `Semana_Simulada` (Req. 17.2, 17.4).
 *
 * Las senales se indexan por la `clave` de cada dimension, de modo que cada
 * dimension lee UNICAMENTE su propia senal (garantia de independencia, Req.
 * 17.2). No contiene ningun identificador ni puntuacion de `Usuario_Sintetico`:
 * la entrada es colectiva por construccion (Req. 17.6).
 */
export interface EntradaIndice {
    /** `Comunidad_Digital` a la que pertenece el indice (agregado colectivo). */
    comunidadId: string;
    /** `Semana_Simulada` de calculo. */
    numeroSemana: number;
    /**
     * Senales colectivas agregadas, una por dimension (clave = `clave` de la
     * dimension). Una senal ausente o no finita se trata como el `minimo` de su
     * dimension.
     */
    senales: Readonly<Record<string, number>>;
    /**
     * Score calibrado por la `Capa_ML` en `[0,1]`, por clave de dimension
     * (Req. 31.2). Opcional: si falta, la dimension reporta `score_calibrado_ml`
     * = 0. Se provee ya calculado para mantener {@link calcularDimensiones} pura.
     */
    scoresCalibradosMl?: Readonly<Record<string, number>>;
    /** Evidencias colectivas trazables por id que respaldan el indice (Req. 30.1). */
    evidenciaIds?: readonly string[];
}

/**
 * Definicion CONFIGURABLE de una dimension del `Indice_Riesgo` (Req. 17.5).
 *
 * Permite anadir dimensiones adicionales sin alterar las existentes: cada
 * definicion es autonoma y su valor se deriva solo de su propia senal.
 */
export interface DefinicionDimension {
    /** Clave estable para leer su senal y su score ML en la entrada. */
    clave: string;
    /** Nombre legible de la dimension (p. ej. "Estres academico"). */
    nombre: string;
    /** Limite inferior del rango de la dimension. */
    minimo: number;
    /** Limite superior del rango de la dimension. */
    maximo: number;
    /**
     * Extractor PURO del valor crudo de ESTA dimension a partir de la entrada.
     * Por defecto lee `entrada.senales[clave]`. Para preservar la independencia
     * (Req. 17.2), un extractor personalizado SOLO debe leer su propia senal.
     */
    extraer?: (entrada: EntradaIndice) => number;
}

/**
 * Resultado COLECTIVO de una dimension para una `(comunidad, semana)`.
 *
 * Refleja las columnas de `gds_dimension_riesgo` (`nombre`, `valor`, `minimo`,
 * `maximo`, `score_calibrado_ml`). No contiene datos individuales (Req. 17.4).
 */
export interface DimensionRiesgo {
    /** Clave estable de la dimension. */
    clave: string;
    /** Nombre legible de la dimension. */
    nombre: string;
    /** Valor de la dimension, garantizado dentro de `[minimo, maximo]`. */
    valor: number;
    /** Limite inferior efectivo (normalizado) del rango. */
    minimo: number;
    /** Limite superior efectivo (normalizado) del rango. */
    maximo: number;
    /** Score calibrado por la `Capa_ML` en `[0,1]` integrado (Req. 31.2). */
    scoreCalibradoMl: number;
}

/** Rango por defecto de las dimensiones (escala 0-100, coherente con el diseno). */
export const RANGO_POR_DEFECTO = { minimo: 0, maximo: 100 } as const;

/**
 * Dimensiones por defecto del `Indice_Riesgo` (Req. 17.1).
 *
 * Incluye al menos estres academico, ansiedad (colectiva), conflicto social,
 * bullying, aislamiento, agotamiento y violencia verbal (Req. 17.1), mas
 * desmotivacion como dimension adicional (configurable, Req. 17.5). El orden es
 * estable. Cada dimension usa el {@link RANGO_POR_DEFECTO} `[0, 100]`.
 */
export const DIMENSIONES_POR_DEFECTO: readonly DefinicionDimension[] = [
    { clave: "estresAcademico", nombre: "Estres academico", ...RANGO_POR_DEFECTO },
    { clave: "ansiedadColectiva", nombre: "Ansiedad colectiva", ...RANGO_POR_DEFECTO },
    { clave: "conflictoSocial", nombre: "Conflicto social", ...RANGO_POR_DEFECTO },
    { clave: "bullying", nombre: "Bullying", ...RANGO_POR_DEFECTO },
    { clave: "aislamiento", nombre: "Aislamiento", ...RANGO_POR_DEFECTO },
    { clave: "agotamiento", nombre: "Agotamiento", ...RANGO_POR_DEFECTO },
    { clave: "violenciaVerbal", nombre: "Violencia verbal", ...RANGO_POR_DEFECTO },
    { clave: "desmotivacion", nombre: "Desmotivacion", ...RANGO_POR_DEFECTO },
] as const;

/**
 * Acota `valor` al intervalo cerrado `[minimo, maximo]`, garantizando el
 * invariante de rango de cada dimension (Req. 17.1, 17.2).
 *
 * Defensivo ante entradas degeneradas: si `minimo`/`maximo` llegan invertidos,
 * se normalizan (`lo = min`, `hi = max`); un `valor` no finito se acota al
 * limite inferior efectivo `lo`.
 */
export function clampRango(valor: number, minimo: number, maximo: number): number {
    const lo = Math.min(minimo, maximo);
    const hi = Math.max(minimo, maximo);
    if (!Number.isFinite(valor) || valor < lo) {
        return lo;
    }
    if (valor > hi) {
        return hi;
    }
    return valor;
}

/**
 * Extrae el valor crudo de una dimension de la entrada leyendo SOLO su propia
 * senal (`entrada.senales[clave]`). Una senal ausente o no finita se trata como
 * `NaN` y sera acotada al `minimo` por {@link clampRango}. Esta lectura aislada
 * por clave es la base de la INDEPENDENCIA entre dimensiones (Req. 17.2).
 */
function valorCrudo(def: DefinicionDimension, entrada: EntradaIndice): number {
    if (def.extraer) {
        return def.extraer(entrada);
    }
    const senal = entrada.senales[def.clave];
    return typeof senal === "number" ? senal : Number.NaN;
}

/**
 * Calcula las dimensiones del `Indice_Riesgo` de forma PURA y DETERMINISTA.
 *
 * Para cada definicion produce una {@link DimensionRiesgo} cuyo `valor` queda
 * dentro de `[minimo, maximo]` (Req. 17.1, 17.2) y cuyo `scoreCalibradoMl` se
 * integra desde la `Capa_ML` acotado a `[0,1]` (Req. 31.2). Cada dimension se
 * computa de forma INDEPENDIENTE de las demas (Req. 17.2) y agregar nuevas
 * definiciones no altera el calculo de las existentes (Req. 17.5). El resultado
 * es exclusivamente COLECTIVO: una fila por dimension de la comunidad/semana,
 * sin puntuaciones individuales (Req. 17.4, 17.6).
 *
 * No tiene estado ni efectos secundarios: la misma entrada y definiciones
 * producen siempre la misma salida. No muta la entrada ni las definiciones.
 *
 * @param entrada Senales colectivas agregadas de la `(comunidad, semana)`.
 * @param dimensiones Definiciones de dimension; por defecto {@link DIMENSIONES_POR_DEFECTO}.
 * @returns Una `DimensionRiesgo` por definicion, en el mismo orden.
 */
export function calcularDimensiones(
    entrada: EntradaIndice,
    dimensiones: readonly DefinicionDimension[] = DIMENSIONES_POR_DEFECTO,
): DimensionRiesgo[] {
    return dimensiones.map((def) => {
        const valor = clampRango(valorCrudo(def, entrada), def.minimo, def.maximo);
        const scoreMlBruto = entrada.scoresCalibradosMl?.[def.clave];
        const scoreCalibradoMl = clamp01(
            typeof scoreMlBruto === "number" ? scoreMlBruto : 0,
        );
        return {
            clave: def.clave,
            nombre: def.nombre,
            valor,
            minimo: Math.min(def.minimo, def.maximo),
            maximo: Math.max(def.minimo, def.maximo),
            scoreCalibradoMl,
        };
    });
}

/**
 * Construye la `EntradaIndice` que espera la `Capa_ML` para UNA dimension a
 * partir de la entrada colectiva (Req. 31.2, 31.7).
 *
 * La senal de la dimension (leida de forma aislada por su clave) alimenta las
 * `senales` agregadas que la `Capa_ML` puntua, y se conservan las `evidenciaIds`
 * colectivas que respaldan el resultado. La entrada resultante es estrictamente
 * COLECTIVA: se refiere a `(comunidadId, numeroSemana)` y nunca a un
 * `Usuario_Sintetico` (Req. 17.4, 17.6). Una senal ausente o no finita produce
 * una lista de senales vacia (la `Capa_ML` la puntua como 0).
 */
export function entradaMlPorDimension(
    def: DefinicionDimension,
    entrada: EntradaIndice,
): EntradaIndiceMl {
    const senal = valorCrudo(def, entrada);
    return {
        comunidadId: entrada.comunidadId,
        numeroSemana: entrada.numeroSemana,
        senales: Number.isFinite(senal) ? [senal] : [],
        evidenciaIds: [...(entrada.evidenciaIds ?? [])],
    };
}

/**
 * Resuelve el `score_calibrado_ml` de cada dimension consultando la `Capa_ML`
 * (Req. 31.2). Para cada definicion construye su {@link entradaMlPorDimension} y
 * llama a `capaML.scoreRiesgoCalibrado`, devolviendo un mapa `clave -> score`.
 *
 * Cada score se acota a `[0,1]` con {@link clamp01} como segunda barrera (la
 * `Capa_ML` ya garantiza el rango, Req. 31.2, 31.7). La `capaML` es inyectable:
 * en produccion sera el cliente HTTP del `Servicio_IA` con degradacion segura;
 * en pruebas, un doble determinista. No muta la entrada ni las definiciones.
 */
export async function resolverScoresCalibradosMl(
    entrada: EntradaIndice,
    dimensiones: readonly DefinicionDimension[],
    capaML: CapaML,
): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};
    for (const def of dimensiones) {
        const { score } = await capaML.scoreRiesgoCalibrado(
            entradaMlPorDimension(def, entrada),
        );
        scores[def.clave] = clamp01(score);
    }
    return scores;
}

/**
 * `Indice_Riesgo` (interfaz estable del diseno).
 *
 * Reemplazable sin tocar el `Pipeline_Analisis`: el calculo delega en la
 * funcion pura {@link calcularDimensiones} (design.md > "IndiceRiesgo").
 */
export interface IndiceRiesgo {
    /**
     * Calcula las dimensiones INDEPENDIENTES del indice para una
     * `(comunidad, semana)` (Req. 17.1, 17.2). Las `dimensiones` son
     * configurables; por defecto se usan las {@link DIMENSIONES_POR_DEFECTO}.
     */
    calcular(entrada: EntradaIndice, dimensiones?: readonly DefinicionDimension[]): DimensionRiesgo[];

    /**
     * Variante que INTEGRA el `score_calibrado_ml` del `Servicio_IA` por
     * dimension a traves de la `Capa_ML` (interfaz estable con fallback) antes
     * de calcular las dimensiones (Req. 31.2). El resultado sigue siendo
     * exclusivamente COLECTIVO (Req. 17.4, 17.6).
     */
    calcularConMl(
        entrada: EntradaIndice,
        dimensiones?: readonly DefinicionDimension[],
        capaML?: CapaML,
    ): Promise<DimensionRiesgo[]>;
}

/**
 * Implementacion base del `Indice_Riesgo`. Es un envoltorio delgado y sin
 * estado sobre {@link calcularDimensiones}; toda la logica de calculo vive en la
 * funcion pura para mantener el calculo aislado y testeable. La integracion con
 * la `Capa_ML` se aisla en {@link calcularConMl}.
 */
export class ServicioIndiceRiesgo implements IndiceRiesgo {
    /**
     * `Capa_ML` por defecto usada por {@link calcularConMl} cuando no se inyecta
     * una explicita: la `Capa_ML` con **degradacion segura** (cliente HTTP del
     * `Servicio_IA` cuando exista; calculo base determinista como fallback).
     */
    constructor(private readonly capaMLPorDefecto: CapaML = crearCapaMLConDegradacion()) { }

    calcular(
        entrada: EntradaIndice,
        dimensiones: readonly DefinicionDimension[] = DIMENSIONES_POR_DEFECTO,
    ): DimensionRiesgo[] {
        return calcularDimensiones(entrada, dimensiones);
    }

    /**
     * Calcula las dimensiones integrando el `score_calibrado_ml` que aporta la
     * `Capa_ML` por dimension (Req. 31.2). Resuelve los scores ML (con clamp a
     * `[0,1]`), los combina con los que pudiera traer la entrada (los de la
     * `Capa_ML` tienen prioridad) y delega en la funcion pura
     * {@link calcularDimensiones}. No expone ninguna puntuacion individual
     * (Req. 17.4, 17.6).
     */
    async calcularConMl(
        entrada: EntradaIndice,
        dimensiones: readonly DefinicionDimension[] = DIMENSIONES_POR_DEFECTO,
        capaML: CapaML = this.capaMLPorDefecto,
    ): Promise<DimensionRiesgo[]> {
        const scoresMl = await resolverScoresCalibradosMl(entrada, dimensiones, capaML);
        return calcularDimensiones(
            {
                ...entrada,
                scoresCalibradosMl: { ...entrada.scoresCalibradosMl, ...scoresMl },
            },
            dimensiones,
        );
    }
}

/** Instancia reutilizable lista para inyectarse en el `Pipeline_Analisis`. */
export const servicioIndiceRiesgo = new ServicioIndiceRiesgo();
