/**
 * Pruebas unitarias del `InstitutionsController` + `InstitutionsService`
 * (Gestor_Instituciones). Se ejercita el controlador real conectado al servicio
 * sobre un DOBLE EN MEMORIA del `PrismaService`: sin BD viva ni red. Jest.
 *
 * Cubren el CRUD y la geolocalizacion expuestos por HTTP:
 *  - alta con coordenadas/radio/logo y categorias validas (Req. 7.1-7.4),
 *  - listado y obtencion (con 404),
 *  - edicion parcial persistida (Req. 7.5),
 *  - restriccion ATOMICA de borrado de una institucion referenciada (Req. 7.6),
 *  - exposicion proactiva de restricciones de eliminacion (Req. 7.8).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_
 */
import { ConflictException, NotFoundException } from '@nestjs/common';

import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { CrearInstitucionDto } from './dto/crear-institucion.dto';

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
 * servicio: `institucion` y los `count` de las entidades dependientes, mas
 * `$transaction` (ejecucion inmediata del callback con el propio doble).
 */
class PrismaEnMemoria {
    private filas: FilaInstitucion[] = [];
    private contador = 0;
    /** Conteos de dependencias simulados por institucionId. */
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

    private contador0 = async ({ where }: { where: { institucionId: string } }): Promise<number> => 0;

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

describe('InstitutionsController: CRUD + geolocalizacion del Gestor_Instituciones', () => {
    let prisma: PrismaEnMemoria;
    let service: InstitutionsService;
    let controller: InstitutionsController;

    beforeEach(() => {
        prisma = new PrismaEnMemoria();
        service = new InstitutionsService(prisma as unknown as PrismaService);
        controller = new InstitutionsController(service);
    });

    it('crea una institucion con coordenadas, radio y logo (Req. 7.1, 7.3, 7.4)', async () => {
        const creada = await controller.crear(DTO_BASE);

        expect(creada.id).toBeTruthy();
        expect(creada.nombre).toBe(DTO_BASE.nombre);
        expect(creada.categoria).toBe('universidad');
        expect(creada.latitud).toBe(-16.5);
        expect(creada.longitud).toBe(-68.15);
        expect(creada.radioMetros).toBe(1500);
        expect(creada.logoUrl).toBe(DTO_BASE.logoUrl);
    });

    it('normaliza logo/descripcion ausentes a null', async () => {
        const creada = await controller.crear({
            nombre: 'Colegio Central',
            categoria: 'colegio',
            latitud: 0,
            longitud: 0,
            radioMetros: 500,
        });
        expect(creada.logoUrl).toBeNull();
        expect(creada.descripcion).toBeNull();
    });

    it('lista las instituciones persistidas', async () => {
        await controller.crear(DTO_BASE);
        await controller.crear({ ...DTO_BASE, nombre: 'Colegio A', categoria: 'colegio' });

        const lista = await controller.listar();
        expect(lista).toHaveLength(2);
        expect(lista.map((i) => i.nombre)).toContain('Colegio A');
    });

    it('obtiene una institucion por id', async () => {
        const creada = await controller.crear(DTO_BASE);
        const obtenida = await controller.obtener(creada.id);
        expect(obtenida.id).toBe(creada.id);
    });

    it('lanza 404 al obtener un id inexistente', async () => {
        await expect(controller.obtener('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('edita parcialmente y persiste los cambios (Req. 7.5)', async () => {
        const creada = await controller.crear(DTO_BASE);
        const editada = await controller.actualizar(creada.id, {
            radioMetros: 3000,
            descripcion: 'actualizada',
        });

        expect(editada.radioMetros).toBe(3000);
        expect(editada.descripcion).toBe('actualizada');
        // Lo no provisto se conserva.
        expect(editada.nombre).toBe(DTO_BASE.nombre);
        expect(editada.categoria).toBe('universidad');
    });

    it('lanza 404 al editar un id inexistente', async () => {
        await expect(
            controller.actualizar('no-existe', { radioMetros: 10 }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina una institucion sin dependencias', async () => {
        const creada = await controller.crear(DTO_BASE);
        await expect(controller.eliminar(creada.id)).resolves.toBeUndefined();
        await expect(controller.obtener(creada.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza atomicamente el borrado de una institucion referenciada (Req. 7.6)', async () => {
        const creada = await controller.crear(DTO_BASE);
        prisma.deps[creada.id] = 2; // referenciada por 2 comunidades de analisis

        await expect(controller.eliminar(creada.id)).rejects.toBeInstanceOf(ConflictException);
        // No se borro: sigue existiendo (rechazo atomico).
        await expect(controller.obtener(creada.id)).resolves.toMatchObject({ id: creada.id });
    });

    it('expone proactivamente las restricciones de eliminacion (Req. 7.8)', async () => {
        const creada = await controller.crear(DTO_BASE);

        const sinDeps = await controller.restricciones(creada.id);
        expect(sinDeps.puedeEliminar).toBe(true);
        expect(sinDeps.dependencias.total).toBe(0);
        expect(sinDeps.mensaje).toBe('');

        prisma.deps[creada.id] = 1;
        const conDeps = await controller.restricciones(creada.id);
        expect(conDeps.puedeEliminar).toBe(false);
        expect(conDeps.dependencias.comunidades).toBe(1);
        expect(conDeps.mensaje).toContain('No se puede eliminar');
    });

    it('lanza 404 al consultar restricciones de un id inexistente (Req. 7.8)', async () => {
        await expect(controller.restricciones('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });
});
