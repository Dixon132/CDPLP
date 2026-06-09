/**
 * Prueba basada en propiedades (PBT) de la persistencia y reutilizacion de los
 * `Usuario_Sintetico` entre semanas de una `Comunidad_Digital` (tarea 14.5).
 *
 * Property 14: Persistencia y reutilizacion de usuarios sinteticos
 * (Req. 10.2, 10.3, 10.5).
 *
 * Para toda transicion de la semana `N` a la `N+1` de una comunidad:
 *  - **Reutilizacion / identidad estable (Req. 10.2, 10.3):** los
 *    `Usuario_Sintetico` existentes se conservan; sus identificadores NO se
 *    regeneran aunque se ofrezcan semillas nuevas en semanas posteriores.
 *  - **Acumulacion monotonica (Req. 10.5):** el historial acumulado de cada
 *    usuario crece monotonicamente por `numero_semana`, conservando las semanas
 *    previas sin reescribirlas.
 *
 * El servicio real ({@link ServicioUsuariosSinteticosPrisma}, tarea 14.2) se
 * ejerce sobre un doble en memoria del cliente Prisma que implementa la MISMA
 * logica de almacenamiento (findMany/create) sin red, de modo que la propiedad
 * valida la logica de negocio real y no un mock del comportamiento.
 *
 * Runner: Jest + ts-jest (globals describe/it/expect). Se reconoce por el
 * segmento `pbt` en su ruta (`jest pbt`, Req. 26.1, 26.2) y se ejecuta con un
 * minimo de 100 iteraciones (`{ numRuns: 100 }`, Req. 26.5).
 *
 * **Validates: Requirements 10.2, 10.3, 10.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 14: Persistencia y reutilización de usuarios sintéticos
import type {
    HistorialUsuario as HistorialRow,
    UsuarioSintetico as UsuarioRow,
} from '@prisma/client';
import fc from 'fast-check';

import {
    ServicioUsuariosSinteticosPrisma,
    type ClienteUsuarios,
    type RegistroActividad,
    type SemillaUsuarioSintetico,
} from '../usuarioSintetico';

// ---------------------------------------------------------------------------
// Doble en memoria de los delegates `usuarioSintetico` e `historialUsuario`.
//
// Reproduce la semantica de almacenamiento que necesita el servicio real:
// filtrado por comunidad/usuario y creacion con id autogenerado. La logica de
// reutilizacion y acumulacion vive ENTERAMENTE en el servicio bajo prueba.
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

// ---------------------------------------------------------------------------
// Generadores acotados al espacio de entrada del dominio.
// ---------------------------------------------------------------------------

/** Generador de una semilla de `Usuario_Sintetico` con seudonimo fijo por lote. */
function semillaArb(seudonimo: string): fc.Arbitrary<SemillaUsuarioSintetico> {
    return fc.record({
        seudonimo: fc.constant(seudonimo),
        perfilConductual: fc.constantFrom(
            'introvertido-academico',
            'extrovertido-social',
            'critico-politico',
            'observador-pasivo',
        ),
        frecuencia: fc.double({ min: 0, max: 1, noNaN: true }),
        estiloEscritura: fc.constantFrom('formal', 'coloquial', 'sarcastico', 'neutro'),
        intereses: fc.array(
            fc.constantFrom('estudios', 'musica', 'politica', 'deporte', 'cine'),
            { maxLength: 4 },
        ),
        nivelParticipacion: fc.constantFrom('bajo', 'medio', 'alto'),
    });
}

/** Genera un lote de N semillas con seudonimos distintos (`anon-0`..`anon-{N-1}`). */
function semillasArb(min: number, max: number): fc.Arbitrary<SemillaUsuarioSintetico[]> {
    return fc
        .integer({ min, max })
        .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => semillaArb(`anon-${i}`))));
}

/** Genera un `RegistroActividad` para una semana dada (la semana se fija fuera). */
function actividadSemanalArb(numeroSemana: number): fc.Arbitrary<RegistroActividad> {
    return fc.record({
        numeroSemana: fc.constant(numeroSemana),
        publicaciones: fc.nat({ max: 20 }),
        comentarios: fc.nat({ max: 50 }),
        interacciones: fc.array(
            fc.record({
                tipo: fc.constantFrom('responde', 'menciona', 'reacciona'),
                con: fc.constantFrom('anon-0', 'anon-1', 'anon-2'),
                conteo: fc.integer({ min: 1, max: 10 }),
            }),
            { maxLength: 3 },
        ),
        temas: fc.array(fc.constantFrom('examenes', 'paro', 'becas', 'transporte'), {
            maxLength: 3,
        }),
    });
}

/** Verdadero si `xs` es estrictamente creciente. */
function esEstrictamenteCreciente(xs: number[]): boolean {
    for (let i = 1; i < xs.length; i++) {
        if (xs[i] <= xs[i - 1]) return false;
    }
    return true;
}

describe('PBT Property 14: Persistencia y reutilizacion de usuarios sinteticos (Req. 10.2, 10.3, 10.5)', () => {
    it('a traves de las transiciones semana N -> N+1, los ids no se regeneran y el historial crece monotonicamente conservando las previas', async () => {
        await fc.assert(
            fc.asyncProperty(
                semillasArb(1, 4),
                fc.integer({ min: 2, max: 8 }), // numero de semanas simuladas (>= 1 transicion)
                // Semillas "intrusas" que se ofrecen en semanas posteriores: NO deben
                // crear nuevos usuarios (la reutilizacion ignora semillas si ya existen).
                semillasArb(0, 3),
                async (semillasIniciales, numeroSemanas, semillasIntrusas) => {
                    const { cliente, usuarios } = crearClienteEnMemoria();
                    const servicio = new ServicioUsuariosSinteticosPrisma(cliente);
                    const comunidadId = 'com-prop14';

                    // --- Semana 1: siembra inicial de la comunidad. ---
                    const semana1 = await servicio.obtenerOReutilizar(comunidadId, semillasIniciales);
                    const idsCanonicos = semana1.map((u) => u.id).sort();
                    expect(idsCanonicos.length).toBe(semillasIniciales.length);

                    // Acumula la actividad de la semana 1 para cada usuario.
                    for (const u of semana1) {
                        const reg = fc.sample(actividadSemanalArb(1), 1)[0];
                        await servicio.acumularHistorial(u.id, reg);
                    }

                    // --- Transiciones semana N -> N+1. ---
                    for (let semana = 2; semana <= numeroSemanas; semana++) {
                        // Reutilizacion: aunque se ofrezcan semillas nuevas, deben
                        // reutilizarse los usuarios existentes (Req. 10.2, 10.3).
                        const actuales = await servicio.obtenerOReutilizar(
                            comunidadId,
                            semillasIntrusas,
                        );

                        // 1) Los identificadores se conservan (no se regeneran).
                        expect(actuales.map((u) => u.id).sort()).toEqual(idsCanonicos);
                        // No se crearon usuarios adicionales en el almacen.
                        expect(
                            usuarios.filter((u) => u.comunidadId === comunidadId),
                        ).toHaveLength(idsCanonicos.length);

                        // 2) El historial previo se conserva intacto: cada usuario ya
                        //    tiene registradas las semanas [1 .. semana-1].
                        for (const u of actuales) {
                            const previo = await servicio.obtenerHistorial(u.id);
                            expect(previo.map((h) => h.numeroSemana)).toEqual(
                                Array.from({ length: semana - 1 }, (_, i) => i + 1),
                            );
                        }

                        // Acumula la actividad de la semana actual.
                        for (const u of actuales) {
                            const reg = fc.sample(actividadSemanalArb(semana), 1)[0];
                            await servicio.acumularHistorial(u.id, reg);
                        }
                    }

                    // --- Verificacion final del crecimiento monotonico. ---
                    const finales = await servicio.listar(comunidadId);
                    expect(finales.map((u) => u.id).sort()).toEqual(idsCanonicos);
                    for (const u of finales) {
                        const semanas = (await servicio.obtenerHistorial(u.id)).map(
                            (h) => h.numeroSemana,
                        );
                        // Conserva todas las semanas [1 .. numeroSemanas]...
                        expect(semanas).toEqual(
                            Array.from({ length: numeroSemanas }, (_, i) => i + 1),
                        );
                        // ...y crece de forma estrictamente creciente (monotonico).
                        expect(esEstrictamenteCreciente(semanas)).toBe(true);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('la acumulacion monotonica rechaza una semana no creciente conservando las previas (Req. 10.5)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 12 }), // ultima semana ya registrada
                fc.integer({ min: 0, max: 12 }), // semana intrusa (<= ultima => rechazada)
                async (ultima, intrusaDelta) => {
                    const { cliente } = crearClienteEnMemoria();
                    const servicio = new ServicioUsuariosSinteticosPrisma(cliente);
                    const [usuario] = await servicio.obtenerOReutilizar('com-mono', [
                        fc.sample(semillaArb('anon-0'), 1)[0],
                    ]);

                    // Acumula las semanas [1 .. ultima].
                    for (let s = 1; s <= ultima; s++) {
                        await servicio.acumularHistorial(
                            usuario.id,
                            fc.sample(actividadSemanalArb(s), 1)[0],
                        );
                    }

                    // Una semana <= ultima debe rechazarse, sin tocar el historial.
                    const intrusa = Math.min(ultima, intrusaDelta);
                    await expect(
                        servicio.acumularHistorial(
                            usuario.id,
                            fc.sample(actividadSemanalArb(intrusa), 1)[0],
                        ),
                    ).rejects.toThrow(/no monotonico/i);

                    const historial = await servicio.obtenerHistorial(usuario.id);
                    expect(historial.map((h) => h.numeroSemana)).toEqual(
                        Array.from({ length: ultima }, (_, i) => i + 1),
                    );
                },
            ),
            { numRuns: 100 },
        );
    });
});
