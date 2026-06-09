/**
 * PBT - Property 35: El modo manual avanza exactamente una semana pendiente
 * (tarea 17.3).
 *
 * Texto de la propiedad (design.md):
 * "Para todo `Analisis` en `Modo_Ejecucion` Manual, cada solicitud explicita de
 *  avance procesa EXACTAMENTE la siguiente `Semana_Simulada` pendiente por
 *  institucion (`ultimaSemanaCompletada + 1`), sin saltar, repetir ni adelantar
 *  semanas; tras agotar las semanas pendientes, una nueva solicitud no encola
 *  nada y el `Analisis` queda COMPLETADO."
 *
 * Se verifica de forma SINCRONA y DETERMINISTA (sin Redis, sin BD, sin red),
 * conforme a las restricciones Windows/cmd del plan y reutilizando el UNICO
 * `GestorEjecucionService` (tarea 17.1):
 *
 *  - **Cola en memoria de ejecucion inmediata**: un `EncoladorSemana` doble
 *    (`ColaEnMemoria`) acumula los trabajos `(A,I,N)` que la solicitud manual
 *    encola (via `HerramientaAceleracion.avanzarUnaSemana`); un "drenado" FIFO
 *    los ejecuta con el `EjecutorTrabajoSemana` real (idempotencia + cerrojo +
 *    estado consultable) y un `ProcesadorSemanaPort` doble determinista.
 *  - **Relojes e IDs inyectables**: `RelojFijo` + `GeneradorIdSecuencial` en el
 *    registro de estado de la cola, y `RelojFijo` en los disparadores.
 *  - **Contador del Tiempo_Real inyectable**: `TemporizadorManual` (el modo
 *    Manual no lo usa, pero el `GestorEjecucionService` lo exige por constructor).
 *
 * El modo Manual reutiliza el MISMO `procesarSemana` por la MISMA cola que los
 * otros modos: solo cambia QUIEN dispara (una solicitud explicita por semana) y
 * CUANTO avanza (exactamente una semana pendiente por institucion, Req. 32.2).
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 32.2**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 35: El modo manual avanza exactamente una semana pendiente
import fc from "fast-check";

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

// ===========================================================================
// "Banco de estado" en memoria: semanas procesadas (idempotencia + duplicados)
// ===========================================================================

/**
 * Estado final de la "BD" del `Analisis` para esta propiedad: cuantas veces se
 * proceso cada `Semana_Simulada` `(A,I,N)`. Sirve para verificar idempotencia
 * (ninguna semana se procesa dos veces) y completitud (sin saltos).
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
 * no-determinismo ni azar; basta para verificar el avance manual.
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

// ===========================================================================
// Montaje del recorrido manual gobernado por el GestorEjecucion
// ===========================================================================

interface ConfigAnalisis {
    analisisId: string;
    instituciones: string[];
    totalSemanas: number;
}

interface Contexto {
    banco: BancoEstado;
    ejecutor: EjecutorTrabajoSemana;
    cola: ColaEnMemoria;
    plan: PlanAnalisisEnMemoria;
    almacen: AlmacenEstadoEjecucionEnMemoria;
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
 * fijo) y el `TemporizadorManual` inyectable.
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
    return { banco, ejecutor, cola, plan, almacen, gestor };
}

/**
 * Drena la cola en orden FIFO ejecutando cada trabajo con el `EjecutorTrabajoSemana`
 * real. Tras COMPLETAR una semana, actualiza el `PlanAnalisis` (ultima semana
 * completada) para que la siguiente solicitud manual encole la siguiente
 * pendiente. Devuelve los trabajos completados en orden.
 */
async function drenar(ctx: Contexto): Promise<DatosTrabajoSemana[]> {
    const completados: DatosTrabajoSemana[] = [];
    while (ctx.cola.pendientes.length > 0) {
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
        }
    }
    return completados;
}

// ===========================================================================
// Generador `analisisManualArb` y la propiedad
// ===========================================================================

/**
 * `analisisManualArb`: un `Analisis` con instituciones (1..4) y total de semanas
 * (1..8) acotado para que las 100 iteraciones se ejecuten rapido y de forma
 * sincrona.
 */
const analisisManualArb: fc.Arbitrary<ConfigAnalisis> = fc.record({
    analisisId: fc.constantFrom("an-1", "an-2", "an-x"),
    instituciones: fc.uniqueArray(fc.constantFrom("i1", "i2", "i3", "i4"), {
        minLength: 1,
        maxLength: 4,
    }),
    totalSemanas: fc.integer({ min: 1, max: 8 }),
});

describe("Property 35: el modo manual avanza exactamente una semana pendiente (Req. 32.2)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 35: El modo manual avanza exactamente una semana pendiente
    it("cada solicitud manual procesa exactamente la siguiente semana pendiente por institucion, sin saltar ni repetir", async () => {
        await fc.assert(
            fc.asyncProperty(analisisManualArb, async (config) => {
                const ctx = montar(config);
                await ctx.gestor.seleccionarModo(config.analisisId, "MANUAL");

                // Ultima semana completada esperada por institucion (arranca en 0).
                const completadasPorInst = new Map<string, number>(
                    config.instituciones.map((i) => [i, 0]),
                );

                // Una solicitud manual por semana, mas un margen para verificar que
                // la solicitud "de mas" no encola nada.
                const maxSolicitudes = config.totalSemanas + 2;
                for (let k = 1; k <= maxSolicitudes; k++) {
                    // Instituciones que aun tienen semanas pendientes ANTES de avanzar.
                    const pendientesAntes = config.instituciones.filter(
                        (i) => completadasPorInst.get(i)! < config.totalSemanas,
                    );

                    const r = await ctx.gestor.avanzarManual(config.analisisId);

                    if (pendientesAntes.length === 0) {
                        // Sin pendientes: la solicitud no encola nada y queda COMPLETADO.
                        expect(r.avance.encolados).toHaveLength(0);
                        expect(r.estadoEjecucion).toBe("COMPLETADO");
                        continue;
                    }

                    // (1) Avanza EXACTAMENTE una semana por institucion pendiente:
                    //     un encolado por institucion pendiente, ni mas ni menos.
                    expect(r.avance.encolados).toHaveLength(pendientesAntes.length);
                    expect(r.estadoEjecucion).toBe("DETENIDO");

                    // (2) Cada encolado es la SIGUIENTE semana pendiente de su
                    //     institucion (ultimaCompletada + 1): ni salta ni adelanta.
                    const porInstitucion = new Map<string, number[]>();
                    for (const enc of r.avance.encolados) {
                        const lista =
                            porInstitucion.get(enc.datos.institucionId) ?? [];
                        lista.push(enc.datos.numeroSemana);
                        porInstitucion.set(enc.datos.institucionId, lista);
                    }
                    for (const inst of pendientesAntes) {
                        const semanas = porInstitucion.get(inst) ?? [];
                        // Exactamente UNA semana por institucion en esta solicitud.
                        expect(semanas).toHaveLength(1);
                        // Y es la contigua siguiente a la ultima completada.
                        expect(semanas[0]).toBe(completadasPorInst.get(inst)! + 1);
                    }
                    // Ninguna institucion ya completa recibe trabajo.
                    for (const enc of r.avance.encolados) {
                        expect(pendientesAntes).toContain(enc.datos.institucionId);
                    }

                    // (3) Drenar: se procesa exactamente la semana encolada y se
                    //     actualiza la ultima completada (+1 por institucion).
                    const completados = await drenar(ctx);
                    expect(completados).toHaveLength(pendientesAntes.length);
                    for (const inst of pendientesAntes) {
                        completadasPorInst.set(
                            inst,
                            completadasPorInst.get(inst)! + 1,
                        );
                    }
                }

                // (4) Completitud y NO duplicacion: cada `(A,I)` proceso justo
                //     {1..totalSemanas}, una sola vez cada semana (idempotencia).
                for (const inst of config.instituciones) {
                    const semanas = ctx.banco.semanasDe(config.analisisId, inst);
                    const esperadas = Array.from(
                        { length: config.totalSemanas },
                        (_, idx) => idx + 1,
                    );
                    expect(semanas).toEqual(esperadas);
                }
                // Cada semana se proceso EXACTAMENTE una vez (sin reprocesos).
                for (const veces of ctx.banco.procesadas.values()) {
                    expect(veces).toBe(1);
                }

                // (5) Estado final del `Analisis`: COMPLETADO.
                const { estadoEjecucion } = await ctx.almacen.obtener(
                    config.analisisId,
                );
                expect(estadoEjecucion).toBe("COMPLETADO");
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
