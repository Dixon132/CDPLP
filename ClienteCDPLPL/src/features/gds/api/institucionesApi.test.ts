// Pruebas del cliente tipado de Instituciones del feature `gds` (tarea 26.4).
//
// Cubren la lógica pura (normalización, payload), el esquema de validación Zod
// (Req. 7.1, 7.2, 7.3, 7.7) y las funciones CRUD con el cliente HTTP mockeado
// (Req. 7.4, 7.5, 7.6). No tocan red real ni DOM.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente axios compartido ANTES de importar el módulo bajo prueba.
vi.mock('./client.js', () => {
    const client = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    };
    return { default: client, gdsApiClient: client };
});

import gdsApiClient from './client.js';
import {
    CATEGORIAS_INSTITUCION,
    RADIO_METROS_DEFECTO,
    normalizeInstitucion,
    institucionToPayload,
    institucionSchema,
    listInstituciones,
    createInstitucion,
    updateInstitucion,
    deleteInstitucion,
    type InstitucionFormValues,
} from './institucionesApi';

const mockClient = gdsApiClient as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const formValido: InstitucionFormValues = {
    nombre: 'Instituto Andino',
    categoria: 'instituto',
    latitud: -16.5,
    longitud: -68.15,
    radio_metros: 500,
    logo_url: '',
    descripcion: '',
};

describe('institucionesApi: categorías admitidas (Req. 7.2)', () => {
    it('expone exactamente {universidad, colegio, instituto, escuela}', () => {
        expect([...CATEGORIAS_INSTITUCION].sort()).toEqual(
            ['colegio', 'escuela', 'instituto', 'universidad'].sort(),
        );
    });
});

describe('normalizeInstitucion', () => {
    it('normaliza una institución cruda tolerando snake_case y camelCase', () => {
        const raw = {
            id: 'i1',
            nombre: 'U Mayor',
            categoria: 'universidad',
            lat: '-16.5',
            lng: '-68.15',
            radioMetros: '750',
            logoUrl: 'http://x/logo.png',
            descripcion: 'desc',
        };
        expect(normalizeInstitucion(raw)).toEqual({
            id: 'i1',
            nombre: 'U Mayor',
            categoria: 'universidad',
            latitud: -16.5,
            longitud: -68.15,
            radio_metros: 750,
            logo_url: 'http://x/logo.png',
            descripcion: 'desc',
        });
    });

    it('usa valores por defecto seguros ante datos ausentes', () => {
        const n = normalizeInstitucion(null);
        expect(n.nombre).toBe('');
        expect(n.latitud).toBeNull();
        expect(n.longitud).toBeNull();
        expect(n.radio_metros).toBe(RADIO_METROS_DEFECTO);
    });
});

describe('institucionToPayload', () => {
    it('convierte numéricos y omite el logo vacío', () => {
        const payload = institucionToPayload({
            nombre: '  Colegio  ',
            categoria: 'colegio',
            latitud: -16.5,
            longitud: -68.1,
            radio_metros: 300,
            logo_url: '   ',
            descripcion: ' algo ',
        });
        expect(payload).toEqual({
            nombre: 'Colegio',
            categoria: 'colegio',
            latitud: -16.5,
            longitud: -68.1,
            radioMetros: 300,
            descripcion: 'algo',
        });
        expect(payload).not.toHaveProperty('logoUrl');
    });

    it('incluye el logo cuando se provee', () => {
        const payload = institucionToPayload({
            nombre: 'X',
            categoria: 'escuela',
            latitud: 1,
            longitud: 2,
            radio_metros: 100,
            logo_url: 'http://x/l.png',
            descripcion: '',
        });
        expect(payload.logoUrl).toBe('http://x/l.png');
    });
});

describe('institucionSchema (Req. 7.1, 7.2, 7.3, 7.7)', () => {
    it('acepta una institución completa y válida', () => {
        const res = institucionSchema.safeParse(formValido);
        expect(res.success).toBe(true);
    });

    it('aplica valores por defecto a logo_url y descripcion', () => {
        const res = institucionSchema.safeParse({
            nombre: 'X',
            categoria: 'colegio',
            latitud: 1,
            longitud: 2,
            radio_metros: 100,
        });
        expect(res.success).toBe(true);
        if (res.success) {
            expect(res.data.logo_url).toBe('');
            expect(res.data.descripcion).toBe('');
        }
    });

    it('exige nombre', () => {
        const res = institucionSchema.safeParse({ ...formValido, nombre: '   ' });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.some((i) => i.path[0] === 'nombre')).toBe(true);
        }
    });

    it('exige una categoría del conjunto admitido', () => {
        const res = institucionSchema.safeParse({ ...formValido, categoria: 'otra' });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.some((i) => i.path[0] === 'categoria')).toBe(true);
        }
    });

    it('exige ubicación seleccionada en el mapa', () => {
        const res = institucionSchema.safeParse({
            ...formValido,
            latitud: null,
            longitud: null,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.some((i) => i.path[0] === 'latitud')).toBe(true);
        }
    });

    it('exige un radio mayor a 0', () => {
        const res = institucionSchema.safeParse({ ...formValido, radio_metros: 0 });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.some((i) => i.path[0] === 'radio_metros')).toBe(true);
        }
    });

    it('rechaza un logo con formato de URL inválido', () => {
        const res = institucionSchema.safeParse({ ...formValido, logo_url: 'no-es-url' });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.some((i) => i.path[0] === 'logo_url')).toBe(true);
        }
    });
});

describe('CRUD contra el backend autónomo (mock)', () => {
    beforeEach(() => {
        mockClient.get.mockReset();
        mockClient.post.mockReset();
        mockClient.put.mockReset();
        mockClient.delete.mockReset();
    });

    it('listInstituciones normaliza y soporta { data: [...] } (Req. 7.4)', async () => {
        mockClient.get.mockResolvedValue({
            data: { data: [{ id: 'i1', nombre: 'A', categoria: 'colegio', lat: 1, lng: 2 }] },
        });
        const lista = await listInstituciones();
        expect(mockClient.get).toHaveBeenCalledWith('/instituciones');
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({ id: 'i1', nombre: 'A', latitud: 1, longitud: 2 });
    });

    it('createInstitucion envía el payload y normaliza la respuesta (Req. 7.1)', async () => {
        mockClient.post.mockResolvedValue({ data: { id: 'nuevo', nombre: 'Instituto Andino' } });
        const creada = await createInstitucion(formValido);
        expect(mockClient.post).toHaveBeenCalledWith(
            '/instituciones',
            expect.objectContaining({ nombre: 'Instituto Andino', categoria: 'instituto' }),
        );
        expect(creada.id).toBe('nuevo');
    });

    it('updateInstitucion usa el id en la ruta (Req. 7.5)', async () => {
        mockClient.put.mockResolvedValue({ data: { id: 'i1', nombre: 'Instituto Andino' } });
        await updateInstitucion('i1', formValido);
        expect(mockClient.put).toHaveBeenCalledWith('/instituciones/i1', expect.any(Object));
    });

    it('deleteInstitucion llama al endpoint con el id (Req. 7.6)', async () => {
        mockClient.delete.mockResolvedValue({ data: {} });
        await deleteInstitucion('i1');
        expect(mockClient.delete).toHaveBeenCalledWith('/instituciones/i1');
    });
});
