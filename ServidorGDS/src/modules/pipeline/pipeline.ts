/**
 * `Pipeline_Analisis` - framework de etapas, estado por etapa y reanudacion.
 *
 * Define el orden canonico de etapas (`ORDEN_ETAPAS`), la interfaz estable
 * `PipelineAnalisis` y un orquestador esqueleto que ejecuta las etapas en orden
 * desde la primera etapa NO completada, sin repetir las ya completadas
 * (reanudacion idempotente, Req. 13.4). Los manejadores concretos de cada etapa
 * (limpieza, normalizacion, anonimizacion, NLP, etc.) se inyectan; en este
 * andamiaje son opcionales/placeholder y se materializan en la tarea 9.2+.
 *
 * Garantia de desacople (Req. 2.2, 2.4): la firma de entrada NO recibe ningun
 * parametro que identifique el origen de los datos; la `Capa_Analisis` solo
 * conoce el tipo compartido `ContratoNormalizado`.
 *
 * Diseno: design.md > "Etapas del pipeline y reanudacion".
 * _Requirements: 2.2, 2.4, 13.1, 13.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";

/**
 * Etapas tecnicas del `Pipeline_Analisis`.
 *
 * La `ANONIMIZACION` precede SIEMPRE a toda etapa de analisis y a todo
 * almacenamiento de resultados (Req. 13.5, 23.1). El `FILTRO_RELEVANCIA` se
 * intercala justo tras la anonimizacion y antes de NLP (Req. 34.4). La etapa
 * final `EMBEDDINGS` calcula, tras la explicacion, los embeddings del contenido
 * analizado y los acumula en `pgvector` (`Memoria_Semantica`) de forma
 * transaccional junto con el resultado de la semana (Req. 36.1).
 */
export enum EtapaPipeline {
    LIMPIEZA = "LIMPIEZA",
    NORMALIZACION = "NORMALIZACION",
    ANONIMIZACION = "ANONIMIZACION", // SIEMPRE antes de las siguientes (Req. 13.5)
    FILTRO_RELEVANCIA = "FILTRO_RELEVANCIA", // tras anonimizacion y antes de NLP (Req. 34.4)
    NLP = "NLP",
    VISION = "VISION",
    TEMPORAL = "TEMPORAL",
    PATRONES = "PATRONES",
    INDICE = "INDICE",
    EXPLICACION = "EXPLICACION",
    EMBEDDINGS = "EMBEDDINGS", // embeddings -> pgvector (Memoria_Semantica) (Req. 36.1)
}

/**
 * Orden canonico de ejecucion de las etapas (Req. 13.1, 36.1):
 * limpieza -> normalizacion -> anonimizacion -> FILTRO_RELEVANCIA -> NLP ->
 * vision -> temporal -> patrones -> indice -> explicacion -> EMBEDDINGS.
 *
 * `EMBEDDINGS` es SIEMPRE la ultima etapa: opera sobre el contenido ya analizado
 * y explicado, y persiste su `Memoria_Semantica` junto al resultado de la semana
 * (Req. 36.1).
 */
export const ORDEN_ETAPAS: readonly EtapaPipeline[] = [
    EtapaPipeline.LIMPIEZA,
    EtapaPipeline.NORMALIZACION,
    EtapaPipeline.ANONIMIZACION,
    EtapaPipeline.FILTRO_RELEVANCIA,
    EtapaPipeline.NLP,
    EtapaPipeline.VISION,
    EtapaPipeline.TEMPORAL,
    EtapaPipeline.PATRONES,
    EtapaPipeline.INDICE,
    EtapaPipeline.EXPLICACION,
    EtapaPipeline.EMBEDDINGS,
] as const;

/**
 * Estado por etapa de una `Semana_Simulada`. `etapasCompletadas` rastrea las
 * etapas ya ejecutadas y se persiste en `gds_ciclo_semanal.etapas_completadas`;
 * permite reanudar desde la etapa fallida sin repetir las completadas (Req. 13.4).
 */
export interface EstadoPipeline {
    /** Etapas ya completadas (subconjunto de `ORDEN_ETAPAS`). */
    etapasCompletadas: EtapaPipeline[];
}

/**
 * Resultado del procesamiento semanal del pipeline. Expone el rastro de etapas
 * completadas y el contrato resultante tras atravesar las etapas que lo
 * transforman (limpieza -> normalizacion -> anonimizacion -> ...). Las salidas
 * de analisis concretas (NLP, indice, explicacion, evidencias, etc.) se anaden
 * en las tareas 11+ / 13+.
 */
export interface ResultadoSemana {
    /** Etapas completadas tras esta ejecucion, en el orden de `ORDEN_ETAPAS`. */
    etapasCompletadas: EtapaPipeline[];
    /** Contrato resultante tras las etapas que lo transforman (anonimizado, etc.). */
    contrato: ContratoNormalizado;
}

/**
 * Manejador de una etapa concreta. Recibe el contrato (ya anonimizado a partir
 * de la etapa `ANONIMIZACION`) y el estado en curso.
 *
 * Si la etapa transforma el contrato (p. ej. limpieza, normalizacion o
 * anonimizacion), el manejador devuelve el nuevo `ContratoNormalizado`, que el
 * orquestador propaga a las etapas siguientes. Si la etapa no transforma el
 * contrato (p. ej. una etapa de analisis que solo produce efectos), devuelve
 * `void` y el orquestador conserva el contrato en curso.
 */
export type ManejadorEtapa = (
    contrato: ContratoNormalizado,
    estado: EstadoPipeline,
) => ContratoNormalizado | void | Promise<ContratoNormalizado | void>;

/** Conjunto (parcial) de manejadores inyectables por etapa. */
export type ManejadoresEtapa = Partial<Record<EtapaPipeline, ManejadorEtapa>>;

/**
 * Registrador de incidencias del pipeline. Inyectable para capturar en pruebas
 * y reemplazable por el logger del servicio. Se usa para **registrar la etapa
 * fallida** cuando una etapa lanza un error (Req. 13.4).
 */
export interface LoggerPipeline {
    error(mensaje: string, contexto?: Record<string, unknown>): void;
}

/** Logger por defecto: registra los fallos de etapa en `console.error`. */
export const loggerConsola: LoggerPipeline = {
    error(mensaje, contexto) {
        if (contexto) {
            console.error(mensaje, contexto);
        } else {
            console.error(mensaje);
        }
    },
};

/**
 * Error que detiene el `Pipeline_Analisis` cuando una etapa falla (Req. 13.4).
 *
 * Transporta la etapa fallida, las etapas completadas **antes** del fallo (que
 * el llamador debe persistir en `gds_ciclo_semanal.etapas_completadas`), el
 * contrato en el estado alcanzado y la causa original. Al reintentar con un
 * `EstadoPipeline` que contenga `etapasCompletadas`, la ejecucion se reanuda
 * desde la etapa fallida sin repetir las etapas ya completadas.
 */
export class ErrorEtapaPipeline extends Error {
    constructor(
        readonly etapa: EtapaPipeline,
        readonly etapasCompletadas: EtapaPipeline[],
        readonly contrato: ContratoNormalizado,
        readonly causa: unknown,
    ) {
        super(`Fallo en la etapa ${etapa} del Pipeline_Analisis`);
        this.name = "ErrorEtapaPipeline";
    }
}

/**
 * Interfaz estable del `Pipeline_Analisis` (`Capa_Analisis`).
 *
 * El punto de entrada canonico es `procesar`, cuya firma es **libre de origen**:
 * recibe unicamente un `ContratoNormalizado` (y, opcionalmente, el estado por
 * etapa para reanudar). No existe ningun parametro que identifique la fuente de
 * los datos ni se importa simbolo alguno de la `Capa_Adquisicion`, de modo que
 * el motor analitico procesa por igual datos simulados o reales (Req. 2.2, 2.4).
 */
export interface PipelineAnalisis {
    /**
     * Punto de entrada canonico, **sin parametro de origen** (Req. 2.2, 2.4).
     *
     * Procesa un `Contrato_Normalizado` recorriendo `ORDEN_ETAPAS`. Cuando no se
     * provee `estado`, arranca desde un estado inicial (sin etapas completadas) y
     * ejecuta el pipeline completo (limpieza -> ... -> EMBEDDINGS). Cuando se
     * provee un `EstadoPipeline` persistido (con `etapas_completadas`), reanuda
     * desde la primera etapa no completada sin repetir las ya hechas (Req. 13.1,
     * 13.4). El `estado` describe el progreso del propio pipeline, no el origen
     * de los datos.
     */
    procesar(
        contrato: ContratoNormalizado,
        estado?: EstadoPipeline,
    ): Promise<ResultadoSemana>;

    /** Ejecuta desde la primera etapa no completada. Reanuda sin repetir (Req. 13.1, 13.4). */
    ejecutar(
        contrato: ContratoNormalizado,
        estado: EstadoPipeline,
    ): Promise<ResultadoSemana>;
}

/**
 * Devuelve el indice en `ORDEN_ETAPAS` de la primera etapa que NO esta
 * completada en el `estado`. Si todas estan completadas devuelve la longitud
 * de `ORDEN_ETAPAS` (no queda nada por ejecutar).
 */
export function primeraEtapaPendiente(estado: EstadoPipeline): number {
    const completadas = new Set(estado.etapasCompletadas);
    for (let i = 0; i < ORDEN_ETAPAS.length; i++) {
        if (!completadas.has(ORDEN_ETAPAS[i])) {
            return i;
        }
    }
    return ORDEN_ETAPAS.length;
}

/**
 * Orquestador del `Pipeline_Analisis`.
 *
 * Ejecuta las etapas en el orden de `ORDEN_ETAPAS` empezando por la primera
 * etapa no completada y, por robustez ante estados no contiguos, omite
 * cualquier etapa ya completada (reanudacion idempotente, Req. 13.4). El
 * contrato se propaga por las etapas que lo transforman (limpieza ->
 * normalizacion -> anonimizacion), de modo que la `ANONIMIZACION` reemplaza los
 * identificadores antes de que las etapas de analisis siguientes vean el
 * contenido (Req. 13.5, 23.1).
 *
 * Manejo de fallos (Req. 13.4): si una etapa lanza un error, el orquestador
 * detiene el procesamiento, **registra la etapa fallida** mediante el `logger`
 * y lanza `ErrorEtapaPipeline` con las etapas completadas **antes** del fallo.
 * El llamador persiste esas etapas y, al reintentar con ese estado, la
 * ejecucion se reanuda desde la etapa fallida sin repetir las completadas.
 *
 * Los manejadores concretos se inyectan; las etapas sin manejador se tratan
 * como placeholder (no-op) e igualmente se marcan completadas (las etapas de
 * analisis NLP/vision/etc. siguen siendo inyectables segun el alcance 9.2).
 */
export class OrquestadorPipeline implements PipelineAnalisis {
    constructor(
        private readonly manejadores: ManejadoresEtapa = {},
        private readonly logger: LoggerPipeline = loggerConsola,
    ) { }

    /**
     * Punto de entrada canonico del pipeline, **libre de origen** (Req. 2.2, 2.4):
     * solo recibe el `Contrato_Normalizado`. El `estado` es opcional y describe el
     * progreso por etapa para permitir la reanudacion; por defecto arranca desde
     * un estado inicial (sin `etapas_completadas`) y ejecuta el pipeline completo.
     *
     * Delega en {@link ejecutar}, que recorre `ORDEN_ETAPAS` desde la primera
     * etapa no completada. El `ResultadoSemana` devuelto expone las
     * `etapasCompletadas`, que el llamador persiste en
     * `gds_ciclo_semanal.etapas_completadas` para soportar la reanudacion
     * idempotente (Req. 13.1, 13.4).
     */
    async procesar(
        contrato: ContratoNormalizado,
        estado: EstadoPipeline = estadoPipelineInicial(),
    ): Promise<ResultadoSemana> {
        return this.ejecutar(contrato, estado);
    }

    async ejecutar(
        contrato: ContratoNormalizado,
        estado: EstadoPipeline,
    ): Promise<ResultadoSemana> {
        const completadas = new Set(estado.etapasCompletadas);
        const etapasCompletadas = [...estado.etapasCompletadas];
        const inicio = primeraEtapaPendiente(estado);
        let contratoActual = contrato;

        for (let i = inicio; i < ORDEN_ETAPAS.length; i++) {
            const etapa = ORDEN_ETAPAS[i];
            if (completadas.has(etapa)) {
                continue; // no repetir etapas ya completadas (Req. 13.4)
            }
            const manejador = this.manejadores[etapa];
            if (manejador) {
                try {
                    const transformado = await manejador(contratoActual, estado);
                    if (transformado) {
                        contratoActual = transformado;
                    }
                } catch (causa) {
                    // Detener, registrar la etapa fallida y permitir reanudar
                    // desde ella sin repetir las completadas (Req. 13.4).
                    this.logger.error(
                        `Pipeline_Analisis: fallo en la etapa ${etapa}`,
                        {
                            etapa,
                            etapasCompletadas: [...etapasCompletadas],
                            causa: causa instanceof Error ? causa.message : String(causa),
                        },
                    );
                    throw new ErrorEtapaPipeline(
                        etapa,
                        [...etapasCompletadas],
                        contratoActual,
                        causa,
                    );
                }
            }
            completadas.add(etapa);
            etapasCompletadas.push(etapa);
        }

        return { etapasCompletadas, contrato: contratoActual };
    }
}

/** Crea un `EstadoPipeline` inicial sin etapas completadas. */
export function estadoPipelineInicial(): EstadoPipeline {
    return { etapasCompletadas: [] };
}

/**
 * Reconstruye un `EstadoPipeline` a partir de las etapas persistidas en la
 * columna `gds_ciclo_semanal.etapas_completadas` (Req. 13.1).
 *
 * Conserva unicamente las etapas que pertenecen a `ORDEN_ETAPAS` (descartando
 * valores desconocidos por compatibilidad ante cambios de esquema) y las
 * devuelve en el orden canonico, sin duplicados. El estado resultante alimenta
 * `procesar`/`ejecutar` para reanudar desde la primera etapa no completada sin
 * repetir las ya hechas (Req. 13.4).
 */
export function estadoDesdeEtapasCompletadas(
    etapasCompletadas: readonly string[],
): EstadoPipeline {
    const validas = new Set<string>(ORDEN_ETAPAS);
    const presentes = new Set(etapasCompletadas.filter((e) => validas.has(e)));
    return {
        etapasCompletadas: ORDEN_ETAPAS.filter((e) => presentes.has(e)),
    };
}

/**
 * Serializa las `etapasCompletadas` de un `EstadoPipeline`/`ResultadoSemana`
 * para persistirlas en `gds_ciclo_semanal.etapas_completadas`, en el orden
 * canonico de `ORDEN_ETAPAS` y sin duplicados (Req. 13.1).
 */
export function serializarEtapasCompletadas(estado: {
    etapasCompletadas: readonly EtapaPipeline[];
}): EtapaPipeline[] {
    const presentes = new Set(estado.etapasCompletadas);
    return ORDEN_ETAPAS.filter((e) => presentes.has(e));
}
