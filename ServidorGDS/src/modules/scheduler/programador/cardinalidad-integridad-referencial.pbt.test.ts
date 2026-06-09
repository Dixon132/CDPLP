/**
 * PBT - Property 12: Cardinalidad e integridad referencial por institucion
 * (tarea 16.8).
 *
 * Texto de la propiedad (design.md):
 * "Para todo `Analisis` con `M` instituciones que ejecuta una semana, se producen
 *  exactamente `M` generaciones y cada resultado o registro de historial queda
 *  atado a exactamente una `Institucion` y a exactamente un `Analisis`, sin
 *  registros huerfanos."
 *
 * La propiedad se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD,
 * sin red), conforme a las restricciones Windows/cmd del plan, reutilizando las
 * piezas REALES del motor de ciclos (tareas 16.1/16.2/16.3):
 *
 *  - `HerramientaAceleracion` (disparador del salto temporal) que ENCOLA via
 *    `procesarSemana` en la MISMA `Cola_Trabajos` un trabajo `(A,I,N)` por cada
 *    institucion con semanas pendientes.
 *  - `EjecutorTrabajoSemana` REAL (idempotencia + cerrojo + estado consultable)
 *    drenando una cola en memoria FIFO.
 *  - `ProcesadorSemana` REAL (UNICO `procesarSemana`), cuya fase de GENERACION se
 *    instrumenta con un doble determinista que cuenta las generaciones por
 *    institucion, y cuya PERSISTENCIA escribe un registro `(A,I,N)` atado a su
 *    `Institucion`, `Analisis` y `Comunidad_Digital`.
 *  - Relojes/IDs inyectables (`RelojFijo` + `GeneradorIdSecuencial`).
 *
 * Se cubren los tres invariantes que exige la propiedad:
 *
 *   1. **Cardinalidad por semana (Req. 9.1):** un `Analisis` con `M` instituciones
 *      que ejecuta UNA semana produce exactamente `M` generaciones y `M` registros
 *      (uno por institucion), todos para el mismo `numeroSemana`.
 *   2. **Atadura referencial exacta (Req. 9.2):** cada registro queda atado a
 *      exactamente UNA `Institucion` y a exactamente UN `Analisis`; su
 *      `Comunidad_Digital` pertenece a esa misma institucion. La identidad
 *      derivada `(A,I,N)` (clave/jobId) reconstruye sin ambiguedad esos campos.
 *   3. **Sin registros huerfanos (Req. 9.4):** todo registro persistido referencia
 *      un `Analisis` registrado y una `Institucion` que pertenece a ese `Analisis`;
 *      ningun registro de un `Analisis` referencia instituciones de otro
 *      (no hay mezcla de datos entre estudios paralelos).
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 9.1, 9.2, 9.4**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 12: Cardinalidad e integridad referencial por institucion
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
// Registro de GENERACIONES por institucion (cardinalidad, Req. 9.1)
// ===========================================================================

/** Cuenta cuantas generaciones se ejecutaron por cada `(A,I,N)`. */
class BitacoraGeneraciones {
    private readonly conteo = new Map<string, number>();

    registrar(datos: DatosTrabajoSemana): void {
        const clave = claveTrabajo(datos);
        this.conteo.set(clave, (this.conteo.get(clave) ?? 0) + 1);
    }

    /** Generaciones totales (suma sobre todas las `(A,I,N)`). */
    total(): number {
        let suma = 0;
        for (const n of this.conteo.values()) suma += n;
        return suma;
    }

    /** Generaciones registradas para una clave `(A,I,N)`. */
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

    todos(): RegistroSemana[] {
        return [...this.resultados.values()];
    }
}

// ===========================================================================
// Dobles deterministas e INSTRUMENTADOS de las fases de `procesarSemana`
// ===========================================================================

/**
 * GENERA: produce un `Contrato_Normalizado` valido y embebe las coordenadas
 * `(A,I)` en `metadata` (passthrough) para trazar la atribucion. Cuenta cada
 * generacion (cardinalidad, Req. 9.1).
 */
class GeneradorInstrumentado implements GeneradorSemana {
    constructor(private readonly bitacora: BitacoraGeneraciones) { }

    async generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana> {
        this.bitacora.registrar({ analisisId, institucionId, numeroSemana });

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
    bitacora: BitacoraGeneraciones,
): ProcesadorSemana<StagingTx> {
    const deps: DependenciasProcesarSemana<StagingTx> = {
        generador: new GeneradorInstrumentado(bitacora),
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

/** Configuracion de UN `Analisis`: su id, sus instituciones y su total de semanas. */
interface ConfigAnalisis {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
}

/**
 * `analisisInstitucionesArb`: un `Analisis` con `M` instituciones (1..4, unicas) y
 * un total de semanas (1..10, dentro del limite de 24 del contrato). Tamanos
 * acotados para que las 100 iteraciones corran rapido y de forma sincrona.
 */
const analisisInstitucionesArb: fc.Arbitrary<ConfigAnalisis> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4"), {
        minLength: 1,
        maxLength: 4,
    }),
    totalSemanas: fc.integer({ min: 1, max: 10 }),
});

/** Configuracion de VARIOS `Analisis` paralelos con ids unicos. */
const multiAnalisisArb: fc.Arbitrary<ConfigAnalisis[]> = fc
    .uniqueArray(
        fc.record({
            analisisId: fc.constantFrom("an-1", "an-2", "an-3"),
            instituciones: fc.uniqueArray(
                fc.constantFrom("i1", "i2", "i3", "i4", "i5"),
                { minLength: 1, maxLength: 5 },
            ),
            totalSemanas: fc.integer({ min: 1, max: 6 }),
        }),
        { minLength: 1, maxLength: 3, selector: (c) => c.analisisId },
    );

// ===========================================================================
// Utilidades de ejecucion
// ===========================================================================

function planDe(configs: ConfigAnalisis[]): PlanAnalisisEnMemoria {
    const plan = new PlanAnalisisEnMemoria();
    for (const c of configs) {
        plan.registrar(c.analisisId, {
            instituciones: [...c.instituciones],
            totalSemanas: c.totalSemanas,
        });
    }
    return plan;
}

interface Entorno {
    banco: BancoEstado;
    bitacora: BitacoraGeneraciones;
    ejecutor: EjecutorTrabajoSemana;
    cola: ColaEnMemoria;
    plan: PlanAnalisisEnMemoria;
    herramienta: HerramientaAceleracion;
}

function crearEntorno(configs: ConfigAnalisis[]): Entorno {
    const banco = new BancoEstado();
    const bitacora = new BitacoraGeneraciones();
    const procesador = crearProcesador(banco, bitacora);
    const ejecutor = crearEjecutorTrabajo(banco, procesador);
    const cola = new ColaEnMemoria();
    const plan = planDe(configs);
    const herramienta = new HerramientaAceleracion({ plan, encolador: cola });
    return { banco, bitacora, ejecutor, cola, plan, herramienta };
}

// ===========================================================================
// Propiedad
// ===========================================================================

describe("Property 12: cardinalidad e integridad referencial por institucion (Req. 9.1, 9.2, 9.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 12: Cardinalidad e integridad referencial por institucion
    it("(1) un Analisis con M instituciones que ejecuta una semana produce exactamente M generaciones y M registros, uno por institucion (Req. 9.1)", async () => {
        await fc.assert(
            fc.asyncProperty(analisisInstitucionesArb, async (config) => {
                const { banco, bitacora, ejecutor, cola, plan, herramienta } =
                    crearEntorno([config]);

                const M = config.instituciones.length;

                // Ejecuta UNA semana del Analisis (la primera pendiente por
                // institucion) y drena la cola por completo.
                await herramienta.avanzarUnaSemana(config.analisisId);
                await drenar(cola, ejecutor, plan);

                // (1a) Exactamente M generaciones (una por institucion).
                expect(bitacora.total()).toBe(M);

                // (1b) Exactamente M registros persistidos, todos de la semana 1.
                const registros = banco.todos();
                expect(registros.length).toBe(M);
                for (const reg of registros) {
                    expect(reg.numeroSemana).toBe(1);
                }

                // (1c) Hay exactamente un registro por cada institucion (sin
                //      duplicar ni omitir ninguna): el conjunto de institucionId
                //      persistidas es exactamente el del Analisis.
                const instPersistidas = new Set(
                    registros.map((r) => r.institucionId),
                );
                expect(instPersistidas.size).toBe(M);
                expect([...instPersistidas].sort()).toEqual(
                    [...config.instituciones].sort(),
                );

                // (1d) Cada institucion genero exactamente una vez su semana 1.
                for (const inst of config.instituciones) {
                    const clave = claveTrabajo({
                        analisisId: config.analisisId,
                        institucionId: inst,
                        numeroSemana: 1,
                    });
                    expect(bitacora.contar(clave)).toBe(1);
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });

    it("(2) cada registro queda atado a exactamente una Institucion y un Analisis, sin huerfanos ni mezcla entre estudios paralelos (Req. 9.2, 9.4)", async () => {
        await fc.assert(
            fc.asyncProperty(
                multiAnalisisArb,
                // Numero de avances de UNA semana por Analisis (puede exceder su
                // total: los avances de mas no generan nada, ejercitando bordes).
                fc.integer({ min: 1, max: 8 }),
                async (configs, avances) => {
                    const { banco, bitacora, ejecutor, cola, plan, herramienta } =
                        crearEntorno(configs);

                    // Mapa Analisis -> conjunto de sus instituciones (referencia
                    // de integridad: ningun registro puede salirse de aqui).
                    const institucionesPorAnalisis = new Map<string, Set<string>>(
                        configs.map((c) => [c.analisisId, new Set(c.instituciones)]),
                    );

                    // Avanza cada Analisis `avances` semanas, drenando tras cada
                    // disparo para habilitar la siguiente semana pendiente.
                    for (let paso = 0; paso < avances; paso++) {
                        for (const c of configs) {
                            await herramienta.avanzarUnaSemana(c.analisisId);
                            await drenar(cola, ejecutor, plan);
                        }
                    }

                    const registros = banco.todos();

                    // (2a) Cardinalidad total: cada generacion produjo exactamente
                    //      un registro persistido (sin generaciones huerfanas ni
                    //      registros sin generacion).
                    expect(bitacora.total()).toBe(registros.length);

                    // Conteo esperado de registros: por Analisis, M * min(avances,
                    // total) (cada avance procesa una semana de cada institucion
                    // mientras queden pendientes).
                    const esperadoTotal = configs.reduce(
                        (acc, c) =>
                            acc +
                            c.instituciones.length *
                            Math.min(avances, c.totalSemanas),
                        0,
                    );
                    expect(registros.length).toBe(esperadoTotal);

                    for (const reg of registros) {
                        // (2b) Atadura a exactamente UN Analisis registrado
                        //      (sin huerfanos): el analisisId existe.
                        const instituciones = institucionesPorAnalisis.get(
                            reg.analisisId,
                        );
                        expect(instituciones).toBeDefined();

                        // (2c) Atadura a exactamente UNA Institucion que pertenece a
                        //      ese Analisis (integridad referencial, sin mezcla
                        //      entre estudios paralelos, Req. 9.4).
                        expect(instituciones!.has(reg.institucionId)).toBe(true);

                        // (2d) La Comunidad_Digital del registro pertenece a su
                        //      propia institucion (no se cruza con otra).
                        expect(reg.comunidadId).toBe(comunidadDe(reg.institucionId));

                        // (2e) La identidad derivada (clave/jobId) reconstruye sin
                        //      ambiguedad la triada (A,I,N) del registro: la atadura
                        //      es exacta y unica.
                        const datos: DatosTrabajoSemana = {
                            analisisId: reg.analisisId,
                            institucionId: reg.institucionId,
                            numeroSemana: reg.numeroSemana,
                        };
                        expect(reg.clave).toBe(claveTrabajo(datos));
                        expect(reg.resultadoId).toBe(resultadoIdDe(datos));
                    }

                    // (2f) La clave (A,I,N) es UNICA por registro (un resultado por
                    //      institucion y semana): no hay dos registros con la misma
                    //      identidad.
                    const claves = new Set(registros.map((r) => r.clave));
                    expect(claves.size).toBe(registros.length);
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });
});
