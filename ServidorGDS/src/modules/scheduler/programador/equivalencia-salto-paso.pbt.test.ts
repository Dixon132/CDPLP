/**
 * PBT - Property 9: Equivalencia entre salto temporal y procesamiento paso a paso
 * (tarea 16.5).
 *
 * Texto de la propiedad (design.md):
 * "Para todo `Analisis` con un proveedor de generacion determinista (semilla
 *  fija) y un `Servicio_IA`/fallback determinista, el estado final obtenido tras
 *  un salto temporal de `K` semanas es identico al estado final obtenido
 *  procesando esas mismas `K` semanas una a una en tiempo real."
 *
 * Esta propiedad es de implementacion OBLIGATORIA (Req. 26.3). Se verifica de
 * forma SINCRONA y DETERMINISTA (sin Redis, sin BD, sin red), conforme a las
 * restricciones Windows/cmd del plan:
 *
 *  - **Proveedor con semilla fija**: `GeneradorDeterminista` produce el
 *    `Contrato_Normalizado` de cada `(Analisis, Institucion, Semana)` de forma
 *    reproducible a partir de una semilla, e incorpora el contexto longitudinal
 *    acumulado (las semanas ya completadas de ese `(A,I)`), de modo que el
 *    contenido de la semana N depende del historial previo.
 *  - **`Servicio_IA`/fallback dobles deterministas**: `AnalizadorDeterminista` y
 *    `AprendizajeDeterminista` derivan el resultado del pipeline y el aprendizaje
 *    (incluido un `Indice_Riesgo` ACUMULATIVO encadenado semana a semana) de
 *    forma reproducible y dependiente del orden de procesamiento.
 *  - **Relojes e IDs inyectables**: `RelojFijo` + `GeneradorIdSecuencial` en el
 *    registro de estado de la cola; los `resultadoId`/`refId` son deterministas
 *    por coordenada `(A,I,N)`.
 *  - **Cola en memoria de ejecucion inmediata**: un `EncoladorSemana` doble
 *    acumula los trabajos `(A,I,N)` y un "drenado" FIFO los ejecuta con el
 *    `EjecutorTrabajoSemana` real (idempotencia + cerrojo + estado consultable).
 *
 * Se comparan DOS recorridos sobre la MISMA configuracion (mismo `Analisis`,
 * mismas instituciones, mismo total de semanas y misma semilla):
 *
 *   (A) **Salto temporal** — `HerramientaAceleracion.avanzarHastaElFinal`: encola
 *       de una sola vez TODAS las `Semana_Simulada` pendientes en orden creciente
 *       y se drenan (Req. 18.2, 18.3).
 *   (B) **Paso a paso (tiempo real simulado)** — `ProgramadorTemporal.tick`: por
 *       cada vencimiento del intervalo encola y procesa UNA semana pendiente por
 *       institucion, repitiendo hasta agotar el `Analisis` (Req. 18.1).
 *
 * Ambos reutilizan el UNICO `procesarSemana` (tarea 16.1) por la MISMA cola, sin
 * ruta alternativa por modo. La propiedad exige que el estado final de la "BD"
 * (resultados por semana + `Indice_Riesgo` acumulado + `Memoria_Semantica`/
 * embeddings) sea IDENTICO entre (A) y (B) (Req. 18.4).
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 18.1, 18.3, 18.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 9: Equivalencia entre salto temporal y procesamiento paso a paso
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
    type PersistorSemana,
    type ResultadoAnalisisSemana,
    type ResultadoGeneracionSemana,
    type UnidadTrabajoSemana,
} from "../procesarSemana";

import { HerramientaAceleracion } from "./herramienta-aceleracion";
import { ProgramadorTemporal } from "./programador-temporal";
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
 * la `Memoria_Semantica`. Es el objeto que se compara entre el salto temporal y
 * el procesamiento paso a paso (deben coincidir, Req. 18.4).
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
 * completadas de `(A,I)` (historial acumulado). Como ambos modos procesan las
 * semanas en el MISMO orden creciente y contiguo, ese contexto es identico, por
 * lo que la generacion es reproducible entre modos (premisa de la Property 9).
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
 * estado final dependa del ORDEN y la CONTIGUIDAD del procesamiento: si el salto
 * y el paso a paso no fueran equivalentes, el acumulado final diferiria.
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
 * disparo encole la siguiente pendiente. Devuelve los numeros de semana en el
 * ORDEN en que se completaron (para verificar la secuencia creciente).
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
// Recorridos: (A) salto temporal y (B) paso a paso (tiempo real simulado)
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

/** (A) Salto temporal: encola TODAS las semanas pendientes de golpe y drena. */
async function ejecutarSaltoTemporal(config: ConfigAnalisis): Promise<EstadoFinal> {
    const banco = new BancoEstado();
    const procesador = crearProcesador(banco, config.semilla);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();
    const plan = planDe(config);

    const herramienta = new HerramientaAceleracion({ plan, encolador: cola });
    await herramienta.avanzarHastaElFinal(config.analisisId);

    const orden = await drenar(cola, ejecutor, plan);
    return instantanea(banco, orden);
}

/**
 * (B) Paso a paso (tiempo real simulado): por cada vencimiento del intervalo el
 * `ProgramadorTemporal.tick` encola la siguiente semana pendiente por institucion
 * y se procesa; se repite hasta que el `Analisis` queda completo.
 */
async function ejecutarPasoAPaso(config: ConfigAnalisis): Promise<EstadoFinal> {
    const banco = new BancoEstado();
    const procesador = crearProcesador(banco, config.semilla);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();
    const plan = planDe(config);

    const programador = new ProgramadorTemporal({ plan, encolador: cola });

    const ordenTotal: DatosTrabajoSemana[] = [];
    // Cota de seguridad: a lo sumo total*instituciones ticks (mas un margen).
    const maxTicks = config.totalSemanas * config.instituciones.length + 2;
    for (let i = 0; i < maxTicks; i++) {
        const avance = await programador.tick(config.analisisId);
        if (avance.encolados.length === 0) {
            break; // Analisis completo: no quedan semanas pendientes.
        }
        const orden = await drenar(cola, ejecutor, plan);
        ordenTotal.push(...orden);
    }
    return instantanea(banco, ordenTotal);
}

// ===========================================================================
// Generador `analisisDeterministaArb` y la propiedad
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

describe("Property 9: equivalencia entre salto temporal y procesamiento paso a paso (Req. 18.1, 18.3, 18.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 9: Equivalencia entre salto temporal y procesamiento paso a paso
    it("el estado final tras un salto temporal es identico al de procesar las mismas semanas una a una", async () => {
        await fc.assert(
            fc.asyncProperty(analisisDeterministaArb, async (config) => {
                const salto = await ejecutarSaltoTemporal(config);
                const pasoApaso = await ejecutarPasoApasoSeguro(config);

                const totalEsperado =
                    config.totalSemanas * config.instituciones.length;

                // Completitud: ambos modos procesan TODAS las semanas del Analisis.
                expect(salto.resultados).toHaveLength(totalEsperado);
                expect(pasoApaso.resultados).toHaveLength(totalEsperado);

                // Orden estrictamente creciente y contiguo por institucion en AMBOS
                // modos (Req. 18.3): la secuencia de semanas completadas de cada
                // (A,I) es 1, 2, ..., totalSemanas.
                for (const inst of config.instituciones) {
                    const prefijo = `${config.analisisId}::${inst}::`;
                    const semanasSalto = salto.ordenProcesado
                        .filter((c) => c.startsWith(prefijo))
                        .map((c) => Number(c.slice(prefijo.length)));
                    const semanasPaso = pasoApaso.ordenProcesado
                        .filter((c) => c.startsWith(prefijo))
                        .map((c) => Number(c.slice(prefijo.length)));
                    const esperado = Array.from(
                        { length: config.totalSemanas },
                        (_, k) => k + 1,
                    );
                    expect(semanasSalto).toEqual(esperado);
                    expect(semanasPaso).toEqual(esperado);
                }

                // EQUIVALENCIA (Req. 18.4): estado final identico (resultados por
                // semana, Indice_Riesgo acumulado y Memoria_Semantica/embeddings).
                expect(pasoApaso.resultados).toEqual(salto.resultados);
                expect(pasoApaso.embeddings).toEqual(salto.embeddings);
            }),
            { numRuns: NUM_RUNS },
        );
    });

    it("el salto es idempotente: re-aplicarlo tras completar el Analisis no cambia el estado final", async () => {
        await fc.assert(
            fc.asyncProperty(analisisDeterministaArb, async (config) => {
                // Recorrido de referencia (salto unico).
                const referencia = await ejecutarSaltoTemporal(config);

                // Recorrido equivalente reutilizando el mismo banco/plan y aplicando
                // el salto DOS veces: el segundo salto no debe reprocesar ni alterar
                // el estado (idempotencia del encolado + de procesarSemana).
                const banco = new BancoEstado();
                const procesador = crearProcesador(banco, config.semilla);
                const ejecutor = crearEjecutorTrabajo(banco, procesador);
                const cola = new ColaEnMemoria();
                const plan = planDe(config);
                const herramienta = new HerramientaAceleracion({ plan, encolador: cola });

                await herramienta.avanzarHastaElFinal(config.analisisId);
                await drenar(cola, ejecutor, plan);
                // Segundo salto: ya no quedan semanas pendientes -> no encola nada.
                const segundo = await herramienta.avanzarHastaElFinal(config.analisisId);
                expect(segundo.encolados).toHaveLength(0);
                await drenar(cola, ejecutor, plan);

                const final = instantanea(banco, []);
                expect(final.resultados).toEqual(referencia.resultados);
                expect(final.embeddings).toEqual(referencia.embeddings);
            }),
            { numRuns: NUM_RUNS },
        );
    });
});

/**
 * Variante del paso a paso con una salvaguarda: si por cualquier motivo el `tick`
 * dejara de avanzar antes de completar, se detiene en la cota. Aisla el bucle de
 * la propiedad principal para mantenerla legible.
 */
async function ejecutarPasoApasoSeguro(config: ConfigAnalisis): Promise<EstadoFinal> {
    return ejecutarPasoAPaso(config);
}
