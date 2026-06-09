/**
 * Pruebas unitarias del `AnalysisController` + `AnalysisService` (Gestor_Analisis).
 * Se ejercita el controlador real conectado al servicio sobre un DOBLE EN
 * MEMORIA del `PrismaService`, un `Motor_Escenarios` doble y un
 * `DisparadorCicloInicial` espia: sin BD viva, sin red ni BullMQ. Jest.
 *
 * Cubren la creacion y administracion expuestas por HTTP:
 *  - alta con >=1 institucion, radio, semanas (<=24) y escenario (Req. 8.1, 8.3);
 *  - fijacion del escenario INMUTABLE + (escenario_id, version) (Req. 8.6, 29.4, 29.6);
 *  - una `Comunidad_Digital` por institucion con su `Zona_Geografica` derivada;
 *  - disparo de la semana 1 por cada institucion (Req. 8.5);
 *  - rechazo de creacion sin institucion y con escenario invalido (Req. 8.4, 8.2);
 *  - borrado en cascada transaccional aislado por analisis (Req. 25.4, 25.7).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 25.4, 25.7, 29.4, 29.6_
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
    DisparadorCicloInicial,
} from './analysis.types';
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

/** Doble en memoria del `PrismaService` con las delegaciones usadas por el servicio. */
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
        create: async ({ data }: { data: Omit<FilaAnalisis, 'id'> }): Promise<FilaAnalisis> => {
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
        }): Promise<(FilaAnalisis & { comunidades?: { institucionId: string }[] }) | null> => {
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
        findMany: async ({
            include,
        }: {
            orderBy?: unknown;
            include?: { comunidades?: unknown };
        }): Promise<(FilaAnalisis & { comunidades?: { institucionId: string }[] })[]> =>
            [...this.analisisFilas]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((f) => ({
                    ...f,
                    ...(include?.comunidades
                        ? {
                            comunidades: this.comunidades
                                .filter((c) => c.analisisId === f.id)
                                .map((c) => ({ institucionId: c.institucionId })),
                        }
                        : {}),
                })),
        delete: async ({ where }: { where: { id: string } }): Promise<FilaAnalisis> => {
            const idx = this.analisisFilas.findIndex((x) => x.id === where.id);
            const [borrada] = this.analisisFilas.splice(idx, 1);
            // Simula la CASCADA del esquema: borra las comunidades del analisis.
            this.comunidades = this.comunidades.filter((c) => c.analisisId !== where.id);
            return { ...borrada };
        },
    };

    comunidad = {
        create: async ({ data }: { data: Omit<FilaComunidad, 'id'> }): Promise<FilaComunidad> => {
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

/** Motor_Escenarios doble: resuelve la copia inmutable del escenario. */
class MotorEscenariosDoble implements MotorEscenarios {
    ultimaSeleccion?: SeleccionEscenario;
    proximaCopia: EscenarioFijado = {
        contexto: 'CONTEXTO FIJADO',
        escenarioId: 'esc-1',
        version: 3,
    };
    fallar = false;

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
    async fijarParaAnalisis(seleccion: SeleccionEscenario): Promise<EscenarioFijado> {
        this.ultimaSeleccion = seleccion;
        if (this.fallar) {
            throw new Error("fijarParaAnalisis requiere 'escenarioId' o 'personalizado'.");
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
    async dispararSemanaInicial(analisisId: string, institucionId: string): Promise<void> {
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

describe('AnalysisController: creacion y administracion del Gestor_Analisis', () => {
    let prisma: PrismaEnMemoria;
    let motor: MotorEscenariosDoble;
    let disparador: DisparadorEspia;
    let service: AnalysisService;
    let controller: AnalysisController;

    beforeEach(() => {
        prisma = new PrismaEnMemoria();
        prisma.instituciones = [
            { id: 'inst-1', latitud: -16.5, longitud: -68.15 },
            { id: 'inst-2', latitud: -17.4, longitud: -66.16 },
        ];
        motor = new MotorEscenariosDoble();
        disparador = new DisparadorEspia();
        service = new AnalysisService(
            prisma as unknown as PrismaService,
            motor,
            disparador,
        );
        controller = new AnalysisController(service);
    });

    it('crea un Analisis con escenario fijado, comunidades y dispara la semana 1 (Req. 8.1, 8.3, 8.5, 8.6, 29.6)', async () => {
        const creado = await controller.crear(DTO_BASE);

        expect(creado.id).toBeTruthy();
        expect(creado.nombre).toBe(DTO_BASE.nombre);
        expect(creado.semanasTotales).toBe(12);
        expect(creado.radioAnalisis).toBe(1500);
        // Escenario fijado como copia inmutable + trazabilidad (Req. 8.6, 29.4, 29.6).
        expect(creado.escenario).toBe('CONTEXTO FIJADO');
        expect(creado.escenarioId).toBe('esc-1');
        expect(creado.escenarioVersion).toBe(3);
        expect(creado.escenarioEsPersonalizado).toBe(false);
        // Una comunidad por institucion (Req. 8.3, 9.x).
        expect(creado.institucionIds.sort()).toEqual(['inst-1', 'inst-2']);
        // Disparo de la semana 1 por cada institucion (Req. 8.5).
        expect(disparador.disparos).toHaveLength(2);
        expect(disparador.disparos.map((d) => d.institucionId).sort()).toEqual([
            'inst-1',
            'inst-2',
        ]);
        expect(disparador.disparos.every((d) => d.analisisId === creado.id)).toBe(true);
    });

    it('deriva la Zona_Geografica de cada comunidad (coordenadas institucion + radio) (Req. 33.1)', async () => {
        const creado = await controller.crear(DTO_BASE);
        const com1 = prisma.comunidades.find(
            (c) => c.analisisId === creado.id && c.institucionId === 'inst-1',
        );
        expect(com1).toMatchObject({
            zonaLatitud: -16.5,
            zonaLongitud: -68.15,
            zonaRadioMetros: 1500,
        });
    });

    it('fija un escenario PERSONALIZADO marcandolo como tal (Req. 8.2, 29.3)', async () => {
        motor.proximaCopia = { contexto: 'mi contexto libre', escenarioId: null, version: null };
        const creado = await controller.crear({
            nombre: 'Personalizado',
            institucionIds: ['inst-1'],
            radioAnalisis: 800,
            semanasTotales: 4,
            personalizado: 'mi contexto libre',
        });

        expect(motor.ultimaSeleccion).toMatchObject({ personalizado: 'mi contexto libre' });
        expect(creado.escenario).toBe('mi contexto libre');
        expect(creado.escenarioEsPersonalizado).toBe(true);
        expect(creado.escenarioId).toBeNull();
        expect(creado.escenarioVersion).toBeNull();
    });

    it('rechaza la creacion sin al menos una institucion (Req. 8.4)', async () => {
        await expect(
            controller.crear({ ...DTO_BASE, institucionIds: [] }),
        ).rejects.toBeInstanceOf(BadRequestException);
        // No persiste nada ni dispara ciclos.
        expect(prisma.analisisFilas).toHaveLength(0);
        expect(disparador.disparos).toHaveLength(0);
    });

    it('rechaza la creacion con una institucion inexistente (integridad referencial)', async () => {
        await expect(
            controller.crear({ ...DTO_BASE, institucionIds: ['inst-1', 'fantasma'] }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.analisisFilas).toHaveLength(0);
    });

    it('rechaza la creacion con seleccion de escenario invalida (Req. 8.2)', async () => {
        motor.fallar = true;
        await expect(
            controller.crear({
                nombre: 'Sin escenario',
                institucionIds: ['inst-1'],
                radioAnalisis: 500,
                semanasTotales: 2,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.analisisFilas).toHaveLength(0);
    });

    it('lista y obtiene los analisis con sus instituciones', async () => {
        const creado = await controller.crear(DTO_BASE);
        const lista = await controller.listar();
        expect(lista).toHaveLength(1);
        const obtenido = await controller.obtener(creado.id);
        expect(obtenido.id).toBe(creado.id);
        expect(obtenido.institucionIds.sort()).toEqual(['inst-1', 'inst-2']);
    });

    it('lanza 404 al obtener un analisis inexistente', async () => {
        await expect(controller.obtener('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina un Analisis en cascada, aislado de otros analisis (Req. 25.4, 25.7)', async () => {
        const a = await controller.crear(DTO_BASE);
        const b = await controller.crear({ ...DTO_BASE, nombre: 'Otro analisis' });

        await expect(controller.eliminar(a.id)).resolves.toBeUndefined();

        // El analisis A y sus comunidades desaparecen (cascada).
        await expect(controller.obtener(a.id)).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.comunidades.some((c) => c.analisisId === a.id)).toBe(false);
        // El analisis B permanece INTACTO (aislamiento, Req. 25.4).
        const bVivo = await controller.obtener(b.id);
        expect(bVivo.institucionIds.sort()).toEqual(['inst-1', 'inst-2']);
        expect(prisma.comunidades.filter((c) => c.analisisId === b.id)).toHaveLength(2);
    });

    it('lanza 404 al eliminar un analisis inexistente', async () => {
        await expect(controller.eliminar('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });
});
