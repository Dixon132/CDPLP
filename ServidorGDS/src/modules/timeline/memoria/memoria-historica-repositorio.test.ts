/**
 * Pruebas unitarias del puerto de persistencia de la MEMORIA HISTORICA
 * (`gds_tendencia_historica`/`gds_evento_historico`) - tarea 22.2.
 *
 * Verifican que `MemoriaHistoricaRepositorioPrisma`:
 *  - registra (acumula) tendencias y eventos con sus refs trazables (Req. 39.3);
 *  - recupera relacionalmente filtrando por analisis/comunidad/semana (Req. 39.4);
 *  - es no-op ante lotes vacios.
 *
 * Usa un DOBLE en memoria del subconjunto de `PrismaClient` que el repositorio
 * consume (`tendenciaHistorica`/`eventoHistorico`), de modo que la prueba es
 * deterministica, sin red ni BD.
 */
import {
    type ClienteMemoriaHistorica,
    MemoriaHistoricaRepositorioPrisma,
} from './memoria-historica-repositorio';
import type {
    EventoHistoricoRegistro,
    TendenciaHistoricaRegistro,
} from './motor-memoria-contextual.types';

interface FilaTendencia extends TendenciaHistoricaRegistro {
    id: string;
}
interface FilaEvento extends EventoHistoricoRegistro {
    id: string;
}

/** Doble en memoria del cliente Prisma (solo lo que usa el repositorio). */
class ClienteDoble implements ClienteMemoriaHistorica {
    readonly filasTendencia: FilaTendencia[] = [];
    readonly filasEvento: FilaEvento[] = [];
    private seq = 0;

    // Forma minima de `prisma.tendenciaHistorica` consumida por el repositorio.
    readonly tendenciaHistorica = {
        createMany: ({ data }: { data: TendenciaHistoricaRegistro[] }) => {
            for (const d of data) {
                this.filasTendencia.push({ id: `t${++this.seq}`, ...d });
            }
            return Promise.resolve({ count: data.length });
        },
        findMany: ({
            where,
        }: {
            where: { analisisId: string; comunidadId?: string; numeroSemana?: number };
            orderBy?: unknown;
        }) =>
            Promise.resolve(
                this.filasTendencia.filter(
                    (f) =>
                        f.analisisId === where.analisisId &&
                        (where.comunidadId === undefined || f.comunidadId === where.comunidadId) &&
                        (where.numeroSemana === undefined || f.numeroSemana === where.numeroSemana),
                ),
            ),
    } as unknown as ClienteMemoriaHistorica['tendenciaHistorica'];

    readonly eventoHistorico = {
        createMany: ({ data }: { data: EventoHistoricoRegistro[] }) => {
            for (const d of data) {
                this.filasEvento.push({ id: `e${++this.seq}`, ...d });
            }
            return Promise.resolve({ count: data.length });
        },
        findMany: ({
            where,
        }: {
            where: { analisisId: string; comunidadId?: string; numeroSemana?: number };
            orderBy?: unknown;
        }) =>
            Promise.resolve(
                this.filasEvento.filter(
                    (f) =>
                        f.analisisId === where.analisisId &&
                        (where.comunidadId === undefined || f.comunidadId === where.comunidadId) &&
                        (where.numeroSemana === undefined || f.numeroSemana === where.numeroSemana),
                ),
            ),
    } as unknown as ClienteMemoriaHistorica['eventoHistorico'];
}

function tendencia(numeroSemana: number, dimension: string): TendenciaHistoricaRegistro {
    return {
        analisisId: 'an-1',
        comunidadId: 'com-1',
        numeroSemana,
        dimension,
        direccion: 'ascendente',
        magnitud: 0.5,
        zonaLatitud: -17.39,
        zonaLongitud: -66.16,
        zonaRadioMetros: 500,
    };
}

function evento(numeroSemana: number, tipo: string): EventoHistoricoRegistro {
    return {
        analisisId: 'an-1',
        comunidadId: 'com-1',
        numeroSemana,
        tipo,
        descripcion: `evento ${tipo}`,
    };
}

describe('MemoriaHistoricaRepositorioPrisma', () => {
    function repo(): {
        repositorio: MemoriaHistoricaRepositorioPrisma;
        cliente: ClienteDoble;
    } {
        const cliente = new ClienteDoble();
        const repositorio = new MemoriaHistoricaRepositorioPrisma(
            cliente as unknown as ConstructorParameters<
                typeof MemoriaHistoricaRepositorioPrisma
            >[0],
        );
        return { repositorio, cliente };
    }

    it('registra y recupera tendencias filtrando por analisis/comunidad/semana', async () => {
        const { repositorio, cliente } = repo();

        await repositorio.registrarTendencias([
            tendencia(1, 'ansiedad'),
            tendencia(2, 'agresividad'),
        ]);

        expect(cliente.filasTendencia).toHaveLength(2);

        const todas = await repositorio.listarTendencias({ analisisId: 'an-1' });
        expect(todas).toHaveLength(2);

        const semana2 = await repositorio.listarTendencias({
            analisisId: 'an-1',
            numeroSemana: 2,
        });
        expect(semana2).toHaveLength(1);
        expect(semana2[0].dimension).toBe('agresividad');

        const otraComunidad = await repositorio.listarTendencias({
            analisisId: 'an-1',
            comunidadId: 'com-9',
        });
        expect(otraComunidad).toHaveLength(0);
    });

    it('registra y recupera eventos historicos', async () => {
        const { repositorio } = repo();
        await repositorio.registrarEventos([evento(1, 'conflicto'), evento(1, 'rumor')]);

        const eventos = await repositorio.listarEventos({ analisisId: 'an-1' });
        expect(eventos).toHaveLength(2);
        expect(eventos.map((e) => e.tipo)).toEqual(
            expect.arrayContaining(['conflicto', 'rumor']),
        );
    });

    it('acumula registros entre invocaciones sucesivas (Req. 39.2)', async () => {
        const { repositorio, cliente } = repo();
        await repositorio.registrarTendencias([tendencia(1, 'ansiedad')]);
        await repositorio.registrarTendencias([tendencia(2, 'ansiedad')]);
        expect(cliente.filasTendencia).toHaveLength(2);
    });

    it('es no-op ante lotes vacios', async () => {
        const { repositorio, cliente } = repo();
        await repositorio.registrarTendencias([]);
        await repositorio.registrarEventos([]);
        expect(cliente.filasTendencia).toHaveLength(0);
        expect(cliente.filasEvento).toHaveLength(0);
    });
});
