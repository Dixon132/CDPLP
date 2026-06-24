/**
 * Pruebas del `GestorEjecucion` (tarea 17.1).
 *
 * Verifican, con dobles deterministas (plan en memoria, encolador doble, reloj
 * fijo y contador del Tiempo_Real disparable a voluntad), que el gestor:
 *  - Manual: avanza EXACTAMENTE la siguiente semana pendiente por solicitud
 *    (Req. 32.2);
 *  - Automatico: encola la siguiente semana pendiente y el worker encadena la
 *    siguiente tras registrarla, en orden estricto (Req. 32.3);
 *  - Tiempo_Real: encola una semana, arranca el contador inyectable y, al vencer,
 *    encola la siguiente reutilizando el `Programador_Temporal` (Req. 32.4, 32.5);
 *  - pausar/reanudar conserva el estado: las semanas completadas permanecen
 *    firmes y la reanudacion continua desde la siguiente pendiente (Req. 32.6,
 *    32.8);
 *  - los tres modos encolan el MISMO conjunto de trabajos (equivalencia, Req.
 *    32.7).
 *
 * _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
 */
import { RelojFijo } from '../cola/adaptadores-memoria';
import { EstadoTrabajo } from '../cola/estados-trabajo';
import type { ResultadoEncolado } from '../cola/cola-procesar-semana.service';
import { jobIdSemana, type DatosTrabajoSemana } from '../cola/trabajo-semana';
import { PlanAnalisisEnMemoria } from '../programador/adaptadores-programador';
import { HerramientaAceleracion } from '../programador/herramienta-aceleracion';
import { ProgramadorTemporal } from '../programador/programador-temporal';
import type { EncoladorSemana } from '../programador/puertos-programador';
import { AlmacenEstadoEjecucionEnMemoria } from './almacen-estado-ejecucion';
import { GestorEjecucionService } from './gestor-ejecucion';
import { TemporizadorManual } from './temporizador';

/** Encolador doble que solo registra los trabajos encolados (sin completarlos). */
class EncoladorDoble implements EncoladorSemana {
    readonly encolados: DatosTrabajoSemana[] = [];
    async encolar(datos: DatosTrabajoSemana): Promise<ResultadoEncolado> {
        this.encolados.push({ ...datos });
        return {
            jobId: jobIdSemana(datos),
            estado: EstadoTrabajo.PENDIENTE,
            datos: { ...datos },
        };
    }
}

/**
 * Encolador que, al encolar `(A,I,N)`, marca de inmediato esa semana como
 * completada en el plan: simula que el worker la procesa antes del siguiente
 * disparo. Permite verificar la progresion paso a paso (Manual/Tiempo_Real).
 */
class EncoladorAutocompletante implements EncoladorSemana {
    readonly encolados: DatosTrabajoSemana[] = [];
    constructor(private readonly plan: PlanAnalisisEnMemoria) { }
    async encolar(datos: DatosTrabajoSemana): Promise<ResultadoEncolado> {
        this.encolados.push({ ...datos });
        this.plan.fijarCompletadas(
            datos.analisisId,
            datos.institucionId,
            datos.numeroSemana,
        );
        return {
            jobId: jobIdSemana(datos),
            estado: EstadoTrabajo.PENDIENTE,
            datos: { ...datos },
        };
    }
}

const clave = (d: DatosTrabajoSemana) => `${d.institucionId}:${d.numeroSemana}`;

function construir(
    plan: PlanAnalisisEnMemoria,
    encolador: EncoladorSemana,
    almacen: AlmacenEstadoEjecucionEnMemoria,
    temporizador: TemporizadorManual,
) {
    const reloj = new RelojFijo(new Date('2024-06-01T00:00:00.000Z'));
    const herramienta = new HerramientaAceleracion({ plan, encolador, reloj });
    const programador = new ProgramadorTemporal({ plan, encolador, reloj });
    return new GestorEjecucionService({
        almacen,
        herramienta,
        programador,
        temporizador,
    });
}

describe('GestorEjecucion (modos de ejecucion y pausa/reanudacion)', () => {
    describe('Modo Manual (Req. 32.2)', () => {
        it('avanza exactamente la siguiente semana pendiente por solicitud', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1', 'i2'], totalSemanas: 3 },
            });
            const encolador = new EncoladorAutocompletante(plan);
            const almacen = new AlmacenEstadoEjecucionEnMemoria({
                a1: { modoEjecucion: 'MANUAL' },
            });
            const gestor = construir(
                plan,
                encolador,
                almacen,
                new TemporizadorManual(),
            );

            // Solicitud 1 -> semana 1 de cada institucion (y solo esa).
            const r1 = await gestor.avanzarManual('a1');
            expect(r1.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([
                1, 1,
            ]);
            expect(r1.estadoEjecucion).toBe('DETENIDO');

            // Solicitud 2 -> semana 2.
            const r2 = await gestor.avanzar('a1'); // dispatch -> manual
            expect(r2.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([
                2, 2,
            ]);

            // Solicitud 3 -> semana 3 (ultima).
            await gestor.avanzarManual('a1');

            // Solicitud 4 -> nada pendiente: COMPLETADO, sin encolar.
            const r4 = await gestor.avanzarManual('a1');
            expect(r4.avance.encolados).toHaveLength(0);
            expect(r4.estadoEjecucion).toBe('COMPLETADO');

            // Cada institucion recibio sus semanas 1..3 una sola vez, en orden.
            for (const i of ['i1', 'i2']) {
                const ns = encolador.encolados
                    .filter((d) => d.institucionId === i)
                    .map((d) => d.numeroSemana);
                expect(ns).toEqual([1, 2, 3]);
            }
        });

        it('avanzarManual exige Modo_Ejecucion Manual', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 2 },
            });
            const almacen = new AlmacenEstadoEjecucionEnMemoria({
                a1: { modoEjecucion: 'AUTOMATICO' },
            });
            const gestor = construir(
                plan,
                new EncoladorDoble(),
                almacen,
                new TemporizadorManual(),
            );
            await expect(gestor.avanzarManual('a1')).rejects.toThrow(/Manual/);
        });
    });

    describe('Modo Automatico (Req. 32.3)', () => {
        it('encola SOLO la siguiente semana pendiente por institucion (el resto lo encadena el worker)', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1', 'i2'], totalSemanas: 4 },
            });
            const encolador = new EncoladorDoble();
            const almacen = new AlmacenEstadoEjecucionEnMemoria({
                a1: { modoEjecucion: 'AUTOMATICO' },
            });
            const gestor = construir(
                plan,
                encolador,
                almacen,
                new TemporizadorManual(),
            );

            const r = await gestor.avanzar('a1');
            expect(r.estadoEjecucion).toBe('EN_EJECUCION');
            // Solo la PRIMERA semana pendiente de cada institucion (encadenado
            // secuencial: el worker encola la siguiente tras registrar la actual).
            expect(r.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([
                1, 1,
            ]);

            // Sin pendientes -> COMPLETADO.
            plan.fijarCompletadas('a1', 'i1', 4);
            plan.fijarCompletadas('a1', 'i2', 4);
            const r2 = await gestor.avanzar('a1');
            expect(r2.avance.encolados).toHaveLength(0);
            expect(r2.estadoEjecucion).toBe('COMPLETADO');
        });
    });

    describe('Modo Tiempo_Real (Req. 32.4, 32.5)', () => {
        it('encola una semana, arranca el contador y al vencer encola la siguiente', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 3 },
            });
            const encolador = new EncoladorAutocompletante(plan);
            const almacen = new AlmacenEstadoEjecucionEnMemoria();
            const temporizador = new TemporizadorManual();
            const gestor = construir(plan, encolador, almacen, temporizador);

            await gestor.seleccionarModo('a1', 'TIEMPO_REAL', 1000);

            // avanzar -> procesa la semana 1 y arranca el contador.
            const r = await gestor.avanzar('a1');
            expect(r.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([1]);
            expect(r.estadoEjecucion).toBe('EN_EJECUCION');
            expect(temporizador.activos).toBe(1);

            // Vence el intervalo -> semana 2.
            await temporizador.disparar();
            // Vence de nuevo -> semana 3 (ultima).
            await temporizador.disparar();
            // Vence otra vez -> nada pendiente: completa y cancela el contador.
            await temporizador.disparar();

            expect(encolador.encolados.map((d) => d.numeroSemana)).toEqual([
                1, 2, 3,
            ]);
            expect(temporizador.activos).toBe(0);
            expect((await almacen.obtener('a1')).estadoEjecucion).toBe('COMPLETADO');
        });

        it('seleccionarModo aplica el intervalo por defecto si se omite y valida intervalos invalidos', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 2 },
            });
            const almacen = new AlmacenEstadoEjecucionEnMemoria();
            const gestor = construir(
                plan,
                new EncoladorDoble(),
                almacen,
                new TemporizadorManual(),
            );

            await gestor.seleccionarModo('a1', 'TIEMPO_REAL');
            expect((await almacen.obtener('a1')).intervaloTiempoRealMs).toBe(60_000);

            await expect(
                gestor.seleccionarModo('a1', 'TIEMPO_REAL', -5),
            ).rejects.toThrow(/intervalo/);
        });
    });

    describe('Pausa y reanudacion (Req. 32.6, 32.8)', () => {
        it('Tiempo_Real: pausar cancela el contador y reanudar continua desde la siguiente pendiente', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 4 },
            });
            const encolador = new EncoladorAutocompletante(plan);
            const almacen = new AlmacenEstadoEjecucionEnMemoria();
            const temporizador = new TemporizadorManual();
            const gestor = construir(plan, encolador, almacen, temporizador);

            await gestor.seleccionarModo('a1', 'TIEMPO_REAL', 1000);
            await gestor.avanzar('a1'); // semana 1
            await temporizador.disparar(); // semana 2

            await gestor.pausar('a1');
            expect(temporizador.activos).toBe(0);
            expect((await almacen.obtener('a1')).estadoEjecucion).toBe('PAUSADO');

            // Disparos durante la pausa no encolan nada (contador cancelado).
            await temporizador.disparar();
            expect(encolador.encolados.map((d) => d.numeroSemana)).toEqual([1, 2]);

            // Reanudar continua en la semana 3, sin repetir 1 ni 2.
            const r = await gestor.reanudar('a1');
            expect(r.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([3]);
            expect(r.estadoEjecucion).toBe('EN_EJECUCION');

            await temporizador.disparar(); // semana 4
            await temporizador.disparar(); // completa

            expect(encolador.encolados.map((d) => d.numeroSemana)).toEqual([
                1, 2, 3, 4,
            ]);
            expect((await almacen.obtener('a1')).estadoEjecucion).toBe('COMPLETADO');
        });

        it('Automatico: reanudar tras pausa no reprocesa las semanas completadas', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 5 },
            });
            const encolador = new EncoladorDoble();
            const almacen = new AlmacenEstadoEjecucionEnMemoria({
                a1: { modoEjecucion: 'AUTOMATICO' },
            });
            const gestor = construir(
                plan,
                encolador,
                almacen,
                new TemporizadorManual(),
            );

            await gestor.avanzar('a1'); // encola 1..5
            // El worker completa 1 y 2 antes de pausar.
            plan.fijarCompletadas('a1', 'i1', 2);
            await gestor.pausar('a1');
            expect((await almacen.obtener('a1')).estadoEjecucion).toBe('PAUSADO');

            // Reanudar: el gestor encola SOLO la siguiente pendiente (3); el worker
            // encadena 4 y 5 al registrar cada una. No repite 1,2 (ya completadas).
            const r = await gestor.reanudar('a1');
            expect(r.avance.encolados.map((e) => e.datos.numeroSemana)).toEqual([
                3,
            ]);
        });

        it('el modo Manual no se pausa y solo se reanuda lo pausado', async () => {
            const plan = new PlanAnalisisEnMemoria({
                a1: { instituciones: ['i1'], totalSemanas: 2 },
            });
            const almacen = new AlmacenEstadoEjecucionEnMemoria({
                a1: { modoEjecucion: 'MANUAL' },
            });
            const gestor = construir(
                plan,
                new EncoladorDoble(),
                almacen,
                new TemporizadorManual(),
            );

            await expect(gestor.pausar('a1')).rejects.toThrow(/Manual/);
            await expect(gestor.reanudar('a1')).rejects.toThrow(/PAUSADO/);
        });
    });

    describe('Equivalencia entre modos (Req. 32.7)', () => {
        it('los tres modos encolan el mismo conjunto de trabajos (A,I,N)', async () => {
            const total = 4;
            const instituciones = ['i1', 'i2'];

            // Manual: una solicitud por semana hasta completar.
            const planM = new PlanAnalisisEnMemoria({
                a1: { instituciones, totalSemanas: total },
            });
            const encM = new EncoladorAutocompletante(planM);
            const gestorM = construir(
                planM,
                encM,
                new AlmacenEstadoEjecucionEnMemoria({ a1: { modoEjecucion: 'MANUAL' } }),
                new TemporizadorManual(),
            );
            for (let n = 1; n <= total; n++) {
                await gestorM.avanzarManual('a1');
            }

            // Automatico: el gestor encola la PRIMERA semana y el worker encadena
            // la siguiente tras registrar cada una. Aqui el EncoladorAutocompletante
            // completa cada semana al encolarla, simulando al worker; repetimos
            // avanzar hasta drenar todas las pendientes (encadenado secuencial).
            const planA = new PlanAnalisisEnMemoria({
                a1: { instituciones, totalSemanas: total },
            });
            const encA = new EncoladorAutocompletante(planA);
            const gestorA = construir(
                planA,
                encA,
                new AlmacenEstadoEjecucionEnMemoria({
                    a1: { modoEjecucion: 'AUTOMATICO' },
                }),
                new TemporizadorManual(),
            );
            for (let guard = 0; guard < total * instituciones.length + 5; guard++) {
                const r = await gestorA.avanzar('a1');
                if (r.avance.encolados.length === 0) {
                    break;
                }
            }

            // Tiempo_Real: una semana por vencimiento del contador.
            const planT = new PlanAnalisisEnMemoria({
                a1: { instituciones, totalSemanas: total },
            });
            const encT = new EncoladorAutocompletante(planT);
            const tempT = new TemporizadorManual();
            const gestorT = construir(
                planT,
                encT,
                new AlmacenEstadoEjecucionEnMemoria(),
                tempT,
            );
            await gestorT.seleccionarModo('a1', 'TIEMPO_REAL', 1000);
            await gestorT.avanzar('a1');
            // Disparar suficientes vencimientos para completar el analisis.
            await tempT.dispararVeces(total);

            const conjunto = (ds: DatosTrabajoSemana[]) =>
                ds.map(clave).sort();

            expect(conjunto(encM.encolados)).toEqual(conjunto(encA.encolados));
            expect(conjunto(encA.encolados)).toEqual(conjunto(encT.encolados));
        });
    });
});
