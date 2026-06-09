/**
 * Pruebas unitarias del `Usuario_Sintetico` persistente migrado al modulo
 * `communities` (tarea 14.2).
 *
 * Cubren:
 *  - Helpers PUROS: (de)serializacion de intereses y actividad, agregacion de
 *    patrones de interaccion y mapeo fila<->dominio (Req. 10.1).
 *  - La logica central del servicio sobre un doble en memoria que ejerce la
 *    MISMA logica real (findMany/create), sin red:
 *    - **Perfil conductual completo (Req. 10.1):** cada usuario representa
 *      perfil, frecuencia, estilo, intereses, participacion, patrones e historial.
 *    - **Reutilizacion (Req. 10.2, 10.3):** los usuarios existentes de una
 *      comunidad se reutilizan entre semanas, NO se regeneran.
 *    - **Acumulacion monotonica (Req. 10.5):** el historial crece por semana
 *      estrictamente creciente, conservando las semanas previas.
 *  - El provider `UsuariosSinteticosService` (DI) sobre un `PrismaService`
 *    doble, para validar el camino NestJS (Req. 10.2, 10.3, 10.5).
 *
 * Runner: Jest + ts-jest (globals describe/it/expect).
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.5_
 */
import type {
    HistorialUsuario as HistorialRow,
    UsuarioSintetico as UsuarioRow,
} from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';
import {
    ServicioUsuariosSinteticosPrisma,
    UsuariosSinteticosService,
    agregarPatronesInteraccion,
    mapHistorialRowToRegistro,
    mapUsuarioRowToDominio,
    parsearActividad,
    parsearIntereses,
    serializarActividad,
    serializarIntereses,
    type ClienteUsuarios,
    type RegistroActividad,
    type SemillaUsuarioSintetico,
} from './usuarioSintetico';

// ---------------------------------------------------------------------------
// Doble en memoria de los delegates `usuarioSintetico` e `historialUsuario`.
// Ejerce la MISMA logica real del servicio (findMany/create), sin red.
// ---------------------------------------------------------------------------
function crearClienteEnMemoria(): {
    cliente: ClienteUsuarios;
    usuarios: UsuarioRow[];
    historiales: HistorialRow[];
} {
    const usuarios: UsuarioRow[] = [];
    const historiales: HistorialRow[] = [];
    let seqUsuario = 0;
    let seqHistorial = 0;

    const usuarioSintetico = {
        findMany: async ({
            where,
        }: {
            where: { comunidadId: string };
        }): Promise<UsuarioRow[]> => {
            return usuarios.filter((u) => u.comunidadId === where.comunidadId);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }): Promise<UsuarioRow> => {
            const row = { id: `usr-${++seqUsuario}`, ...data } as UsuarioRow;
            usuarios.push(row);
            return row;
        },
    };

    const historialUsuario = {
        findMany: async ({
            where,
        }: {
            where: { usuarioId: string | { in: string[] } };
        }): Promise<HistorialRow[]> => {
            if (typeof where.usuarioId === 'string') {
                const uid = where.usuarioId;
                return historiales.filter((h) => h.usuarioId === uid);
            }
            const ids = new Set(where.usuarioId.in);
            return historiales.filter((h) => ids.has(h.usuarioId));
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }): Promise<HistorialRow> => {
            const row = { id: `hist-${++seqHistorial}`, ...data } as HistorialRow;
            historiales.push(row);
            return row;
        },
    };

    const cliente = { usuarioSintetico, historialUsuario } as unknown as ClienteUsuarios;
    return { cliente, usuarios, historiales };
}

function semilla(overrides: Partial<SemillaUsuarioSintetico> = {}): SemillaUsuarioSintetico {
    return {
        seudonimo: 'anon-1',
        perfilConductual: 'introvertido-academico',
        frecuencia: 0.4,
        estiloEscritura: 'formal',
        intereses: ['estudios', 'musica'],
        nivelParticipacion: 'medio',
        ...overrides,
    };
}

function registro(overrides: Partial<RegistroActividad> = {}): RegistroActividad {
    return {
        numeroSemana: 1,
        publicaciones: 2,
        comentarios: 5,
        interacciones: [{ tipo: 'responde', con: 'anon-2', conteo: 3 }],
        temas: ['examenes'],
        ...overrides,
    };
}

function usuarioRow(overrides: Partial<UsuarioRow> = {}): UsuarioRow {
    return {
        id: 'usr-row',
        comunidadId: 'com-1',
        seudonimo: 'anon-1',
        perfilConductual: 'introvertido-academico',
        frecuencia: 0.4,
        estiloEscritura: 'formal',
        intereses: JSON.stringify(['estudios', 'musica']),
        nivelParticipacion: 'medio',
        ...overrides,
    } as UsuarioRow;
}

function historialRow(overrides: Partial<HistorialRow> = {}): HistorialRow {
    return {
        id: 'hist-row',
        usuarioId: 'usr-row',
        numeroSemana: 1,
        actividad: serializarActividad(registro()),
        ...overrides,
    } as HistorialRow;
}

// ---------------------------------------------------------------------------
// Helpers puros.
// ---------------------------------------------------------------------------
describe('intereses (serializacion/parseo)', () => {
    it('round-trip de una lista de intereses', () => {
        const arr = ['a', 'b', 'c'];
        expect(parsearIntereses(serializarIntereses(arr))).toEqual(arr);
    });

    it('parsea una lista vacia', () => {
        expect(parsearIntereses(serializarIntereses([]))).toEqual([]);
    });

    it('interpreta un valor no-JSON como un unico interes (compatibilidad)', () => {
        expect(parsearIntereses('deportes')).toEqual(['deportes']);
    });

    it('filtra elementos no-string del JSON', () => {
        expect(parsearIntereses(JSON.stringify(['a', 1, null, 'b']))).toEqual(['a', 'b']);
    });
});

describe('actividad (serializacion/parseo)', () => {
    it('round-trip de un registro de actividad', () => {
        const r = registro({ numeroSemana: 4, notas: 'reacciono al paro' });
        // `serializarActividad` produce `InputJsonValue` (escritura); al releer se
        // trata como `JsonValue` (lectura), de ahi el cast por `unknown`.
        const parsed = parsearActividad(
            4,
            serializarActividad(r) as unknown as Parameters<typeof parsearActividad>[1],
        );
        expect(parsed).toEqual(r);
    });

    it('aplica valores por defecto seguros ante un Json invalido', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = parsearActividad(2, null as any);
        expect(parsed).toEqual({
            numeroSemana: 2,
            publicaciones: 0,
            comentarios: 0,
            interacciones: [],
            temas: [],
        });
    });

    it('descarta interacciones malformadas conservando las validas', () => {
        const actividad = {
            publicaciones: 1,
            comentarios: 0,
            interacciones: [{ tipo: 'menciona', conteo: 2 }, { conteo: 9 }, 'ruido'],
            temas: ['x', 5],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = parsearActividad(1, actividad as any);
        expect(parsed.interacciones).toEqual([{ tipo: 'menciona', conteo: 2 }]);
        expect(parsed.temas).toEqual(['x']);
    });
});

describe('agregarPatronesInteraccion', () => {
    it('suma conteos por (tipo, con) a lo largo del historial', () => {
        const historial: RegistroActividad[] = [
            registro({ numeroSemana: 1, interacciones: [{ tipo: 'responde', con: 'b', conteo: 2 }] }),
            registro({
                numeroSemana: 2,
                interacciones: [
                    { tipo: 'responde', con: 'b', conteo: 3 },
                    { tipo: 'menciona', con: 'c', conteo: 1 },
                ],
            }),
        ];
        const agregados = agregarPatronesInteraccion(historial);
        expect(agregados).toContainEqual({ tipo: 'responde', con: 'b', conteo: 5 });
        expect(agregados).toContainEqual({ tipo: 'menciona', con: 'c', conteo: 1 });
        expect(agregados).toHaveLength(2);
    });

    it('devuelve lista vacia para historial sin interacciones', () => {
        expect(agregarPatronesInteraccion([])).toEqual([]);
    });
});

describe('mapeo fila<->dominio', () => {
    it('mapUsuarioRowToDominio representa el perfil completo con historial ordenado (Req. 10.1)', () => {
        const rows = [
            historialRow({
                id: 'h2',
                numeroSemana: 3,
                actividad: serializarActividad(
                    registro({ numeroSemana: 3 }),
                ) as unknown as HistorialRow['actividad'],
            }),
            historialRow({ id: 'h1', numeroSemana: 1 }),
        ];
        const dominio = mapUsuarioRowToDominio(usuarioRow(), rows);
        expect(dominio).toMatchObject({
            id: 'usr-row',
            comunidadId: 'com-1',
            seudonimo: 'anon-1',
            perfilConductual: 'introvertido-academico',
            frecuencia: 0.4,
            estiloEscritura: 'formal',
            intereses: ['estudios', 'musica'],
            nivelParticipacion: 'medio',
        });
        expect(dominio.historial.map((h) => h.numeroSemana)).toEqual([1, 3]);
        expect(dominio.patronesInteraccion).toContainEqual({
            tipo: 'responde',
            con: 'anon-2',
            conteo: 6,
        });
    });

    it('mapHistorialRowToRegistro reconstruye el registro semanal', () => {
        const r = mapHistorialRowToRegistro(historialRow({ numeroSemana: 7 }));
        expect(r.numeroSemana).toBe(7);
        expect(r.publicaciones).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Servicio de compatibilidad: reutilizacion.
// ---------------------------------------------------------------------------
describe('ServicioUsuariosSinteticosPrisma.obtenerOReutilizar', () => {
    it('crea los usuarios en la siembra inicial con perfil conductual completo (Req. 10.1)', async () => {
        const { cliente, usuarios } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);

        const creados = await servicio.obtenerOReutilizar('com-1', [
            semilla({ seudonimo: 'a' }),
            semilla({ seudonimo: 'b' }),
        ]);

        expect(creados).toHaveLength(2);
        expect(usuarios).toHaveLength(2);
        expect(creados.map((u) => u.seudonimo).sort()).toEqual(['a', 'b']);
        expect(creados[0]).toMatchObject({
            comunidadId: 'com-1',
            perfilConductual: 'introvertido-academico',
            frecuencia: 0.4,
            estiloEscritura: 'formal',
            intereses: ['estudios', 'musica'],
            nivelParticipacion: 'medio',
            historial: [],
            patronesInteraccion: [],
        });
    });

    it('reutiliza (NO regenera) los usuarios existentes entre semanas (Req. 10.2, 10.3)', async () => {
        const { cliente, usuarios } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);

        const semana1 = await servicio.obtenerOReutilizar('com-1', [
            semilla({ seudonimo: 'a' }),
            semilla({ seudonimo: 'b' }),
        ]);
        const idsSemana1 = semana1.map((u) => u.id).sort();

        // Semana 2: aunque se pasen semillas nuevas, deben reutilizarse los mismos.
        const semana2 = await servicio.obtenerOReutilizar('com-1', [
            semilla({ seudonimo: 'c' }),
            semilla({ seudonimo: 'd' }),
            semilla({ seudonimo: 'e' }),
        ]);

        expect(usuarios).toHaveLength(2); // no se crearon nuevos
        expect(semana2.map((u) => u.id).sort()).toEqual(idsSemana1); // mismos ids
        expect(semana2.map((u) => u.seudonimo).sort()).toEqual(['a', 'b']);
    });

    it('aisla las comunidades: cada una mantiene sus propios usuarios', async () => {
        const { cliente } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);

        await servicio.obtenerOReutilizar('com-1', [semilla({ seudonimo: 'a' })]);
        await servicio.obtenerOReutilizar('com-2', [semilla({ seudonimo: 'z' })]);

        const com1 = await servicio.listar('com-1');
        const com2 = await servicio.listar('com-2');
        expect(com1.map((u) => u.seudonimo)).toEqual(['a']);
        expect(com2.map((u) => u.seudonimo)).toEqual(['z']);
    });
});

// ---------------------------------------------------------------------------
// Servicio de compatibilidad: acumulacion monotonica del historial.
// ---------------------------------------------------------------------------
describe('ServicioUsuariosSinteticosPrisma.acumularHistorial', () => {
    it('acumula semanas crecientes conservando las previas (Req. 10.5)', async () => {
        const { cliente } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);
        const [usuario] = await servicio.obtenerOReutilizar('com-1', [semilla()]);

        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 1 }));
        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 }));
        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 3 }));

        const historial = await servicio.obtenerHistorial(usuario.id);
        expect(historial.map((h) => h.numeroSemana)).toEqual([1, 2, 3]);
    });

    it('rechaza una semana que no es estrictamente creciente (Req. 10.5)', async () => {
        const { cliente } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);
        const [usuario] = await servicio.obtenerOReutilizar('com-1', [semilla()]);

        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 }));

        await expect(
            servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 })),
        ).rejects.toThrow(/no monotonico/i);
        await expect(
            servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 1 })),
        ).rejects.toThrow(/no monotonico/i);

        // El historial previo se conserva intacto.
        const historial = await servicio.obtenerHistorial(usuario.id);
        expect(historial.map((h) => h.numeroSemana)).toEqual([2]);
    });

    it('el historial acumulado se refleja al reutilizar el usuario (Req. 10.3, 10.5)', async () => {
        const { cliente } = crearClienteEnMemoria();
        const servicio = new ServicioUsuariosSinteticosPrisma(cliente);
        const [usuario] = await servicio.obtenerOReutilizar('com-1', [semilla()]);

        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 1 }));
        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 }));

        // Reutilizacion en una semana posterior debe traer el historial acumulado.
        const [reutilizado] = await servicio.obtenerOReutilizar('com-1', []);
        expect(reutilizado.id).toBe(usuario.id);
        expect(reutilizado.historial.map((h) => h.numeroSemana)).toEqual([1, 2]);
        expect(reutilizado.patronesInteraccion).toContainEqual({
            tipo: 'responde',
            con: 'anon-2',
            conteo: 6,
        });
    });
});

// ---------------------------------------------------------------------------
// Provider NestJS: misma logica sobre el `PrismaService` (doble en memoria).
// ---------------------------------------------------------------------------
describe('UsuariosSinteticosService (provider NestJS)', () => {
    it('reutiliza usuarios y acumula historial monotonicamente (Req. 10.2, 10.3, 10.5)', async () => {
        const { cliente, usuarios } = crearClienteEnMemoria();
        const servicio = new UsuariosSinteticosService(cliente as unknown as PrismaService);

        const semana1 = await servicio.obtenerOReutilizar('com-1', [
            semilla({ seudonimo: 'a' }),
            semilla({ seudonimo: 'b' }),
        ]);
        const idsSemana1 = semana1.map((u) => u.id).sort();

        // Reutilizacion entre semanas: no se regeneran identificadores.
        const semana2 = await servicio.obtenerOReutilizar('com-1', [semilla({ seudonimo: 'c' })]);
        expect(usuarios).toHaveLength(2);
        expect(semana2.map((u) => u.id).sort()).toEqual(idsSemana1);

        // Acumulacion monotonica del historial de un usuario.
        const usuario = semana1[0];
        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 1 }));
        await servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 }));
        const historial = await servicio.obtenerHistorial(usuario.id);
        expect(historial.map((h) => h.numeroSemana)).toEqual([1, 2]);

        await expect(
            servicio.acumularHistorial(usuario.id, registro({ numeroSemana: 2 })),
        ).rejects.toThrow(/no monotonico/i);
    });
});
