/**
 * Pruebas del `ProgramadorTemporal` (tarea 16.3).
 *
 * Verifican, con dobles deterministas, que el disparador en tiempo real simulado:
 *  - en cada `tick` encola exactamente la siguiente `Semana_Simulada` pendiente
 *    por institucion, en orden estrictamente creciente (Req. 18.1, 18.3);
 *  - reutiliza la MISMA cola que la `Herramienta_Aceleracion`, sin ruta
 *    alternativa por modo: procesar paso a paso (un tick por semana) encola la
 *    misma secuencia que un salto hasta el final (equivalencia, Req. 18.4);
 *  - usa un reloj inyectable (Req. 18.4).
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import { RelojFijo } from '../cola/adaptadores-memoria';
import { EstadoTrabajo } from '../cola/estados-trabajo';
import type { ResultadoEncolado } from '../cola/cola-procesar-semana.service';
import { jobIdSemana, type DatosTrabajoSemana } from '../cola/trabajo-semana';
import { PlanAnalisisEnMemoria } from './adaptadores-programador';
import { HerramientaAceleracion } from './herramienta-aceleracion';
import { ProgramadorTemporal } from './programador-temporal';
import type { EncoladorSemana } from './puertos-programador';

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

const semanasDe = (datos: DatosTrabajoSemana[]) =>
    datos.map((d) => d.numeroSemana);

const semanasEncoladas = (encolados: ResultadoEncolado[]) =>
    encolados.map((e) => e.datos.numeroSemana);

describe('ProgramadorTemporal (tiempo real simulado)', () => {
    it('cada tick encola la siguiente semana pendiente (una sola)', async () => {
        const plan = new PlanAnalisisEnMemoria({
            a1: { instituciones: ['i1'], totalSemanas: 3 },
        });
        const encolador = new EncoladorDoble();
        const reloj = new RelojFijo(new Date('2024-06-01T00:00:00.000Z'));
        const programador = new ProgramadorTemporal({ plan, encolador, reloj });

        // Tick 1 -> semana 1; la cola la completa antes del siguiente intervalo.
        const r1 = await programador.tick('a1');
        expect(semanasEncoladas(r1.encolados)).toEqual([1]);
        plan.fijarCompletadas('a1', 'i1', 1);

        // Tick 2 -> semana 2.
        const r2 = await programador.tick('a1');
        expect(semanasEncoladas(r2.encolados)).toEqual([2]);
        plan.fijarCompletadas('a1', 'i1', 2);

        // Tick 3 -> semana 3 (ultima).
        const r3 = await programador.tick('a1');
        expect(semanasEncoladas(r3.encolados)).toEqual([3]);
        plan.fijarCompletadas('a1', 'i1', 3);

        // Tick 4 -> analisis completo, nada que encolar.
        const r4 = await programador.tick('a1');
        expect(r4.encolados).toHaveLength(0);

        expect(semanasDe(encolador.encolados)).toEqual([1, 2, 3]);
    });

    it('SIN ruta alternativa por modo: ticks paso a paso == salto hasta el final', async () => {
        const total = 5;

        // Camino A: Programador_Temporal, un tick por semana.
        const planPaso = new PlanAnalisisEnMemoria({
            a1: { instituciones: ['i1', 'i2'], totalSemanas: total },
        });
        const encPaso = new EncoladorDoble();
        const programador = new ProgramadorTemporal({
            plan: planPaso,
            encolador: encPaso,
            reloj: new RelojFijo(),
        });
        for (let n = 1; n <= total; n++) {
            await programador.tick('a1');
            planPaso.fijarCompletadas('a1', 'i1', n);
            planPaso.fijarCompletadas('a1', 'i2', n);
        }

        // Camino B: Herramienta_Aceleracion, salto hasta el final.
        const planSalto = new PlanAnalisisEnMemoria({
            a1: { instituciones: ['i1', 'i2'], totalSemanas: total },
        });
        const encSalto = new EncoladorDoble();
        const herramienta = new HerramientaAceleracion({
            plan: planSalto,
            encolador: encSalto,
            reloj: new RelojFijo(),
        });
        await herramienta.avanzarHastaElFinal('a1');

        // Ambos caminos encolan EXACTAMENTE el mismo conjunto de trabajos.
        const clave = (d: DatosTrabajoSemana) =>
            `${d.institucionId}:${d.numeroSemana}`;
        expect(encPaso.encolados.map(clave).sort()).toEqual(
            encSalto.encolados.map(clave).sort(),
        );
        // Y cada institucion recibe sus semanas 1..5 una sola vez.
        for (const i of ['i1', 'i2']) {
            const ns = encPaso.encolados
                .filter((d) => d.institucionId === i)
                .map((d) => d.numeroSemana);
            expect(ns).toEqual([1, 2, 3, 4, 5]);
        }
    });
});
