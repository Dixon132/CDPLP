/**
 * PBT - Property 10: Secuencia de semanas estrictamente creciente y contigua
 * (tarea 16.6).
 *
 * Texto de la propiedad (design.md):
 * "Para toda secuencia de avances de un `Analisis`, las semanas completadas por
 *  institucion forman una secuencia contigua y estrictamente creciente que
 *  comienza en 1 (sin huecos ni omisiones), y cada ciclo ejecuta sus fases en el
 *  orden generacion -> analisis -> aprendizaje -> almacenamiento antes de
 *  habilitar la semana siguiente."
 *
 * La propiedad se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD,
 * sin red), conforme a las restricciones Windows/cmd del plan, reutilizando las
 * piezas REALES del motor de ciclos (tareas 16.1/16.2/16.3):
 *
 *  - `HerramientaAceleracion` y `ProgramadorTemporal` (disparadores) que ENCOLAN
 *    via `planificarAvance` (planificador PURO) en la MISMA `Cola_Trabajos`.
 *  - `EjecutorTrabajoSemana` REAL (idempotencia + cerrojo + estado consultable)
 *    drenando una cola en memoria FIFO.
 *  - `ProcesadorSemana` REAL (UNICO `procesarSemana`), cuyas fases
 *    (genera -> valida -> analiza -> aprende -> almacena) se instrumentan con
 *    dobles deterministas que registran el ORDEN real de ejecucion por `(A,I,N)`.
 *
 * Para ejercitar "toda secuencia de avances" se aplica una lista aleatoria de
 * acciones de avance (una semana / un mes / hasta el final) y, tras cada una, se
 * drena la cola. Sobre el estado final se verifican los tres invariantes:
 *
 *   1. **Contiguidad desde 1 (Req. 12.4):** por institucion, las semanas
 *      completadas son exactamente `[1, 2, ..., k]` (sin huecos ni omisiones), y
 *      ninguna supera `totalSemanas`.
 *   2. **Orden de fases por ciclo (Req. 12.3):** cada `(A,I,N)` completada ejecuta
 *      sus fases en el orden genera -> analiza -> aprende -> almacena.
 *   3. **Una sola semana por ciclo + habilitacion en orden (Req. 12.2, 12.3):**
 *      el almacenamiento de la semana `N` precede a la generacion de la `N+1` de
 *      la misma institucion (la N+1 no se "habilita" antes de cerrar la N), y se
 *      produce exactamente una generacion por semana completada.
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 12.2, 12.3, 12.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 10: Secuencia de semanas estrictamente creciente y contigua
import fc from "fast-check";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoZod } from "../../contracts/validadorContrato";
import type { MemoriaSemantica } from "../../ai-engine/memoriaSemantica";
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
// Registro del ORDEN real de ejecucion de las fases por `(A,I,N)`
// ===========================================================================

/** Fases del ciclo, en el orden canonico que exige la Property 10 (Req. 12.3). */
type Fase = "genera" | "analiza" | "aprende" | "almacena";
const ORDEN_FASES: readonly Fase[] = ["genera", "analiza", "aprende", "almacena"];

/** Evento de ejecucion de una fase, con un orden global monotono (trazable). */
interface EventoFase {
    fase: Fase;
    clave: string;
    orden: number;
}

/**
 * Bitacora global y monotona de fases: cada doble instrumentado registra aqui el
 * instante (orden incremental) en que ejecuta su fase para una `(A,I,N)`. Permite
 * verificar empiricamente el orden genera -> analiza -> aprende -> almacena y que
 * la semana `N+1` no se habilita antes de cerrar la `N`.
 */
class BitacoraFases {
    readonly eventos: EventoFase[] = [];
    private contador = 0;

    registrar(fase: Fase, datos: DatosTrabajoSemana): void {
        this.eventos.push({ fase, clave: claveTrabajo(datos), orden: this.contador++ });
    }

    /** Orden global del evento `fase` para `clave`, o `-1` si no ocurrio. */
    ordenDe(clave: string, fase: Fase): number {
        const ev = this.eventos.find((e) => e.clave === clave && e.fase === fase);
        return ev ? ev.orden : -1;
    }

    /** Cantidad de eventos `fase` registrados para `clave`. */
    contar(clave: string, fase: Fase): number {
        return this.eventos.filter((e) => e.clave === clave && e.fase === fase).length;
    }
}

// ===========================================================================
// Banco de estado en memoria (resultados persistidos por semana)
// ===========================================================================

/** Vista persistida minima de una `Semana_Simulada` completada. */
interface RegistroSemana {
    clave: string;
    analisisId: string;
    institucionId: string;
    numeroSemana: number;
    resultadoId: string;
}

class BancoEstado {
    readonly resultados = new Map<string, RegistroSemana>();

    yaProcesada(datos: DatosTrabajoSemana): boolean {
        return this.resultados.has(claveTrabajo(datos));
    }
}

/** `comunidadId` estable por institucion (1 comunidad por institucion en el test). */
function comunidadDe(institucionId: string): string {
    return `com-${institucionId}`;
}

/** `resultadoId` determinista por coordenada `(A,I,N)` (IDs inyectables). */
function resultadoIdDe(datos: DatosTrabajoSemana): string {
    return `res:${datos.analisisId}:${datos.institucionId}:${datos.numeroSemana}`;
}

// ===========================================================================
// Dobles deterministas e INSTRUMENTADOS de las fases de `procesarSemana`
// ===========================================================================

/**
 * GENERA: produce un `Contrato_Normalizado` valido y embebe las coordenadas
 * `(A,I)` en `metadata` (campos passthrough) para que las fases posteriores
 * atribuyan su evento a la `(A,I,N)` correcta. Registra la fase `genera`.
 */
class GeneradorInstrumentado implements GeneradorSemana {
    constructor(private readonly bitacora: BitacoraFases) { }

    async generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana> {
        this.bitacora.registrar("genera", { analisisId, institucionId, numeroSemana });

        const contrato = {
            post: { autorId: `u-${institucionId}-1`, texto: "examenes otra vez" },
            comments: [
                { autorId: `u-${institucionId}-2`, texto: "el paro sigue", enRespuestaA: null },
            ],
            image_description: "aula con estudiantes",
            hashtags: ["#u", "#comunidad"],
            metadata: {
                version: CONTRATO_VERSION,
                fuente: "doble-instrumentado",
                generadoEn: "2024-01-01T00:00:00.000Z",
                semana: numeroSemana,
                idioma: "es-BO",
                // Coordenadas embebidas (passthrough) para trazar la fase.
                analisisId,
                institucionId,
            },
        } as ContratoNormalizado;

        return {
            contrato,
            comunidadId: comunidadDe(institucionId),
            proveedor: "doble-instrumentado",
        };
    }
}

/** Lee las coordenadas embebidas en `metadata` por el generador. */
function coordenadasDe(contrato: ContratoNormalizado): DatosTrabajoSemana {
    const meta = contrato.metadata as Record<string, unknown>;
    return {
        analisisId: String(meta.analisisId),
        institucionId: String(meta.institucionId),
        numeroSemana: Number(meta.semana),
    };
}

/** ANALIZA: atraviesa todas las etapas y registra la fase `analiza`. */
class AnalizadorInstrumentado implements AnalizadorSemana {
    constructor(private readonly bitacora: BitacoraFases) { }

    async analizar(
        contrato: ContratoNormalizado,
        _estado?: EstadoPipeline,
    ): Promise<ResultadoAnalisisSemana> {
        this.bitacora.registrar("analiza", coordenadasDe(contrato));
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

/** APRENDE: computacion pura instrumentada; registra la fase `aprende`. */
class AprendizajeInstrumentado implements MotorAprendizaje {
    constructor(private readonly bitacora: BitacoraFases) { }

    async aprender(entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje> {
        const { contexto } = entrada;
        this.bitacora.registrar("aprende", {
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
        });
        return {};
    }
}

// --- Almacenamiento transaccional atomico (staging -> commit) --------------

class StagingTx {
    resultados: RegistroSemana[] = [];
}

function crearEjecutorTransaccional(banco: BancoEstado) {
    return async <R>(trabajo: (tx: StagingTx) => Promise<R>): Promise<R> => {
        const staging = new StagingTx();
        const r = await trabajo(staging); // si lanza -> rollback (no se vuelca)
        for (const reg of staging.resultados) {
            banco.resultados.set(reg.clave, reg);
        }
        return r;
    };
}

/** ALMACENA: escribe el registro de la semana y registra la fase `almacena`. */
function crearPersistor(bitacora: BitacoraFases): PersistorSemana<StagingTx> {
    return async (tx, unidad: UnidadTrabajoSemana) => {
        const { contexto } = unidad;
        const datos: DatosTrabajoSemana = {
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
        };
        bitacora.registrar("almacena", datos);
        const resultadoId = resultadoIdDe(datos);
        tx.resultados.push({
            clave: claveTrabajo(datos),
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
            resultadoId,
        });
        return { resultadoId };
    };
}

/** `Memoria_Semantica` ligada a la transaccion: no-op determinista. */
function crearMemoriaTransaccional(): (tx: StagingTx) => MemoriaSemantica {
    return (): MemoriaSemantica => ({
        async indexar(): Promise<void> {
            /* no-op */
        },
        async buscarSimilares() {
            return [];
        },
    });
}

/** Ensambla el `ProcesadorSemana` REAL con los dobles instrumentados. */
function crearProcesador(
    banco: BancoEstado,
    bitacora: BitacoraFases,
): ProcesadorSemana<StagingTx> {
    const deps: DependenciasProcesarSemana<StagingTx> = {
        generador: new GeneradorInstrumentado(bitacora),
        validador: new ValidadorContratoZod(() => {
            /* registrador silencioso en pruebas */
        }),
        analizador: new AnalizadorInstrumentado(bitacora),
        aprendizaje: new AprendizajeInstrumentado(bitacora),
        ejecutarTransaccion: crearEjecutorTransaccional(banco),
        persistirResultado: crearPersistor(bitacora),
        memoriaTransaccional: crearMemoriaTransaccional(),
    };
    return new ProcesadorSemana<StagingTx>(deps);
}

// ===========================================================================
// Cola en memoria + drenado FIFO con el `EjecutorTrabajoSemana` REAL
// ===========================================================================

/** `EncoladorSemana` en memoria: acumula trabajos, deduplicando por `jobId`. */
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

/**
 * Drena la cola en orden FIFO con el ejecutor REAL. Tras COMPLETAR una semana,
 * actualiza el `PlanAnalisis` (ultima completada) para que el siguiente disparo
 * encole la siguiente pendiente.
 */
async function drenar(
    cola: ColaEnMemoria,
    ejecutor: EjecutorTrabajoSemana,
    plan: PlanAnalisisEnMemoria,
): Promise<void> {
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
        }
    }
}

// ===========================================================================
// Generadores fast-check
// ===========================================================================

/** Acciones de avance disponibles (Req. 18.2): una semana / un mes / final. */
type Accion = "semana" | "mes" | "final";

interface ConfigSecuencia {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
    acciones: Accion[];
}

/**
 * `secuenciaAvancesArb`: un `Analisis` (instituciones 1..4, semanas 1..10, dentro
 * del limite de 24 del contrato) con una secuencia NO vacia de avances. Tamanos
 * acotados para que las 100 iteraciones corran rapido y de forma sincrona.
 */
const secuenciaAvancesArb: fc.Arbitrary<ConfigSecuencia> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4"), {
        minLength: 1,
        maxLength: 4,
    }),
    totalSemanas: fc.integer({ min: 1, max: 10 }),
    acciones: fc.array(fc.constantFrom<Accion>("semana", "mes", "final"), {
        minLength: 1,
        maxLength: 6,
    }),
});

// ===========================================================================
// Ejecucion de una secuencia de avances
// ===========================================================================

interface ResultadoSecuencia {
    banco: BancoEstado;
    bitacora: BitacoraFases;
}

async function ejecutarSecuencia(config: ConfigSecuencia): Promise<ResultadoSecuencia> {
    const banco = new BancoEstado();
    const bitacora = new BitacoraFases();
    const procesador = crearProcesador(banco, bitacora);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();

    const plan = new PlanAnalisisEnMemoria();
    plan.registrar(config.analisisId, {
        instituciones: [...config.instituciones],
        totalSemanas: config.totalSemanas,
    });

    const herramienta = new HerramientaAceleracion({ plan, encolador: cola });
    // El `ProgramadorTemporal` reutiliza el MISMO camino (cantidadSemanas = 1).
    const programador = new ProgramadorTemporal({ plan, encolador: cola });

    for (const accion of config.acciones) {
        if (accion === "semana") {
            // Alternamos disparador: el `tick` del Programador_Temporal equivale a
            // `avanzarUnaSemana`, demostrando que NO hay ruta alternativa por modo.
            await programador.tick(config.analisisId);
        } else if (accion === "mes") {
            await herramienta.avanzarUnMes(config.analisisId);
        } else {
            await herramienta.avanzarHastaElFinal(config.analisisId);
        }
        await drenar(cola, ejecutor, plan);
    }

    return { banco, bitacora };
}

/** Semanas completadas de una institucion, ascendentes. */
function semanasDe(banco: BancoEstado, institucionId: string): number[] {
    const ns: number[] = [];
    for (const reg of banco.resultados.values()) {
        if (reg.institucionId === institucionId) {
            ns.push(reg.numeroSemana);
        }
    }
    return ns.sort((a, b) => a - b);
}

// ===========================================================================
// Propiedad
// ===========================================================================

describe("Property 10: secuencia de semanas estrictamente creciente y contigua (Req. 12.2, 12.3, 12.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 10: Secuencia de semanas estrictamente creciente y contigua
    it("las semanas completadas por institucion son contiguas desde 1 y cada ciclo ejecuta sus fases en orden antes de habilitar la siguiente", async () => {
        await fc.assert(
            fc.asyncProperty(secuenciaAvancesArb, async (config) => {
                const { banco, bitacora } = await ejecutarSecuencia(config);

                for (const inst of config.instituciones) {
                    const semanas = semanasDe(banco, inst);

                    // (1) CONTIGUIDAD DESDE 1 (Req. 12.4): las semanas completadas
                    //     son exactamente [1, 2, ..., k], sin huecos ni omisiones.
                    const k = semanas.length;
                    const esperado = Array.from({ length: k }, (_, i) => i + 1);
                    expect(semanas).toEqual(esperado);

                    // Ninguna semana supera el total configurado del `Analisis`.
                    for (const n of semanas) {
                        expect(n).toBeLessThanOrEqual(config.totalSemanas);
                    }

                    for (let n = 1; n <= k; n++) {
                        const clave = claveTrabajo({
                            analisisId: config.analisisId,
                            institucionId: inst,
                            numeroSemana: n,
                        });

                        // (2) ORDEN DE FASES POR CICLO (Req. 12.3): cada fase ocurre
                        //     exactamente una vez y en el orden canonico.
                        const ordenes = ORDEN_FASES.map((fase) => {
                            expect(bitacora.contar(clave, fase)).toBe(1);
                            return bitacora.ordenDe(clave, fase);
                        });
                        for (let i = 1; i < ordenes.length; i++) {
                            expect(ordenes[i]).toBeGreaterThan(ordenes[i - 1]!);
                        }

                        // (3) HABILITACION EN ORDEN (Req. 12.2, 12.3): el
                        //     almacenamiento de la semana N precede a la generacion
                        //     de la N+1 (la siguiente no se habilita antes de cerrar).
                        if (n < k) {
                            const claveSiguiente = claveTrabajo({
                                analisisId: config.analisisId,
                                institucionId: inst,
                                numeroSemana: n + 1,
                            });
                            const almacenaN = bitacora.ordenDe(clave, "almacena");
                            const generaSiguiente = bitacora.ordenDe(
                                claveSiguiente,
                                "genera",
                            );
                            expect(generaSiguiente).toBeGreaterThan(almacenaN);
                        }
                    }
                }

                // (4) UNA SOLA SEMANA POR CICLO (Req. 12.2): hay exactamente una
                //     generacion por cada semana completada (sin generar el periodo
                //     completo de una vez).
                const totalCompletadas = config.instituciones.reduce(
                    (acc, inst) => acc + semanasDe(banco, inst).length,
                    0,
                );
                const totalGeneraciones = bitacora.eventos.filter(
                    (e) => e.fase === "genera",
                ).length;
                expect(totalGeneraciones).toBe(totalCompletadas);
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
