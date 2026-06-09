/**
 * Pruebas unitarias de los mapeos puros del puerto de persistencia de la
 * `Memoria_Jerarquica` (modulo `timeline`). Validan la correspondencia
 * dominio <-> fila Prisma por nivel sin tocar la base de datos. Pruebas en Jest.
 */
import { MemoriaNivel, NivelMemoria } from './motor-memoria-contextual.types';
import {
    aListaStrings,
    mapGlobalRowToMemoria,
    mapMemoriaToGlobalCreate,
    mapMemoriaToSemanalCreate,
    mapMemoriaToTrimestralCreate,
    mapSemanalRowToMemoria,
    mapTrimestralRowToMemoria,
} from './memoria-repositorio';

describe('aListaStrings', () => {
    it('normaliza Json no-arreglo y entradas no-string a []', () => {
        expect(aListaStrings(null)).toEqual([]);
        expect(aListaStrings(undefined)).toEqual([]);
        expect(aListaStrings('x')).toEqual([]);
        expect(aListaStrings([1, 'a', true, 'b'])).toEqual(['a', 'b']);
    });
});

describe('mapeo semanal dominio <-> fila', () => {
    it('preserva escenario, periodo->numeroSemana, tokens e historial completo', () => {
        const m: MemoriaNivel = {
            nivel: NivelMemoria.SEMANAL,
            analisisId: 'a1',
            institucionId: 'i1',
            comunidadId: 'c1',
            periodo: 7,
            escenario: 'Guerra del Gas',
            resumen: 'resumen semana 7',
            eventosRelevantes: ['evento-7'],
            cambiosImportantes: ['cambio-7'],
            anomalias: ['anomalia-7'],
            tendencias: ['tendencia-7'],
            tokensAprox: 120,
        };

        const input = mapMemoriaToSemanalCreate(m);
        expect(input.numeroSemana).toBe(7);
        expect(input.escenario).toBe('Guerra del Gas');
        expect(input.tokensAprox).toBe(120);
        expect(input.eventosRelevantes).toEqual(['evento-7']);
        expect(input.cambiosImportantes).toEqual(['cambio-7']);
        expect(input.anomalias).toEqual(['anomalia-7']);
        expect(input.tendencias).toEqual(['tendencia-7']);

        const volver = mapSemanalRowToMemoria(
            {
                analisisId: 'a1',
                comunidadId: 'c1',
                numeroSemana: 7,
                escenario: 'Guerra del Gas',
                resumen: 'resumen semana 7',
                eventosRelevantes: ['evento-7'],
                cambiosImportantes: ['cambio-7'],
                anomalias: ['anomalia-7'],
                tendencias: ['tendencia-7'],
                tokensAprox: 120,
            },
            'i1',
        );
        expect(volver).toEqual(m);
    });
});

describe('mapeo trimestral preserva el historial completo (Json)', () => {
    it('serializa y normaliza las cuatro listas de historial', () => {
        const m: MemoriaNivel = {
            nivel: NivelMemoria.TRIMESTRAL,
            analisisId: 'a1',
            institucionId: 'i1',
            comunidadId: 'c1',
            periodo: 2,
            escenario: 'Crisis Politica',
            resumen: 'resumen trimestre 2',
            eventosRelevantes: ['evento-1', 'evento-2'],
            cambiosImportantes: ['cambio-1'],
            anomalias: ['anomalia-1'],
            tendencias: ['tendencia-1', 'tendencia-2'],
            tokensAprox: 300,
        };

        const input = mapMemoriaToTrimestralCreate(m);
        expect(input.eventosRelevantes).toEqual(['evento-1', 'evento-2']);
        expect(input.cambiosImportantes).toEqual(['cambio-1']);
        expect(input.anomalias).toEqual(['anomalia-1']);
        expect(input.tendencias).toEqual(['tendencia-1', 'tendencia-2']);

        const volver = mapTrimestralRowToMemoria(
            {
                analisisId: 'a1',
                comunidadId: 'c1',
                numeroTrimestre: 2,
                escenario: 'Crisis Politica',
                resumen: 'resumen trimestre 2',
                eventosRelevantes: ['evento-1', 'evento-2'],
                cambiosImportantes: ['cambio-1'],
                anomalias: ['anomalia-1'],
                tendencias: ['tendencia-1', 'tendencia-2'],
                tokensAprox: 300,
            },
            'i1',
        );
        expect(volver).toEqual(m);
    });
});

describe('mapeo global no esta acotado a comunidad', () => {
    it('usa periodo 0 e institucion/comunidad vacias y conserva el historial', () => {
        const m: MemoriaNivel = {
            nivel: NivelMemoria.GLOBAL,
            analisisId: 'a1',
            institucionId: '',
            comunidadId: '',
            periodo: 0,
            escenario: 'Pandemia',
            resumen: 'resumen global',
            eventosRelevantes: ['e'],
            cambiosImportantes: ['c'],
            anomalias: ['an'],
            tendencias: ['t'],
            tokensAprox: 500,
        };

        const input = mapMemoriaToGlobalCreate(m);
        expect(input.escenario).toBe('Pandemia');
        expect(input.cambiosImportantes).toEqual(['c']);
        expect('comunidadId' in input).toBe(false);

        const volver = mapGlobalRowToMemoria({
            analisisId: 'a1',
            escenario: 'Pandemia',
            resumen: 'resumen global',
            eventosRelevantes: ['e'],
            cambiosImportantes: ['c'],
            anomalias: ['an'],
            tendencias: ['t'],
            tokensAprox: 500,
        });
        expect(volver).toEqual(m);
    });
});
