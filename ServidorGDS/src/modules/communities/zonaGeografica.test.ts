/**
 * Pruebas unitarias del nucleo PURO de la `Zona_Geografica` del modulo
 * `communities` (Req. 33.1, 33.2, 33.4, 33.5).
 *
 * Cubren:
 *  - la DERIVACION de la zona combinando coordenadas de la `Institucion` con el
 *    radio de analisis recibido del frontend (Req. 33.1);
 *  - la INCLUSION de la zona derivada en el `ContextoGeneracion` (Req. 33.2);
 *  - el mapeo de la zona a sus columnas persistidas y la asociacion de patrones
 *    a su zona/origen para trazabilidad (Req. 33.4);
 *  - la agrupacion por zona para comparacion entre comunidades (Req. 33.5);
 *  - el saneo del radio a entero no negativo y de coordenadas no finitas.
 *
 * Runner: Jest + ts-jest (globals describe/it/expect). La verificacion universal
 * por propiedades vive en las tareas 14.6 (Property 37) y 14.7 (Property 38).
 * _Requirements: 33.1, 33.2, 33.4, 33.5_
 */
import {
    aRadioMetrosEntero,
    aRegistroPatron,
    agruparPatronesPorZona,
    anclarZona,
    asociarPatronesAZona,
    claveZona,
    derivarZona,
    type CoordenadasInstitucion,
    type OrigenComunidad,
    type PatronDetectado,
    type ZonaGeografica,
    zonaAColumnas,
} from './zonaGeografica';

const institucion: CoordenadasInstitucion = { latitud: -16.5, longitud: -68.15 };
const origen: OrigenComunidad = { analisisId: 'ana-1', comunidadId: 'com-1' };

describe('derivarZona (Req. 33.1)', () => {
    it('combina exactamente las coordenadas de la institucion con el radio de analisis', () => {
        expect(derivarZona(institucion, 1500)).toEqual({
            latitud: -16.5,
            longitud: -68.15,
            radioMetros: 1500,
        });
    });

    it('preserva las coordenadas almacenadas sin alterarlas', () => {
        const zona = derivarZona({ latitud: 12.345678, longitud: -98.7654321 }, 300);
        expect(zona.latitud).toBe(12.345678);
        expect(zona.longitud).toBe(-98.7654321);
    });

    it('sanea el radio a entero no negativo (coherente con Int persistido)', () => {
        expect(derivarZona(institucion, 1500.6).radioMetros).toBe(1501);
        expect(derivarZona(institucion, -10).radioMetros).toBe(0);
        expect(derivarZona(institucion, Number.NaN).radioMetros).toBe(0);
    });

    it('normaliza coordenadas no finitas a 0 sin corromper la zona', () => {
        expect(
            derivarZona({ latitud: Number.NaN, longitud: Number.POSITIVE_INFINITY }, 100),
        ).toEqual({ latitud: 0, longitud: 0, radioMetros: 100 });
    });
});

describe('anclarZona en el ContextoGeneracion (Req. 33.2)', () => {
    it('incluye la zona derivada en el contexto sin mutar la entrada', () => {
        const zona = derivarZona(institucion, 800);
        const base = {
            escenario: 'conflicto universitario',
            semana: 3,
            comunidad: { institucionId: 'inst-1', analisisId: 'ana-1' },
        };

        const ctx = anclarZona(base, zona);

        expect(ctx.zonaGeografica).toEqual(zona);
        expect(ctx.escenario).toBe('conflicto universitario');
        expect(ctx.semana).toBe(3);
        // No muta el objeto base original.
        expect(base).not.toHaveProperty('zonaGeografica');
    });
});

describe('zonaAColumnas (Req. 33.4)', () => {
    it('mapea coordenadas + radio a las columnas de persistencia', () => {
        const zona: ZonaGeografica = { latitud: -16.5, longitud: -68.15, radioMetros: 1500 };
        expect(zonaAColumnas(zona)).toEqual({
            zonaLatitud: -16.5,
            zonaLongitud: -68.15,
            zonaRadioMetros: 1500,
        });
    });

    it('redondea el radio fraccionario y normaliza coordenadas no finitas', () => {
        expect(
            zonaAColumnas({ latitud: Number.NaN, longitud: 1, radioMetros: 99.6 }),
        ).toEqual({ zonaLatitud: 0, zonaLongitud: 1, zonaRadioMetros: 100 });
    });
});

describe('aRadioMetrosEntero', () => {
    it('redondea al entero mas cercano y acota a 0 los valores invalidos', () => {
        expect(aRadioMetrosEntero(1500.4)).toBe(1500);
        expect(aRadioMetrosEntero(1500.6)).toBe(1501);
        expect(aRadioMetrosEntero(-1)).toBe(0);
        expect(aRadioMetrosEntero(Number.POSITIVE_INFINITY)).toBe(0);
    });
});

describe('asociarPatronesAZona (Req. 33.4)', () => {
    const zona = derivarZona(institucion, 1500);

    it('ancla un patron a su zona y origen para trazabilidad', () => {
        const patron: PatronDetectado = {
            tipo: 'tendencia',
            descripcion: 'alza de estres academico',
        };
        expect(aRegistroPatron(patron, zona, origen)).toEqual({
            analisisId: 'ana-1',
            comunidadId: 'com-1',
            zonaLatitud: -16.5,
            zonaLongitud: -68.15,
            zonaRadioMetros: 1500,
            tipo: 'tendencia',
            descripcion: 'alza de estres academico',
        });
    });

    it('ancla cada patron a la misma zona conservando orden y cardinalidad', () => {
        const patrones: PatronDetectado[] = [
            { tipo: 'tendencia', descripcion: 'p1' },
            { tipo: 'anomalia', descripcion: 'p2' },
            { tipo: 'recurrencia', descripcion: 'p3' },
        ];
        const registros = asociarPatronesAZona(patrones, zona, origen);

        expect(registros).toHaveLength(3);
        expect(registros.map((r) => r.descripcion)).toEqual(['p1', 'p2', 'p3']);
        for (const registro of registros) {
            expect(registro.zonaLatitud).toBe(zona.latitud);
            expect(registro.zonaLongitud).toBe(zona.longitud);
            expect(registro.zonaRadioMetros).toBe(zona.radioMetros);
            expect(registro.analisisId).toBe(origen.analisisId);
            expect(registro.comunidadId).toBe(origen.comunidadId);
        }
    });

    it('devuelve una lista vacia cuando no hay patrones detectados (Req. 16.2)', () => {
        expect(asociarPatronesAZona([], zona, origen)).toEqual([]);
    });
});

describe('agruparPatronesPorZona / claveZona (Req. 33.5)', () => {
    it('agrupa patrones por su Zona_Geografica para comparacion entre comunidades', () => {
        const zonaA = derivarZona(institucion, 1500);
        const zonaB = derivarZona({ latitud: -17.78, longitud: -63.18 }, 2000);
        const origenB: OrigenComunidad = { analisisId: 'ana-1', comunidadId: 'com-2' };

        const registros = [
            ...asociarPatronesAZona([{ tipo: 't', descripcion: 'a1' }], zonaA, origen),
            ...asociarPatronesAZona(
                [
                    { tipo: 't', descripcion: 'b1' },
                    { tipo: 't', descripcion: 'b2' },
                ],
                zonaB,
                origenB,
            ),
        ];

        const grupos = agruparPatronesPorZona(registros);
        expect(grupos.size).toBe(2);
        expect(grupos.get(claveZona(zonaAColumnas(zonaA)))?.map((r) => r.descripcion)).toEqual([
            'a1',
        ]);
        expect(grupos.get(claveZona(zonaAColumnas(zonaB)))?.map((r) => r.descripcion)).toEqual([
            'b1',
            'b2',
        ]);
    });
});
