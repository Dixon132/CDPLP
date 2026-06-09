/**
 * Pruebas del `ProcesarSemanaProcessor` (worker BullMQ) sobre una COLA EN MEMORIA
 * determinista (tarea 16.2).
 *
 * En lugar de Redis, se usa un doble de cola con ejecucion INMEDIATA que:
 *  - deduplica por `jobId` determinista (idempotencia de encolado, Req. 27.2, 38.3);
 *  - reintenta de forma acotada segun `opts.attempts`, incrementando
 *    `attemptsMade` como hace BullMQ (Req. 38.4);
 *  - procesa cada `(A,I,N)` como un job independiente (aislamiento, Req. 9.5, 38.4).
 *
 * El procesador es un envoltorio delgado: se instancia directamente (sin arrancar
 * un Worker real) y se le pasan `Job` dobles, conforme al entorno sincrono y
 * determinista del plan.
 * _Requirements: 9.5, 27.2, 27.5, 38.1, 38.2, 38.3, 38.4, 38.5_
 */
import type { Job } from 'bullmq';

import { REINTENTOS_POR_DEFECTO } from '../../../queue/queue.constants';
import {
    CerrojoConcurrenciaEnMemoria,
    GeneradorIdSecuencial,
    RegistroEstadoTrabajosEnMemoria,
    RelojFijo,
} from './adaptadores-memoria';
import {
    ConsultaResultadoSemanaSiempreNueva,
} from './adaptadores-memoria';
import {
    EjecutorTrabajoSemana,
    type DependenciasEjecutor,
} from './ejecutor-trabajo-semana';
import { EstadoTrabajo } from './estados-trabajo';
import { ProcesarSemanaProcessor } from './procesar-semana.processor';
import type { ProcesadorSemanaPort } from './puertos-cola';
import type { ResultadoProcesarSemana } from '../procesarSemana';
import { jobIdSemana, type DatosTrabajoSemana } from './trabajo-semana';

// --- Doble de cola con ejecucion inmediata --------------------------------

interface OpcionesJob {
    jobId: string;
    attempts: number;
}

/**
 * Cola en memoria determinista: deduplica por `jobId` y procesa de inmediato,
 * reintentando hasta `attempts` veces (incrementando `attemptsMade` como BullMQ).
 */
class ColaEnMemoria {
    private readonly vistos = new Set<string>();
    procesados: string[] = [];
    constructor(private readonly processor: ProcesarSemanaProcessor) { }

    /** Encola y ejecuta. Devuelve `false` si el `jobId` ya existia (dedup). */
    async add(data: DatosTrabajoSemana, opts: OpcionesJob): Promise<boolean> {
        if (this.vistos.has(opts.jobId)) {
            return false; // jobId determinista ya encolado -> ignorado (Req. 27.2, 38.3)
        }
        this.vistos.add(opts.jobId);
        this.procesados.push(opts.jobId);

        let ultimoError: unknown;
        for (let attemptsMade = 0; attemptsMade < opts.attempts; attemptsMade++) {
            const job = {
                data,
                opts: { attempts: opts.attempts },
                attemptsMade,
            } as unknown as Job<DatosTrabajoSemana>;
            try {
                await this.processor.process(job);
                return true; // exito (u omitido)
            } catch (e) {
                ultimoError = e; // backoff omitido en pruebas (determinismo)
            }
        }
        throw ultimoError; // agotados los reintentos acotados
    }
}

function crearProcessor(
    procesadorSemana: ProcesadorSemanaPort,
): {
    processor: ProcesarSemanaProcessor;
    registro: RegistroEstadoTrabajosEnMemoria;
} {
    const registro = new RegistroEstadoTrabajosEnMemoria(
        new RelojFijo(),
        new GeneradorIdSecuencial(),
    );
    const deps: DependenciasEjecutor = {
        procesador: procesadorSemana,
        cerrojo: new CerrojoConcurrenciaEnMemoria(),
        consultaResultado: new ConsultaResultadoSemanaSiempreNueva(),
        registro,
    };
    const processor = new ProcesarSemanaProcessor(new EjecutorTrabajoSemana(deps));
    return { processor, registro };
}

const datos = (over: Partial<DatosTrabajoSemana> = {}): DatosTrabajoSemana => ({
    analisisId: 'a1',
    institucionId: 'i1',
    numeroSemana: 1,
    ...over,
});

function resultadoOk(d: DatosTrabajoSemana): ResultadoProcesarSemana {
    return {
        analisisId: d.analisisId,
        institucionId: d.institucionId,
        comunidadId: `c-${d.institucionId}`,
        numeroSemana: d.numeroSemana,
        resultadoId: `res-${d.institucionId}-${d.numeroSemana}`,
        etapasCompletadas: [],
    };
}

// --- Tests -----------------------------------------------------------------

describe('ProcesarSemanaProcessor sobre cola en memoria (BullMQ inmediata)', () => {
    it('procesa un job y deja el estado COMPLETADO consultable', async () => {
        let llamadas = 0;
        const { processor, registro } = crearProcessor({
            async procesarSemana(a, i, n) {
                llamadas += 1;
                return resultadoOk({ analisisId: a, institucionId: i, numeroSemana: n });
            },
        });
        const cola = new ColaEnMemoria(processor);
        const d = datos();

        await cola.add(d, { jobId: jobIdSemana(d), attempts: REINTENTOS_POR_DEFECTO });

        expect(llamadas).toBe(1);
        expect((await registro.consultar(d))?.estado).toBe(EstadoTrabajo.COMPLETADO);
    });

    it('deduplica por jobId determinista: reencolar la misma semana no crea otro job (Req. 27.2, 38.3)', async () => {
        let llamadas = 0;
        const { processor } = crearProcessor({
            async procesarSemana(a, i, n) {
                llamadas += 1;
                return resultadoOk({ analisisId: a, institucionId: i, numeroSemana: n });
            },
        });
        const cola = new ColaEnMemoria(processor);
        const d = datos();
        const opts = { jobId: jobIdSemana(d), attempts: REINTENTOS_POR_DEFECTO };

        const primera = await cola.add(d, opts);
        const segunda = await cola.add(d, opts); // mismo jobId -> ignorado

        expect(primera).toBe(true);
        expect(segunda).toBe(false);
        expect(llamadas).toBe(1);
        expect(cola.procesados).toEqual([jobIdSemana(d)]);
    });

    it('reintenta de forma acotada y termina en FALLIDO al agotar attempts (Req. 38.4)', async () => {
        let intentos = 0;
        const { processor, registro } = crearProcessor({
            async procesarSemana() {
                intentos += 1;
                throw new Error('siempre falla');
            },
        });
        const cola = new ColaEnMemoria(processor);
        const d = datos();

        await expect(
            cola.add(d, { jobId: jobIdSemana(d), attempts: 3 }),
        ).rejects.toThrow(/siempre falla/);

        // Exactamente 3 intentos (politica acotada), no reintentos infinitos.
        expect(intentos).toBe(3);
        expect((await registro.consultar(d))?.estado).toBe(EstadoTrabajo.FALLIDO);
    });

    it('reintenta y completa si un intento posterior tiene exito', async () => {
        let intentos = 0;
        const { processor, registro } = crearProcessor({
            async procesarSemana(a, i, n) {
                intentos += 1;
                if (intentos < 2) throw new Error('fallo transitorio');
                return resultadoOk({ analisisId: a, institucionId: i, numeroSemana: n });
            },
        });
        const cola = new ColaEnMemoria(processor);
        const d = datos();

        await cola.add(d, { jobId: jobIdSemana(d), attempts: 3 });

        expect(intentos).toBe(2); // fallo + exito
        expect((await registro.consultar(d))?.estado).toBe(EstadoTrabajo.COMPLETADO);
    });

    it('AISLA fallos por institucion: I1 FALLIDO no impide a I2 COMPLETADO (Req. 9.5, 38.4)', async () => {
        const { processor, registro } = crearProcessor({
            async procesarSemana(a, i, n) {
                if (i === 'i1') throw new Error('fallo de i1');
                return resultadoOk({ analisisId: a, institucionId: i, numeroSemana: n });
            },
        });
        const cola = new ColaEnMemoria(processor);
        const dI1 = datos({ institucionId: 'i1' });
        const dI2 = datos({ institucionId: 'i2' });

        await expect(
            cola.add(dI1, { jobId: jobIdSemana(dI1), attempts: 2 }),
        ).rejects.toThrow(/fallo de i1/);
        // El trabajo de i2 procede con normalidad pese al fallo de i1.
        await cola.add(dI2, { jobId: jobIdSemana(dI2), attempts: 2 });

        expect((await registro.consultar(dI1))?.estado).toBe(EstadoTrabajo.FALLIDO);
        expect((await registro.consultar(dI2))?.estado).toBe(EstadoTrabajo.COMPLETADO);
    });
});
