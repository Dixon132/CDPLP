/**
 * Pruebas de la `HerramientaAceleracion` (tarea 16.3).
 *
 * Verifican, con dobles deterministas (sin Redis ni BD), que la herramienta:
 *  - ofrece avanzar una semana / un mes / hasta el final (Req. 18.2);
 *  - ENCOLA los ciclos pendientes en orden estrictamente creciente por la MISMA
 *    `Cola_Trabajos`, sin omitir semanas ni tomar ruta alternativa (Req. 18.1, 18.3);
 *  - un salto interrumpido conserva las semanas ya procesadas y se reanuda desde
 *    la siguiente pendiente (Req. 18.5);
 *  - usa un reloj inyectable para sellar el disparo (Req. 18.4).
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import { RelojFijo } from '../cola/adaptadores-memoria';
import { EstadoTrabajo } from '../cola/estados-trabajo';
import type { ResultadoEncolado } from '../cola/cola-procesar-semana.service';
import { jobIdSemana, type DatosTrabajoSemana } from '../cola/trabajo-semana';
import { PlanAnalisisEnMemoria } from './adaptadores-programador';
import { HerramientaAceleracion } from './herramienta-aceleracion';
import type { EncoladorSemana } from './puertos-programador';

/** Encolador doble: registra los encolados y simula la cola (PENDIENTE). */
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

function crear(
    config: ConstructorParameters<typeof PlanAnalisisEnMemoria>[0],
) {
    const plan = new PlanAnalisisEnMemoria(config);
    const encolador = new EncoladorDoble();
    const reloj = new RelojFijo(new Date('2024-05-01T00:00:00.000Z'));
    const herramienta = new HerramientaAceleracion({ plan, encolador, reloj });
    return { plan, encolador, reloj, herramienta };
}

describe('HerramientaAceleracion (salto temporal administrativo)', () => {
    it('avanzarUnaSemana encola exactamente la siguiente pendiente', async () => {
        const { encolador, herramienta } = crear({
            a1: { instituciones: ['i1'], totalSemanas: 24 },
        });

        const r = await herramienta.avanzarUnaSemana('a1');

        expect(semanasDe(encolador.encolados)).toEqual([1]);
        expect(r.encolados).toHaveLength(1);
        expect(r.encolados[0]?.jobId).toBe('procesar-semana:a1:i1:1');
        expect(r.disparadoEn.toISOString()).toBe('2024-05-01T00:00:00.000Z');
    });

    it('avanzarUnMes encola hasta 4 semanas pendientes en orden', async () => {
        const { encolador, herramienta } = crear({
            a1: {
                instituciones: ['i1'],
                totalSemanas: 24,
                completadasPorInstitucion: { i1: 2 },
            },
        });

        await herramienta.avanzarUnMes('a1');

        expect(semanasDe(encolador.encolados)).toEqual([3, 4, 5, 6]);
    });

    it('avanzarHastaElFinal encola TODAS las pendientes en orden creciente', async () => {
        const { encolador, herramienta } = crear({
            a1: {
                instituciones: ['i1'],
                totalSemanas: 5,
                completadasPorInstitucion: { i1: 1 },
            },
        });

        await herramienta.avanzarHastaElFinal('a1');

        expect(semanasDe(encolador.encolados)).toEqual([2, 3, 4, 5]);
    });

    it('multi-institucion: encola por semana ascendente respetando el aislamiento', async () => {
        const { encolador, herramienta } = crear({
            a1: {
                instituciones: ['i1', 'i2'],
                totalSemanas: 3,
                completadasPorInstitucion: { i1: 0, i2: 1 },
            },
        });

        await herramienta.avanzarHastaElFinal('a1');

        expect(encolador.encolados).toEqual([
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 1 },
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 2 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 2 },
            { analisisId: 'a1', institucionId: 'i1', numeroSemana: 3 },
            { analisisId: 'a1', institucionId: 'i2', numeroSemana: 3 },
        ]);
    });

    it('analisis ya completo: no encola nada', async () => {
        const { encolador, herramienta } = crear({
            a1: {
                instituciones: ['i1'],
                totalSemanas: 4,
                completadasPorInstitucion: { i1: 4 },
            },
        });

        const r = await herramienta.avanzarHastaElFinal('a1');

        expect(encolador.encolados).toHaveLength(0);
        expect(r.encolados).toHaveLength(0);
    });

    it('salto INTERRUMPIDO y reanudado: conserva lo hecho y sigue desde la pendiente (Req. 18.5)', async () => {
        const { plan, encolador, herramienta } = crear({
            a1: { instituciones: ['i1'], totalSemanas: 6 },
        });

        // Primer salto: avanza un mes (semanas 1..4) y "se interrumpe".
        await herramienta.avanzarUnMes('a1');
        expect(semanasDe(encolador.encolados)).toEqual([1, 2, 3, 4]);

        // La cola procesa y persiste atomicamente esas semanas (simulado).
        plan.fijarCompletadas('a1', 'i1', 4);

        // Reanudar hasta el final: continua desde la 5, sin reprocesar 1..4.
        await herramienta.avanzarHastaElFinal('a1');
        expect(semanasDe(encolador.encolados)).toEqual([1, 2, 3, 4, 5, 6]);
    });
});
