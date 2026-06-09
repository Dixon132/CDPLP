/**
 * PBT - Property 13: Aislamiento de fallos entre instituciones (tarea 16.9).
 *
 * Texto de la propiedad (design.md):
 * "Para todo conjunto de instituciones de un `Analisis` donde la generacion de
 *  una falla en una semana, las demas instituciones completan su procesamiento de
 *  esa semana de forma independiente (trabajos aislados en la `Cola_Trabajos`) y
 *  solo la institucion afectada queda en estado reintentable."
 *
 * La propiedad se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD,
 * sin red), conforme a las restricciones Windows/cmd del plan, reutilizando las
 * piezas REALES del motor de ciclos (tareas 16.1/16.2/16.3):
 *
 *  - `HerramientaAceleracion` (disparador del salto temporal) que ENCOLA via
 *    `procesarSemana` en la MISMA `Cola_Trabajos` un trabajo `(A,I,N)` por cada
 *    institucion con semanas pendientes; cada `(A,I,N)` es un trabajo
 *    INDEPENDIENTE (aislamiento por institucion, Req. 9.5, 38.4).
 *  - `EjecutorTrabajoSemana` REAL (idempotencia + cerrojo + estado consultable +
 *    politica de reintentos acotada) que, ante un fallo de `procesarSemana`,
 *    marca PENDIENTE (reintentable) mientras queden intentos y FALLIDO al
 *    agotarlos, RELANZANDO el error para que la cola aplique su politica.
 *  - `ProcesadorSemana` REAL (UNICO `procesarSemana`), cuya fase de GENERACION se
 *    instrumenta para FALLAR en una institucion concreta. Como la generacion
 *    ocurre ANTES de la transaccion atomica, un fallo NO deja resultado parcial
 *    (atomicidad, tarea 16.1).
 *  - Relojes/IDs inyectables (`RelojFijo` + `GeneradorIdSecuencial`).
 *
 * Se cubren los invariantes que exige la propiedad, en dos clausulas:
 *
 *   (A) **Aislamiento + estado reintentable (Req. 9.3, 9.5, 38.4):** ante el
 *       fallo de la generacion de UNA institucion en la semana, las DEMAS
 *       completan esa semana de forma independiente (COMPLETADO, con resultado
 *       persistido), y SOLO la institucion afectada queda en estado REINTENTABLE
 *       (PENDIENTE, no terminal), sin resultado persistido. El orden en que se
 *       drenan los trabajos no altera este resultado (trabajos aislados).
 *
 *   (B) **Reintentabilidad acotada e independencia (Req. 9.3, 9.5, 38.4):** dentro
 *       de la politica de reintentos acotada, si el fallo de la institucion
 *       afectada es TRANSITORIO se completa al reintentar (resultado persistido
 *       exactamente una vez); si es PERSISTENTE agota los reintentos y queda
 *       FALLIDA. En AMBOS casos las demas instituciones permanecen COMPLETADAS e
 *       INTACTAS (su generacion no se repite: idempotencia), demostrando que el
 *       fallo de una institucion jamas contamina a las otras.
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 9.3, 9.5, 38.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 13: Aislamiento de fallos entre instituciones
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
import { EstadoTrabajo, esEstadoTerminal } from "../cola/estados-trabajo";
import type {
    ConsultaResultadoSemana,
    ProcesadorSemanaPort,
    RegistroEstadoTrabajos,
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
// Identificadores derivados deterministas (IDs inyectables, sin azar)
// ===========================================================================

/** `comunidadId` estable por institucion (1 comunidad por institucion en el test). */
function comunidadDe(institucionId: string): string {
    return `com-${institucionId}`;
}

/** `resultadoId` determinista por coordenada `(A,I,N)`. */
function resultadoIdDe(datos: DatosTrabajoSemana): string {
    return `res:${datos.analisisId}:${datos.institucionId}:${datos.numeroSemana}`;
}

// ===========================================================================
// Registro de GENERACIONES por institucion (para verificar que el fallo de una
// no repite ni altera el trabajo de las demas)
// ===========================================================================

/** Cuenta cuantas veces se INVOCO la generacion de cada `(A,I,N)`. */
class BitacoraGeneraciones {
    private readonly conteo = new Map<string, number>();

    registrar(datos: DatosTrabajoSemana): void {
        const clave = claveTrabajo(datos);
        this.conteo.set(clave, (this.conteo.get(clave) ?? 0) + 1);
    }

    /** Invocaciones de generacion registradas para una clave `(A,I,N)`. */
    contar(clave: string): number {
        return this.conteo.get(clave) ?? 0;
    }
}

// ===========================================================================
// Banco de estado en memoria (registros persistidos por semana)
// ===========================================================================

/** Vista persistida de una `Semana_Simulada` (resultado/historial semanal). */
interface RegistroSemana {
    clave: string;
    analisisId: string;
    institucionId: string;
    comunidadId: string;
    numeroSemana: number;
    resultadoId: string;
}

class BancoEstado {
    readonly resultados = new Map<string, RegistroSemana>();

    yaProcesada(datos: DatosTrabajoSemana): boolean {
        return this.resultados.has(claveTrabajo(datos));
    }

    tieneInstitucion(institucionId: string): boolean {
        for (const r of this.resultados.values()) {
            if (r.institucionId === institucionId) return true;
        }
        return false;
    }

    todos(): RegistroSemana[] {
        return [...this.resultados.values()];
    }
}

// ===========================================================================
// Dobles deterministas e INSTRUMENTADOS de las fases de `procesarSemana`
// ===========================================================================

/**
 * GENERA: produce un `Contrato_Normalizado` valido para las instituciones sanas
 * y FALLA para la institucion afectada mientras le queden fallos pendientes
 * (`fallosObjetivo`). Como la generacion ocurre ANTES de la transaccion atomica,
 * un fallo no deja resultado parcial (atomicidad de `procesarSemana`, tarea 16.1).
 * Cuenta cada invocacion de generacion para verificar el aislamiento.
 */
class GeneradorConFallo implements GeneradorSemana {
    /** Numero de fallos de generacion ya producidos por la institucion afectada. */
    fallosHechos = 0;

    constructor(
        private readonly institucionFallida: string,
        private readonly bitacora: BitacoraGeneraciones,
        /** Cuantos fallos de generacion produce la institucion afectada antes de exito. */
        private readonly fallosObjetivo: number,
    ) { }

    async generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana> {
        this.bitacora.registrar({ analisisId, institucionId, numeroSemana });

        if (
            institucionId === this.institucionFallida &&
            this.fallosHechos < this.fallosObjetivo
        ) {
            this.fallosHechos += 1;
            throw new Error(
                `fallo de generacion simulado en institucion ${institucionId} (semana ${numeroSemana})`,
            );
        }

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
            },
        } as ContratoNormalizado;

        return {
            contrato,
            comunidadId: comunidadDe(institucionId),
            proveedor: "doble-instrumentado",
        };
    }
}

/** ANALIZA: atraviesa todas las etapas y devuelve el contrato (ya validado). */
class AnalizadorInstrumentado implements AnalizadorSemana {
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

/** APRENDE: computacion pura determinista (sin artefactos relevantes al test). */
class AprendizajeInstrumentado implements MotorAprendizaje {
    async aprender(_entrada: EntradaAprendizaje): Promise<ArtefactosAprendizaje> {
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

/**
 * ALMACENA: escribe el registro de la semana atado a su `(A,I,N)` y
 * `Comunidad_Digital` (tomada del contexto, derivada de la institucion).
 */
function crearPersistor(): PersistorSemana<StagingTx> {
    return async (tx, unidad: UnidadTrabajoSemana) => {
        const { contexto } = unidad;
        const datos: DatosTrabajoSemana = {
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            numeroSemana: contexto.numeroSemana,
        };
        const resultadoId = resultadoIdDe(datos);
        tx.resultados.push({
            clave: claveTrabajo(datos),
            analisisId: contexto.analisisId,
            institucionId: contexto.institucionId,
            comunidadId: contexto.comunidadId,
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
    generador: GeneradorSemana,
): ProcesadorSemana<StagingTx> {
    const deps: DependenciasProcesarSemana<StagingTx> = {
        generador,
        validador: new ValidadorContratoZod(() => {
            /* registrador silencioso en pruebas */
        }),
        analizador: new AnalizadorInstrumentado(),
        aprendizaje: new AprendizajeInstrumentado(),
        ejecutarTransaccion: crearEjecutorTransaccional(banco),
        persistirResultado: crearPersistor(),
        memoriaTransaccional: crearMemoriaTransaccional(),
    };
    return new ProcesadorSemana<StagingTx>(deps);
}

// ===========================================================================
// Cola en memoria + ejecutor REAL (estado consultable)
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
    registro: RegistroEstadoTrabajos,
): EjecutorTrabajoSemana {
    return new EjecutorTrabajoSemana({
        procesador,
        cerrojo: new CerrojoConcurrenciaEnMemoria(),
        consultaResultado: new ConsultaSobreBanco(banco),
        registro,
    });
}

// ===========================================================================
// Generadores fast-check
// ===========================================================================

/** Configuracion de UN `Analisis` con una institucion designada como fallida. */
interface ConfigAislamiento {
    analisisId: string;
    instituciones: string[];
    /** Indice (dentro de `instituciones`) de la institucion cuya generacion falla. */
    indiceFallo: number;
    totalSemanas: number;
}

/**
 * `aislamientoArb`: un `Analisis` con `M` instituciones (2..5, unicas) - se exige
 * `M >= 2` para que exista al menos una institucion sana ademas de la afectada -,
 * con UNA institucion designada como fallida y un total de semanas (1..6).
 */
const aislamientoArb: fc.Arbitrary<ConfigAislamiento> = fc
    .uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4", "i5"), {
        minLength: 2,
        maxLength: 5,
    })
    .chain((instituciones) =>
        fc.record({
            analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
            instituciones: fc.constant(instituciones),
            indiceFallo: fc.integer({ min: 0, max: instituciones.length - 1 }),
            totalSemanas: fc.integer({ min: 1, max: 6 }),
        }),
    );

// ===========================================================================
// Utilidades de ejecucion
// ===========================================================================

function planDe(config: ConfigAislamiento): PlanAnalisisEnMemoria {
    const plan = new PlanAnalisisEnMemoria();
    plan.registrar(config.analisisId, {
        instituciones: [...config.instituciones],
        totalSemanas: config.totalSemanas,
    });
    return plan;
}

interface Entorno {
    banco: BancoEstado;
    bitacora: BitacoraGeneraciones;
    generador: GeneradorConFallo;
    ejecutor: EjecutorTrabajoSemana;
    registro: RegistroEstadoTrabajosEnMemoria;
    cola: ColaEnMemoria;
    plan: PlanAnalisisEnMemoria;
    herramienta: HerramientaAceleracion;
    institucionFallida: string;
}

function crearEntorno(config: ConfigAislamiento, fallosObjetivo: number): Entorno {
    const institucionFallida = config.instituciones[config.indiceFallo]!;
    const banco = new BancoEstado();
    const bitacora = new BitacoraGeneraciones();
    const generador = new GeneradorConFallo(
        institucionFallida,
        bitacora,
        fallosObjetivo,
    );
    const procesador = crearProcesador(banco, generador);
    const registro = new RegistroEstadoTrabajosEnMemoria(
        new RelojFijo(new Date("2024-01-01T00:00:00.000Z")),
        new GeneradorIdSecuencial("reg"),
    );
    const ejecutor = crearEjecutorTrabajo(banco, procesador, registro);
    const cola = new ColaEnMemoria();
    const plan = planDe(config);
    const herramienta = new HerramientaAceleracion({ plan, encolador: cola });
    return {
        banco,
        bitacora,
        generador,
        ejecutor,
        registro,
        cola,
        plan,
        herramienta,
        institucionFallida,
    };
}

/**
 * Simula la politica de reintentos ACOTADA de BullMQ sobre UN trabajo `(A,I,N)`,
 * con el MISMO `jobId` determinista: intenta hasta `MAX_INTENTOS`, relanzando en
 * cada fallo (como haria la cola con backoff) hasta COMPLETAR o agotar intentos.
 * Devuelve el estado FINAL consultado en el registro (la fuente de verdad).
 */
async function ejecutarTrabajoConReintentos(
    ejecutor: EjecutorTrabajoSemana,
    registro: RegistroEstadoTrabajos,
    datos: DatosTrabajoSemana,
): Promise<EstadoTrabajo> {
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        const contexto: ContextoIntento = { intento, maxIntentos: MAX_INTENTOS };
        try {
            const r = await ejecutor.ejecutar(datos, contexto);
            if (r.estado === EstadoTrabajo.COMPLETADO) {
                break;
            }
        } catch {
            // Fallo: la cola reintentaria con el mismo jobId (idempotente).
        }
    }
    const reg = await registro.consultar(datos);
    return reg?.estado ?? EstadoTrabajo.PENDIENTE;
}

// ===========================================================================
// Propiedad
// ===========================================================================

describe("Property 13: aislamiento de fallos entre instituciones (Req. 9.3, 9.5, 38.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 13: Aislamiento de fallos entre instituciones
    it("(A) ante el fallo de la generacion de una institucion en la semana, las demas COMPLETAN esa semana de forma independiente y solo la afectada queda REINTENTABLE (PENDIENTE), sin resultado persistido", async () => {
        await fc.assert(
            fc.asyncProperty(aislamientoArb, async (config) => {
                // La institucion afectada SIEMPRE falla su generacion (persistente
                // de cara a este unico intento): fallosObjetivo grande.
                const entorno = crearEntorno(config, Number.POSITIVE_INFINITY);
                const {
                    banco,
                    bitacora,
                    ejecutor,
                    registro,
                    cola,
                    herramienta,
                    institucionFallida,
                } = entorno;

                const M = config.instituciones.length;
                const sanas = config.instituciones.filter(
                    (i) => i !== institucionFallida,
                );

                // Encola la semana 1 de TODAS las instituciones (un trabajo
                // aislado por institucion) en la MISMA cola.
                await herramienta.avanzarUnaSemana(config.analisisId);
                expect(cola.pendientes.length).toBe(M);

                // Procesa UN intento por trabajo (intento 1 de MAX_INTENTOS): la
                // institucion afectada falla (queda reintentable), las demas
                // completan. El orden de drenado lo fija el encolado; el fallo de
                // una NO impide procesar a las demas (trabajos aislados).
                const estados = new Map<string, EstadoTrabajo>();
                for (const datos of cola.pendientes) {
                    const contexto: ContextoIntento = {
                        intento: 1,
                        maxIntentos: MAX_INTENTOS,
                    };
                    try {
                        const r = await ejecutor.ejecutar(datos, contexto);
                        estados.set(datos.institucionId, r.estado);
                    } catch {
                        // Fallo aislado de ESTE trabajo: no detiene a los demas.
                        const reg = await registro.consultar(datos);
                        estados.set(
                            datos.institucionId,
                            reg?.estado ?? EstadoTrabajo.PENDIENTE,
                        );
                    }
                }

                // (A1) Las instituciones SANAS completan su semana de forma
                //      independiente, con resultado persistido.
                for (const inst of sanas) {
                    expect(estados.get(inst)).toBe(EstadoTrabajo.COMPLETADO);
                    expect(banco.tieneInstitucion(inst)).toBe(true);
                    // Su generacion se invoco exactamente una vez (sin reproceso).
                    const clave = claveTrabajo({
                        analisisId: config.analisisId,
                        institucionId: inst,
                        numeroSemana: 1,
                    });
                    expect(bitacora.contar(clave)).toBe(1);
                }

                // (A2) SOLO la institucion afectada queda en estado REINTENTABLE
                //      (PENDIENTE, no terminal) y sin resultado persistido.
                const estadoFallida = estados.get(institucionFallida)!;
                expect(estadoFallida).toBe(EstadoTrabajo.PENDIENTE);
                expect(esEstadoTerminal(estadoFallida)).toBe(false);
                expect(banco.tieneInstitucion(institucionFallida)).toBe(false);

                // (A3) Exactamente M-1 registros persistidos, todos de la semana 1,
                //      uno por cada institucion SANA (sin huerfanos ni mezcla).
                const registros = banco.todos();
                expect(registros.length).toBe(M - 1);
                const instPersistidas = new Set(
                    registros.map((r) => r.institucionId),
                );
                expect([...instPersistidas].sort()).toEqual([...sanas].sort());
                for (const reg of registros) {
                    expect(reg.numeroSemana).toBe(1);
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });

    it("(B) bajo reintentos acotados, el fallo transitorio de la institucion afectada se resuelve al reintentar y el persistente la deja FALLIDA; en ambos casos las demas permanecen COMPLETADAS e intactas", async () => {
        await fc.assert(
            fc.asyncProperty(
                aislamientoArb,
                // Numero de fallos de generacion de la institucion afectada:
                //  - 1..4 (< MAX_INTENTOS): TRANSITORIO -> se completa al reintentar.
                //  - 5..7 (>= MAX_INTENTOS): PERSISTENTE -> agota reintentos (FALLIDO).
                fc.integer({ min: 1, max: 7 }),
                async (config, fallosObjetivo) => {
                    const entorno = crearEntorno(config, fallosObjetivo);
                    const {
                        banco,
                        bitacora,
                        ejecutor,
                        registro,
                        cola,
                        herramienta,
                        institucionFallida,
                    } = entorno;

                    const sanas = config.instituciones.filter(
                        (i) => i !== institucionFallida,
                    );
                    const seRecupera = fallosObjetivo < MAX_INTENTOS;

                    // Encola la semana 1 de TODAS las instituciones.
                    await herramienta.avanzarUnaSemana(config.analisisId);

                    // Drena cada trabajo con la politica de reintentos acotada.
                    const estados = new Map<string, EstadoTrabajo>();
                    for (const datos of [...cola.pendientes]) {
                        const estado = await ejecutarTrabajoConReintentos(
                            ejecutor,
                            registro,
                            datos,
                        );
                        estados.set(datos.institucionId, estado);
                    }

                    // (B1) Las instituciones SANAS permanecen COMPLETADAS e
                    //      INTACTAS: su generacion se invoco UNA sola vez (el fallo
                    //      de la afectada no las reprocesa) y su resultado quedo
                    //      persistido EXACTAMENTE una vez.
                    for (const inst of sanas) {
                        expect(estados.get(inst)).toBe(EstadoTrabajo.COMPLETADO);
                        expect(banco.tieneInstitucion(inst)).toBe(true);
                        const clave = claveTrabajo({
                            analisisId: config.analisisId,
                            institucionId: inst,
                            numeroSemana: 1,
                        });
                        expect(bitacora.contar(clave)).toBe(1);
                    }

                    // (B2) La institucion afectada:
                    const estadoFallida = estados.get(institucionFallida)!;
                    const claveFallida = claveTrabajo({
                        analisisId: config.analisisId,
                        institucionId: institucionFallida,
                        numeroSemana: 1,
                    });

                    if (seRecupera) {
                        // Fallo transitorio: se completa dentro de los reintentos
                        // acotados, con resultado persistido EXACTAMENTE una vez.
                        expect(estadoFallida).toBe(EstadoTrabajo.COMPLETADO);
                        expect(banco.tieneInstitucion(institucionFallida)).toBe(true);
                        // Generacion: `fallosObjetivo` intentos fallidos + 1 exito.
                        expect(bitacora.contar(claveFallida)).toBe(
                            fallosObjetivo + 1,
                        );
                    } else {
                        // Fallo persistente: agota la politica acotada -> FALLIDO
                        // (terminal), SIN resultado persistido (atomicidad).
                        expect(estadoFallida).toBe(EstadoTrabajo.FALLIDO);
                        expect(esEstadoTerminal(estadoFallida)).toBe(true);
                        expect(banco.tieneInstitucion(institucionFallida)).toBe(
                            false,
                        );
                        // Generacion: exactamente MAX_INTENTOS intentos, todos fallidos.
                        expect(bitacora.contar(claveFallida)).toBe(MAX_INTENTOS);
                    }

                    // (B3) Cardinalidad de persistencia: M-1 registros (sanas) si la
                    //      afectada no se recupera; M si se recupera. Ninguna mezcla.
                    const esperados = seRecupera
                        ? config.instituciones.length
                        : sanas.length;
                    expect(banco.todos().length).toBe(esperados);
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });
});
