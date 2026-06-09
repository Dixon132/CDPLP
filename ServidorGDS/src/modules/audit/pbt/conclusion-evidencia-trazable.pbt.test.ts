// Feature: analisis-tendencias-riesgo-emocional, Property 31: Toda conclusión referencia evidencia trazable, auditable y anonimizada
/**
 * PBT — Property 31: Toda conclusión referencia evidencia trazable, auditable y
 * anonimizada.
 *
 * Para toda conclusión, indicador, dimensión del `Indice_Riesgo`, patrón y
 * explicación, existe al menos una `Evidencia` referenciada por identificador
 * trazable y RESOLUBLE; cada `Evidencia` traza hasta su `Semana_Simulada`, su
 * `Comunidad_Digital`/`Institucion` y su `Analisis` de origen; su auditoría
 * expone el recorrido completo conclusión → evidencia → dato original; su
 * contenido se presenta anonimizado (sin identificadores crudos) y conserva su
 * marca de `Contributividad`.
 *
 * Se valida contra la implementación real del `Sistema_Evidencias`
 * (`SistemaEvidenciasService`) respaldada por un doble EN MEMORIA del delegate
 * `evidence` de Prisma que ejerce la MISMA lógica (asignación de id, búsqueda,
 * auditoría), sin red ni BD viva, de forma determinista.
 *
 * Generador: `conclusionConEvidenciaArb`.
 *
 * Runner: Jest (`jest pbt --runInBand`). Reconocida por el segmento `pbt` en su
 * ruta (ver jest.config.js). Mínimo 100 iteraciones (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 30.1, 30.3, 30.4, 30.5, 34.5**
 */
import type { Evidence as EvidenceRow } from '@prisma/client';
import fc from 'fast-check';
import { createHash } from 'node:crypto';

import type { PrismaService } from '../../../prisma/prisma.service';
import { Contributividad, type Evidencia } from '../sistema-evidencias.interfaces';
import { SistemaEvidenciasService } from '../sistema-evidencias.service';

// ---------------------------------------------------------------------------
// Doble en memoria del delegate `evidence` de Prisma (solo lo que usa el
// servicio). Asigna ids trazables y ejerce la lógica real de busqueda/auditoria.
// ---------------------------------------------------------------------------
function crearPrismaEnMemoria(): PrismaService {
    const filas: EvidenceRow[] = [];
    let secuencia = 0;

    const evidence = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }): Promise<EvidenceRow> => {
            const row = { id: `ev-${++secuencia}`, ...data } as EvidenceRow;
            filas.push(row);
            return row;
        },
        findMany: async ({
            where,
        }: {
            where: { id: { in: string[] } };
        }): Promise<EvidenceRow[]> => {
            const ids = new Set(where.id.in);
            return filas.filter((f) => ids.has(f.id));
        },
        findUnique: async ({
            where,
        }: {
            where: { id: string };
        }): Promise<EvidenceRow | null> => {
            return filas.find((f) => f.id === where.id) ?? null;
        },
    };

    return { evidence } as unknown as PrismaService;
}

/** Seudónimo determinista (SHA-256 + salt), idéntico al `Servicio_Anonimizacion`. */
function seudonimo(idCrudo: string, salt: string): string {
    return createHash('sha256').update(`${salt}${idCrudo}`, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Modelo de prueba: una conclusión que referencia evidencias.
// ---------------------------------------------------------------------------
type TipoConclusion = 'conclusion' | 'indicador' | 'dimension' | 'patron' | 'explicacion';

interface ConclusionConEvidencia {
    tipoConclusion: TipoConclusion;
    descripcion: string;
    /** Identificadores CRUDOS que NUNCA deben filtrarse a la evidencia (Req. 30.5). */
    identificadoresCrudos: string[];
    /** Evidencias (sin id) que sustentan la conclusión; al menos una (Req. 30.1). */
    evidencias: Omit<Evidencia, 'id'>[];
}

// ---------------------------------------------------------------------------
// Generador `conclusionConEvidenciaArb`.
//
// Construye una conclusión/indicador/dimensión/patrón/explicación con AL MENOS
// una `Evidencia` cuyo contenido y referencias usan SOLO seudónimos hex
// (anonimizados), trazable a semana/comunidad/institución/análisis y con marca
// de `Contributividad`.
// ---------------------------------------------------------------------------

/** Id crudo con prefijo distintivo, imposible de confundir con un hash hex. */
const idCrudoArb = fc
    .tuple(
        fc.constantFrom('USR', 'POST', 'COM'),
        fc.string({ minLength: 1, maxLength: 12 }).filter((s) => /[^\s]/.test(s)),
    )
    .map(([pref, s]) => `__CRUDO_${pref}_${s}__`);

const contributividadArb = fc.constantFrom(
    Contributividad.CONTRIBUTIVO,
    Contributividad.NO_CONTRIBUTIVO,
);

const tipoEvidenciaArb = fc.constantFrom(
    'publicacion' as const,
    'comentario' as const,
    'conteo' as const,
    'variacion' as const,
);

/** Genera una evidencia (sin id) anonimizada y trazable a partir de ids crudos. */
function evidenciaArb(salt: string, crudos: string[]) {
    const refAnonArb = fc
        .constantFrom(...crudos)
        .map((crudo) => seudonimo(crudo, salt));

    return fc.record({
        resultadoId: fc.uuid(),
        analisisId: fc.uuid(),
        comunidadId: fc.uuid(),
        institucionId: fc.uuid(),
        numeroSemana: fc.integer({ min: 1, max: 200 }),
        refContenido: refAnonArb,
        contributividad: contributividadArb,
        tipo: tipoEvidenciaArb,
        // Contenido anonimizado: solo palabras neutras + seudónimos hex.
        contenido: fc
            .array(refAnonArb, { minLength: 1, maxLength: 4 })
            .map((refs) => `tendencia colectiva ${refs.join(' ')}`),
        publicacionesAsociadas: fc.array(refAnonArb, { maxLength: 5 }),
        comentariosAsociados: fc.array(refAnonArb, { maxLength: 5 }),
        eventosAsociados: fc.array(fc.constantFrom('evento:paro', 'evento:examen', 'evento:feriado'), {
            maxLength: 3,
        }),
        semanasInvolucradas: fc.array(fc.integer({ min: 1, max: 200 }), { maxLength: 5 }),
        indicadoresUtilizados: fc.array(
            fc.constantFrom('estres_academico', 'cohesion', 'conflicto', 'animo'),
            { minLength: 1, maxLength: 3 },
        ),
        explicacionIA: fc.constantFrom(
            'La cohesión bajó respecto a la semana previa.',
            'El estrés académico aumentó tras el evento.',
            'El ánimo colectivo se mantuvo estable.',
        ),
        metricasUtilizadas: fc.dictionary(
            fc.constantFrom('conteo', 'baseline', 'variacion'),
            fc.integer({ min: 0, max: 1000 }),
        ),
        metricas: fc.option(
            fc.record({
                conteo: fc.integer({ min: 0, max: 1000 }),
                variacionPct: fc.integer({ min: -100, max: 100 }),
            }),
            { nil: undefined },
        ),
    });
}

const conclusionConEvidenciaArb: fc.Arbitrary<ConclusionConEvidencia> = fc
    .record({
        tipoConclusion: fc.constantFrom<TipoConclusion>(
            'conclusion',
            'indicador',
            'dimension',
            'patron',
            'explicacion',
        ),
        descripcion: fc.constantFrom(
            'Tendencia de estrés en la comunidad',
            'Variación de la dimensión cohesión',
            'Patrón recurrente de conflicto',
            'Nivel de riesgo colectivo',
        ),
        salt: fc.string({ minLength: 1, maxLength: 16 }),
        crudos: fc.uniqueArray(idCrudoArb, { minLength: 1, maxLength: 8 }),
    })
    .chain(({ tipoConclusion, descripcion, salt, crudos }) =>
        fc
            .array(evidenciaArb(salt, crudos), { minLength: 1, maxLength: 4 })
            .map((evidencias) => ({
                tipoConclusion,
                descripcion,
                identificadoresCrudos: crudos,
                evidencias,
            })),
    );

// ---------------------------------------------------------------------------
// Property 31.
// ---------------------------------------------------------------------------
describe('PBT Property 31 — Toda conclusión referencia evidencia trazable, auditable y anonimizada (Req. 30.1, 30.3, 30.4, 30.5, 34.5)', () => {
    it('cada conclusión referencia ≥1 evidencia resoluble, trazable, auditable y anonimizada (numRuns: 100)', async () => {
        await fc.assert(
            fc.asyncProperty(conclusionConEvidenciaArb, async (conclusion) => {
                const sistema = new SistemaEvidenciasService(crearPrismaEnMemoria());

                // Almacenar las evidencias -> obtener ids trazables asignados.
                const almacenadas: Evidencia[] = [];
                for (const e of conclusion.evidencias) {
                    almacenadas.push(await sistema.almacenar(e));
                }
                const referenciasEvidencia = almacenadas.map((e) => e.id);

                // (30.1) Existe al menos una evidencia referenciada por id trazable.
                expect(referenciasEvidencia.length).toBeGreaterThanOrEqual(1);
                expect(referenciasEvidencia.every((id) => typeof id === 'string' && id.length > 0)).toBe(
                    true,
                );

                // (30.1/30.2) Toda referencia se RESUELVE por id, preservando el orden.
                const resueltas = await sistema.obtener(referenciasEvidencia);
                expect(resueltas.map((e) => e.id)).toEqual(referenciasEvidencia);

                for (const ev of resueltas) {
                    // (30.3) Cada evidencia traza a semana/comunidad/institución/análisis.
                    expect(Number.isInteger(ev.numeroSemana)).toBe(true);
                    expect(ev.numeroSemana).toBeGreaterThanOrEqual(1);
                    expect(ev.comunidadId.length).toBeGreaterThan(0);
                    expect(ev.institucionId.length).toBeGreaterThan(0);
                    expect(ev.analisisId.length).toBeGreaterThan(0);
                    expect(ev.resultadoId.length).toBeGreaterThan(0);

                    // (34.5) Conserva su marca de Contributividad (valor del enum).
                    expect([
                        Contributividad.CONTRIBUTIVO,
                        Contributividad.NO_CONTRIBUTIVO,
                    ]).toContain(ev.contributividad);

                    // (30.4) La auditoría expone el recorrido conclusión → evidencia → dato original.
                    const recorrido = await sistema.auditar(ev.id);
                    expect(recorrido.evidencia.id).toBe(ev.id);
                    expect(recorrido.datoOriginal).toEqual({
                        numeroSemana: ev.numeroSemana,
                        comunidadId: ev.comunidadId,
                        refContenido: ev.refContenido,
                    });

                    // (30.5) El contenido se presenta anonimizado: ningún identificador
                    // crudo sobrevive en el contenido ni en las referencias auditables.
                    const superficie = [
                        ev.contenido,
                        ev.refContenido,
                        ...ev.publicacionesAsociadas,
                        ...ev.comentariosAsociados,
                        recorrido.datoOriginal.refContenido,
                    ].join(' \u0001 ');
                    for (const crudo of conclusion.identificadoresCrudos) {
                        expect(superficie.includes(crudo)).toBe(false);
                    }
                }
            }),
            { numRuns: 100 },
        );
    });
});
