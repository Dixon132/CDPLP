/**
 * Pruebas unitarias del `EscenariosController` (API de la
 * `Biblioteca_Escenarios`). Se ejercita el controlador real conectado al
 * `MotorEscenariosService` sobre un DOBLE EN MEMORIA del puerto
 * `BibliotecaEscenariosRepositorio`: sin BD viva ni red. Pruebas en Jest.
 *
 * Cubren el CRUD versionado expuesto por HTTP:
 *  - listar / obtener (con 404), crear (personalizado, version 1),
 *  - editar (nueva version sin mutar la previa, con 404),
 *  - seed idempotente de predefinidos.
 *
 * _Requirements: 29.1, 29.2, 29.5, 29.6, 29.7_
 */
import { NotFoundException } from '@nestjs/common';

import { EscenariosController } from './escenarios.controller';
import { MotorEscenariosService } from './motor-escenarios.service';
import { ESCENARIOS_PREDEFINIDOS } from './escenarios.predefinidos';
import { CrearEscenarioDto } from './dto/crear-escenario.dto';
import type {
    BibliotecaEscenariosRepositorio,
    EscenarioReutilizable,
    EscenarioSinId,
} from './escenarios.types';

/** Doble en memoria del puerto de persistencia de la biblioteca. */
class BibliotecaEnMemoria implements BibliotecaEscenariosRepositorio {
    private filas: EscenarioReutilizable[] = [];
    private contador = 0;

    async crear(def: EscenarioSinId): Promise<EscenarioReutilizable> {
        this.contador += 1;
        const fila: EscenarioReutilizable = {
            id: `esc-${this.contador}`,
            nombre: def.nombre,
            descripcion: def.descripcion,
            contexto: def.contexto,
            intensidad: def.intensidad,
            duracionEsperada: def.duracionEsperada,
            eventosDetonantes: [...def.eventosDetonantes],
            actoresInvolucrados: [...def.actoresInvolucrados],
            categoria: def.categoria,
            tags: [...def.tags],
            configuracionComportamiento: { ...def.configuracionComportamiento },
            parametros: { ...def.parametros },
            version: def.version,
            esPredefinido: def.esPredefinido,
        };
        this.filas.push(fila);
        return { ...fila };
    }

    async listar(): Promise<EscenarioReutilizable[]> {
        return this.filas.map((f) => ({ ...f }));
    }

    async obtenerPorId(id: string): Promise<EscenarioReutilizable | null> {
        const f = this.filas.find((x) => x.id === id);
        return f ? { ...f } : null;
    }
}

const DTO_BASE: CrearEscenarioDto = {
    nombre: 'Escenario API',
    descripcion: 'desc',
    contexto: 'contexto original',
    intensidad: 'media',
    duracionEsperada: 5,
    eventosDetonantes: ['evento A'],
    actoresInvolucrados: ['estudiantes'],
    categoria: 'academico',
    tags: ['prueba'],
    configuracionComportamiento: { tono: 'neutral' },
    parametros: { x: 1 },
};

describe('EscenariosController: CRUD versionado de la Biblioteca_Escenarios', () => {
    let repo: BibliotecaEnMemoria;
    let motor: MotorEscenariosService;
    let controller: EscenariosController;

    beforeEach(() => {
        repo = new BibliotecaEnMemoria();
        motor = new MotorEscenariosService(repo);
        controller = new EscenariosController(motor);
    });

    it('crea un escenario personalizado con version 1 (Req. 29.1)', async () => {
        const creado = await controller.crear(DTO_BASE);

        expect(creado.id).toBeTruthy();
        expect(creado.version).toBe(1);
        expect(creado.esPredefinido).toBe(false);
        expect(creado.nombre).toBe(DTO_BASE.nombre);
    });

    it('lista los escenarios persistidos (Req. 29.2)', async () => {
        await controller.crear(DTO_BASE);
        await controller.crear({ ...DTO_BASE, nombre: 'Otro' });

        const lista = await controller.listar();
        expect(lista).toHaveLength(2);
        expect(lista.map((e) => e.nombre)).toContain('Otro');
    });

    it('obtiene un escenario por id', async () => {
        const creado = await controller.crear(DTO_BASE);
        const obtenido = await controller.obtener(creado.id);
        expect(obtenido.id).toBe(creado.id);
    });

    it('lanza 404 al obtener un id inexistente', async () => {
        await expect(controller.obtener('no-existe')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('edita generando una nueva version sin mutar la previa (Req. 29.5, 29.6)', async () => {
        const v1 = await controller.crear(DTO_BASE);
        const v2 = await controller.editar(v1.id, { contexto: 'editado' });

        expect(v2.version).toBe(2);
        expect(v2.contexto).toBe('editado');
        expect(v2.id).not.toBe(v1.id);

        const v1Recuperado = await controller.obtener(v1.id);
        expect(v1Recuperado.contexto).toBe('contexto original');
        expect(v1Recuperado.version).toBe(1);
    });

    it('lanza 404 al editar un id inexistente', async () => {
        await expect(
            controller.editar('no-existe', { contexto: 'x' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('siembra los predefinidos de forma idempotente (Req. 29.7)', async () => {
        const primera = await controller.sembrar();
        const segunda = await controller.sembrar();

        expect(primera).toHaveLength(ESCENARIOS_PREDEFINIDOS.length);
        expect(segunda).toHaveLength(ESCENARIOS_PREDEFINIDOS.length);

        const lista = await controller.listar();
        expect(lista).toHaveLength(ESCENARIOS_PREDEFINIDOS.length);
        expect(lista.every((e) => e.esPredefinido && e.version === 1)).toBe(true);
    });
});
