// Pruebas de la lógica pura del cliente TS de análisis del feature `gds`:
// acotado de semanas, construcción de payload, normalización y validación con
// Zod. No tocan red ni DOM. Cubren Req. 8.1, 8.2, 8.3, 8.4, 12.1, 29.2, 29.3.
import { describe, it, expect } from 'vitest';
import {
    SEMANAS_MIN,
    SEMANAS_MAX,
    SEMANAS_DEFECTO,
    RADIO_ANALISIS_DEFECTO,
    TIPO_ESCENARIO,
    analisisSchema,
    analisisToPayload,
    clampSemanas,
    normalizeAnalisis,
    type AnalisisFormValues,
} from './analisisApi';

const baseValida: AnalisisFormValues = {
    nombre: 'Estudio U Andina',
    descripcion: 'Tendencias del semestre',
    institucionIds: ['i1', 'i2'],
    radio_metros: 1500,
    total_semanas: 12,
    tipo_escenario: TIPO_ESCENARIO.BIBLIOTECA,
    escenario_id: 'pred:pandemia',
    escenario_texto: '',
    escenario_nombre: '',
    guardar_en_biblioteca: false,
};

/** Recopila las rutas (`path`) de error de un `safeParse`. */
function camposConError(form: AnalisisFormValues): string[] {
    const res = analisisSchema.safeParse(form);
    if (res.success) return [];
    return res.error.issues.map((i) => i.path.join('.'));
}

describe('clampSemanas (Req. 12.1: 1..24)', () => {
    it('acota por debajo del mínimo', () => {
        expect(clampSemanas(0)).toBe(SEMANAS_MIN);
        expect(clampSemanas(-5)).toBe(SEMANAS_MIN);
    });

    it('acota por encima del máximo', () => {
        expect(clampSemanas(25)).toBe(SEMANAS_MAX);
        expect(clampSemanas(1000)).toBe(SEMANAS_MAX);
    });

    it('respeta valores en rango y trunca decimales', () => {
        expect(clampSemanas(12)).toBe(12);
        expect(clampSemanas(8.9)).toBe(8);
    });

    it('cae al valor por defecto ante valores no numéricos', () => {
        expect(clampSemanas('x')).toBe(SEMANAS_DEFECTO);
        expect(clampSemanas(undefined)).toBe(SEMANAS_DEFECTO);
    });
});

describe('analisisToPayload', () => {
    it('construye el payload con escenario de biblioteca (Req. 8.1, 8.2, 8.3)', () => {
        expect(analisisToPayload(baseValida)).toEqual({
            nombre: 'Estudio U Andina',
            descripcion: 'Tendencias del semestre',
            institucion_ids: ['i1', 'i2'],
            radio_metros: 1500,
            total_semanas: 12,
            escenario: { tipo: TIPO_ESCENARIO.BIBLIOTECA, escenario_id: 'pred:pandemia' },
        });
    });

    it('construye el payload personalizado con guardado en biblioteca (Req. 29.3)', () => {
        const payload = analisisToPayload({
            ...baseValida,
            tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
            escenario_texto: '  Conflicto local por el agua  ',
            escenario_nombre: '  Crisis del agua  ',
            guardar_en_biblioteca: true,
        });
        expect(payload.escenario).toEqual({
            tipo: TIPO_ESCENARIO.PERSONALIZADO,
            texto: 'Conflicto local por el agua',
            guardar_en_biblioteca: true,
            nombre: 'Crisis del agua',
        });
    });

    it('omite el nombre del escenario personalizado cuando está vacío', () => {
        const payload = analisisToPayload({
            ...baseValida,
            tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
            escenario_texto: 'algo',
            escenario_nombre: '   ',
            guardar_en_biblioteca: false,
        });
        expect(payload.escenario).not.toHaveProperty('nombre');
        expect(payload.escenario).toMatchObject({ guardar_en_biblioteca: false });
    });

    it('recorta nombre/descripcion y filtra ids vacíos', () => {
        const payload = analisisToPayload({
            ...baseValida,
            nombre: '  Estudio  ',
            descripcion: '  desc  ',
            institucionIds: ['i1', '', 'i3'],
        });
        expect(payload.nombre).toBe('Estudio');
        expect(payload.descripcion).toBe('desc');
        expect(payload.institucion_ids).toEqual(['i1', 'i3']);
    });

    it('acota las semanas fuera de rango al construir el payload', () => {
        expect(analisisToPayload({ ...baseValida, total_semanas: 99 }).total_semanas).toBe(
            SEMANAS_MAX,
        );
    });
});

describe('analisisSchema (Req. 8.1, 8.2, 8.3, 8.4, 12.1, 29.2, 29.3)', () => {
    it('acepta un formulario completo y válido (biblioteca)', () => {
        expect(analisisSchema.safeParse(baseValida).success).toBe(true);
    });

    it('acepta un formulario válido con escenario personalizado', () => {
        expect(
            analisisSchema.safeParse({
                ...baseValida,
                tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
                escenario_id: '',
                escenario_texto: 'Crisis sociopolítica regional',
            }).success,
        ).toBe(true);
    });

    it('exige nombre', () => {
        expect(camposConError({ ...baseValida, nombre: '   ' })).toContain('nombre');
    });

    it('exige al menos una institución (Req. 8.4)', () => {
        expect(camposConError({ ...baseValida, institucionIds: [] })).toContain('institucionIds');
    });

    it('exige radio mayor a 0', () => {
        expect(camposConError({ ...baseValida, radio_metros: 0 })).toContain('radio_metros');
        expect(camposConError({ ...baseValida, radio_metros: -1 })).toContain('radio_metros');
    });

    it('exige semanas enteras dentro de [1, 24] (Req. 12.1)', () => {
        expect(camposConError({ ...baseValida, total_semanas: 0 })).toContain('total_semanas');
        expect(camposConError({ ...baseValida, total_semanas: 25 })).toContain('total_semanas');
        expect(camposConError({ ...baseValida, total_semanas: 5.5 })).toContain('total_semanas');
    });

    it('exige seleccionar un escenario de la biblioteca cuando ese es el tipo', () => {
        expect(camposConError({ ...baseValida, escenario_id: '' })).toContain('escenario_id');
    });

    it('exige texto del escenario personalizado', () => {
        expect(
            camposConError({
                ...baseValida,
                tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
                escenario_id: '',
                escenario_texto: '   ',
            }),
        ).toContain('escenario_texto');
    });

    it('exige nombre del escenario personalizado al guardarlo en biblioteca (Req. 29.3)', () => {
        expect(
            camposConError({
                ...baseValida,
                tipo_escenario: TIPO_ESCENARIO.PERSONALIZADO,
                escenario_id: '',
                escenario_texto: 'algo',
                guardar_en_biblioteca: true,
                escenario_nombre: '',
            }),
        ).toContain('escenario_nombre');
    });
});

describe('normalizeAnalisis', () => {
    it('normaliza tolerando snake_case/camelCase y cuenta instituciones', () => {
        expect(
            normalizeAnalisis({
                _id: 'a1',
                name: 'Estudio',
                status: 'EN_PROCESO',
                totalSemanas: '12',
                instituciones: [{ id: 'i1' }, { id: 'i2' }],
            }),
        ).toEqual({
            id: 'a1',
            nombre: 'Estudio',
            descripcion: '',
            estado: 'EN_PROCESO',
            total_semanas: 12,
            instituciones: 2,
        });
    });

    it('usa valores por defecto seguros ante datos ausentes', () => {
        const n = normalizeAnalisis(null);
        expect(n.id).toBeNull();
        expect(n.estado).toBe('PENDIENTE');
        expect(n.instituciones).toBe(0);
    });
});

describe('constantes y rango temporal', () => {
    it('expone el rango temporal y el radio por defecto', () => {
        expect(SEMANAS_MIN).toBe(1);
        expect(SEMANAS_MAX).toBe(24);
        expect(SEMANAS_DEFECTO).toBe(24);
        expect(RADIO_ANALISIS_DEFECTO).toBe(1000);
    });
});
