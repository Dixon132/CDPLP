/**
 * PBT - Property 11: Interrupcion reanudable conserva resultados (tarea 16.7).
 *
 * Texto de la propiedad (design.md):
 * "Para todo punto de interrupcion en la semana `K` de un salto temporal, las
 *  semanas `1..K-1` completadas permanecen firmes y consistentes, y la
 *  reanudacion continua exactamente desde la siguiente semana pendiente."
 *
 * La propiedad se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD,
 * sin red), conforme a las restricciones Windows/cmd del plan, reutilizando las
 * piezas REALES del motor de ciclos (tareas 16.1/16.2/16.3):
 *
 *  - `HerramientaAceleracion.avanzarHastaElFinal` (salto temporal) que ENCOLA via
 *    `procesarSemana` en la MISMA `Cola_Trabajos`.
 *  - `EjecutorTrabajoSemana` REAL (idempotencia + cerrojo + estado consultable)
 *    drenando una cola en memoria FIFO.
 *  - `ProcesadorSemana` REAL (UNICO `procesarSemana`) con persistencia ATOMICA
 *    (staging -> commit): un fallo NO deja resultado parcial (Req. 25.5).
 *  - Proveedor con semilla fija + dobles deterministas del `Servicio_IA`/fallback
 *    (con un `Indice_Riesgo` ACUMULATIVO encadenado semana a semana), de modo que
 *    el estado de una semana ya procesada es REPRODUCIBLE y comparable bit a bit
 *    con el de una ejecucion sin interrupcion.
 *  - Relojes/IDs inyectables (`RelojFijo` + `GeneradorIdSecuencial`).
 *
 * Se cubren las DOS causas de interrupcion que exige la propiedad:
 *
 *  (A) **Interrupcion del salto (Req. 18.5)** — el "proceso cae" tras completar un
 *      PREFIJO de las semanas encoladas: la cola en memoria se DESCARTA (volatil)
 *      y solo persisten en el banco/plan (durables) las semanas ya cerradas. Se
 *      verifica que (1) cada semana completada es IDENTICA a la de una ejecucion
 *      sin interrupcion (firme y consistente), (2) las semanas completadas por
 *      institucion son contiguas desde 1, y (3) al reanudar (re-`avanzarHastaElFinal`
 *      sobre el mismo banco/plan) se continua EXACTAMENTE desde la siguiente
 *      semana pendiente, sin reprocesar las firmes, hasta alcanzar el mismo estado
 *      final que la ejecucion sin interrupcion.
 *
 *  (B) **Fallo de escritura a mitad de ciclo (Req. 25.5)** — la transaccion de
 *      almacenamiento de la semana `K` falla varias veces (agota los reintentos
 *      acotados) y deja el trabajo FALLIDO. Por la ATOMICIDAD de `procesarSemana`,
 *      la semana `K` NO deja registro ni embeddings parciales; las semanas
 *      `1..K-1` permanecen firmes. Cuando el subsistema de escritura se recupera,
 *      la reanudacion completa la semana `K` y subsiguientes, alcanzando el mismo
 *      estado final que una ejecucion sin fallo.
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 18.5, 25.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 11: Interrupcion reanudable conserva resultados
import fc from "fast-check";

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
    type MotorAprendizaje,
    type PersistorSemana,
    type ResultadoAnalisisSemana,
    type ResultadoGeneracionSemana,
    type UnidadTrabajoSemana,
} from "../procesarSemana";

import { HerramientaAceleracion } from "./herramienta-aceleracion";
import { PlanAnalisisEnMemoria } from "./adaptadores-programador";
import type { EncoladorSemana } from "./puertos-programador";

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
// "Banco de estado" en memoria: simula el estado DURABLE de la BD del Analisis
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
 * Estado DURABLE de la "BD" del `Analisis`: resultados por semana + embeddings de
 * la `Memoria_Semantica`. Sobrevive a la interrupcion (a diferencia de la cola en
 * memoria, que es volatil). Es el objeto que se compara para comprobar que las
 * semanas ya procesadas permanecen firmes (Req. 18.5) y que la reanudacion
 * alcanza el mismo estado final que una ejecucion sin interrupcion.
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
 * completadas de `(A,I)`. Como ambos recorridos (con y sin interrupcion) procesan
 * las semanas en el MISMO orden creciente y contiguo, ese contexto es identico y
 * la generacion es reproducible (premisa de la Property 11).
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
        const previas = this.banco
            .semanasCompletadasDe(analisisId, institucionId)
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
 * (funcion del contenido) y el ACUMULADO sumando los propios de las semanas
 * previas de `(A,I)` ya persistidas. Este encadenamiento hace que el estado de
 * una semana dependa del ORDEN y la CONTIGUIDAD del procesamiento: si la
 * reanudacion no continuara exactamente desde la siguiente pendiente, el acumulado
 * final diferiria del de la ejecucion sin interrupcion.
 */
class AprendizajeDeterminista implements MotorAprendizaje {
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
            perfiles: [
                `u-${contexto.institucionId}-1`,
                `u-${contexto.institucionId}-2`,
            ],
            scores: { [`u-${contexto.institucionId}-1`]: propio },
        };
    }
}

// ===========================================================================
// Almacenamiento transaccional atomico (staging -> commit) hacia el BancoEstado
// ===========================================================================

/** Cambios en preparacion (staging) que solo se confirman al hacer commit. */
class StagingTx {
    resultados: RegistroSemana[] = [];
    embeddings: VectorMemoria[] = [];
}

/**
 * `EjecutorTransaccional` doble (commit limpio): aplica las escrituras a un
 * `StagingTx` y solo las vuelca al `BancoEstado` real si el trabajo termina sin
 * lanzar (commit). Replica la atomicidad de `procesarSemana`.
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

/**
 * `EjecutorTransaccional` doble que FALLA la escritura a mitad de ciclo (Req.
 * 25.5): tras preparar el `StagingTx` (el trabajo ya "escribio" en memoria de la
 * transaccion), si la clave `(A,I,N)` tiene fallos pendientes, LANZA antes de
 * confirmar -> ROLLBACK total (no se vuelca nada al banco). Demuestra que un fallo
 * a mitad de la transaccion no deja registro ni embeddings parciales. Al agotarse
 * los fallos, confirma normalmente (subsistema de escritura recuperado).
 */
function crearEjecutorTransaccionalConFallo(
    banco: BancoEstado,
    fallos: Map<string, number>,
) {
    return async <R>(trabajo: (tx: StagingTx) => Promise<R>): Promise<R> => {
        const staging = new StagingTx();
        const r = await trabajo(staging);
        const clave = staging.resultados[0]?.clave;
        if (clave) {
            const restantes = fallos.get(clave) ?? 0;
            if (restantes > 0) {
                fallos.set(clave, restantes - 1);
                // Fallo a mitad del commit: la transaccion se revierte por
                // completo, el banco no recibe ningun cambio (atomicidad).
                throw new Error(`fallo de escritura a mitad de ciclo en ${clave}`);
            }
        }
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
            ...(unidad.proveedor !== undefined
                ? { proveedor: unidad.proveedor }
                : {}),
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

/** Ensambla un `ProcesadorSemana` determinista con el ejecutor transaccional dado. */
function crearProcesadorCon(
    banco: BancoEstado,
    semilla: number,
    ejecutarTransaccion: ReturnType<typeof crearEjecutorTransaccional>,
): ProcesadorSemana<StagingTx> {
    const deps: DependenciasProcesarSemana<StagingTx> = {
        generador: new GeneradorDeterminista(banco, semilla),
        validador: new ValidadorContratoZod(() => {
            /* registrador silencioso en pruebas */
        }),
        analizador: new AnalizadorDeterminista(),
        aprendizaje: new AprendizajeDeterminista(banco),
        ejecutarTransaccion,
        persistirResultado: crearPersistor(),
        memoriaTransaccional: crearMemoriaTransaccional(),
    };
    return new ProcesadorSemana<StagingTx>(deps);
}

/** Procesador con commit limpio (sin fallos de escritura). */
function crearProcesador(banco: BancoEstado, semilla: number): ProcesadorSemana<StagingTx> {
    return crearProcesadorCon(banco, semilla, crearEjecutorTransaccional(banco));
}

// ===========================================================================
// Cola en memoria (volatil) + ejecutor real
// ===========================================================================

/**
 * `EncoladorSemana` en memoria: acumula los trabajos `(A,I,N)` preservando el
 * orden de encolado. Deduplica por `jobId` determinista entre los pendientes
 * (idempotencia de encolado), igual que BullMQ con `jobId` fijo. Es VOLATIL: al
 * interrumpir un salto, se descarta (modela la perdida de la cola por caida).
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

/** Puerto de idempotencia respaldado por el `BancoEstado` durable. */
class ConsultaSobreBanco implements ConsultaResultadoSemana {
    constructor(private readonly banco: BancoEstado) { }
    async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
        return this.banco.yaProcesada(datos);
    }
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
// Drenados: completo, por PREFIJO (interrupcion) y con reintentos acotados
// ===========================================================================

/**
 * Drena la cola FIFO ejecutando cada trabajo con el `EjecutorTrabajoSemana` real.
 * Tras COMPLETAR una semana, fija la ultima completada en el `plan` para que el
 * siguiente disparo encole la siguiente pendiente. Devuelve las semanas
 * completadas EN ORDEN.
 */
async function drenarCompleto(
    cola: ColaEnMemoria,
    ejecutor: EjecutorTrabajoSemana,
    plan: PlanAnalisisEnMemoria,
): Promise<DatosTrabajoSemana[]> {
    const completados: DatosTrabajoSemana[] = [];
    while (cola.pendientes.length > 0) {
        const datos = cola.pendientes.shift()!;
        const contexto: ContextoIntento = { intento: 1, maxIntentos: MAX_INTENTOS };
        const r = await ejecutor.ejecutar(datos, contexto);
        if (r.estado === EstadoTrabajo.COMPLETADO && !r.omitido) {
            plan.fijarCompletadas(
                datos.analisisId,
                datos.institucionId,
                datos.numeroSemana,
            );
            completados.push(datos);
        }
    }
    return completados;
}

/**
 * Drena la cola FIFO pero se INTERRUMPE tras completar `limite` semanas (modela la
 * caida del proceso a mitad del salto). Devuelve las semanas efectivamente
 * completadas antes de la interrupcion. La cola restante se descarta por el
 * llamador (cola volatil).
 */
async function drenarPrefijo(
    cola: ColaEnMemoria,
    ejecutor: EjecutorTrabajoSemana,
    plan: PlanAnalisisEnMemoria,
    limite: number,
): Promise<DatosTrabajoSemana[]> {
    const completados: DatosTrabajoSemana[] = [];
    while (cola.pendientes.length > 0 && completados.length < limite) {
        const datos = cola.pendientes.shift()!;
        const contexto: ContextoIntento = { intento: 1, maxIntentos: MAX_INTENTOS };
        const r = await ejecutor.ejecutar(datos, contexto);
        if (r.estado === EstadoTrabajo.COMPLETADO && !r.omitido) {
            plan.fijarCompletadas(
                datos.analisisId,
                datos.institucionId,
                datos.numeroSemana,
            );
            completados.push(datos);
        }
    }
    return completados;
}

/** Resultado de drenar con reintentos: semanas completadas y la que fallo (si la hubo). */
interface ResultadoDrenadoConReintentos {
    completados: DatosTrabajoSemana[];
    /** Semana que agoto sus reintentos (FALLIDO) e interrumpio el salto, si la hubo. */
    fallido?: DatosTrabajoSemana;
}

/**
 * Drena la cola FIFO simulando el ciclo de reintentos acotados de BullMQ (mismo
 * `jobId`): cada trabajo se intenta hasta `MAX_INTENTOS`. Si una semana agota los
 * reintentos sin completarse, queda FALLIDO y el salto se INTERRUMPE (se descarta
 * el resto de la cola). Es el escenario de fallo de escritura a mitad de ciclo
 * (Req. 25.5).
 */
async function drenarConReintentos(
    cola: ColaEnMemoria,
    ejecutor: EjecutorTrabajoSemana,
    plan: PlanAnalisisEnMemoria,
): Promise<ResultadoDrenadoConReintentos> {
    const completados: DatosTrabajoSemana[] = [];
    while (cola.pendientes.length > 0) {
        const datos = cola.pendientes.shift()!;
        let completado = false;
        for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
            const contexto: ContextoIntento = { intento, maxIntentos: MAX_INTENTOS };
            try {
                const r = await ejecutor.ejecutar(datos, contexto);
                if (r.estado === EstadoTrabajo.COMPLETADO) {
                    completado = !r.omitido;
                    break;
                }
            } catch {
                // Fallo transitorio: BullMQ reintentaria con el mismo jobId.
            }
        }
        if (completado) {
            plan.fijarCompletadas(
                datos.analisisId,
                datos.institucionId,
                datos.numeroSemana,
            );
            completados.push(datos);
        } else {
            // FALLIDO terminal: la escritura no se recupero dentro de los
            // reintentos acotados -> el salto se interrumpe en esta semana.
            return { completados, fallido: datos };
        }
    }
    return { completados };
}

// ===========================================================================
// Instantanea canonica del estado durable
// ===========================================================================

interface EstadoFinal {
    /** Resultados por semana, ORDENADOS por clave `(A,I,N)`. */
    resultados: RegistroSemana[];
    /** Embeddings de la `Memoria_Semantica`, ORDENADOS por `refId`. */
    embeddings: VectorMemoria[];
}

function instantanea(banco: BancoEstado): EstadoFinal {
    const resultados = [...banco.resultados.values()].sort((a, b) =>
        a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0,
    );
    const embeddings = [...banco.embeddings].sort((a, b) =>
        a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0,
    );
    return { resultados, embeddings };
}

interface ConfigAnalisis {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
    semilla: number;
}

function planDe(config: ConfigAnalisis): PlanAnalisisEnMemoria {
    const plan = new PlanAnalisisEnMemoria();
    plan.registrar(config.analisisId, {
        instituciones: [...config.instituciones],
        totalSemanas: config.totalSemanas,
    });
    return plan;
}

/** Ejecucion de REFERENCIA sin interrupcion: encola todo y drena por completo. */
async function ejecutarSinInterrupcion(config: ConfigAnalisis): Promise<EstadoFinal> {
    const banco = new BancoEstado();
    const procesador = crearProcesador(banco, config.semilla);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();
    const plan = planDe(config);

    const herramienta = new HerramientaAceleracion({ plan, encolador: cola });
    await herramienta.avanzarHastaElFinal(config.analisisId);
    await drenarCompleto(cola, ejecutor, plan);

    return instantanea(banco);
}

// ===========================================================================
// Generador `analisisDeterministaArb`
// ===========================================================================

const analisisDeterministaArb: fc.Arbitrary<ConfigAnalisis> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4"), {
        minLength: 1,
        maxLength: 4,
    }),
    totalSemanas: fc.integer({ min: 1, max: 8 }),
    semilla: fc.integer({ min: 0, max: 1_000_000 }),
});

/** Mapa `clave -> RegistroSemana` para comparar firmeza semana a semana. */
function mapaPorClave(estado: EstadoFinal): Map<string, RegistroSemana> {
    return new Map(estado.resultados.map((r) => [r.clave, r]));
}

/** Semanas completadas de `(A,I)` en una lista de coordenadas, ascendentes. */
function semanasDe(
    completados: DatosTrabajoSemana[],
    institucionId: string,
): number[] {
    return completados
        .filter((d) => d.institucionId === institucionId)
        .map((d) => d.numeroSemana)
        .sort((a, b) => a - b);
}

// ===========================================================================
// Propiedad
// ===========================================================================

describe("Property 11: interrupcion reanudable conserva resultados (Req. 18.5, 25.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 11: Interrupcion reanudable conserva resultados
    it("(A) un salto interrumpido conserva firmes las semanas ya procesadas y reanuda desde la siguiente pendiente hasta el mismo estado final (Req. 18.5)", async () => {
        await fc.assert(
            fc.asyncProperty(
                analisisDeterministaArb,
                fc.nat({ max: 40 }),
                async (config, puntoInterrupcionRaw) => {
                    const totalTrabajos =
                        config.totalSemanas * config.instituciones.length;
                    // Punto de interrupcion: cuantas semanas se completan antes de
                    // "caer". Cubre los bordes 0 (nada procesado) y total (todo).
                    const limite = Math.min(puntoInterrupcionRaw, totalTrabajos);

                    // Referencia: el mismo Analisis SIN interrupcion.
                    const referencia = await ejecutarSinInterrupcion(config);
                    const refPorClave = mapaPorClave(referencia);

                    // --- Fase 1: salto que se INTERRUMPE tras `limite` semanas ---
                    const banco = new BancoEstado();
                    const procesador = crearProcesador(banco, config.semilla);
                    const ejecutor = crearEjecutorTrabajo(banco, procesador);
                    const plan = planDe(config);

                    const colaVolatil = new ColaEnMemoria();
                    const herramienta1 = new HerramientaAceleracion({
                        plan,
                        encolador: colaVolatil,
                    });
                    await herramienta1.avanzarHastaElFinal(config.analisisId);
                    const completadosFase1 = await drenarPrefijo(
                        colaVolatil,
                        ejecutor,
                        plan,
                        limite,
                    );
                    // La cola en memoria se DESCARTA aqui (caida del proceso): solo
                    // el `banco` y el `plan` (durables) sobreviven.

                    const interrumpido = instantanea(banco);

                    // (1) FIRMEZA Y CONSISTENCIA (Req. 18.5): cada semana ya
                    //     completada es IDENTICA a la de la ejecucion sin
                    //     interrupcion (sin escrituras parciales ni corrupcion).
                    expect(interrumpido.resultados).toHaveLength(completadosFase1.length);
                    for (const reg of interrumpido.resultados) {
                        expect(reg).toEqual(refPorClave.get(reg.clave));
                    }
                    // Los embeddings persistidos son un subconjunto EXACTO de los de
                    // la referencia (atomicidad: o se persiste la semana entera o
                    // nada). Cada embedding firme existe identico en la referencia.
                    const refEmbPorRef = new Map(
                        referencia.embeddings.map((e) => [e.refId, e]),
                    );
                    for (const emb of interrumpido.embeddings) {
                        expect(refEmbPorRef.get(emb.refId)).toEqual(emb);
                    }

                    // (2) CONTIGUIDAD DESDE 1 por institucion en lo ya procesado.
                    for (const inst of config.instituciones) {
                        const semanas = banco.semanasCompletadasDe(
                            config.analisisId,
                            inst,
                        );
                        const esperado = Array.from(
                            { length: semanas.length },
                            (_, k) => k + 1,
                        );
                        expect(semanas).toEqual(esperado);
                    }

                    // --- Fase 2: REANUDACION sobre el mismo banco/plan durables ---
                    const colaReanudada = new ColaEnMemoria();
                    const herramienta2 = new HerramientaAceleracion({
                        plan,
                        encolador: colaReanudada,
                    });
                    await herramienta2.avanzarHastaElFinal(config.analisisId);
                    const completadosFase2 = await drenarCompleto(
                        colaReanudada,
                        ejecutor,
                        plan,
                    );

                    // (3) CONTINUA DESDE LA SIGUIENTE PENDIENTE: la reanudacion NO
                    //     reprocesa ninguna semana ya firme, y para cada institucion
                    //     arranca exactamente en (ultima completada en fase 1 + 1).
                    const clavesFase1 = new Set(completadosFase1.map(claveTrabajo));
                    for (const datos of completadosFase2) {
                        expect(clavesFase1.has(claveTrabajo(datos))).toBe(false);
                    }
                    for (const inst of config.instituciones) {
                        const yaHechas = semanasDe(completadosFase1, inst).length;
                        const reanudadas = semanasDe(completadosFase2, inst);
                        if (reanudadas.length > 0) {
                            expect(reanudadas[0]).toBe(yaHechas + 1);
                        }
                    }
                    // Entre ambas fases se procesan TODAS las semanas, exactamente
                    // una vez cada una.
                    expect(
                        completadosFase1.length + completadosFase2.length,
                    ).toBe(totalTrabajos);

                    // (4) EQUIVALENCIA FINAL (Req. 18.5): el estado final tras la
                    //     interrupcion + reanudacion es IDENTICO al de la ejecucion
                    //     sin interrupcion.
                    const final = instantanea(banco);
                    expect(final.resultados).toEqual(referencia.resultados);
                    expect(final.embeddings).toEqual(referencia.embeddings);
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });

    it("(B) un fallo de escritura a mitad de ciclo no deja resultados parciales y la reanudacion completa el Analisis tras recuperarse (Req. 25.5)", async () => {
        // Una sola institucion: el punto de fallo en la semana K queda bien
        // definido sobre una secuencia lineal 1..total (el aislamiento entre
        // instituciones lo cubre la Property 13).
        const configFalloArb = fc.record({
            analisisId: fc.constantFrom("an-1", "an-2"),
            institucion: fc.constantFrom("i1", "i2"),
            totalSemanas: fc.integer({ min: 1, max: 8 }),
            semilla: fc.integer({ min: 0, max: 1_000_000 }),
            // Semana K (1-indexada) cuya escritura falla a mitad de ciclo.
            semanaFalloRaw: fc.integer({ min: 1, max: 8 }),
        });

        await fc.assert(
            fc.asyncProperty(configFalloArb, async (caso) => {
                const config: ConfigAnalisis = {
                    analisisId: caso.analisisId,
                    instituciones: [caso.institucion],
                    totalSemanas: caso.totalSemanas,
                    semilla: caso.semilla,
                };
                const semanaFallo = Math.min(caso.semanaFalloRaw, caso.totalSemanas);
                const datosFallo: DatosTrabajoSemana = {
                    analisisId: caso.analisisId,
                    institucionId: caso.institucion,
                    numeroSemana: semanaFallo,
                };
                const claveFallo = claveTrabajo(datosFallo);

                const referencia = await ejecutarSinInterrupcion(config);
                const refPorClave = mapaPorClave(referencia);

                // --- Fase 1: la escritura de la semana K falla persistentemente ---
                // `MAX_INTENTOS` fallos == agota todos los reintentos -> FALLIDO.
                const banco = new BancoEstado();
                const fallos = new Map<string, number>([[claveFallo, MAX_INTENTOS]]);
                const procesador = crearProcesadorCon(
                    banco,
                    config.semilla,
                    crearEjecutorTransaccionalConFallo(banco, fallos),
                );
                const ejecutor = crearEjecutorTrabajo(banco, procesador);
                const plan = planDe(config);

                const cola1 = new ColaEnMemoria();
                const herramienta1 = new HerramientaAceleracion({
                    plan,
                    encolador: cola1,
                });
                await herramienta1.avanzarHastaElFinal(config.analisisId);
                const drenado = await drenarConReintentos(cola1, ejecutor, plan);

                // El salto se interrumpio EXACTAMENTE en la semana K.
                expect(drenado.fallido).toEqual(datosFallo);

                // (1) ATOMICIDAD (Req. 25.5): la semana K NO dejo registro ni
                //     embeddings parciales pese a fallar a mitad del commit.
                expect(banco.resultados.has(claveFallo)).toBe(false);
                const refResultadoK = refPorClave.get(claveFallo)!;
                expect(
                    banco.embeddings.some((e) => e.refId === refResultadoK.resultadoId),
                ).toBe(false);

                // (2) FIRMEZA de las semanas 1..K-1: identicas a la referencia y
                //     contiguas desde 1.
                const completadasFase1 = banco.semanasCompletadasDe(
                    caso.analisisId,
                    caso.institucion,
                );
                expect(completadasFase1).toEqual(
                    Array.from({ length: semanaFallo - 1 }, (_, k) => k + 1),
                );
                for (const reg of banco.resultados.values()) {
                    expect(reg).toEqual(refPorClave.get(reg.clave));
                }

                // --- Fase 2: el subsistema de escritura se RECUPERA y se reanuda ---
                // Mismo banco/plan durables; ejecutor sin fallos de escritura.
                fallos.clear();
                const procesadorOk = crearProcesador(banco, config.semilla);
                const ejecutorOk = crearEjecutorTrabajo(banco, procesadorOk);
                const cola2 = new ColaEnMemoria();
                const herramienta2 = new HerramientaAceleracion({
                    plan,
                    encolador: cola2,
                });
                await herramienta2.avanzarHastaElFinal(config.analisisId);
                const completadosFase2 = await drenarCompleto(cola2, ejecutorOk, plan);

                // (3) Reanuda desde la semana K (la primera pendiente).
                const semanasFase2 = semanasDe(completadosFase2, caso.institucion);
                expect(semanasFase2[0]).toBe(semanaFallo);

                // (4) EQUIVALENCIA FINAL: tras recuperarse, el estado es identico al
                //     de una ejecucion sin fallo.
                const final = instantanea(banco);
                expect(final.resultados).toEqual(referencia.resultados);
                expect(final.embeddings).toEqual(referencia.embeddings);
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
