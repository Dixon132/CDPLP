/**
 * PBT - Property 36: Pausa y reanudacion conservan estado consistente
 * (tarea 17.4).
 *
 * Texto de la propiedad (design.md):
 * "Para todo punto de pausa de un `Analisis` en `Modo_Ejecucion` Automatico o
 *  Tiempo_Real, las `Semana_Simulada` completadas permanecen firmes y
 *  consistentes, y la reanudacion continua exactamente desde la siguiente
 *  `Semana_Simulada` pendiente sin repetir ni omitir semanas."
 *
 * Se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD, sin red),
 * conforme a las restricciones Windows/cmd del plan y reutilizando el UNICO
 * `GestorEjecucionService` (tarea 17.1, con pausar/reanudar):
 *
 *  - **Cola en memoria de ejecucion inmediata**: un `EncoladorSemana` doble
 *    (`ColaEnMemoria`) acumula los trabajos `(A,I,N)` que el avance encola
 *    (Automatico = todas las pendientes; Tiempo_Real = la siguiente por
 *    institucion en cada vencimiento); un "drenado" FIFO los ejecuta con el
 *    `EjecutorTrabajoSemana` real (idempotencia + cerrojo + estado consultable)
 *    y un `ProcesadorSemanaPort` doble determinista.
 *  - **Relojes e IDs inyectables**: `RelojFijo` + `GeneradorIdSecuencial` en el
 *    registro de estado de la cola y `RelojFijo` en los disparadores.
 *  - **Contador del Tiempo_Real inyectable**: `TemporizadorManual` dispara los
 *    vencimientos del intervalo a voluntad (sin esperas reales); `pausar` lo
 *    cancela y `reanudar` lo rearranca.
 *
 * El "punto de pausa" se modela procesando exactamente `objetivoPausa` semanas
 * (globales) y deteniendo el drenado; luego `GestorEjecucion.pausar` cancela el
 * contador y detiene el encolado. Como cada `Semana_Simulada` se procesa y
 * persiste atomicamente y el encolado es idempotente por `jobId` determinista, la
 * reanudacion (`reanudar`) continua EXACTAMENTE desde la siguiente pendiente sin
 * repetir ni omitir semanas, sea cual sea el modo (Req. 32.6, 32.8).
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 32.6, 32.8**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 36: Pausa y reanudación conservan estado consistente
import fc from "fast-check";

import type { ModoEjecucion } from "../../analysis/analysis.types";

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
import type { ResultadoProcesarSemana } from "../procesarSemana";
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from "../cola/adaptadores-memoria";

import { HerramientaAceleracion } from "../programador/herramienta-aceleracion";
import { ProgramadorTemporal } from "../programador/programador-temporal";
import { PlanAnalisisEnMemoria } from "../programador/adaptadores-programador";
import type { EncoladorSemana } from "../programador/puertos-programador";

import { AlmacenEstadoEjecucionEnMemoria } from "./almacen-estado-ejecucion";
import { GestorEjecucionService } from "./gestor-ejecucion";
import { TemporizadorManual } from "./temporizador";

const NUM_RUNS = 100;
const MAX_INTENTOS = 5;
/** Intervalo (ms) del Tiempo_Real para las pruebas (se dispara a voluntad). */
const INTERVALO_TR_MS = 1000;

// ===========================================================================
// "Banco de estado" en memoria: semanas procesadas (idempotencia + duplicados)
// ===========================================================================

/**
 * Estado final de la "BD" del `Analisis` para esta propiedad: cuantas veces se
 * proceso cada `Semana_Simulada` `(A,I,N)`. Sirve para verificar idempotencia
 * (ninguna semana se procesa dos veces) y completitud (sin saltos ni omisiones).
 */
class BancoEstado {
    /** clave `(A,I,N)` -> numero de veces procesada (debe ser 1 al final). */
    readonly procesadas = new Map<string, number>();

    yaProcesada(datos: DatosTrabajoSemana): boolean {
        return this.procesadas.has(claveTrabajo(datos));
    }

    registrar(datos: DatosTrabajoSemana): void {
        const clave = claveTrabajo(datos);
        this.procesadas.set(clave, (this.procesadas.get(clave) ?? 0) + 1);
    }

    /** Numeros de `Semana_Simulada` ya procesadas para `(A,I)`, ascendentes. */
    semanasDe(analisisId: string, institucionId: string): number[] {
        const ns: number[] = [];
        for (const clave of this.procesadas.keys()) {
            const [a, i, n] = clave.split("::");
            if (a === analisisId && i === institucionId) {
                ns.push(Number(n));
            }
        }
        return ns.sort((a, b) => a - b);
    }
}

// ===========================================================================
// Dobles deterministas: procesador, idempotencia y cola en memoria
// ===========================================================================

/**
 * `ProcesadorSemanaPort` doble determinista: registra la `Semana_Simulada`
 * `(A,I,N)` en el `BancoEstado` y devuelve su trazabilidad. No introduce
 * no-determinismo ni azar; basta para verificar la pausa/reanudacion.
 */
class ProcesadorRegistrador implements ProcesadorSemanaPort {
    constructor(private readonly banco: BancoEstado) { }

    async procesarSemana(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoProcesarSemana> {
        const datos: DatosTrabajoSemana = {
            analisisId,
            institucionId,
            numeroSemana,
        };
        this.banco.registrar(datos);
        return {
            analisisId,
            institucionId,
            comunidadId: `com-${institucionId}`,
            numeroSemana,
            resultadoId: `res:${claveTrabajo(datos)}`,
            etapasCompletadas: [],
        };
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
 * `EncoladorSemana` en memoria: acumula los trabajos `(A,I,N)` preservando el
 * orden de encolado y deduplica por `jobId` determinista entre los pendientes
 * (idempotencia de encolado), igual que BullMQ con `jobId` fijo. Por eso reencolar
 * una semana ya pendiente (al reanudar) no la duplica.
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

// ===========================================================================
// Montaje del recorrido gobernado por el GestorEjecucion
// ===========================================================================

interface ConfigAnalisis {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
    modo: Extract<ModoEjecucion, "AUTOMATICO" | "TIEMPO_REAL">;
    /** Fraccion [0,1] que decide el punto de pausa (semanas globales procesadas). */
    fraccionPausa: number;
}

interface Contexto {
    banco: BancoEstado;
    ejecutor: EjecutorTrabajoSemana;
    cola: ColaEnMemoria;
    plan: PlanAnalisisEnMemoria;
    almacen: AlmacenEstadoEjecucionEnMemoria;
    temporizador: TemporizadorManual;
    gestor: GestorEjecucionService;
}

function planDe(config: ConfigAnalisis): PlanAnalisisEnMemoria {
    const plan = new PlanAnalisisEnMemoria();
    plan.registrar(config.analisisId, {
        instituciones: [...config.instituciones],
        totalSemanas: config.totalSemanas,
    });
    return plan;
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
 * Monta un `GestorEjecucionService` real (tarea 17.1) sobre la infraestructura
 * deterministas: el mismo `PlanAnalisis`/cola en memoria que drena el ejecutor
 * real, la `HerramientaAceleracion` y el `ProgramadorTemporal` reales (con reloj
 * fijo) y el `TemporizadorManual` inyectable (contador del Tiempo_Real disparable).
 */
function montar(config: ConfigAnalisis): Contexto {
    const banco = new BancoEstado();
    const procesador = new ProcesadorRegistrador(banco);
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
// Drenado FIFO con el ejecutor real (idempotente)
// ===========================================================================

/**
 * Drena hasta `restante` trabajos de la cola en orden FIFO, ejecutando cada uno
 * con el `EjecutorTrabajoSemana` real. Tras COMPLETAR (no omitir) una semana,
 * actualiza el `PlanAnalisis` para que el siguiente disparo encole la siguiente
 * pendiente. Devuelve los trabajos efectivamente completados, en orden.
 */
async function drenarHasta(
    ctx: Contexto,
    restante: number,
): Promise<DatosTrabajoSemana[]> {
    const completados: DatosTrabajoSemana[] = [];
    while (restante > 0 && ctx.cola.pendientes.length > 0) {
        const datos = ctx.cola.pendientes.shift()!;
        const contexto: ContextoIntento = { intento: 1, maxIntentos: MAX_INTENTOS };
        const r = await ctx.ejecutor.ejecutar(datos, contexto);
        if (r.estado === EstadoTrabajo.COMPLETADO && !r.omitido) {
            ctx.plan.fijarCompletadas(
                datos.analisisId,
                datos.institucionId,
                datos.numeroSemana,
            );
            completados.push(datos);
            restante--;
        }
    }
    return completados;
}

/** Drena TODOS los trabajos pendientes (sin limite). */
function drenarTodo(ctx: Contexto): Promise<DatosTrabajoSemana[]> {
    return drenarHasta(ctx, Number.POSITIVE_INFINITY);
}

/** `true` si el `Analisis` aun tiene `Semana_Simulada` pendientes en el plan. */
async function quedanPendientes(
    ctx: Contexto,
    config: ConfigAnalisis,
): Promise<boolean> {
    for (const inst of config.instituciones) {
        const ultima = await ctx.plan.ultimaSemanaCompletada(config.analisisId, inst);
        if (ultima < config.totalSemanas) return true;
    }
    return false;
}

// ===========================================================================
// Fases: avanzar hasta el punto de pausa, y completar tras reanudar
// ===========================================================================

/**
 * Arranca el `Analisis` en su `Modo_Ejecucion` y procesa EXACTAMENTE
 * `objetivoPausa` semanas (globales), dejando el resto pendiente: ese es el
 * "punto de pausa".
 *  - Automatico: `avanzar` encola TODAS las pendientes de golpe; se drena hasta
 *    el objetivo (el resto queda encolado, simulando al worker detenido).
 *  - Tiempo_Real: `avanzar` encola la primera por institucion y arranca el
 *    contador; se drena y, si falta, se disparan vencimientos hasta el objetivo.
 */
async function avanzarHastaPausa(
    ctx: Contexto,
    config: ConfigAnalisis,
    objetivoPausa: number,
): Promise<DatosTrabajoSemana[]> {
    await ctx.gestor.seleccionarModo(
        config.analisisId,
        config.modo,
        config.modo === "TIEMPO_REAL" ? INTERVALO_TR_MS : undefined,
    );

    await ctx.gestor.avanzar(config.analisisId);

    const completados: DatosTrabajoSemana[] = [];
    completados.push(...(await drenarHasta(ctx, objetivoPausa - completados.length)));

    if (config.modo === "TIEMPO_REAL") {
        const guardMax = objetivoPausa + config.instituciones.length + 5;
        let guard = 0;
        while (completados.length < objetivoPausa && guard++ < guardMax) {
            const { estadoEjecucion } = await ctx.almacen.obtener(config.analisisId);
            if (estadoEjecucion !== "EN_EJECUCION") break;
            await ctx.temporizador.disparar(); // contador -> tick encola la siguiente
            completados.push(
                ...(await drenarHasta(ctx, objetivoPausa - completados.length)),
            );
        }
    }
    return completados;
}

/**
 * Tras `reanudar`, lleva el `Analisis` hasta el final:
 *  - Automatico: drena las pendientes (las restantes y/o reencoladas, dedupe).
 *  - Tiempo_Real: drena y dispara vencimientos hasta que el contador marque el
 *    `Analisis` COMPLETADO.
 */
async function completarTrasReanudar(
    ctx: Contexto,
    config: ConfigAnalisis,
): Promise<DatosTrabajoSemana[]> {
    const completados: DatosTrabajoSemana[] = [];
    completados.push(...(await drenarTodo(ctx)));

    if (config.modo === "TIEMPO_REAL") {
        const guardMax =
            config.totalSemanas * config.instituciones.length +
            config.instituciones.length +
            5;
        let guard = 0;
        while (guard++ < guardMax) {
            const { estadoEjecucion } = await ctx.almacen.obtener(config.analisisId);
            if (estadoEjecucion === "COMPLETADO") break;
            await ctx.temporizador.disparar();
            completados.push(...(await drenarTodo(ctx)));
        }
    }
    return completados;
}

/** Agrupa una lista de trabajos por institucion en numeros de semana ascendentes. */
function semanasPorInstitucion(
    trabajos: DatosTrabajoSemana[],
): Map<string, number[]> {
    const m = new Map<string, number[]>();
    for (const t of trabajos) {
        const lista = m.get(t.institucionId) ?? [];
        lista.push(t.numeroSemana);
        m.set(t.institucionId, lista);
    }
    for (const lista of m.values()) lista.sort((a, b) => a - b);
    return m;
}

// ===========================================================================
// Generador `analisisPausaArb` y la propiedad
// ===========================================================================

/**
 * `analisisPausaArb`: un `Analisis` en `Modo_Ejecucion` Automatico o Tiempo_Real,
 * con instituciones (1..3) y total de semanas (1..6) acotados para que las 100
 * iteraciones se ejecuten rapido y de forma sincrona, mas una `fraccionPausa`
 * que decide el punto de pausa.
 */
const analisisPausaArb: fc.Arbitrary<ConfigAnalisis> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4"), {
        minLength: 1,
        maxLength: 3,
    }),
    totalSemanas: fc.integer({ min: 1, max: 6 }),
    modo: fc.constantFrom<Extract<ModoEjecucion, "AUTOMATICO" | "TIEMPO_REAL">>(
        "AUTOMATICO",
        "TIEMPO_REAL",
    ),
    fraccionPausa: fc.double({ min: 0, max: 1, noNaN: true }),
});

describe("Property 36: pausa y reanudacion conservan estado consistente (Req. 32.6, 32.8)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 36: Pausa y reanudación conservan estado consistente
    it("las semanas completadas permanecen firmes y la reanudacion continua desde la siguiente pendiente sin repetir ni omitir", async () => {
        await fc.assert(
            fc.asyncProperty(analisisPausaArb, async (config) => {
                const totalTrabajos =
                    config.totalSemanas * config.instituciones.length;
                // El punto de pausa deja SIEMPRE al menos una semana pendiente
                // (en [0, totalTrabajos - 1]) para que la pausa sea significativa.
                const objetivoPausa = Math.min(
                    totalTrabajos - 1,
                    Math.floor(config.fraccionPausa * totalTrabajos),
                );

                const ctx = montar(config);

                // --- Fase 1: avanzar hasta el punto de pausa -------------------
                const completadosAntes = await avanzarHastaPausa(
                    ctx,
                    config,
                    objetivoPausa,
                );

                // El punto de pausa proceso EXACTAMENTE el objetivo de semanas, y
                // cada una se proceso una sola vez (idempotencia hasta aqui).
                expect(completadosAntes).toHaveLength(objetivoPausa);
                expect(ctx.banco.procesadas.size).toBe(objetivoPausa);
                for (const veces of ctx.banco.procesadas.values()) {
                    expect(veces).toBe(1);
                }
                // Por institucion, lo completado antes de la pausa es un PREFIJO
                // contiguo {1..m_i} (sin huecos): orden creciente y contiguo.
                const antesPorInst = semanasPorInstitucion(completadosAntes);
                for (const [, semanas] of antesPorInst) {
                    const esperadas = Array.from(
                        { length: semanas.length },
                        (_, idx) => idx + 1,
                    );
                    expect(semanas).toEqual(esperadas);
                }

                // Instantanea de lo completado: debe permanecer FIRME tras pausar.
                const clavesAntes = [...ctx.banco.procesadas.keys()].sort();

                // --- Fase 2: PAUSAR --------------------------------------------
                // Solo se pausa un Analisis EN_EJECUCION (Automatico/Tiempo_Real).
                const previo = await ctx.almacen.obtener(config.analisisId);
                expect(previo.estadoEjecucion).toBe("EN_EJECUCION");

                await ctx.gestor.pausar(config.analisisId);

                const pausado = await ctx.almacen.obtener(config.analisisId);
                expect(pausado.estadoEjecucion).toBe("PAUSADO");
                // Tiempo_Real: pausar cancela el contador (no quedan contadores activos).
                if (config.modo === "TIEMPO_REAL") {
                    expect(ctx.temporizador.activos).toBe(0);
                }
                // Las semanas completadas permanecen FIRMES: ni se borran ni se
                // reprocesan al pausar (estado consistente, Req. 32.6/32.8).
                expect([...ctx.banco.procesadas.keys()].sort()).toEqual(clavesAntes);
                for (const veces of ctx.banco.procesadas.values()) {
                    expect(veces).toBe(1);
                }
                // En el punto de pausa siguen quedando semanas pendientes.
                expect(await quedanPendientes(ctx, config)).toBe(true);

                // --- Fase 3: REANUDAR y completar ------------------------------
                await ctx.gestor.reanudar(config.analisisId);
                const completadosDespues = await completarTrasReanudar(ctx, config);

                // (A) La reanudacion NO reprocesa ninguna semana ya completada
                //     antes de la pausa (continua desde la siguiente pendiente).
                const setAntes = new Set(clavesAntes);
                for (const datos of completadosDespues) {
                    expect(setAntes.has(claveTrabajo(datos))).toBe(false);
                }

                // (B) Completitud SIN OMISIONES: cada `(A,I)` proceso justo
                //     {1..totalSemanas}, contiguo y sin huecos.
                for (const inst of config.instituciones) {
                    const semanas = ctx.banco.semanasDe(config.analisisId, inst);
                    const esperadas = Array.from(
                        { length: config.totalSemanas },
                        (_, idx) => idx + 1,
                    );
                    expect(semanas).toEqual(esperadas);
                }

                // (C) SIN REPETICIONES: cada semana se proceso EXACTAMENTE una vez
                //     en todo el recorrido (pausa + reanudacion).
                expect(ctx.banco.procesadas.size).toBe(totalTrabajos);
                for (const veces of ctx.banco.procesadas.values()) {
                    expect(veces).toBe(1);
                }

                // (D) Las semanas completadas antes de la pausa siguen presentes
                //     (firmes) en el estado final.
                for (const clave of clavesAntes) {
                    expect(ctx.banco.procesadas.get(clave)).toBe(1);
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
