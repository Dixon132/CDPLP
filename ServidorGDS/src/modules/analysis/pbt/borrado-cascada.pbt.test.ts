/**
 * Prueba basada en propiedades (PBT) del **borrado en cascada consistente y
 * aislado por analisis** del `AnalysisService` (Gestor_Analisis), con Jest +
 * fast-check (minimo 100 iteraciones, `{ numRuns: 100 }`).
 *
 * Property 24: Borrado en cascada consistente y aislado por analisis.
 *
 * *Para todo* conjunto de `Analisis`, eliminar uno borra exactamente su
 * subgrafo dependiente (comunidades, ciclos, resultados, usuarios, scores,
 * evidencias, explicaciones, patrones, embeddings, memorias, reportes) sin
 * afectar los datos de otros analisis; si la cascada falla, la transaccion se
 * revierte y el analisis y sus dependientes quedan intactos.
 *
 * Se ejercita la logica real de `AnalysisService.eliminar` contra un DOBLE EN
 * MEMORIA del `PrismaService` que modela la semantica `onDelete: Cascade` del
 * subgrafo de `gds_analisis` y la atomicidad de `$transaction` (snapshot +
 * rollback), siguiendo las convenciones de `analysis.controller.test.ts`: sin
 * BD viva, sin red ni BullMQ, de forma determinista.
 *
 * **Validates: Requirements 25.4, 25.6, 25.7**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 24: Borrado en cascada consistente y aislado por análisis
import { NotFoundException } from '@nestjs/common';
import fc from 'fast-check';

import { AnalysisService } from '../analysis.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { DisparadorCicloInicial } from '../analysis.types';
import type {
    EscenarioFijado,
    MotorEscenarios,
    SeleccionEscenario,
} from '../escenarios/escenarios.types';

/**
 * Tablas del SUBGRAFO dependiente de `gds_analisis` que se borran en cascada al
 * eliminar el `Analisis` (Req. 25.4, design: "Politica de borrado y
 * consistencia"). Cada fila dependiente referencia su `analisisId`.
 */
const TABLAS_SUBGRAFO = [
    'comunidades',
    'ciclos',
    'resultados',
    'usuarios',
    'scores',
    'evidencias',
    'explicaciones',
    'patrones',
    'embeddings',
    'memorias',
    'reportes',
] as const;
type TablaSubgrafo = (typeof TABLAS_SUBGRAFO)[number];

/** Fila generica de una tabla dependiente del subgrafo de un `Analisis`. */
interface FilaDependiente {
    id: string;
    analisisId: string;
}

/**
 * Doble en memoria del `PrismaService` que modela el subgrafo en cascada de
 * `gds_analisis`. Implementa:
 *  - `analisis.findUnique`/`analisis.delete` (las unicas delegaciones que usa
 *    `AnalysisService.eliminar`);
 *  - la semantica `onDelete: Cascade`: borrar un analisis arrastra TODAS sus
 *    filas dependientes (y SOLO las suyas) en todas las tablas del subgrafo;
 *  - la atomicidad de `$transaction`: si el callback lanza, el estado se
 *    revierte por completo (snapshot + restore), modelando el ROLLBACK real.
 */
class PrismaCascadaEnMemoria {
    analisisFilas: { id: string }[] = [];
    dependientes: Record<TablaSubgrafo, FilaDependiente[]>;

    /**
     * Si se fija a un `analisisId`, su borrado en cascada FALLA a mitad
     * (modela un fallo de la cascada para el invariante de rollback, Req. 25.6).
     */
    fallarBorradoDe: string | null = null;

    constructor() {
        this.dependientes = TABLAS_SUBGRAFO.reduce(
            (acc, t) => ({ ...acc, [t]: [] as FilaDependiente[] }),
            {} as Record<TablaSubgrafo, FilaDependiente[]>,
        );
    }

    analisis = {
        findUnique: async ({
            where,
        }: {
            where: { id: string };
        }): Promise<{ id: string } | null> => {
            const f = this.analisisFilas.find((x) => x.id === where.id);
            return f ? { ...f } : null;
        },
        delete: async ({
            where,
        }: {
            where: { id: string };
        }): Promise<{ id: string }> => {
            const idx = this.analisisFilas.findIndex((x) => x.id === where.id);
            if (idx === -1) {
                throw new Error(`Analisis inexistente: ${where.id}`);
            }
            // Simula la CASCADA del esquema borrando el subgrafo del analisis.
            // Si esta marcado para fallar, se borran algunas tablas y luego se
            // lanza: la `$transaction` debe revertir TODO (Req. 25.6).
            const mitad = Math.ceil(TABLAS_SUBGRAFO.length / 2);
            TABLAS_SUBGRAFO.forEach((tabla, posicion) => {
                if (this.fallarBorradoDe === where.id && posicion === mitad) {
                    throw new Error(`Fallo de cascada al borrar ${where.id}`);
                }
                this.dependientes[tabla] = this.dependientes[tabla].filter(
                    (fila) => fila.analisisId !== where.id,
                );
            });
            const [borrada] = this.analisisFilas.splice(idx, 1);
            return { ...borrada };
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        // Snapshot profundo previo: modela el COMMIT/ROLLBACK transaccional.
        const snapshotAnalisis = this.analisisFilas.map((f) => ({ ...f }));
        const snapshotDeps = JSON.parse(JSON.stringify(this.dependientes));
        try {
            return await cb(this);
        } catch (err) {
            // ROLLBACK: se restaura el estado integro previo a la transaccion.
            this.analisisFilas = snapshotAnalisis;
            this.dependientes = snapshotDeps;
            throw err;
        }
    }

    /** Total de filas dependientes de un analisis en todo el subgrafo. */
    totalDependientesDe(analisisId: string): number {
        return TABLAS_SUBGRAFO.reduce(
            (suma, t) =>
                suma + this.dependientes[t].filter((f) => f.analisisId === analisisId).length,
            0,
        );
    }

    /** Instantanea serializable del estado completo (para comparar igualdad). */
    instantanea(): string {
        return JSON.stringify({
            analisis: [...this.analisisFilas].sort((a, b) => a.id.localeCompare(b.id)),
            dependientes: this.dependientes,
        });
    }
}

/** `Motor_Escenarios` doble inerte: no participa en el borrado. */
class MotorEscenariosInerte implements MotorEscenarios {
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
    async fijarParaAnalisis(_s: SeleccionEscenario): Promise<EscenarioFijado> {
        throw new Error('no usado');
    }
    async sembrarPredefinidos(): Promise<never[]> {
        return [];
    }
}

/** Disparador inerte: la administracion/borrado no dispara ciclos. */
class DisparadorInerte implements DisparadorCicloInicial {
    async dispararSemanaInicial(): Promise<void> {
        return undefined;
    }
}

/**
 * Generador de un `Analisis` con su subgrafo dependiente: un mapa de cuantas
 * filas tiene por cada tabla del subgrafo (0..6), permitiendo subgrafos vacios.
 */
const analisisConSubgrafoArb = fc.record(
    TABLAS_SUBGRAFO.reduce(
        (acc, t) => ({ ...acc, [t]: fc.integer({ min: 0, max: 6 }) }),
        {} as Record<TablaSubgrafo, fc.Arbitrary<number>>,
    ),
);

/** Conjunto de >=2 analisis (para poder verificar el AISLAMIENTO entre ellos). */
const conjuntoAnalisisArb = fc.array(analisisConSubgrafoArb, {
    minLength: 2,
    maxLength: 5,
});

/**
 * Construye el doble Prisma a partir del conjunto generado, asignando ids
 * deterministas `an-{i}` y filas dependientes `{tabla}-{i}-{k}`.
 */
function construirPrisma(
    conjunto: Record<TablaSubgrafo, number>[],
): PrismaCascadaEnMemoria {
    const prisma = new PrismaCascadaEnMemoria();
    conjunto.forEach((spec, i) => {
        const analisisId = `an-${i}`;
        prisma.analisisFilas.push({ id: analisisId });
        for (const tabla of TABLAS_SUBGRAFO) {
            for (let k = 0; k < spec[tabla]; k += 1) {
                prisma.dependientes[tabla].push({
                    id: `${tabla}-${i}-${k}`,
                    analisisId,
                });
            }
        }
    });
    return prisma;
}

function crearServicio(prisma: PrismaCascadaEnMemoria): AnalysisService {
    return new AnalysisService(
        prisma as unknown as PrismaService,
        new MotorEscenariosInerte(),
        new DisparadorInerte(),
    );
}

describe('Property 24: Borrado en cascada consistente y aislado por análisis', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 24: Borrado en cascada consistente y aislado por análisis

    it('eliminar un Analisis borra exactamente su subgrafo y no afecta a otros (Req. 25.4, 25.7)', async () => {
        await fc.assert(
            fc.asyncProperty(
                conjuntoAnalisisArb,
                fc.double({ min: 0, max: 1, noNaN: true }),
                async (conjunto, fraccionObjetivo) => {
                    const prisma = construirPrisma(conjunto);
                    const service = new AnalysisService(
                        prisma as unknown as PrismaService,
                        new MotorEscenariosInerte(),
                        new DisparadorInerte(),
                    );

                    // Analisis objetivo a eliminar (indice derivado de la fraccion).
                    const indice = Math.min(
                        conjunto.length - 1,
                        Math.floor(fraccionObjetivo * conjunto.length),
                    );
                    const objetivoId = `an-${indice}`;

                    // Estado de los OTROS analisis ANTES del borrado (aislamiento).
                    const otrosIds = prisma.analisisFilas
                        .map((a) => a.id)
                        .filter((id) => id !== objetivoId);
                    const depsOtrosAntes = new Map(
                        otrosIds.map((id) => [id, prisma.totalDependientesDe(id)]),
                    );

                    await service.eliminar(objetivoId);

                    // 1) El analisis objetivo y TODO su subgrafo desaparecen.
                    expect(prisma.analisisFilas.some((a) => a.id === objetivoId)).toBe(false);
                    expect(prisma.totalDependientesDe(objetivoId)).toBe(0);
                    for (const tabla of TABLAS_SUBGRAFO) {
                        expect(
                            prisma.dependientes[tabla].some((f) => f.analisisId === objetivoId),
                        ).toBe(false);
                    }

                    // 2) Los demas analisis y sus dependientes quedan INTACTOS.
                    for (const id of otrosIds) {
                        expect(prisma.analisisFilas.some((a) => a.id === id)).toBe(true);
                        expect(prisma.totalDependientesDe(id)).toBe(depsOtrosAntes.get(id));
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('si la cascada falla, la transaccion se revierte y todo queda intacto (Req. 25.6)', async () => {
        await fc.assert(
            fc.asyncProperty(
                conjuntoAnalisisArb,
                fc.double({ min: 0, max: 1, noNaN: true }),
                async (conjunto, fraccionObjetivo) => {
                    const prisma = construirPrisma(conjunto);
                    const service = new AnalysisService(
                        prisma as unknown as PrismaService,
                        new MotorEscenariosInerte(),
                        new DisparadorInerte(),
                    );

                    const indice = Math.min(
                        conjunto.length - 1,
                        Math.floor(fraccionObjetivo * conjunto.length),
                    );
                    const objetivoId = `an-${indice}`;

                    // Estado integro ANTES y marca de fallo de cascada del objetivo.
                    const antes = prisma.instantanea();
                    prisma.fallarBorradoDe = objetivoId;

                    // El borrado se RECHAZA (propaga el fallo de la cascada).
                    await expect(service.eliminar(objetivoId)).rejects.toThrow();

                    // ROLLBACK: el analisis y TODOS sus dependientes quedan intactos.
                    expect(prisma.instantanea()).toBe(antes);
                    expect(prisma.analisisFilas.some((a) => a.id === objetivoId)).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('eliminar un Analisis inexistente lanza NotFoundException sin tocar datos (Req. 25.7)', async () => {
        const prisma = construirPrisma([
            TABLAS_SUBGRAFO.reduce((a, t) => ({ ...a, [t]: 1 }), {} as Record<TablaSubgrafo, number>),
            TABLAS_SUBGRAFO.reduce((a, t) => ({ ...a, [t]: 1 }), {} as Record<TablaSubgrafo, number>),
        ]);
        const service = crearServicio(prisma);
        const antes = prisma.instantanea();

        await expect(service.eliminar('an-inexistente')).rejects.toBeInstanceOf(
            NotFoundException,
        );
        expect(prisma.instantanea()).toBe(antes);
    });
});
