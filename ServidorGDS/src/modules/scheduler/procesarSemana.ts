/**
 * `procesarSemana` - UNICO punto de entrada por `Semana_Simulada`, transaccional
 * (tarea 16.1).
 *
 * Es la pieza de logica que TODOS los modos de ejecucion (Manual / Automatico /
 * Tiempo_Real) y ambos disparadores (`Programador_Temporal` y
 * `Herramienta_Aceleracion`) reutilizan sin variante alguna: el modo solo cambia
 * QUIEN dispara el ciclo y CUANDO, no QUE se ejecuta (design.md > "Motor de
 * ciclos", Req. 12, 18, 32). Esto garantiza la equivalencia entre el salto
 * temporal y el procesamiento paso a paso, y entre los tres modos.
 *
 * Flujo por semana (en orden estricto), tal como exige el diseno:
 *
 * ```
 * procesarSemana(analisisId, institucionId, semanaN)
 *   -> genera   (Capa_Adquisicion via IDataProvider / Modulo_Simulacion)
 *   -> valida   (Validador_Contrato; rechaza no conformes antes de la Capa_Analisis)
 *   -> analiza  (Pipeline_Analisis; IA pesada en Servicio_IA, fallback TS)
 *   -> aprende  (perfiles, comunidad, memoria, indice, scores, patrones, embeddings)
 *   -> almacena (TRANSACCION ATOMICA: resultado + aprendizaje + embeddings)
 * ```
 *
 * Atomicidad (Req. 25.5, 13.2, 13.3): la persistencia del resultado de la
 * semana, de los artefactos de aprendizaje y de los `Embeddings`
 * (`Memoria_Semantica` -> `pgvector`) ocurre dentro de UNA SOLA transaccion.
 * Si cualquier paso de la persistencia falla, la transaccion se revierte por
 * completo y no queda ningun registro parcial de esa semana; al reanudar, la
 * semana vuelve a procesarse sin filas huerfanas ni duplicados. La generacion,
 * la validacion y el analisis ocurren ANTES de abrir la transaccion: si fallan,
 * no se escribe nada (no hay efectos secundarios persistentes).
 *
 * Orden y privacidad (Req. 13.1, 13.5): el analisis se delega al
 * `Pipeline_Analisis`, que ejecuta las etapas en `ORDEN_ETAPAS` con la
 * anonimizacion como precondicion de todo analisis y almacenamiento. Si una
 * etapa del pipeline falla, el error (`ErrorEtapaPipeline`) se propaga con las
 * etapas completadas para permitir reanudar desde la etapa fallida sin repetir
 * las completadas (Req. 13.4); como el fallo ocurre antes de la transaccion, no
 * se persiste resultado parcial alguno.
 *
 * Desacople (Req. 31.6, 35.4): `procesarSemana` depende SOLO de puertos estables
 * (generador, validador, pipeline, motor de aprendizaje, persistor y ejecutor
 * transaccional) inyectados por constructor. Es agnostico del framework, de la
 * cola (BullMQ) y de la base de datos concreta, de modo que puede ejercitarse en
 * pruebas con dobles deterministas (sin red ni BD) y portarse a la
 * `Cola_Trabajos` (tarea 16.2) y al `GestorEjecucion` (tarea 17) sin cambios.
 *
 * Diseno: design.md > "Motor de ciclos y saltos temporales" > "Unico punto de
 * entrada por semana".
 * _Requirements: 12.2, 12.3, 13.2, 13.3, 25.5_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type { ValidadorContrato } from "../contracts/validadorContrato";
import type { MemoriaSemantica } from "../ai-engine/memoriaSemantica";
import {
    type ContextoEmbeddings,
    type EjecutorTransaccional,
    type FabricaMemoriaTransaccional,
    extraerFragmentosEmbeddings,
} from "../pipeline/etapaEmbeddings";
import { type ResultadosAnalisis } from "../pipeline/etapasAnalisis";
import {
    type EstadoPipeline,
    type EtapaPipeline,
    type ResultadoSemana,
} from "../pipeline/pipeline";

/**
 * Coordenadas de la `Semana_Simulada` a procesar. La triada
 * `(analisisId, institucionId, numeroSemana)` identifica de forma unica el
 * trabajo y es la clave de idempotencia/concurrencia de la cola (tarea 16.2,
 * Req. 27.2, 38.2).
 */
export interface ContextoSemana {
    /** `Analisis` de origen. */
    analisisId: string;
    /** `Institucion` cuya `Comunidad_Digital` se procesa (aislamiento, Req. 9.5). */
    institucionId: string;
    /** `Comunidad_Digital` destino (clave de la `Memoria_Jerarquica`/semantica). */
    comunidadId: string;
    /** Numero de `Semana_Simulada` (entero >= 1), procesado en orden creciente. */
    numeroSemana: number;
}

/**
 * Resultado de la fase de GENERACION (`Capa_Adquisicion`). Devuelve el contrato
 * candidato (aun SIN validar: el `Validador_Contrato` es la frontera) y la
 * `Comunidad_Digital` para la que se genero, de modo que `procesarSemana`
 * mantenga su firma `(analisisId, institucionId, semanaN)` sin necesitar el
 * `comunidadId` desde fuera.
 */
export interface ResultadoGeneracionSemana {
    /** Candidato a `Contrato_Normalizado`; lo valida el `Validador_Contrato`. */
    contrato: unknown;
    /** `Comunidad_Digital` para la que se genero el contenido. */
    comunidadId: string;
    /** Nombre del proveedor (`IDataProvider`) que genero el contenido (trazable). */
    proveedor?: string;
}

/**
 * Puerto de GENERACION: produce el contenido de UNA `Semana_Simulada` a partir
 * del contexto longitudinal acumulado. En produccion lo implementa un adaptador
 * del `Modulo_Simulacion` (que orquesta `IDataProvider` + `Motor_Memoria_Contextual`);
 * en pruebas, un doble determinista con semilla fija (Req. 18.4).
 */
export interface GeneradorSemana {
    /** Genera el candidato de la semana N para `(analisisId, institucionId)`. */
    generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana>;
}

/**
 * Resultado de la fase de ANALISIS: el resultado del `Pipeline_Analisis`
 * (contrato anonimizado + etapas completadas) y las salidas de las etapas de
 * analisis (filtro/NLP/vision) acumuladas durante la ejecucion.
 */
export interface ResultadoAnalisisSemana {
    /** Resultado del `Pipeline_Analisis` (contrato anonimizado + etapas). */
    resultado: ResultadoSemana;
    /** Salidas de las etapas de analisis (filtro/NLP/vision) (Req. 14.x, 34.x). */
    analisis: ResultadosAnalisis;
}

/**
 * Puerto de ANALISIS: ejecuta el `Pipeline_Analisis` sobre el contrato YA
 * validado y devuelve tanto el resultado del pipeline como las salidas de las
 * etapas de analisis. En produccion, un adaptador construye un acumulador FRESCO
 * por semana, cablea las etapas del pipeline (anonimizacion -> filtro -> NLP ->
 * ... -> explicacion) contra ese acumulador (`crearManejadoresEtapa`) y ejecuta
 * `OrquestadorPipeline.procesar`; en pruebas, un doble determinista.
 *
 * Mantener el analisis tras un puerto evita que `procesarSemana` conozca como se
 * acumulan las salidas de etapa y preserva el desacople (Req. 31.6): el motor de
 * ciclos solo orquesta el orden genera -> valida -> analiza -> aprende ->
 * almacena. La anonimizacion como precondicion y la reanudacion por etapa
 * (Req. 13.1, 13.4, 13.5) las garantiza el `Pipeline_Analisis` interno.
 */
export interface AnalizadorSemana {
    /** Analiza el contrato validado; `estado` opcional reanuda por etapa (Req. 13.4). */
    analizar(
        contrato: ContratoNormalizado,
        estado?: EstadoPipeline,
    ): Promise<ResultadoAnalisisSemana>;
}

/**
 * Entrada de la fase de APRENDIZAJE: el contexto de la semana, el contrato ya
 * analizado/anonimizado (`resultado.contrato`), las salidas del pipeline
 * (filtro/NLP/vision en `analisis`) y el rastro de etapas completadas.
 */
export interface EntradaAprendizaje {
    contexto: ContextoSemana;
    /** Resultado del `Pipeline_Analisis` (contrato anonimizado + etapas). */
    resultado: ResultadoSemana;
    /** Salidas de las etapas de analisis (filtro/NLP/vision). */
    analisis: ResultadosAnalisis;
    /** Proveedor que genero el contenido (trazabilidad). */
    proveedor?: string;
}

/**
 * Artefactos de APRENDIZAJE producidos al cerrar la semana (Req. 13.2): perfiles
 * de `Usuario_Sintetico`, estado de la `Comunidad_Digital`, consolidacion de
 * memoria, dimensiones del `Indice_Riesgo`, `Score_Asociacion`, patrones y
 * tendencias. Se modelan como un contenedor abierto y opaco para `procesarSemana`:
 * el motor de aprendizaje concreto (tareas 13/14) los calcula y el persistor los
 * escribe; `procesarSemana` solo garantiza que se persistan ATOMICAMENTE junto
 * al resultado de la semana y los embeddings.
 */
export interface ArtefactosAprendizaje {
    /** Perfiles de `Usuario_Sintetico` actualizados (Req. 13.2, 10.x). */
    perfiles?: unknown;
    /** Estado/indicadores de la `Comunidad_Digital` (Req. 13.2). */
    comunidad?: unknown;
    /** Consolidacion de la `Memoria_Jerarquica`/contextual (Req. 13.2, 28.x). */
    memoria?: unknown;
    /** Dimensiones del `Indice_Riesgo` calculadas para la semana (Req. 17.x). */
    indice?: unknown;
    /** `Score_Asociacion` recalculado al cerrar la semana (Req. 11.5). */
    scores?: unknown;
    /** Patrones/tendencias detectados, anclados a su `Zona_Geografica` (Req. 33.x). */
    patrones?: unknown;
    /** Cualquier otro artefacto de aprendizaje que el persistor sepa escribir. */
    [extra: string]: unknown;
}

/**
 * Puerto de APRENDIZAJE: a partir del resultado del analisis, calcula los
 * artefactos que el sistema "aprende" al cerrar la semana (perfiles, comunidad,
 * memoria, indice, scores, patrones). Es una computacion PURA (sin persistir):
 * `procesarSemana` la persiste dentro de la transaccion atomica.
 */
export interface MotorAprendizaje {
    aprender(entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje>;
}

/**
 * Unidad de trabajo a persistir ATOMICAMENTE para una `Semana_Simulada`: el
 * resultado del pipeline, las salidas de analisis y los artefactos de
 * aprendizaje, todo ligado al contexto de la semana.
 */
export interface UnidadTrabajoSemana {
    contexto: ContextoSemana;
    resultado: ResultadoSemana;
    analisis: ResultadosAnalisis;
    aprendizaje: ArtefactosAprendizaje;
    proveedor?: string;
}

/**
 * Puerto de PERSISTENCIA del resultado de la semana DENTRO de la transaccion
 * activa `tx`. Escribe `gds_resultado_analisis` y el subgrafo del analisis
 * (dimensiones, scores, patrones, perfiles, memoria, etc.) y DEVUELVE el
 * `resultadoId` recien creado, que `procesarSemana` usa para referenciar los
 * embeddings de la `Memoria_Semantica` dentro de la MISMA transaccion (Req.
 * 36.5). La implementacion concreta (Prisma sobre `tx`) se cablea en la capa de
 * persistencia; aqui es un puerto estable inyectable.
 */
export type PersistorSemana<TX = unknown> = (
    tx: TX,
    unidad: UnidadTrabajoSemana,
) => Promise<{ resultadoId: string }>;

/** Dependencias (puertos) de `procesarSemana`. Inyectables por constructor. */
export interface DependenciasProcesarSemana<TX = unknown> {
    /** GENERA: produce el contenido de la semana (Capa_Adquisicion). */
    generador: GeneradorSemana;
    /** VALIDA: frontera `Contrato_Normalizado` antes de la `Capa_Analisis`. */
    validador: ValidadorContrato;
    /** ANALIZA: `Pipeline_Analisis` (etapas en orden, anonimizacion primero). */
    analizador: AnalizadorSemana;
    /** APRENDE: calcula perfiles/comunidad/memoria/indice/scores/patrones. */
    aprendizaje: MotorAprendizaje;
    /** ALMACENA: abre la transaccion atomica (Prisma `$transaction` en prod). */
    ejecutarTransaccion: EjecutorTransaccional<TX>;
    /** ALMACENA: escribe el resultado de la semana y devuelve su `resultadoId`. */
    persistirResultado: PersistorSemana<TX>;
    /** ALMACENA: `Memoria_Semantica` ligada a la transaccion (embeddings tx-scoped). */
    memoriaTransaccional: FabricaMemoriaTransaccional<TX>;
}

/** Opciones por invocacion de `procesarSemana`. */
export interface OpcionesProcesarSemana {
    /**
     * Estado de etapas persistido para REANUDAR el `Pipeline_Analisis` desde la
     * etapa fallida sin repetir las completadas (Req. 13.4). Si se omite, el
     * pipeline arranca desde el inicio.
     */
    estado?: EstadoPipeline;
}

/** Resultado de `procesarSemana`: trazabilidad de la semana procesada. */
export interface ResultadoProcesarSemana {
    analisisId: string;
    institucionId: string;
    comunidadId: string;
    numeroSemana: number;
    /** Id del `ResultadoAnalisis` persistido para esta semana. */
    resultadoId: string;
    /** Etapas del pipeline completadas en esta ejecucion (orden canonico). */
    etapasCompletadas: EtapaPipeline[];
    /** Proveedor que genero el contenido de la semana. */
    proveedor?: string;
}

/**
 * Orquestador del UNICO `procesarSemana` (transaccional) reutilizado por todos
 * los modos. Recibe sus puertos por constructor (DI / dobles de prueba) y NO
 * conoce la cola, el framework ni la BD concreta.
 */
export class ProcesadorSemana<TX = unknown> {
    constructor(private readonly deps: DependenciasProcesarSemana<TX>) { }

    /**
     * Procesa la `Semana_Simulada` N del par `(analisisId, institucionId)`:
     * genera -> valida -> analiza -> aprende -> almacena (transaccion atomica).
     *
     * Devuelve la trazabilidad de la semana procesada. Lanza si:
     *  - el numero de semana es invalido (no entero o < 1),
     *  - el `Validador_Contrato` rechaza el contenido generado (no llega a la
     *    `Capa_Analisis`, Req. 2.5),
     *  - una etapa del `Pipeline_Analisis` falla (`ErrorEtapaPipeline`, Req. 13.4),
     *  - la transaccion de almacenamiento falla (se revierte por completo, Req. 25.5).
     *
     * En todos los casos de fallo previos a la transaccion no se escribe nada;
     * un fallo durante la transaccion la revierte integramente (atomicidad).
     */
    async procesarSemana(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
        opciones: OpcionesProcesarSemana = {},
    ): Promise<ResultadoProcesarSemana> {
        if (!Number.isInteger(numeroSemana) || numeroSemana < 1) {
            throw new Error(
                `procesarSemana: numero de semana invalido (${numeroSemana}); debe ser un entero >= 1.`,
            );
        }

        // 1) GENERA (Capa_Adquisicion). El contrato es aun un candidato.
        const generacion = await this.deps.generador.generar(
            analisisId,
            institucionId,
            numeroSemana,
        );

        const contexto: ContextoSemana = {
            analisisId,
            institucionId,
            comunidadId: generacion.comunidadId,
            numeroSemana,
        };

        // 2) VALIDA (frontera Contrato_Normalizado). Rechaza no conformes ANTES
        //    de que lleguen a la Capa_Analisis (Req. 2.5).
        const validacion = this.deps.validador.validar(generacion.contrato);
        if (!validacion.ok || !validacion.contrato) {
            const detalle = (validacion.errores ?? [])
                .map((e) => `${e.campo}: ${e.mensaje}`)
                .join("; ");
            throw new Error(
                `procesarSemana: contrato no conforme rechazado antes de la Capa_Analisis (semana ${numeroSemana})` +
                (detalle ? ` [${detalle}]` : ""),
            );
        }
        const contratoValido: ContratoNormalizado = validacion.contrato;

        // 3) ANALIZA (Pipeline_Analisis). Las etapas de analisis (filtro/NLP/
        //    vision) escriben en un acumulador FRESCO por semana que el
        //    `AnalizadorSemana` devuelve junto al resultado del pipeline. La
        //    anonimizacion precede a todo analisis y almacenamiento por
        //    construccion del ORDEN_ETAPAS (Req. 13.1, 13.5). Si una etapa falla,
        //    el error se propaga ANTES de abrir la transaccion: no se persiste
        //    resultado parcial (Req. 13.4).
        const { resultado, analisis } = await this.deps.analizador.analizar(
            contratoValido,
            opciones.estado,
        );

        // 4) APRENDE (computacion pura, sin persistir): perfiles, comunidad,
        //    memoria, indice, scores y patrones a partir del analisis (Req. 13.2).
        const aprendizaje = await this.deps.aprendizaje.aprender({
            contexto,
            resultado,
            analisis,
            ...(generacion.proveedor !== undefined
                ? { proveedor: generacion.proveedor }
                : {}),
        });

        const unidad: UnidadTrabajoSemana = {
            contexto,
            resultado,
            analisis,
            aprendizaje,
            ...(generacion.proveedor !== undefined
                ? { proveedor: generacion.proveedor }
                : {}),
        };

        // 5) ALMACENA en UNA transaccion atomica (Req. 25.5, 13.3): resultado de
        //    la semana + artefactos de aprendizaje + embeddings de la
        //    Memoria_Semantica. Si cualquier paso falla, la transaccion se
        //    revierte por completo (sin filas huerfanas ni duplicados).
        const resultadoId = await this.deps.ejecutarTransaccion(async (tx) => {
            // 5.a) Persistir el resultado de la semana y su subgrafo de
            //      aprendizaje; obtener el resultadoId para trazar los embeddings.
            const { resultadoId } = await this.deps.persistirResultado(tx, unidad);

            // 5.b) Indexar los embeddings del contenido analizado en la MISMA
            //      transaccion, acumulando en pgvector SIN borrar previos
            //      (Req. 36.1, 36.2). La memoria va ligada a `tx` para garantizar
            //      la atomicidad con el resultado de la semana.
            const memoria: MemoriaSemantica = this.deps.memoriaTransaccional(tx);
            const ctxEmbeddings: ContextoEmbeddings = {
                analisisId: contexto.analisisId,
                comunidadId: contexto.comunidadId,
                institucionId: contexto.institucionId,
                resultadoId,
                numeroSemana: contexto.numeroSemana,
            };
            const { vectores, textos } = extraerFragmentosEmbeddings(
                resultado.contrato,
                ctxEmbeddings,
            );
            await memoria.indexar(vectores, textos);

            return resultadoId;
        });

        return {
            analisisId,
            institucionId,
            comunidadId: contexto.comunidadId,
            numeroSemana,
            resultadoId,
            etapasCompletadas: resultado.etapasCompletadas,
            ...(generacion.proveedor !== undefined
                ? { proveedor: generacion.proveedor }
                : {}),
        };
    }
}

/** Token DI (NestJS) del UNICO `procesarSemana` reutilizado por todos los modos. */
export const PROCESADOR_SEMANA = Symbol("GDS:PROCESADOR_SEMANA");
