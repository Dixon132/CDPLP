/**
 * Pruebas unitarias de la logica PURA del `Generador_Reportes`: el calculo del
 * rango de semanas por horizonte (`rangoSemanas`) y la construccion del
 * contenido colectivo + narrativa (`construirContenido`). Sin acceso a BD.
 *
 * Evidencia para la tarea 23.1 (generacion por horizonte). Jest (sin vitest).
 *
 * _Requirements: 19.1, 19.2, 19.3, 19.4_
 */
import { construirContenido, rangoSemanas } from './reports.generador';
import { EntradaContenido, Horizonte, ResultadoCrudo } from './reports.types';

// ---------------------------------------------------------------------------
// rangoSemanas: tramos por horizonte (Req. 19.1, 19.3)
// ---------------------------------------------------------------------------
describe('rangoSemanas', () => {
    it('SEMANAL cubre una sola semana (periodo 1-based)', () => {
        expect(rangoSemanas(Horizonte.SEMANAL, 1, 24)).toEqual({ desde: 1, hasta: 1 });
        expect(rangoSemanas(Horizonte.SEMANAL, 5, 24)).toEqual({ desde: 5, hasta: 5 });
    });

    it('MENSUAL cubre tramos contiguos de 4 semanas', () => {
        expect(rangoSemanas(Horizonte.MENSUAL, 1, 24)).toEqual({ desde: 1, hasta: 4 });
        expect(rangoSemanas(Horizonte.MENSUAL, 2, 24)).toEqual({ desde: 5, hasta: 8 });
    });

    it('TRIMESTRAL y SEMESTRAL cubren 12 y 24 semanas', () => {
        expect(rangoSemanas(Horizonte.TRIMESTRAL, 1, 24)).toEqual({ desde: 1, hasta: 12 });
        expect(rangoSemanas(Horizonte.TRIMESTRAL, 2, 24)).toEqual({ desde: 13, hasta: 24 });
        expect(rangoSemanas(Horizonte.SEMESTRAL, 1, 24)).toEqual({ desde: 1, hasta: 24 });
    });

    it('FINAL cubre todo el analisis', () => {
        expect(rangoSemanas(Horizonte.FINAL, 1, 24)).toEqual({ desde: 1, hasta: 24 });
        expect(rangoSemanas(Horizonte.FINAL, 99, 10)).toEqual({ desde: 1, hasta: 10 });
    });

    it('recorta el extremo superior a las semanas totales (periodo parcial)', () => {
        // Analisis de 10 semanas: el trimestre 1 (1..12) se recorta a 1..10.
        expect(rangoSemanas(Horizonte.TRIMESTRAL, 1, 10)).toEqual({ desde: 1, hasta: 10 });
        // Mensual 3 sobre 10 semanas: 9..12 -> 9..10.
        expect(rangoSemanas(Horizonte.MENSUAL, 3, 10)).toEqual({ desde: 9, hasta: 10 });
    });

    it('rechaza un periodo cuya semana inicial excede el analisis', () => {
        expect(() => rangoSemanas(Horizonte.MENSUAL, 7, 24)).toThrow(/excede/);
        expect(() => rangoSemanas(Horizonte.SEMANAL, 0, 24)).toThrow(/Periodo invalido/);
    });
});

// ---------------------------------------------------------------------------
// construirContenido: agregado colectivo, evidencia referenciada, narrativa
// ---------------------------------------------------------------------------
function resultado(
    numeroSemana: number,
    valor: number,
    evId: string,
    overrides: Partial<ResultadoCrudo> = {},
): ResultadoCrudo {
    return {
        id: `res-${numeroSemana}`,
        numeroSemana,
        institucionId: 'inst-1',
        dimensiones: [
            {
                nombre: 'estres_academico',
                valor,
                minimo: 0,
                maximo: 100,
                scoreCalibradoMl: valor / 100,
                explicaciones: [
                    {
                        que: `Estres en semana ${numeroSemana}`,
                        porQue: 'Aumento de carga',
                        cuandoEmpezo: `semana ${numeroSemana}`,
                        comoEvoluciono: 'al alza',
                    },
                ],
            },
        ],
        evidencias: [
            {
                id: evId,
                tipo: 'variacion',
                contenido: 'contenido anonimizado',
                numeroSemana,
                contributividad: 'CONTRIBUTIVO',
                refContenido: `post:anon-${numeroSemana}`,
                publicacionesAsociadas: [`post:anon-${numeroSemana}`],
                eventosAsociados: ['paro_universitario'],
                indicadoresUtilizados: ['estres_academico'],
                conteo: 10 * numeroSemana,
                variacionPct: null,
            },
        ],
        ...overrides,
    };
}

function entradaBase(overrides: Partial<EntradaContenido> = {}): EntradaContenido {
    return {
        analisisId: 'an-1',
        institucionId: null,
        horizonte: Horizonte.MENSUAL,
        periodo: 1,
        rango: { desde: 1, hasta: 4 },
        resultados: [resultado(1, 20, 'ev-1'), resultado(2, 40, 'ev-2'), resultado(4, 60, 'ev-4')],
        patrones: [{ tipo: 'tendencia', descripcion: 'Tendencia al alza', comunidadId: 'com-1' }],
        ahora: new Date('2025-01-01T00:00:00.000Z'),
        ...overrides,
    };
}

describe('construirContenido', () => {
    it('incluye las nueve secciones exigidas por el Req. 19.2', () => {
        const c = construirContenido(entradaBase());
        // explicaciones, evidencias, publicaciones, indicadores, cambios,
        // tendencias, detonantes, conclusiones, recomendaciones.
        expect(c.explicaciones.length).toBeGreaterThan(0);
        expect(c.evidencias.length).toBeGreaterThan(0);
        expect(c.publicacionesRelevantes.length).toBeGreaterThan(0);
        expect(c.indicadores.length).toBeGreaterThan(0);
        expect(c.cambios.length).toBeGreaterThan(0);
        expect(c.tendencias.length).toBeGreaterThan(0);
        expect(c.detonantes.length).toBeGreaterThan(0);
        expect(c.conclusiones.length).toBeGreaterThan(0);
        expect(c.recomendaciones.length).toBeGreaterThan(0);
        expect(typeof c.resumen).toBe('string');
        expect(c.resumen.length).toBeGreaterThan(0);
    });

    it('agrega el indicador colectivo por dimension a lo largo del periodo', () => {
        const c = construirContenido(entradaBase());
        const ind = c.indicadores.find((i) => i.dimension === 'estres_academico')!;
        expect(ind.valorInicial).toBe(20);
        expect(ind.valorFinal).toBe(60);
        expect(ind.minimo).toBe(20);
        expect(ind.maximo).toBe(60);
        expect(ind.promedio).toBe(40);
        expect(ind.semanas).toEqual([1, 2, 4]);
        expect(ind.scoreCalibradoMlPromedio).toBeCloseTo(0.4, 5);
    });

    it('cuantifica el cambio con su variacion y direccion, referenciando evidencia', () => {
        const c = construirContenido(entradaBase());
        const cambio = c.cambios.find((x) => x.dimension === 'estres_academico')!;
        expect(cambio.desdeSemana).toBe(1);
        expect(cambio.hastaSemana).toBe(4);
        expect(cambio.variacionAbsoluta).toBe(40);
        expect(cambio.variacionPct).toBe(200);
        expect(cambio.direccion).toBe('sube');
        // Toda conclusion/cambio referencia evidencia por id (Req. 19.2, 30.1).
        expect(cambio.evidenciaIds).toEqual(expect.arrayContaining(['ev-1', 'ev-2', 'ev-4']));
    });

    it('toda conclusion referencia al menos una evidencia por id', () => {
        const c = construirContenido(entradaBase());
        for (const concl of c.conclusiones) {
            expect(concl.evidenciaIds.length).toBeGreaterThan(0);
        }
    });

    it('agrega los factores detonantes con sus semanas y evidencia', () => {
        const c = construirContenido(entradaBase());
        const det = c.detonantes.find((d) => d.evento === 'paro_universitario')!;
        expect(det.semanas).toEqual([1, 2, 4]);
        expect(det.evidenciaIds).toEqual(expect.arrayContaining(['ev-1', 'ev-2', 'ev-4']));
    });

    it('deduplica evidencias y las ordena por semana', () => {
        const c = construirContenido(entradaBase());
        expect(c.evidencias.map((e) => e.id)).toEqual(['ev-1', 'ev-2', 'ev-4']);
        expect(c.semanasCubiertas).toEqual([1, 2, 4]);
    });

    it('solo considera resultados dentro del rango del periodo (Req. 19.3)', () => {
        const entrada = entradaBase({
            rango: { desde: 1, hasta: 1 },
            horizonte: Horizonte.SEMANAL,
            resultados: [resultado(1, 20, 'ev-1'), resultado(2, 40, 'ev-2')],
        });
        const c = construirContenido(entrada);
        expect(c.semanasCubiertas).toEqual([1]);
        expect(c.evidencias.map((e) => e.id)).toEqual(['ev-1']);
    });

    it('propaga el horizonte, periodo, rango e institucion (Req. 19.1, 19.4)', () => {
        const c = construirContenido(
            entradaBase({ institucionId: 'inst-1', horizonte: Horizonte.SEMESTRAL, periodo: 1, rango: { desde: 1, hasta: 24 } }),
        );
        expect(c.horizonte).toBe(Horizonte.SEMESTRAL);
        expect(c.periodo).toBe(1);
        expect(c.rango).toEqual({ desde: 1, hasta: 24 });
        expect(c.institucionId).toBe('inst-1');
        expect(c.resumen).toContain('semestral');
        expect(c.resumen).toContain('inst-1');
    });

    it('reporta estabilidad y recomendacion de monitoreo cuando no hay alzas', () => {
        const entrada = entradaBase({
            resultados: [resultado(1, 30, 'ev-1'), resultado(2, 30, 'ev-2')],
            rango: { desde: 1, hasta: 4 },
        });
        const c = construirContenido(entrada);
        const cambio = c.cambios.find((x) => x.dimension === 'estres_academico')!;
        expect(cambio.direccion).toBe('estable');
        expect(c.recomendaciones[0].texto).toMatch(/monitoreo/i);
    });

    it('maneja un periodo sin resultados sin fallar', () => {
        const c = construirContenido(entradaBase({ resultados: [], patrones: [] }));
        expect(c.semanasCubiertas).toEqual([]);
        expect(c.indicadores).toEqual([]);
        expect(c.evidencias).toEqual([]);
        expect(c.conclusiones).toEqual([]);
        expect(c.recomendaciones.length).toBe(1);
        expect(c.resumen).toContain('0 semana');
    });
});
