/**
 * PBT - Property 8: Reanudacion idempotente del pipeline y de la cola (tarea 16.4).
 *
 * Texto de la propiedad (design.md):
 * "Para toda ejecucion que falle en una etapa `K`, reanudar el pipeline no
 *  re-ejecuta las etapas anteriores a `K` ni duplica resultados ya persistidos,
 *  y produce el mismo resultado final que una ejecucion sin fallo; reintentar el
 *  trabajo en la `Cola_Trabajos` (BullMQ) con el mismo `job_id` no duplica
 *  resultados para esa `(Analisis, Institucion, Semana)`."
 *
 * Esta propiedad tiene DOS clausulas, ambas verificadas aqui de forma SINCRONA y
 * DETERMINISTA (sin Redis ni BD), conforme a las restricciones Windows/cmd:
 *
 *  (A) Reanudacion del PIPELINE (Req. 13.4): con el `OrquestadorPipeline` real y
 *      las etapas transformadoras reales (limpieza -> normalizacion ->
 *      anonimizacion via `crearManejadoresEtapa`, cableadas al
 *      `Servicio_Anonimizacion` real), una ejecucion que falla en la etapa `K`
 *      se reanuda desde `K` sin re-ejecutar ni duplicar las etapas previas, y
 *      produce el mismo resultado final (contrato + etapas) que una ejecucion sin
 *      fallo sobre el mismo contrato y salt.
 *
 *  (B) Idempotencia de la COLA (Req. 27.2, 38.3): con el `EjecutorTrabajoSemana`
 *      real, un `procesarSemana` doble con persistencia ATOMICA en memoria (un
 *      fallo no deja resultado) y una `ConsultaResultadoSemana` respaldada por el
 *      mismo almacen, se simula el ciclo de reintentos de BullMQ con el MISMO
 *      `jobId` determinista: tras fallos transitorios reprocesa sin duplicar, y
 *      una vez persistido el resultado, los reintentos/re-encolados posteriores
 *      con el mismo `jobId` se omiten por idempotencia. El resultado por
 *      `(Analisis, Institucion, Semana)` queda persistido EXACTAMENTE una vez.
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 13.4, 27.2, 38.3**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 8: Reanudacion idempotente del pipeline y de la cola
import fc from "fast-check";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { servicioAnonimizacion } from "../../analisis";
import { crearManejadoresEtapa } from "../../pipeline/etapas";
import {
    ErrorEtapaPipeline,
    EtapaPipeline,
    ORDEN_ETAPAS,
    OrquestadorPipeline,
    estadoPipelineInicial,
    type ManejadoresEtapa,
} from "../../pipeline/pipeline";
import type { ResultadoProcesarSemana } from "../procesarSemana";
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from "./adaptadores-memoria";
import { EjecutorTrabajoSemana, type ContextoIntento } from "./ejecutor-trabajo-semana";
import { EstadoTrabajo } from "./estados-trabajo";
import type { ConsultaResultadoSemana, ProcesadorSemanaPort } from "./puertos-cola";
import {
    claveTrabajo,
    jobIdSemana,
    type DatosTrabajoSemana,
} from "./trabajo-semana";

const NUM_RUNS = 100;

// ===========================================================================
// Clausula (A): reanudacion idempotente del Pipeline_Analisis (Req. 13.4)
// ===========================================================================

/** Identificador sintetico original distintivo (no colisiona con seudonimos). */
const idOriginalArb: fc.Arbitrary<string> = fc.uuid().map((u) => `usr-orig-${u}`);

/** Texto sin identificadores embebidos (los ids viven solo en campos de id). */
const textoArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant(""),
    fc.constantFrom(
        "que paro mas largo",
        "no aguanto el bloqueo",
        "examenes otra vez",
        "tipico de la u",
        "ñandú áéíóú",
    ),
);

/** Salt arbitrario para la anonimizacion (incluye vacio y no-ASCII). */
const saltArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant(""),
    fc.string({ minLength: 1, maxLength: 24 }),
);

/**
 * Genera un `Contrato_Normalizado` cuyos identificadores de autor provienen de
 * un conjunto distintivo. Las referencias `enRespuestaA` apuntan al autor del
 * post (conocido) o son `null`: el `Servicio_Anonimizacion` solo seudonimiza
 * referencias a autores conocidos.
 */
const contratoArb: fc.Arbitrary<ContratoNormalizado> = fc
    .uniqueArray(idOriginalArb, { minLength: 1, maxLength: 5 })
    .chain((ids) =>
        fc
            .record({
                postAutor: fc.constantFrom(...ids),
                postTexto: textoArb,
                imageDescription: textoArb,
                hashtags: fc.array(fc.constantFrom("#paro", "#u", "#crisis"), {
                    maxLength: 4,
                }),
                comments: fc.array(
                    fc.record({
                        autorId: fc.constantFrom(...ids),
                        texto: textoArb,
                    }),
                    { maxLength: 6 },
                ),
                semana: fc.integer({ min: 1, max: 24 }),
            })
            .map(
                ({
                    postAutor,
                    postTexto,
                    imageDescription,
                    hashtags,
                    comments,
                    semana,
                }): ContratoNormalizado => ({
                    post: { autorId: postAutor, texto: postTexto },
                    comments: comments.map((c, i) => ({
                        autorId: c.autorId,
                        texto: c.texto,
                        enRespuestaA: i % 2 === 0 ? null : postAutor,
                    })),
                    image_description: imageDescription,
                    hashtags,
                    metadata: {
                        version: "1.0.0",
                        fuente: "test",
                        generadoEn: "2024-01-01T00:00:00.000Z",
                        semana,
                        idioma: "es-BO",
                    },
                }),
            ),
    );

interface ManejadoresInstrumentados {
    manejadores: ManejadoresEtapa;
    /** Orden de etapas REALMENTE ejecutadas (incluye intentos fallidos). */
    ordenEjecucion: EtapaPipeline[];
    /** Etapas cuyo resultado quedo "persistido" (en el almacen compartido). */
    persistidos: EtapaPipeline[];
}

/**
 * Construye manejadores que envuelven a las etapas transformadoras reales
 * (limpieza/normalizacion/anonimizacion) y a las etapas restantes (sin
 * transformacion). Cada etapa registra su ejecucion y "persiste" su resultado.
 * Si `fallarEn` esta definido, esa etapa lanza UNA sola vez (primer intento),
 * permitiendo reanudar despues.
 */
function crearManejadoresInstrumentados(
    salt: string,
    fallarEn?: EtapaPipeline,
): ManejadoresInstrumentados {
    const reales = crearManejadoresEtapa({
        anonimizacion: { servicio: servicioAnonimizacion, salt },
    });
    const ordenEjecucion: EtapaPipeline[] = [];
    const persistidos: EtapaPipeline[] = [];
    const yaFallo = { valor: false };

    const manejadores: ManejadoresEtapa = {};
    for (const etapa of ORDEN_ETAPAS) {
        manejadores[etapa] = async (contrato, estado) => {
            ordenEjecucion.push(etapa);
            if (etapa === fallarEn && !yaFallo.valor) {
                yaFallo.valor = true;
                throw new Error(`fallo simulado en la etapa ${etapa}`);
            }
            const transformado = await reales[etapa]?.(contrato, estado);
            persistidos.push(etapa);
            return transformado;
        };
    }

    return { manejadores, ordenEjecucion, persistidos };
}

function contar(lista: EtapaPipeline[], etapa: EtapaPipeline): number {
    return lista.filter((e) => e === etapa).length;
}

describe("Property 8 (A): reanudacion idempotente del Pipeline_Analisis (Req. 13.4)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 8: Reanudacion idempotente del pipeline y de la cola
    it("reanuda desde la etapa fallida K sin re-ejecutar ni duplicar las etapas previas y produce el mismo resultado final que una ejecucion sin fallo", async () => {
        await fc.assert(
            fc.asyncProperty(
                contratoArb,
                saltArb,
                fc.constantFrom(...ORDEN_ETAPAS),
                async (contrato, salt, etapaK) => {
                    const idxK = ORDEN_ETAPAS.indexOf(etapaK);
                    const etapasPreviasK = ORDEN_ETAPAS.slice(0, idxK);

                    // 1) Ejecucion de referencia SIN fallo (mismo contrato/salt).
                    const sinFallo = crearManejadoresInstrumentados(salt);
                    const resultadoSinFallo = await new OrquestadorPipeline(
                        sinFallo.manejadores,
                    ).ejecutar(contrato, estadoPipelineInicial());

                    expect(resultadoSinFallo.etapasCompletadas).toEqual([
                        ...ORDEN_ETAPAS,
                    ]);
                    expect(sinFallo.persistidos).toEqual([...ORDEN_ETAPAS]);

                    // 2) Ejecucion que falla en la etapa K (almacen compartido
                    //    entre el intento fallido y la reanudacion).
                    const conFallo = crearManejadoresInstrumentados(salt, etapaK);
                    const orquestador = new OrquestadorPipeline(
                        conFallo.manejadores,
                        { error: () => { } }, // logger silencioso en pruebas
                    );

                    let error: ErrorEtapaPipeline | undefined;
                    try {
                        await orquestador.ejecutar(contrato, estadoPipelineInicial());
                    } catch (e) {
                        error = e as ErrorEtapaPipeline;
                    }

                    expect(error).toBeInstanceOf(ErrorEtapaPipeline);
                    expect(error!.etapa).toBe(etapaK);
                    expect(error!.etapasCompletadas).toEqual([...etapasPreviasK]);
                    // Solo las etapas anteriores a K quedaron persistidas; K no.
                    expect(conFallo.persistidos).toEqual([...etapasPreviasK]);

                    // 3) Reanudacion desde el estado persistido (mismo almacen).
                    const resultadoReanudado = await orquestador.ejecutar(
                        error!.contrato,
                        { etapasCompletadas: [...error!.etapasCompletadas] },
                    );

                    // (a) Las etapas anteriores a K NO se re-ejecutan.
                    for (const etapa of etapasPreviasK) {
                        expect(contar(conFallo.ordenEjecucion, etapa)).toBe(1);
                    }
                    // K se ejecuto dos veces: el intento fallido y la reanudacion.
                    expect(contar(conFallo.ordenEjecucion, etapaK)).toBe(2);

                    // (b) No se duplican resultados ya persistidos.
                    expect(conFallo.persistidos).toEqual([...ORDEN_ETAPAS]);
                    expect(new Set(conFallo.persistidos).size).toBe(
                        ORDEN_ETAPAS.length,
                    );

                    // (c) Mismo resultado final que una ejecucion sin fallo.
                    expect(resultadoReanudado.etapasCompletadas).toEqual([
                        ...ORDEN_ETAPAS,
                    ]);
                    expect(resultadoReanudado.contrato).toEqual(
                        resultadoSinFallo.contrato,
                    );
                },
            ),
            { numRuns: NUM_RUNS },
        );
    });
});

// ===========================================================================
// Clausula (B): idempotencia de la Cola_Trabajos con el mismo job_id
//               (Req. 27.2, 38.3)
// ===========================================================================

/**
 * Almacen en memoria de resultados de `procesarSemana`, indexado por la clave
 * `(A,I,N)`. Modela la persistencia ATOMICA: un resultado se registra UNA vez al
 * completar; un fallo no escribe nada. Permite verificar que no haya duplicados.
 */
class AlmacenResultados {
    private readonly porClave = new Map<string, ResultadoProcesarSemana[]>();

    guardar(datos: DatosTrabajoSemana, resultado: ResultadoProcesarSemana): void {
        const clave = claveTrabajo(datos);
        const lista = this.porClave.get(clave) ?? [];
        lista.push(resultado);
        this.porClave.set(clave, lista);
    }

    tiene(datos: DatosTrabajoSemana): boolean {
        return (this.porClave.get(claveTrabajo(datos))?.length ?? 0) > 0;
    }

    conteo(datos: DatosTrabajoSemana): number {
        return this.porClave.get(claveTrabajo(datos))?.length ?? 0;
    }
}

/**
 * `procesarSemana` doble con persistencia atomica: falla las primeras
 * `fallosTransitorios[clave]` veces (sin persistir) y, a partir de ahi, persiste
 * EXACTAMENTE un resultado en el almacen. Reproduce la garantia de atomicidad de
 * `procesarSemana` (tarea 16.1): un intento fallido no deja resultado.
 */
class ProcesadorAtomicoDoble implements ProcesadorSemanaPort {
    /** Numero total de invocaciones (para verificar reprocesos controlados). */
    invocaciones = 0;

    constructor(
        private readonly almacen: AlmacenResultados,
        private readonly fallosTransitorios: Map<string, number>,
    ) { }

    async procesarSemana(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoProcesarSemana> {
        this.invocaciones += 1;
        const datos: DatosTrabajoSemana = { analisisId, institucionId, numeroSemana };
        const clave = claveTrabajo(datos);

        const restantes = this.fallosTransitorios.get(clave) ?? 0;
        if (restantes > 0) {
            this.fallosTransitorios.set(clave, restantes - 1);
            // Fallo ANTES de persistir: la transaccion se revierte (atomicidad),
            // por lo que el almacen no recibe nada.
            throw new Error(`fallo transitorio de procesarSemana en ${clave}`);
        }

        const resultado: ResultadoProcesarSemana = {
            analisisId,
            institucionId,
            comunidadId: `c-${institucionId}`,
            numeroSemana,
            resultadoId: `res-${clave}`,
            etapasCompletadas: [...ORDEN_ETAPAS],
        };
        this.almacen.guardar(datos, resultado);
        return resultado;
    }
}

/** `ConsultaResultadoSemana` respaldada por el almacen real (idempotencia real). */
class ConsultaSobreAlmacen implements ConsultaResultadoSemana {
    constructor(private readonly almacen: AlmacenResultados) { }
    async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
        return this.almacen.tiene(datos);
    }
}

/** Trabajo `(A,I,N)` con un numero acotado de fallos transitorios iniciales. */
const trabajoConFallosArb = fc.record({
    analisisId: fc.constantFrom("a1", "a2", "a3"),
    institucionId: fc.constantFrom("i1", "i2", "i3"),
    numeroSemana: fc.integer({ min: 1, max: 12 }),
    // Fallos transitorios estrictamente menores que maxIntentos-1, de modo que
    // el trabajo SIEMPRE acaba completandose dentro de los reintentos acotados.
    fallosTransitorios: fc.integer({ min: 0, max: 2 }),
    // Re-encolados redundantes posteriores al exito (mismo job_id) (Req. 38.3).
    reEncoladosRedundantes: fc.integer({ min: 0, max: 3 }),
});

const MAX_INTENTOS = 5;

/**
 * Simula el ciclo de reintentos de BullMQ sobre el MISMO `jobId` determinista:
 * intenta hasta `MAX_INTENTOS`, relanzando en cada fallo (como haria la cola con
 * backoff) hasta completar u omitir. Devuelve el estado final observado.
 */
async function ejecutarConReintentos(
    ejecutor: EjecutorTrabajoSemana,
    datos: DatosTrabajoSemana,
): Promise<EstadoTrabajo> {
    let estadoFinal = EstadoTrabajo.PENDIENTE;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        const contexto: ContextoIntento = { intento, maxIntentos: MAX_INTENTOS };
        try {
            const r = await ejecutor.ejecutar(datos, contexto);
            estadoFinal = r.estado;
            if (r.estado === EstadoTrabajo.COMPLETADO) {
                return estadoFinal;
            }
        } catch {
            // Fallo transitorio: BullMQ reintentaria con el mismo jobId.
            estadoFinal = EstadoTrabajo.PENDIENTE;
        }
    }
    return estadoFinal;
}

describe("Property 8 (B): idempotencia de la Cola_Trabajos con el mismo job_id (Req. 27.2, 38.3)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 8: Reanudacion idempotente del pipeline y de la cola
    it("reintentar/re-encolar el mismo job_id no duplica resultados para (Analisis, Institucion, Semana)", async () => {
        await fc.assert(
            fc.asyncProperty(trabajoConFallosArb, async (caso) => {
                const datos: DatosTrabajoSemana = {
                    analisisId: caso.analisisId,
                    institucionId: caso.institucionId,
                    numeroSemana: caso.numeroSemana,
                };

                const almacen = new AlmacenResultados();
                const fallos = new Map<string, number>([
                    [claveTrabajo(datos), caso.fallosTransitorios],
                ]);
                const procesador = new ProcesadorAtomicoDoble(almacen, fallos);
                const ejecutor = new EjecutorTrabajoSemana({
                    procesador,
                    cerrojo: new CerrojoConcurrenciaEnMemoria(),
                    consultaResultado: new ConsultaSobreAlmacen(almacen),
                    registro: new RegistroEstadoTrabajosEnMemoria(
                        new RelojFijo(new Date("2024-03-01T00:00:00.000Z")),
                        new GeneradorIdSecuencial("reg"),
                    ),
                });

                const jobId = jobIdSemana(datos);

                // 1) Ciclo de reintentos de BullMQ (mismo jobId) hasta completar.
                const estadoFinal = await ejecutarConReintentos(ejecutor, datos);
                expect(estadoFinal).toBe(EstadoTrabajo.COMPLETADO);

                // El resultado quedo persistido EXACTAMENTE una vez pese a los
                // fallos transitorios y reintentos (atomicidad + idempotencia).
                expect(almacen.conteo(datos)).toBe(1);
                // procesarSemana se invoco solo en los intentos no omitidos:
                // (fallosTransitorios fallidos) + 1 exitoso.
                expect(procesador.invocaciones).toBe(caso.fallosTransitorios + 1);

                // 2) Re-encolados/reintentos REDUNDANTES con el MISMO jobId tras
                //    el exito: se omiten por idempotencia, sin duplicar (Req. 38.3).
                const invocacionesTrasExito = procesador.invocaciones;
                for (let k = 0; k < caso.reEncoladosRedundantes; k++) {
                    const intento = MAX_INTENTOS + k + 1;
                    const r = await ejecutor.ejecutar(datos, {
                        intento,
                        maxIntentos: MAX_INTENTOS + caso.reEncoladosRedundantes + 1,
                    });
                    expect(r.omitido).toBe(true);
                    expect(r.motivoOmision).toBe("idempotencia");
                    expect(r.estado).toBe(EstadoTrabajo.COMPLETADO);
                    // El jobId es DETERMINISTA: estable para la misma triada (A,I,N).
                    expect(r.jobId).toBe(jobId);
                }

                // No se reproceso ni duplico nada en los re-encolados redundantes.
                expect(procesador.invocaciones).toBe(invocacionesTrasExito);
                expect(almacen.conteo(datos)).toBe(1);
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
