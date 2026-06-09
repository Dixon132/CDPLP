/**
 * Pruebas unitarias DEDICADAS de creacion y validacion del `Analisis`
 * (`AnalysisService` / Gestor_Analisis). Complementan a
 * `analysis.controller.test.ts` ejercitando el servicio de dominio directamente
 * sobre un DOBLE EN MEMORIA del `PrismaService`, un `Motor_Escenarios` doble y
 * un `DisparadorCicloInicial` espia (sin BD viva, sin red ni BullMQ). Jest.
 *
 * Cobertura del incremento (tarea 21.6):
 *  - CREACION agrupando UNA o VARIAS `Institucion` (Req. 8.1, 8.3), con
 *    deduplicacion de instituciones repetidas y una `Comunidad_Digital` por
 *    institucion.
 *  - CONFIGURACION temporal de hasta 24 `Semana_Simulada`: limites 1 y 24
 *    (Req. 8.1).
 *  - SELECCION de escenario de la `Biblioteca_Escenarios` (`escenarioId`) o
 *    PERSONALIZADO en texto libre, propagada al `Motor_Escenarios` (Req. 8.2).
 *  - VALIDACION que RECHAZA: seleccion vacia de instituciones (Req. 8.4),
 *    institucion inexistente (integridad referencial) y seleccion de escenario
 *    invalida (Req. 8.2), sin persistir ni disparar ciclos.
 *  - FIJACION del escenario como contexto INMUTABLE + (escenario_id, version)
 *    para trazabilidad (Req. 8.6, 29.4, 29.6).
 *
 * _Requirements: 8.2, 8.3, 8.4_
 */
import { BadRequestException } from '@nestjs/common';

import { AnalysisService } from './analysis.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { SEMANAS_MAXIMAS, type DisparadorCicloInicial } from './analysis.types';
import type {
    EscenarioFijado,
    MotorEscenarios,
    SeleccionEscenario,
} from './escenarios/escenarios.types';
import { CrearAnalisisDto } from './dto/crear-analisis.dto';

interface FilaInstitucion {
    id: string;
    latitud: number;
    longitud: number;
}
interface FilaAnalisis {
    id: string;
    nombre: string;
    escenario: string;
    escenarioEsPersonalizado: boolean;
    escenarioId: string | null;
    escenarioVersion: number | null;
    semanasTotales: number;
    radioAnalisis: number;
    saltAnon: string;
    modoEjecucion: string;
    intervaloTiempoRealMs: number | null;
    estadoEjecucion: string;
    estado: string;
}
interface FilaComunidad {
    id: string;
    analisisId: string;
    institucionId: string;
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
}

/** Doble en memoria del `PrismaService` con las delegaciones que usa el servicio. */
class PrismaEnMemoria {
    instituciones: FilaInstitucion[] = [];
    analisisFilas: FilaAnalisis[] = [];
    comunidades: FilaComunidad[] = [];
    private contador = 0;

    institucion = {
        findMany: async ({
            where,
        }: {
            where: { id: { in: string[] } };
            select?: unknown;
        }): Promise<FilaInstitucion[]> =>
            this.instituciones
                .filter((i) => where.id.in.includes(i.id))
                .map((i) => ({ ...i })),
    };

    analisis = {
        create: async ({
            data,
        }: {
            data: Omit<FilaAnalisis, 'id'>;
        }): Promise<FilaAnalisis> => {
            this.contador += 1;
            const fila: FilaAnalisis = { id: `an-${this.contador}`, ...data };
            this.analisisFilas.push(fila);
            return { ...fila };
        },
        findUnique: async ({
            where,
            include,
        }: {
            where: { id: string };
            include?: { comunidades?: unknown };
        }): Promise<
            (FilaAnalisis & { comunidades?: { institucionId: string }[] }) | null
        > => {
            const f = this.analisisFilas.find((x) => x.id === where.id);
            if (!f) return null;
            if (include?.comunidades) {
                return {
                    ...f,
                    comunidades: this.comunidades
                        .filter((c) => c.analisisId === f.id)
                        .map((c) => ({ institucionId: c.institucionId })),
                };
            }
            return { ...f };
        },
    };

    comunidad = {
        create: async ({
            data,
        }: {
            data: Omit<FilaComunidad, 'id'>;
        }): Promise<FilaComunidad> => {
            this.contador += 1;
            const fila: FilaComunidad = { id: `com-${this.contador}`, ...data };
            this.comunidades.push(fila);
            return { ...fila };
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        return cb(this);
    }
}

/** Motor_Escenarios doble: registra la seleccion y devuelve una copia fijada. */
class MotorEscenariosDoble implements MotorEscenarios {
    ultimaSeleccion?: SeleccionEscenario;
    proximaCopia: EscenarioFijado = {
        contexto: 'CONTEXTO FIJADO',
        escenarioId: 'esc-1',
        version: 3,
    };
    fallar = false;
    llamadas = 0;

    async guardar(): Promise<never> {
        throw new Error('no usado');
    }
    async listar(): Promise<never[]> {
        return [];
    }
    async obtenerPorId(): Promise<null> {
        return null;
    }
    async editar(): Promise<never> {
        throw new Error('no usado');
    }
    async fijarParaAnalisis(
        seleccion: SeleccionEscenario,
    ): Promise<EscenarioFijado> {
        this.llamadas += 1;
        this.ultimaSeleccion = seleccion;
        if (this.fallar) {
            throw new Error(
                "fijarParaAnalisis requiere 'escenarioId' o 'personalizado'.",
            );
        }
        return { ...this.proximaCopia };
    }
    async sembrarPredefinidos(): Promise<never[]> {
        return [];
    }
}

/** Disparador espia: registra los `(analisisId, institucionId)` disparados. */
class DisparadorEspia implements DisparadorCicloInicial {
    disparos: { analisisId: string; institucionId: string }[] = [];
    async dispararSemanaInicial(
        analisisId: string,
        institucionId: string,
    ): Promise<void> {
        this.disparos.push({ analisisId, institucionId });
    }
}

const DTO_BASE: CrearAnalisisDto = {
    nombre: 'Tendencias UMSA 2025',
    institucionIds: ['inst-1', 'inst-2'],
    radioAnalisis: 1500,
    semanasTotales: 12,
    escenarioId: 'esc-1',
};

describe('AnalysisService: creacion y validacion (tarea 21.6)', () => {
    let prisma: PrismaEnMemoria;
    let motor: MotorEscenariosDoble;
    let disparador: DisparadorEspia;
    let service: AnalysisService;

    beforeEach(() => {
        prisma = new PrismaEnMemoria();
        prisma.instituciones = [
            { id: 'inst-1', latitud: -16.5, longitud: -68.15 },
            { id: 'inst-2', latitud: -17.4, longitud: -66.16 },
            { id: 'inst-3', latitud: -19.05, longitud: -65.26 },
        ];
        motor = new MotorEscenariosDoble();
        disparador = new DisparadorEspia();
        service = new AnalysisService(
            prisma as unknown as PrismaService,
            motor,
            disparador,
        );
    });

    describe('agrupacion de una o varias Institucion (Req. 8.1, 8.3)', () => {
        it('crea un Analisis con una SOLA institucion (minimo valido)', async () => {
            const creado = await service.crear({
                ...DTO_BASE,
                institucionIds: ['inst-1'],
            });

            expect(creado.institucionIds).toEqual(['inst-1']);
            // Una comunidad por institucion.
            expect(
                prisma.comunidades.filter((c) => c.analisisId === creado.id),
            ).toHaveLength(1);
            // Dispara la semana 1 de esa unica institucion (Req. 8.5).
            expect(disparador.disparos).toEqual([
                { analisisId: creado.id, institucionId: 'inst-1' },
            ]);
        });

        it('crea un Analisis agrupando VARIAS instituciones, una comunidad por cada una', async () => {
            const creado = await service.crear({
                ...DTO_BASE,
                institucionIds: ['inst-1', 'inst-2', 'inst-3'],
            });

            expect(creado.institucionIds.sort()).toEqual([
                'inst-1',
                'inst-2',
                'inst-3',
            ]);
            expect(
                prisma.comunidades.filter((c) => c.analisisId === creado.id),
            ).toHaveLength(3);
            expect(disparador.disparos.map((d) => d.institucionId).sort()).toEqual([
                'inst-1',
                'inst-2',
                'inst-3',
            ]);
        });

        it('deduplica instituciones repetidas en la seleccion (una sola comunidad por institucion)', async () => {
            const creado = await service.crear({
                ...DTO_BASE,
                institucionIds: ['inst-1', 'inst-1', 'inst-2'],
            });

            expect(creado.institucionIds.sort()).toEqual(['inst-1', 'inst-2']);
            expect(
                prisma.comunidades.filter((c) => c.analisisId === creado.id),
            ).toHaveLength(2);
            // No dispara dos veces la misma institucion.
            expect(disparador.disparos).toHaveLength(2);
        });
    });

    describe('configuracion temporal de hasta 24 Semana_Simulada (Req. 8.1)', () => {
        it('acepta el limite inferior de 1 semana', async () => {
            const creado = await service.crear({ ...DTO_BASE, semanasTotales: 1 });
            expect(creado.semanasTotales).toBe(1);
        });

        it('acepta el limite superior de 24 semanas (SEMANAS_MAXIMAS)', async () => {
            const creado = await service.crear({
                ...DTO_BASE,
                semanasTotales: SEMANAS_MAXIMAS,
            });
            expect(creado.semanasTotales).toBe(24);
            expect(SEMANAS_MAXIMAS).toBe(24);
        });
    });

    describe('seleccion de escenario: biblioteca o personalizado (Req. 8.2)', () => {
        it('propaga la seleccion de la Biblioteca_Escenarios (escenarioId) al Motor_Escenarios', async () => {
            await service.crear({
                ...DTO_BASE,
                escenarioId: 'esc-guerra-del-gas',
            });
            expect(motor.ultimaSeleccion).toMatchObject({
                escenarioId: 'esc-guerra-del-gas',
            });
        });

        it('propaga la seleccion de un escenario PERSONALIZADO (texto libre) y lo marca como tal', async () => {
            motor.proximaCopia = {
                contexto: 'conflicto barrial inventado',
                escenarioId: null,
                version: null,
            };
            const creado = await service.crear({
                nombre: 'Personalizado',
                institucionIds: ['inst-1'],
                radioAnalisis: 800,
                semanasTotales: 4,
                personalizado: 'conflicto barrial inventado',
                guardarEnBiblioteca: true,
            });

            expect(motor.ultimaSeleccion).toMatchObject({
                personalizado: 'conflicto barrial inventado',
                guardarEnBiblioteca: true,
            });
            expect(creado.escenarioEsPersonalizado).toBe(true);
            expect(creado.escenario).toBe('conflicto barrial inventado');
            expect(creado.escenarioId).toBeNull();
            expect(creado.escenarioVersion).toBeNull();
        });
    });

    describe('validacion que rechaza creaciones invalidas', () => {
        it('rechaza seleccion VACIA de instituciones sin persistir ni disparar (Req. 8.4)', async () => {
            await expect(
                service.crear({ ...DTO_BASE, institucionIds: [] }),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(prisma.analisisFilas).toHaveLength(0);
            expect(prisma.comunidades).toHaveLength(0);
            expect(disparador.disparos).toHaveLength(0);
            // No se llega siquiera a fijar escenario.
            expect(motor.llamadas).toBe(0);
        });

        it('rechaza con un mensaje de validacion explicito ante seleccion vacia (Req. 8.4)', async () => {
            await expect(
                service.crear({ ...DTO_BASE, institucionIds: [] }),
            ).rejects.toThrow(/al menos una Institucion/i);
        });

        it('rechaza una institucion INEXISTENTE indicando cual falta (integridad referencial)', async () => {
            await expect(
                service.crear({
                    ...DTO_BASE,
                    institucionIds: ['inst-1', 'fantasma'],
                }),
            ).rejects.toThrow(/fantasma/);

            expect(prisma.analisisFilas).toHaveLength(0);
            expect(disparador.disparos).toHaveLength(0);
        });

        it('rechaza una SELECCION DE ESCENARIO invalida traducida a error de validacion (Req. 8.2)', async () => {
            motor.fallar = true;
            await expect(
                service.crear({
                    nombre: 'Sin escenario',
                    institucionIds: ['inst-1'],
                    radioAnalisis: 500,
                    semanasTotales: 2,
                }),
            ).rejects.toBeInstanceOf(BadRequestException);

            // El escenario invalido aborta antes de persistir o disparar.
            expect(prisma.analisisFilas).toHaveLength(0);
            expect(prisma.comunidades).toHaveLength(0);
            expect(disparador.disparos).toHaveLength(0);
        });
    });

    describe('fijacion del escenario como contexto INMUTABLE (Req. 8.6, 29.4, 29.6)', () => {
        it('persiste la copia del escenario con su trazabilidad (escenario_id, version)', async () => {
            motor.proximaCopia = {
                contexto: 'CONTEXTO INMUTABLE',
                escenarioId: 'esc-7',
                version: 5,
            };
            const creado = await service.crear(DTO_BASE);

            expect(creado.escenario).toBe('CONTEXTO INMUTABLE');
            expect(creado.escenarioId).toBe('esc-7');
            expect(creado.escenarioVersion).toBe(5);
        });

        it('el contexto fijado NO cambia aunque mute la fuente del Motor_Escenarios tras crear', async () => {
            const creado = await service.crear(DTO_BASE);
            const contextoOriginal = creado.escenario;

            // Mutar la "fuente" del motor despues de la creacion no debe afectar
            // al contexto ya fijado y persistido en el Analisis.
            motor.proximaCopia.contexto = 'CONTEXTO MUTADO POSTERIORMENTE';

            const obtenido = await service.obtener(creado.id);
            expect(obtenido.escenario).toBe(contextoOriginal);
            expect(obtenido.escenario).not.toBe('CONTEXTO MUTADO POSTERIORMENTE');
        });
    });
});
