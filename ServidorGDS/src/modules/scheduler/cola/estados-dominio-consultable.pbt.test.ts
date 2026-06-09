/**
 * PBT - Property 26: Dominio consultable de estados de ciclo y de trabajo
 * (tarea 16.10).
 *
 * Texto de la propiedad (design.md):
 * "Para todo `Ciclo_Semanal` y todo trabajo de la `Cola_Trabajos`, su estado
 *  consultable pertenece al conjunto {PENDIENTE, EN_PROCESO, COMPLETADO,
 *  FALLIDO}."
 *
 * El dominio de estados es CERRADO y CONSULTABLE (Req. 27.5 para el ciclo,
 * Req. 38.5 para el trabajo de la cola). En esta plataforma, el estado de cada
 * `Ciclo_Semanal` y el de su trabajo `(A,I,N)` en la `Cola_Trabajos` comparten
 * el mismo dominio (`EstadoTrabajo`) y se exponen por la MISMA frontera
 * consultable (`RegistroEstadoTrabajos`, respaldada en produccion por
 * `gds_ciclo_semanal`/Redis). Verificar la membresia sobre esa frontera cubre,
 * por tanto, ambos requisitos a la vez.
 *
 * Estrategia (SINCRONA y DETERMINISTA, sin Redis ni BD, conforme a Windows/cmd):
 * se genera una carga arbitraria de trabajos `(A,I,N)` con comportamientos
 * variados (exito inmediato, fallos transitorios que acaban en exito, fallos
 * permanentes que agotan los reintentos y trabajos cuyo cerrojo ya esta tomado).
 * Esos comportamientos cubren las CUATRO transiciones posibles del ejecutor real
 * (`EjecutorTrabajoSemana`):
 *   - COMPLETADO  (exito o idempotencia),
 *   - EN_PROCESO  (cerrojo tomado por otro worker / en curso),
 *   - PENDIENTE   (fallo con intentos restantes, vuelve a la cola),
 *   - FALLIDO     (fallo en el ultimo intento, terminal).
 * Tras cada intento se exige que TODO estado observado -el devuelto por el
 * ejecutor y, sobre todo, el CONSULTABLE en el registro (`consultar`/`listar`)-
 * pertenezca al dominio cerrado `{PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO}`,
 * sin ningun valor fuera de el.
 *
 * Framework: Jest + fast-check (numRuns: 100). `describe`, `it` y `expect` son
 * globales de Jest (ts-jest), por lo que no se importan.
 *
 * **Validates: Requirements 27.5, 38.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 26: Dominio consultable de estados de ciclo y de trabajo
import fc from "fast-check";

import type { ResultadoProcesarSemana } from "../procesarSemana";
import { ORDEN_ETAPAS } from "../../pipeline/pipeline";
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from "./adaptadores-memoria";
import {
    EjecutorTrabajoSemana,
    type ContextoIntento,
} from "./ejecutor-trabajo-semana";
import {
    ESTADOS_TRABAJO,
    EstadoTrabajo,
    esEstadoTrabajo,
} from "./estados-trabajo";
import type {
    ConsultaResultadoSemana,
    ProcesadorSemanaPort,
} from "./puertos-cola";
import { claveTrabajo, type DatosTrabajoSemana } from "./trabajo-semana";

const NUM_RUNS = 100;
const MAX_INTENTOS = 4;

/** Dominio cerrado esperado (Req. 27.5, 38.5), independiente del orden. */
const DOMINIO_ESPERADO = ["COMPLETADO", "EN_PROCESO", "FALLIDO", "PENDIENTE"];

/**
 * `procesarSemana` doble y configurable por clave `(A,I,N)`:
 *  - `modo: "exito"`        -> persiste un resultado al primer intento.
 *  - `modo: "transitorio"`  -> falla `fallos` veces (sin persistir) y luego exito.
 *  - `modo: "permanente"`   -> falla siempre (nunca persiste): acaba FALLIDO.
 * Reproduce la atomicidad de `procesarSemana` (un fallo no deja resultado).
 */
interface ComportamientoClave {
    modo: "exito" | "transitorio" | "permanente";
    /** Fallos transitorios restantes (solo para `modo: "transitorio"`). */
    restantes: number;
}

class ProcesadorConfigurable implements ProcesadorSemanaPort {
    constructor(
        private readonly comportamientos: Map<string, ComportamientoClave>,
        private readonly persistidas: Set<string>,
    ) { }

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
        const clave = claveTrabajo(datos);
        const cfg = this.comportamientos.get(clave);

        if (cfg?.modo === "permanente") {
            throw new Error(`fallo permanente en ${clave}`);
        }
        if (cfg?.modo === "transitorio" && cfg.restantes > 0) {
            cfg.restantes -= 1;
            throw new Error(`fallo transitorio en ${clave}`);
        }

        this.persistidas.add(clave);
        return {
            analisisId,
            institucionId,
            comunidadId: `c-${institucionId}`,
            numeroSemana,
            resultadoId: `res-${clave}`,
            etapasCompletadas: [...ORDEN_ETAPAS],
        };
    }
}

/** Idempotencia real respaldada por el conjunto de claves ya persistidas. */
class ConsultaSobrePersistidas implements ConsultaResultadoSemana {
    constructor(private readonly persistidas: Set<string>) { }
    async yaProcesada(datos: DatosTrabajoSemana): Promise<boolean> {
        return this.persistidas.has(claveTrabajo(datos));
    }
}

// --- Generadores ----------------------------------------------------------

/** Comportamiento arbitrario de un trabajo (cubre las cuatro transiciones). */
const comportamientoArb = fc.oneof(
    fc.constant({ modo: "exito" as const, fallos: 0 }),
    // Transitorio: < MAX_INTENTOS-1 fallos => siempre acaba en COMPLETADO.
    fc
        .integer({ min: 1, max: MAX_INTENTOS - 1 })
        .map((fallos) => ({ modo: "transitorio" as const, fallos })),
    // Permanente: agota los reintentos => acaba en FALLIDO.
    fc.constant({ modo: "permanente" as const, fallos: MAX_INTENTOS }),
);

/** Un trabajo `(A,I,N)` con su comportamiento y si su cerrojo esta pre-tomado. */
const trabajoArb = fc.record({
    analisisId: fc.constantFrom("a1", "a2", "a3"),
    institucionId: fc.constantFrom("i1", "i2", "i3"),
    numeroSemana: fc.integer({ min: 1, max: 9 }),
    comportamiento: comportamientoArb,
    /** Si `true`, otro worker ya tiene el cerrojo: el intento vera EN_PROCESO. */
    cerrojoTomado: fc.boolean(),
});

/** Carga de trabajos UNICOS por clave `(A,I,N)` (1..6 trabajos). */
const cargaArb = fc
    .uniqueArray(trabajoArb, {
        minLength: 1,
        maxLength: 6,
        selector: (t) =>
            `${t.analisisId}::${t.institucionId}::${t.numeroSemana}`,
    });

type Trabajo = (typeof cargaArb extends fc.Arbitrary<infer T> ? T : never)[number];

/**
 * Simula el ciclo de reintentos ACOTADOS de BullMQ con el mismo `jobId`,
 * verificando que CADA estado observado (devuelto y consultable) pertenece al
 * dominio cerrado tras cada intento.
 */
async function ejecutarYVerificar(
    ejecutor: EjecutorTrabajoSemana,
    registro: RegistroEstadoTrabajosEnMemoria,
    datos: DatosTrabajoSemana,
): Promise<void> {
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        const contexto: ContextoIntento = { intento, maxIntentos: MAX_INTENTOS };
        let estadoDevuelto: EstadoTrabajo;
        try {
            const r = await ejecutor.ejecutar(datos, contexto);
            estadoDevuelto = r.estado;
        } catch {
            // Fallo transitorio relanzado para BullMQ: el estado quedo registrado.
            estadoDevuelto = (await registro.consultar(datos))!.estado;
        }

        // (1) El estado DEVUELTO por el ejecutor pertenece al dominio cerrado.
        expect(esEstadoTrabajo(estadoDevuelto)).toBe(true);
        expect(ESTADOS_TRABAJO).toContain(estadoDevuelto);

        // (2) El estado CONSULTABLE del ciclo/trabajo pertenece al dominio cerrado.
        const consultado = await registro.consultar(datos);
        if (consultado) {
            expect(esEstadoTrabajo(consultado.estado)).toBe(true);
            expect(ESTADOS_TRABAJO).toContain(consultado.estado);
        }

        if (estadoDevuelto === EstadoTrabajo.COMPLETADO) {
            return; // terminal: no se reintenta.
        }
    }
}

describe("Property 26: dominio consultable de estados de ciclo y de trabajo (Req. 27.5, 38.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 26: Dominio consultable de estados de ciclo y de trabajo
    it("expone EXACTAMENTE el dominio cerrado {PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO}", () => {
        // El dominio consultable es cerrado y de cardinalidad 4 (Req. 38.5).
        expect([...ESTADOS_TRABAJO].map(String).sort()).toEqual(
            [...DOMINIO_ESPERADO].sort(),
        );
        for (const estado of ESTADOS_TRABAJO) {
            expect(esEstadoTrabajo(estado)).toBe(true);
        }
    });

    it("todo estado consultable de cada ciclo/trabajo, tras cualquier transicion, pertenece al dominio cerrado", async () => {
        await fc.assert(
            fc.asyncProperty(cargaArb, async (carga: Trabajo[]) => {
                const comportamientos = new Map<string, ComportamientoClave>();
                const persistidas = new Set<string>();
                const cerrojo = new CerrojoConcurrenciaEnMemoria();
                const registro = new RegistroEstadoTrabajosEnMemoria(
                    new RelojFijo(new Date("2024-05-01T00:00:00.000Z")),
                    new GeneradorIdSecuencial("reg"),
                );

                // Configurar el comportamiento por clave y pre-tomar cerrojos.
                for (const t of carga) {
                    const datos: DatosTrabajoSemana = {
                        analisisId: t.analisisId,
                        institucionId: t.institucionId,
                        numeroSemana: t.numeroSemana,
                    };
                    const clave = claveTrabajo(datos);
                    comportamientos.set(clave, {
                        modo: t.comportamiento.modo,
                        restantes: t.comportamiento.fallos,
                    });
                    if (t.cerrojoTomado) {
                        // Otro worker ya posee el cerrojo: el intento vera EN_PROCESO.
                        await cerrojo.adquirir(clave);
                    }
                }

                const ejecutor = new EjecutorTrabajoSemana({
                    procesador: new ProcesadorConfigurable(
                        comportamientos,
                        persistidas,
                    ),
                    cerrojo,
                    consultaResultado: new ConsultaSobrePersistidas(persistidas),
                    registro,
                });

                // Ejecutar cada trabajo y verificar la membresia en cada paso.
                for (const t of carga) {
                    await ejecutarYVerificar(ejecutor, registro, {
                        analisisId: t.analisisId,
                        institucionId: t.institucionId,
                        numeroSemana: t.numeroSemana,
                    });
                }

                // Verificacion GLOBAL final: NINGUN registro consultable queda
                // fuera del dominio cerrado {PENDIENTE, EN_PROCESO, COMPLETADO,
                // FALLIDO} (Req. 27.5, 38.5).
                const todos = await registro.listar();
                for (const r of todos) {
                    expect(esEstadoTrabajo(r.estado)).toBe(true);
                    expect(ESTADOS_TRABAJO).toContain(r.estado);
                    expect(DOMINIO_ESPERADO).toContain(String(r.estado));
                }
            }),
            { numRuns: NUM_RUNS },
        );
    });
});
