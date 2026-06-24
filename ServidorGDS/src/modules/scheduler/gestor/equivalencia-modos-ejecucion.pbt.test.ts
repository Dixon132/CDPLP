/**
 * PBT - Property 34: Equivalencia de resultado entre los tres modos de ejecucion
 * (tarea 17.2).
 *
 * Texto de la propiedad (design.md):
 * "Para todo `Analisis` con un proveedor de generacion determinista (semilla
 *  fija) y un `Servicio_IA`/fallback determinista, el estado final del `Analisis`
 *  (incluido el `Corpus_Longitudinal` acumulado y la `Memoria_Semantica`) es
 *  identico al ejecutarlo completo en `Modo_Ejecucion` Manual, Automatico o
 *  Tiempo_Real, dado que los tres reutilizan la misma logica `procesarSemana`."
 *
 * Esta propiedad es de implementacion OBLIGATORIA (Req. 26.3, equivalencia entre
 * modos). Se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD, sin
 * red), conforme a las restricciones Windows/cmd del plan:
 *
 *  - **Proveedor con semilla fija**: `GeneradorDeterminista` produce el
 *    `Contrato_Normalizado` de cada `(Analisis, Institucion, Semana)` de forma
 *    reproducible a partir de una semilla, e incorpora el contexto longitudinal
 *    acumulado (las semanas ya completadas de ese `(A,I)`), de modo que el
 *    contenido de la semana N depende del `Corpus_Longitudinal` previo.
 *  - **`Servicio_IA`/fallback dobles deterministas**: `AnalizadorDeterminista` y
 *    `AprendizajeDeterminista` derivan el resultado del pipeline y el aprendizaje
 *    (incluido un `Indice_Riesgo` ACUMULATIVO encadenado semana a semana) de
 *    forma reproducible y dependiente del orden de procesamiento.
 *  - **Relojes e IDs inyectables**: `RelojFijo` + `GeneradorIdSecuencial` en el
 *    registro de estado de la cola, y `RelojFijo` en los disparadores; los
 *    `resultadoId`/`refId` son deterministas por coordenada `(A,I,N)`.
 *  - **Cola en memoria de ejecucion inmediata**: un `EncoladorSemana` doble
 *    acumula los trabajos `(A,I,N)` y un "drenado" FIFO los ejecuta con el
 *    `EjecutorTrabajoSemana` real (idempotencia + cerrojo + estado consultable).
 *  - **Contador del Tiempo_Real inyectable**: `TemporizadorManual` dispara los
 *    vencimientos del intervalo a voluntad (sin esperas reales).
 *
 * Se ejecuta el MISMO `Analisis` (mismas instituciones, mismo total de semanas y
 * misma semilla) COMPLETO en los tres `Modo_Ejecucion`, gobernados por el UNICO
 * `GestorEjecucionService` (tarea 17.1):
 *
 *   (M) **Manual** (Req. 32.2) — una solicitud `avanzarManual` por semana:
 *       procesa EXACTAMENTE la siguiente `Semana_Simulada` pendiente por
 *       institucion, repetida hasta completar el `Analisis`.
 *   (A) **Automatico** (Req. 32.3) — `avanzar` reutiliza
 *       `HerramientaAceleracion.avanzarHastaElFinal`: encola de una sola vez
 *       TODAS las semanas pendientes en orden creciente.
 *   (T) **Tiempo_Real** (Req. 32.4, 32.5) — `avanzar` mas vencimientos del
 *       `TemporizadorManual`: cada vencimiento reutiliza `ProgramadorTemporal.tick`
 *       y encola la siguiente semana pendiente por institucion.
 *
 * Los tres modos solo cambian QUIEN dispara y CUANDO; reutilizan el UNICO
 * `procesarSemana` por la MISMA cola, sin ruta alternativa por modo. La propiedad
 * exige que el estado final de la "BD" del `Analisis` (resultados por semana +
 * `Indice_Riesgo` acumulado + `Memoria_Semantica`/embeddings) sea IDENTICO entre
 * los tres modos (Req. 32.7, 32.3, 31.4).
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 32.7, 32.3, 31.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 34: Equivalencia de resultado entre los tres modos de ejecución
import fc from "fast-check";

import type { ModoEjecucion } from "../../analysis/analysis.types";
import { MODOS_EJECUCION } from "../../analysis/analysis.types";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoZod } from "../../contracts/validadorContrato";
import type {
    MemoriaSemantica,
    VectorMemoria,
} from "../../ai-engine/memoriaSemantica";
import {
    ORDEN_ETAPAS,
    type EstadoPipeline,
    type ResultadoSemana,
} from "../../pipeline/pipeline";
import type { ResultadosAnalisis } from "../../pipeline/etapasAnalisis";

import {
    ProcesadorSemana,
    type AnalizadorSemana,
    type ArtefactosAprendizaje,
    type DependenciasProcesarSemana,
    type EntradaAprendizaje,
    type GeneradorSemana,
    type PersistorSemana,
    type ResultadoAnalisisSemana,
    type ResultadoGeneracionSemana,
    type UnidadTrabajoSemana,
} from "../procesarSemana";

import { HerramientaAceleracion } from "../programador/herramienta-aceleracion";
import { ProgramadorTemporal } from "../programador/programador-temporal";
import { PlanAnalisisEnMemoria } from "../programador/adaptadores-programador";
import type { EncoladorSemana } from "../programador/puertos-programador";

import type { ResultadoEncolado } from "../cola/cola-procesar-semana.service";
import {
    claveTrabajo,
    jobIdSemana,
    type DatosTrabajoSemana,
} from "../cola/trabajo-semana";
import {
    EjecutorTrabajoSemana,
    type ContextoIntento,
} from "../cola/ejecutor-trabajo-semana";
import { EstadoTrabajo } from "../cola/estados-trabajo";
import type {
    ConsultaResultadoSemana,
    ProcesadorSemanaPort,
} from "../cola/puertos-cola";
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from "../cola/adaptadores-memoria";

import { AlmacenEstadoEjecucionEnMemoria } from "./almacen-estado-ejecucion";
import { GestorEjecucionService } from "./gestor-ejecucion";
import { TemporizadorManual } from "./temporizador";

const NUM_RUNS = 100;
const MAX_INTENTOS = 5;

// ===========================================================================
// Utilidades deterministas (sin Date.now/uuid/azar)
// ===========================================================================

/** Hash FNV-1a -> numero estable en [0, 1). Fuente UNICA de "azar" reproducible. */
function hash01(semilla: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < semilla.length; i++) {
        h ^= semilla.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) % 1_000_000) / 1_000_000;
}

/** Frases deterministas para el contenido sintetico (es-BO, sin PII). */
const FRASES = [
    "examenes otra vez",
    "el paro sigue",
    "crisis en la u",
    "todo normal por aca",
    "mucho estres esta semana",
    "nos apoyamos entre todos",
    "silencio incomodo en clase",
    "fiesta de la facultad",
] as const;

function fraseDeterminista(semilla: string): string {
    return FRASES[Math.floor(hash01(semilla) * FRASES.length)] ?? FRASES[0];
}

/** `comunidadId` estable por institucion (1 comunidad por institucion en el test). */
function comunidadDe(institucionId: string): string {
    return `com-${institucionId}`;
}

/** `resultadoId` DETERMINISTA por coordenada `(A,I,N)` (relojes/IDs inyectables). */
function resultadoIdDe(datos: DatosTrabajoSemana): string {
    return `res:${datos.analisisId}:${datos.institucionId}:${datos.numeroSemana}`;
}

// ===========================================================================
// "Banco de estado" en memoria: simula el estado final de la BD del Analisis
// ===========================================================================

/** Vista persistida de una `Semana_Simulada` (resultado + aprendizaje). */
interface RegistroSemana {
    clave: string;
    analisisId: string;
    institucionId: string;
    comunidadId: string;
    numeroSemana: number;
    resultadoId: string;
    proveedor?: string;
    etapasCompletadas: string[];
    /** `Indice_Riesgo` propio de la semana (determinista por contenido). */
    indicePropio: number;
    /** `Indice_Riesgo` ACUMULADO (encadenado con las semanas previas de `(A,I)`). */
    indiceAcumulado: number;
}

/**
 * Estado final de la "BD" del `Analisis`: resultados por semana + embeddings de
 * la `Memoria_Semantica`. Es el objeto que se compara entre los tres modos de
 * ejecucion (deben coincidir, Req. 32.7).
 */
class BancoEstado {
    readonly resultados = new Map<string, RegistroSemana>();
    readonly embeddings: VectorMemoria[] = [];

    yaProcesada(datos: DatosTrabajoSemana): boolean {
        return this.resultados.has(claveTrabajo(datos));
    }

    /** Numeros de `Semana_Simulada` ya COMPLETADAS para `(A,I)`, ascendentes. */
    semanasCompletadasDe(analisisId: string, institucionId: string): number[] {
        const ns: number[] = [];
        for (const reg of this.resultados.values()) {
            if (reg.analisisId === analisisId && reg.institucionId === institucionId) {
                ns.push(reg.numeroSemana);
            }
        }
        return ns.sort((a, b) => a - b);
    }

    /** Suma del `indicePropio` de las semanas YA completadas de `(A,I)`. */
    indiceAcumuladoPrevio(analisisId: string, institucionId: string): number {
        let suma = 0;
        for (const reg of this.resultados.values()) {
            if (reg.analisisId === analisisId && reg.institucionId === institucionId) {
                suma += reg.indicePropio;
            }
        }
        return suma;
    }
}

// ===========================================================================
// Dobles deterministas de las fases de `procesarSemana` (semilla fija)
// ===========================================================================

/**
 * `GeneradorSemana` con semilla fija + contexto longitudinal: el contenido de la
 * semana N depende de la semilla, de `(A,I,N)` y del numero de semanas previas ya
 * completadas de `(A,I)` (`Corpus_Longitudinal` acumulado). Como los tres modos
 * procesan las semanas en el MISMO orden creciente y contiguo, ese contexto es
 * identico, por lo que la generacion es reproducible entre modos (premisa de la
 * Property 34).
 */
class GeneradorDeterminista implements GeneradorSemana {
    constructor(
        private readonly banco: BancoEstado,
        private readonly semilla: number,
    ) { }

    async generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana> {
        const previas = this.banco.semanasCompletadasDe(analisisId, institucionId)
            .length;
        const base = `${this.semilla}:${analisisId}:${institucionId}:${numeroSemana}:${previas}`;

        const contrato: ContratoNormalizado = {
            post: {
                autorId: `u-${institucionId}-1`,
                texto: fraseDeterminista(`${base}:post`),
            },
            comments: [
                {
                    autorId: `u-${institucionId}-2`,
                    texto: fraseDeterminista(`${base}:c0`),
                    enRespuestaA: null,
                },
                {
                    autorId: `u-${institucionId}-3`,
                    texto: fraseDeterminista(`${base}:c1`),
                    enRespuestaA: `u-${institucionId}-1`,
                },
            ],
            image_description: fraseDeterminista(`${base}:img`),
            hashtags: ["#u", "#comunidad"],
            metadata: {
                version: CONTRATO_VERSION,
                fuente: "doble-semilla",
                generadoEn: "2024-01-01T00:00:00.000Z",
                semana: numeroSemana,
                idioma: "es-BO",
            },
        };

        return {
            contrato,
            comunidadId: comunidadDe(institucionId),
            proveedor: "doble-semilla",
        };
    }
}

/**
 * `AnalizadorSemana` determinista (doble del `Servicio_IA`/fallback): atraviesa
 * todas las etapas y devuelve el contrato tal cual (ya validado), de modo que la
 * extraccion de embeddings sea reproducible. No introduce no-determinismo.
 */
class AnalizadorDeterminista implements AnalizadorSemana {
    // El `estado` de reanudacion no altera el resultado final en este doble.
    async analizar(
        contrato: ContratoNormalizado,
        _estado?: EstadoPipeline,
    ): Promise<ResultadoAnalisisSemana> {
        const analisis: ResultadosAnalisis = {
            filtro: { contributivos: [], noContributivos: [] },
        };
        const resultado: ResultadoSemana = {
            etapasCompletadas: [...ORDEN_ETAPAS],
            contrato,
        };
        return { resultado, analisis };
    }
}

/**
 * `MotorAprendizaje` determinista: calcula el `Indice_Riesgo` propio de la semana
 * (funcion del contenido) y el `Indice_Riesgo` ACUMULADO sumando los propios de
 * las semanas previas de `(A,I)` ya persistidas. Este encadenamiento hace que el
 * estado final dependa del ORDEN y la CONTIGUIDAD del procesamiento: si los tres
 * modos no fueran equivalentes, el acumulado final diferiria.
 */
class AprendizajeDeterminista {
    constructor(private readonly banco: BancoEstado) { }

    async aprender(entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje> {
        const { contexto, resultado } = entrada;
        const propio = hash01(
            `${resultado.contrato.post.texto}|${resultado.contrato.image_description}|${contexto.numeroSemana}`,
        );
        const acumuladoPrevio = this.banco.indiceAcumuladoPrevio(
            contexto.analisisId,
            contexto.institucionId,
        );
        return {
            indice: {
                propio,
                acumulado: acumuladoPrevio + propio,
            },
            perfiles: [`u-${contexto.institucionId}-1`, `u-${contexto.institucionId}-2`],
            scores: { [`u-${contexto.institucionId}-1`]: propio },
        };
    }
}

// ===========================================================================
// Almacenamiento transaccional atomico hacia el BancoEstado
// ===========================================================================

/** Cambios en preparacion (staging) que solo se confirman al hacer commit. */
class StagingTx {
    resultados: RegistroSemana[] = [];
    embeddings: VectorMemoria[] = [];
}

/**
 * `EjecutorTransaccional` doble: aplica las escrituras a un `StagingTx` y solo las
 * vuelca al `BancoEstado` real si el trabajo termina sin lanzar (commit); si
 * lanza, descarta el staging (rollback). Replica la atomicidad de `procesarSemana`.
 */
function crearEjecutorTransaccional(banco: BancoEstado) {
    return async <R>(trabajo: (tx: StagingTx) => Promise<R>): Promise<R> => {
        const staging = new StagingTx();
        const r = await trabajo(staging); // si lanza -> no se vuelca (rollback)
        for (const reg of staging.resultados) {
            banco.resultados.set(reg.clave, reg);
        }
        banco.embeddings.push(...staging.embeddings);
        return r;
    };
}

/** `PersistorSemana`: escribe el registro de la semana en el staging tx. */
function crearPersistor(): PersistorSemana<StagingTx> {
    return async (tx, unidad: UnidadTrabajoSemana) => {
        const { contexto } = unidad;
        const datos: DatosTrabajoSemana = {
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
        };
        const resultadoId = resultadoIdDe(datos);
        const indice = unidad.aprendizaje.indice as
            | { propio: number; acumulado: number }
            | undefined;

        const registro: RegistroSemana = {
            clave: claveTrabajo(datos),
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            comunidadId: contexto.comunidadId,
            numeroSemana: contexto.numeroSemana,
            resultadoId,
            etapasCompletadas: [...unidad.resultado.etapasCompletadas],
            indicePropio: indice?.propio ?? 0,
            indiceAcumulado: indice?.acumulado ?? 0,
            ...(unidad.proveedor !== undefined ? { proveedor: unidad.proveedor } : {}),
        };
        tx.resultados.push(registro);
        return { resultadoId };
    };
}

/** `Memoria_Semantica` ligada a la transaccion (escribe embeddings en el staging). */
function crearMemoriaTransaccional(): (tx: StagingTx) => MemoriaSemantica {
    return (tx: StagingTx): MemoriaSemantica => ({
        async indexar(vectores: VectorMemoria[]): Promise<void> {
            tx.embeddings.push(...vectores);
        },
        async buscarSimilares() {
            return [];
        },
    });
}

/** Ensambla un `ProcesadorSemana` determinista que escribe en `banco`. */
function crearProcesador(banco: BancoEstado, semilla: number): ProcesadorSemana<StagingTx> {
    const deps: DependenciasProcesarSemana<StagingTx> = {
        generador: new GeneradorDeterminista(banco, semilla),
        validador: new ValidadorContratoZod(() => {
            /* registrador silencioso en pruebas */
        }),
        analizador: new AnalizadorDeterminista(),
        aprendizaje: new AprendizajeDeterminista(banco),
        ejecutarTransaccion: crearEjecutorTransaccional(banco),
        persistirResultado: crearPersistor(),
        memoriaTransaccional: crearMemoriaTransaccional(),
    };
    return new ProcesadorSemana<StagingTx>(deps);
}

// ===========================================================================
// Cola en memoria de ejecucion inmediata + drenado FIFO con el ejecutor real
// ===========================================================================

/**
 * `EncoladorSemana` en memoria: acumula los trabajos `(A,I,N)` preservando el
 * orden de encolado. Deduplica por `jobId` determinista entre los pendientes
 * (idempotencia de encolado), igual que BullMQ con `jobId` fijo.
 */
class ColaEnMemoria implements EncoladorSemana {
    readonly pendientes: DatosTrabajoSemana[] = [];

    async encolar(datos: DatosTrabajoSemana): Promise<ResultadoEncolado> {
        const jobId = jobIdSemana(datos);
        const yaPendiente = this.pendientes.some((d) => jobIdSemana(d) === jobId);
        if (!yaPendiente) {
            this.pendientes.push({ ...datos });
        }
        return { jobId, estado: EstadoTrabajo.PENDIENTE, datos: { ...datos } };
    }
}

/** Puerto de idempotencia respaldado por el `BancoEstado` real. */
class ConsultaSobreBanco implements ConsultaResultadoSemana {
    constructor(private readonly banco: BancoEstado) { }
    async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
        return this.banco.yaProcesada(datos);
    }
}

/**
 * Drena la cola en orden FIFO ejecutando cada trabajo con el `EjecutorTrabajoSemana`
 * real (idempotencia + cerrojo + estado consultable). Tras COMPLETAR una semana,
 * actualiza el `PlanAnalisis` (ultima semana completada) para que el siguiente
 * disparo encole la siguiente pendiente. Devuelve los trabajos en el ORDEN en que
 * se completaron.
 */
async function drenar(
    cola: ColaEnMemoria,
    ejecutor: EjecutorTrabajoSemana,
    plan: PlanAnalisisEnMemoria,
): Promise<DatosTrabajoSemana[]> {
    const completadosEnOrden: DatosTrabajoSemana[] = [];
    while (cola.pendientes.length > 0) {
        const datos = cola.pendientes.shift()!;
        const contexto: ContextoIntento = { intento: 1, maxIntentos: MAX_INTENTOS };
        const r = await ejecutor.ejecutar(datos, contexto);
        if (r.estado === EstadoTrabajo.COMPLETADO && !r.omitido) {
            plan.fijarCompletadas(datos.analisisId, datos.institucionId, datos.numeroSemana);
            completadosEnOrden.push(datos);
        }
    }
    return completadosEnOrden;
}

function crearEjecutorTrabajo(
    banco: BancoEstado,
    procesador: ProcesadorSemanaPort,
): EjecutorTrabajoSemana {
    return new EjecutorTrabajoSemana({
        procesador,
        cerrojo: new CerrojoConcurrenciaEnMemoria(),
        consultaResultado: new ConsultaSobreBanco(banco),
        registro: new RegistroEstadoTrabajosEnMemoria(
            new RelojFijo(new Date("2024-01-01T00:00:00.000Z")),
            new GeneradorIdSecuencial("reg"),
        ),
    });
}

// ===========================================================================
// Montaje de un recorrido completo gobernado por el GestorEjecucion
// ===========================================================================

interface ConfigAnalisis {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
    semilla: number;
}

/** Estado final canonico de un recorrido, listo para comparar con `toEqual`. */
interface EstadoFinal {
    /** Resultados por semana, ORDENADOS por clave `(A,I,N)`. */
    resultados: RegistroSemana[];
    /** Embeddings de la `Memoria_Semantica`, ORDENADOS por `refId`. */
    embeddings: VectorMemoria[];
    /** Orden en que se completaron las semanas (clave `(A,I,N)`). */
    ordenProcesado: string[];
}

function planDe(config: ConfigAnalisis): PlanAnalisisEnMemoria {
    const plan = new PlanAnalisisEnMemoria();
    plan.registrar(config.analisisId, {
        instituciones: [...config.instituciones],
        totalSemanas: config.totalSemanas,
    });
    return plan;
}

function instantanea(banco: BancoEstado, ordenProcesado: DatosTrabajoSemana[]): EstadoFinal {
    const resultados = [...banco.resultados.values()].sort((a, b) =>
        a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0,
    );
    const embeddings = [...banco.embeddings].sort((a, b) =>
        a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0,
    );
    return {
        resultados,
        embeddings,
        ordenProcesado: ordenProcesado.map(claveTrabajo),
    };
}

/** Contexto deterministas de un recorrido (banco + cola + plan + gestor). */
interface Contexto {
    banco: BancoEstado;
    ejecutor: EjecutorTrabajoSemana;
    cola: ColaEnMemoria;
    plan: PlanAnalisisEnMemoria;
    almacen: AlmacenEstadoEjecucionEnMemoria;
    temporizador: TemporizadorManual;
    gestor: GestorEjecucionService;
}

/**
 * Monta un `GestorEjecucionService` real (tarea 17.1) sobre la infraestructura
 * deterministas: el mismo `PlanAnalisis`/cola en memoria que drena el ejecutor
 * real, la `HerramientaAceleracion` y el `ProgramadorTemporal` reales (con reloj
 * fijo) y el `TemporizadorManual` (contador del Tiempo_Real disparable).
 */
function montar(config: ConfigAnalisis): Contexto {
    const banco = new BancoEstado();
    const procesador = crearProcesador(banco, config.semilla);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();
    const plan = planDe(config);
    const reloj = new RelojFijo(new Date("2024-01-01T00:00:00.000Z"));
    const herramienta = new HerramientaAceleracion({ plan, encolador: cola, reloj });
    const programador = new ProgramadorTemporal({ plan, encolador: cola, reloj });
    const temporizador = new TemporizadorManual();
    const almacen = new AlmacenEstadoEjecucionEnMemoria();
    const gestor = new GestorEjecucionService({
        almacen,
        herramienta,
        programador,
        temporizador,
    });
    return { banco, ejecutor, cola, plan, almacen, temporizador, gestor };
}

// ===========================================================================
// Recorridos completos por cada Modo_Ejecucion gobernados por el GestorEjecucion
// ===========================================================================

/**
 * (M) Manual (Req. 32.2): una solicitud `avanzarManual` por semana; cada solicitud
 * encola la siguiente `Semana_Simulada` pendiente por institucion y se drena.
 */
async function ejecutarManual(config: ConfigAnalisis): Promise<EstadoFinal> {
    const ctx = montar(config);
    await ctx.gestor.seleccionarModo(config.analisisId, "MANUAL");

    const orden: DatosTrabajoSemana[] = [];
    // Cota de seguridad: a lo sumo una solicitud por semana (mas un margen).
    const maxSolicitudes = config.totalSemanas + 2;
    for (let i = 0; i < maxSolicitudes; i++) {
        const r = await ctx.gestor.avanzarManual(config.analisisId);
        if (r.avance.encolados.length === 0) {
            break; // Analisis completo: no quedan semanas pendientes.
        }
        orden.push(...(await drenar(ctx.cola, ctx.ejecutor, ctx.plan)));
    }
    return instantanea(ctx.banco, orden);
}

/**
 * (A) Automatico (Req. 32.3): el gestor encola la PRIMERA semana pendiente y el
 * `ProcesarSemanaProcessor` ENCADENA la siguiente tras REGISTRAR la actual. Aqui
 * se simula ese encadenado secuencial: `avanzar` (encola la siguiente) -> drenar
 * (procesa y completa) -> `avanzar`... hasta que no queden pendientes. Asi nunca
 * hay mas de una semana por institucion en vuelo (orden estricto, sin saltos ni
 * repeticiones), a diferencia del encolado masivo previo.
 */
async function ejecutarAutomatico(config: ConfigAnalisis): Promise<EstadoFinal> {
    const ctx = montar(config);
    await ctx.gestor.seleccionarModo(config.analisisId, "AUTOMATICO");

    const orden: DatosTrabajoSemana[] = [];
    // Cota de seguridad: a lo sumo total*instituciones encadenamientos (mas margen).
    const maxIteraciones =
        config.totalSemanas * config.instituciones.length + 5;
    for (let i = 0; i < maxIteraciones; i++) {
        const r = await ctx.gestor.avanzar(config.analisisId);
        if (r.avance.encolados.length === 0) {
            break; // Analisis completo: no quedan semanas pendientes.
        }
        orden.push(...(await drenar(ctx.cola, ctx.ejecutor, ctx.plan)));
    }
    return instantanea(ctx.banco, orden);
}

/**
 * (T) Tiempo_Real (Req. 32.4, 32.5): `avanzar` procesa una semana y arranca el
 * contador; cada vencimiento del `TemporizadorManual` reutiliza `tick` para
 * encolar la siguiente semana pendiente por institucion, hasta completar.
 */
async function ejecutarTiempoReal(config: ConfigAnalisis): Promise<EstadoFinal> {
    const ctx = montar(config);
    await ctx.gestor.seleccionarModo(config.analisisId, "TIEMPO_REAL", 1000);

    const orden: DatosTrabajoSemana[] = [];
    // Primera semana + arranque del contador del Tiempo_Real.
    await ctx.gestor.avanzar(config.analisisId);
    orden.push(...(await drenar(ctx.cola, ctx.ejecutor, ctx.plan)));

    // Cota de seguridad: a lo sumo total*instituciones vencimientos (mas margen).
    const maxDisparos = config.totalSemanas * config.instituciones.length + 5;
    for (let i = 0; i < maxDisparos; i++) {
        const { estadoEjecucion } = await ctx.almacen.obtener(config.analisisId);
        if (estadoEjecucion === "COMPLETADO") {
            break; // Analisis completo: el contador se cancelo solo.
        }
        await ctx.temporizador.disparar(); // contador -> tick encola la siguiente
        orden.push(...(await drenar(ctx.cola, ctx.ejecutor, ctx.plan)));
    }
    return instantanea(ctx.banco, orden);
}

/** Despacha el recorrido completo segun el `Modo_Ejecucion`. */
function ejecutarEnModo(
    config: ConfigAnalisis,
    modo: ModoEjecucion,
): Promise<EstadoFinal> {
    switch (modo) {
        case "MANUAL":
            return ejecutarManual(config);
        case "AUTOMATICO":
            return ejecutarAutomatico(config);
        case "TIEMPO_REAL":
            return ejecutarTiempoReal(config);
        default:
            throw new Error(`Modo_Ejecucion no soportado: ${String(modo)}`);
    }
}

// ===========================================================================
// Generadores `analisisDeterministaArb` / `modoEjecucionArb` y la propiedad
// ===========================================================================

/**
 * `analisisDeterministaArb`: un `Analisis` con proveedor de semilla fija y dobles
 * deterministas. Mantiene los tamanos acotados (instituciones 1..4, semanas 1..8)
 * para que las 100 iteraciones se ejecuten rapido y de forma sincrona.
 */
const analisisDeterministaArb: fc.Arbitrary<ConfigAnalisis> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(
        fc.constantFrom("i1", "i2", "i3", "i4"),
        { minLength: 1, maxLength: 4 },
    ),
    totalSemanas: fc.integer({ min: 1, max: 8 }),
    semilla: fc.integer({ min: 0, max: 1_000_000 }),
});

/** Los tres `Modo_Ejecucion` cuya equivalencia exige la Property 34. */
const MODOS: readonly ModoEjecucion[] = MODOS_EJECUCION;

/**
 * `modoEjecucionArb` sobre `analisisDeterministaArb`: ademas del `Analisis`
 * determinista, elige un `Modo_Ejecucion` de REFERENCIA aleatorio. La propiedad
 * ejecuta el `Analisis` completo en los tres modos y verifica que el estado final
 * de cada uno coincide con el del modo de referencia: cualquiera que se tome como
 * baseline, los otros dos producen el MISMO estado final (Req. 32.7).
 */
const modoEjecucionArb = fc.record({
    config: analisisDeterministaArb,
    referencia: fc.constantFrom(...MODOS),
});

describe("Property 34: equivalencia de resultado entre los tres modos de ejecucion (Req. 32.7, 32.3, 31.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 34: Equivalencia de resultado entre los tres modos de ejecución
    it("el estado final del Analisis es identico en Manual, Automatico y Tiempo_Real", async () => {
        await fc.assert(
            fc.asyncProperty(modoEjecucionArb, async ({ config, referencia }) => {
                const porModo: Record<ModoEjecucion, EstadoFinal> = {
                    MANUAL: await ejecutarEnModo(config, "MANUAL"),
                    AUTOMATICO: await ejecutarEnModo(config, "AUTOMATICO"),
                    TIEMPO_REAL: await ejecutarEnModo(config, "TIEMPO_REAL"),
                };

                const totalEsperado =
                    config.totalSemanas * config.instituciones.length;

                // Completitud: los tres modos procesan TODAS las semanas del Analisis.
                for (const modo of MODOS) {
                    expect(porModo[modo].resultados).toHaveLength(totalEsperado);
                }

                // EQUIVALENCIA (Req. 32.7): el estado final del Analisis (resultados
                // por semana, Indice_Riesgo/Corpus_Longitudinal acumulado y
                // Memoria_Semantica/embeddings) coincide con el del modo de
                // referencia, sea cual sea el modo elegido como baseline.
                const ref = porModo[referencia];
                for (const modo of MODOS) {
                    expect(porModo[modo].resultados).toEqual(ref.resultados);
                    expect(porModo[modo].embeddings).toEqual(ref.embeddings);
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
