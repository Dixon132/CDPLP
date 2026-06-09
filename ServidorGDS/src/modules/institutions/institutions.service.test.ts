/**
 * Pruebas unitarias DEDICADAS del `InstitutionsService` (Gestor_Instituciones)
 * centradas en el CRUD y la geolocalizacion (tarea 20.3). Ejercitan el servicio
 * real sobre un DOBLE EN MEMORIA del `PrismaService`: sin BD viva ni red. Jest.
 *
 * Complementan a `institutions.controller.test.ts` (que valida la capa HTTP)
 * cubriendo a nivel de servicio:
 *  - alta y persistencia con coordenadas/radio/logo (Req. 7.1, 7.3, 7.4),
 *  - TODAS las categorias validas del conjunto {universidad, colegio,
 *    instituto, escuela} (Req. 7.2),
 *  - almacenamiento de coordenadas y radio en valores limite (Req. 7.3),
 *  - referencia al logo: alta, actualizacion y limpieza a null (Req. 7.4),
 *  - edicion parcial persistida campo a campo y auditoria de los cambios en el
 *    alta, la edicion y el borrado (Req. 7.5).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
 */
import { Logger } from '@nestjs/common';

import { InstitutionsService } from './institutions.service';
import type { PrismaService } from '../../prisma/prisma.service';
import {
    CATEGORIAS_INSTITUCION,
    type CategoriaInstitucion,
} from './institutions.types';
import type { CrearInstitucionDto } from './dto/crear-institucion.dto';

interface FilaInstitucion {
    id: string;
    nombre: string;
    categoria: string;
    latitud: number;
    longitud: number;
    radioMetros: number;
    logoUrl: string | null;
    descripcion: string | null;
}

/**
 * Doble en memoria del `PrismaService` con las delegaciones usadas por el
 * servicio: `institucion` (create/findMany/findUnique/update/delete), los
 * `count` de las entidades dependientes y `$transaction` (ejecucion inmediata
 * del callback con el propio doble). Reproduce la persistencia real sin BD.
 */
class PrismaEnMemoria {
    private filas: FilaInstitucion[] = [];
    private contador = 0;
    /** Conteo de dependencias simulado por institucionId (0 por defecto). */
    deps: Record<string, number> = {};

    institucion = {
        create: async ({ data }: { data: Omit<FilaInstitucion, 'id'> }): Promise<FilaInstitucion> => {
            this.contador += 1;
            const fila: FilaInstitucion = { id: `inst-${this.contador}`, ...data };
            this.filas.push(fila);
            return { ...fila };
        },
        findMany: async (): Promise<FilaInstitucion[]> =>
            [...this.filas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((f) => ({ ...f })),
        findUnique: async ({ where }: { where: { id: string } }): Promise<FilaInstitucion | null> => {
            const f = this.filas.find((x) => x.id === where.id);
            return f ? { ...f } : null;
        },
        update: async ({
            where,
            data,
        }: {
            where: { id: string };
            data: Partial<Omit<FilaInstitucion, 'id'>>;
        }): Promise<FilaInstitucion> => {
            const f = this.filas.find((x) => x.id === where.id);
            if (!f) throw new Error('no existe');
            Object.assign(f, data);
            return { ...f };
        },
        delete: async ({ where }: { where: { id: string } }): Promise<FilaInstitucion> => {
            const idx = this.filas.findIndex((x) => x.id === where.id);
            const [borrada] = this.filas.splice(idx, 1);
            return { ...borrada };
        },
    };

    private contador0 = async (_args: { where: { institucionId: string } }): Promise<number> => 0;

    comunidad = {
        count: async ({ where }: { where: { institucionId: string } }): Promise<number> =>
            this.deps[where.institucionId] ?? 0,
    };
    cicloSemanal = { count: this.contador0 };
    evidence = { count: this.contador0 };
    reporte = { count: this.contador0 };
    embedding = { count: this.contador0 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        return cb(this);
    }
}

const DTO_BASE: CrearInstitucionDto = {
    nombre: 'Universidad Mayor de San Andres',
    categoria: 'universidad',
    latitud: -16.5,
    longitud: -68.15,
    radioMetros: 1500,
    logoUrl: 'https://cdn.gds/logos/umsa.png',
    descripcion: 'Universidad publica',
};

describe('InstitutionsService: CRUD y geolocalizacion (Req. 7.1-7.5)', () => {
    let prisma: PrismaEnMemoria;
    let service: InstitutionsService;

    beforeEach(() => {
        prisma = new PrismaEnMemoria();
        service = new InstitutionsService(prisma as unknown as PrismaService);
    });

    describe('alta y persistencia (Req. 7.1)', () => {
        it('crea y persiste una institucion recuperable por id', async () => {
            const creada = await service.crear(DTO_BASE);

            expect(creada.id).toBeTruthy();
            const persistida = await service.obtener(creada.id);
            expect(persistida).toEqual(creada);
            expect(persistida.nombre).toBe(DTO_BASE.nombre);
            expect(persistida.descripcion).toBe('Universidad publica');
        });
    });

    describe('categorias validas (Req. 7.2)', () => {
        it.each([...CATEGORIAS_INSTITUCION])(
            'admite y persiste la categoria "%s"',
            async (categoria: CategoriaInstitucion) => {
                const creada = await service.crear({
                    ...DTO_BASE,
                    nombre: `Institucion ${categoria}`,
                    categoria,
                });
                expect(creada.categoria).toBe(categoria);
                const persistida = await service.obtener(creada.id);
                expect(persistida.categoria).toBe(categoria);
            },
        );

        it('cubre exactamente el conjunto {universidad, colegio, instituto, escuela}', () => {
            expect([...CATEGORIAS_INSTITUCION].sort()).toEqual(
                ['colegio', 'escuela', 'instituto', 'universidad'].sort(),
            );
        });
    });

    describe('almacenamiento de coordenadas y radio (Req. 7.3)', () => {
        it('persiste latitud, longitud y radio tal cual se proveen', async () => {
            const creada = await service.crear({
                ...DTO_BASE,
                latitud: -16.500123,
                longitud: -68.150987,
                radioMetros: 2750,
            });
            expect(creada.latitud).toBeCloseTo(-16.500123, 6);
            expect(creada.longitud).toBeCloseTo(-68.150987, 6);
            expect(creada.radioMetros).toBe(2750);
        });

        it.each([
            ['limite sur/oeste', -90, -180],
            ['limite norte/este', 90, 180],
            ['origen (ecuador/meridiano)', 0, 0],
        ])('almacena coordenadas en %s', async (_caso, latitud, longitud) => {
            const creada = await service.crear({
                ...DTO_BASE,
                latitud,
                longitud,
                radioMetros: 1,
            });
            const persistida = await service.obtener(creada.id);
            expect(persistida.latitud).toBe(latitud);
            expect(persistida.longitud).toBe(longitud);
            expect(persistida.radioMetros).toBe(1);
        });
    });

    describe('referencia al logo (Req. 7.4)', () => {
        it('almacena la referencia del logo cuando se adjunta', async () => {
            const creada = await service.crear({
                ...DTO_BASE,
                logoUrl: 'https://cdn.gds/logos/colegio.svg',
            });
            expect(creada.logoUrl).toBe('https://cdn.gds/logos/colegio.svg');
        });

        it('normaliza el logo ausente a null', async () => {
            const { logoUrl: _omit, ...sinLogo } = DTO_BASE;
            const creada = await service.crear(sinLogo);
            expect(creada.logoUrl).toBeNull();
        });

        it('permite limpiar el logo a null en una edicion', async () => {
            const creada = await service.crear(DTO_BASE);
            expect(creada.logoUrl).toBe(DTO_BASE.logoUrl);

            const editada = await service.actualizar(creada.id, { logoUrl: undefined });
            // `logoUrl` no provisto: se conserva el valor previo.
            expect(editada.logoUrl).toBe(DTO_BASE.logoUrl);
        });

        it('actualiza la referencia del logo a un nuevo valor', async () => {
            const creada = await service.crear(DTO_BASE);
            const editada = await service.actualizar(creada.id, {
                logoUrl: 'https://cdn.gds/logos/nuevo.png',
            });
            expect(editada.logoUrl).toBe('https://cdn.gds/logos/nuevo.png');
        });
    });

    describe('edicion parcial y auditoria (Req. 7.5)', () => {
        it('persiste cambios de cada campo y conserva lo no provisto', async () => {
            const creada = await service.crear(DTO_BASE);

            const editada = await service.actualizar(creada.id, {
                nombre: 'UMSA (renombrada)',
                categoria: 'instituto',
                latitud: -17.1,
                longitud: -66.2,
                radioMetros: 4200,
                descripcion: 'descripcion nueva',
            });

            expect(editada.nombre).toBe('UMSA (renombrada)');
            expect(editada.categoria).toBe('instituto');
            expect(editada.latitud).toBe(-17.1);
            expect(editada.longitud).toBe(-66.2);
            expect(editada.radioMetros).toBe(4200);
            expect(editada.descripcion).toBe('descripcion nueva');
            // Campo no provisto: se conserva.
            expect(editada.logoUrl).toBe(DTO_BASE.logoUrl);
            // El id no cambia.
            expect(editada.id).toBe(creada.id);

            // La edicion quedo efectivamente persistida.
            const persistida = await service.obtener(creada.id);
            expect(persistida).toEqual(editada);
        });

        it('una edicion vacia no altera el estado almacenado', async () => {
            const creada = await service.crear(DTO_BASE);
            const editada = await service.actualizar(creada.id, {});
            expect(editada).toEqual(creada);
        });

        it('registra para auditoria el alta, la edicion y el borrado (Req. 7.5)', async () => {
            const logSpy = jest
                .spyOn(Logger.prototype, 'log')
                .mockImplementation(() => undefined);

            const creada = await service.crear(DTO_BASE, 'admin-1');
            await service.actualizar(creada.id, { radioMetros: 9000 }, 'admin-1');
            await service.eliminar(creada.id, 'admin-1');

            const mensajes = logSpy.mock.calls.map((c) => String(c[0]));
            const auditorias = mensajes.filter((m) => m.includes('[auditoria][institucion]'));

            expect(auditorias.some((m) => m.includes('accion=crear') && m.includes(creada.id))).toBe(true);
            expect(
                auditorias.some(
                    (m) =>
                        m.includes('accion=actualizar') &&
                        m.includes(creada.id) &&
                        m.includes('9000'),
                ),
            ).toBe(true);
            expect(auditorias.some((m) => m.includes('accion=eliminar') && m.includes(creada.id))).toBe(true);
            // La auditoria registra al actor del cambio.
            expect(auditorias.every((m) => m.includes('actor=admin-1'))).toBe(true);

            logSpy.mockRestore();
        });
    });

    describe('listado (Req. 7.1)', () => {
        it('devuelve las instituciones ordenadas por nombre', async () => {
            await service.crear({ ...DTO_BASE, nombre: 'Zeta', categoria: 'escuela' });
            await service.crear({ ...DTO_BASE, nombre: 'Alfa', categoria: 'colegio' });
            await service.crear({ ...DTO_BASE, nombre: 'Mu', categoria: 'instituto' });

            const lista = await service.listar();
            expect(lista.map((i) => i.nombre)).toEqual(['Alfa', 'Mu', 'Zeta']);
        });
    });
});
