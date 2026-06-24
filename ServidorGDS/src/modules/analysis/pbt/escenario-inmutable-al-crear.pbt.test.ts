/**
 * Prueba basada en propiedades (PBT) de la **inmutabilidad del escenario
 * copiado al crear un `Analisis`**, ejercitada de extremo a extremo sobre el
 * `AnalysisService` (Gestor_Analisis, tarea 21.1) y el `MotorEscenariosService`
 * (`fijarParaAnalisis`, tarea 21.2), con Jest + fast-check (minimo 100
 * iteraciones, `{ numRuns: 100 }`).
 *
 * Property 30: Inmutabilidad del escenario copiado al crear el analisis.
 *
 * *Para todo* `Analisis` creado a partir de un `Escenario_Reutilizable` de la
 * `Biblioteca_Escenarios`, editar posteriormente ese escenario (generando
 * nuevas versiones) NO modifica el `Escenario` fijado ni la pareja
 * `(escenario_id, escenario_version)` persistida en el `Analisis`: al crear el
 * analisis, su contexto queda fijado como una COPIA INMUTABLE tomada por valor
 * en ese instante.
 *
 * A diferencia de una prueba a nivel de motor/helper, aqui se ejercita el
 * camino REAL de creacion: `AnalysisService.crear` resuelve el escenario via
 * `MotorEscenariosService.fijarParaAnalisis` y PERSISTE la copia + trazabilidad
 * en `gds_analisis`. Tras editar el escenario en la biblioteca, se RECARGA el
 * analisis desde la persistencia (`obtener`) para comprobar que la copia
 * persistida sigue intacta.
 *
 * Se usan DOBLES EN MEMORIA del `PrismaService` y del puerto
 * `BibliotecaEscenariosRepositorio`, siguiendo las convenciones de
 * `analysis.controller.test.ts` y `pbt/borrado-cascada.pbt.test.ts`: sin BD
 * viva, sin red ni BullMQ, de forma determinista.
 *
 * **Validates: Requirements 29.4, 29.5, 29.6**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 30: Inmutabilidad del escenario copiado al crear el análisis
import fc from 'fast-check';

import { AnalysisService } from '../analysis.service';
import { MotorEscenariosService } from '../escenarios/motor-escenarios.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { DisparadorCicloInicial } from '../analysis.types';
import type {
    BibliotecaEscenariosRepositorio,
    EscenarioReutilizable,
    EscenarioSinId,
    IntensidadEscenario,
} from '../escenarios/escenarios.types';
import { CrearAnalisisDto } from '../dto/crear-analisis.dto';

// --- Dobles en memoria -------------------------------------------------------

interface FilaInstitucion {
    id: string;
    latitud: number;
    longitud: number;
}
interface FilaAnalisis {
    id: string;
    nombre: string;
    escenario: string;
    escenarioEsPersonalizado: boolean;
    escenarioId: string | null;
    escenarioVersion: number | null;
    semanasTotales: number;
    radioAnalisis: number;
    saltAnon: string;
    modoEjecucion: string;
    intervaloTiempoRealMs: number | null;
    estadoEjecucion: string;
    estado: string;
}
interface FilaComunidad {
    id: string;
    analisisId: string;
    institucionId: string;
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
}

/**
 * Doble en memoria del `PrismaService` con las delegaciones usadas por
 * `AnalysisService.crear`/`obtener`. Clona por valor al leer/escribir, modelando
 * la persistencia real (la copia del escenario vive en `gds_analisis` y es
 * independiente de la `Biblioteca_Escenarios`).
 */
class PrismaEnMemoria {
    instituciones: FilaInstitucion[] = [];
    analisisFilas: FilaAnalisis[] = [];
    comunidades: FilaComunidad[] = [];
    private contador = 0;

    institucion = {
        findMany: async ({
            where,
        }: {
            where: { id: { in: string[] } };
            select?: unknown;
        }): Promise<FilaInstitucion[]> =>
            this.instituciones
                .filter((i) => where.id.in.includes(i.id))
                .map((i) => ({ ...i })),
    };

    analisis = {
        create: async ({
            data,
        }: {
            data: Omit<FilaAnalisis, 'id'>;
        }): Promise<FilaAnalisis> => {
            this.contador += 1;
            const fila: FilaAnalisis = { id: `an-${this.contador}`, ...data };
            this.analisisFilas.push(fila);
            return { ...fila };
        },
        findUnique: async ({
            where,
            include,
        }: {
            where: { id: string };
            include?: { comunidades?: unknown };
        }): Promise<
            (FilaAnalisis & { comunidades?: { institucionId: string }[] }) | null
        > => {
            const f = this.analisisFilas.find((x) => x.id === where.id);
            if (!f) return null;
            if (include?.comunidades) {
                return {
                    ...f,
                    comunidades: this.comunidades
                        .filter((c) => c.analisisId === f.id)
                        .map((c) => ({ institucionId: c.institucionId })),
                };
            }
            return { ...f };
        },
    };

    comunidad = {
        create: async ({
            data,
        }: {
            data: Omit<FilaComunidad, 'id'>;
        }): Promise<FilaComunidad> => {
            this.contador += 1;
            const fila: FilaComunidad = { id: `com-${this.contador}`, ...data };
            this.comunidades.push(fila);
            return { ...fila };
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        return cb(this);
    }
}

/**
 * Doble en memoria del puerto de persistencia de la `Biblioteca_Escenarios`.
 * Clona por valor al crear y al leer, modelando la semantica de la BD real:
 * editar crea una NUEVA fila/version y no muta las previas.
 */
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

/** Disparador inerte: el ciclo inicial no participa en esta propiedad. */
class DisparadorInerte implements DisparadorCicloInicial {
    async dispararSemanaInicial(): Promise<void> {
        return undefined;
    }
}

// --- Generadores -------------------------------------------------------------

const intensidadArb: fc.Arbitrary<IntensidadEscenario> = fc.constantFrom(
    'baja',
    'media',
    'alta',
);

/** Generador de un `Escenario_Reutilizable` (definicion sin id ni version). */
const definicionEscenarioArb = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 40 }),
    descripcion: fc.string({ maxLength: 80 }),
    contexto: fc.string({ minLength: 1, maxLength: 200 }),
    intensidad: intensidadArb,
    duracionEsperada: fc.integer({ min: 0, max: 52 }),
    eventosDetonantes: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    actoresInvolucrados: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    categoria: fc.string({ minLength: 1, maxLength: 20 }),
    tags: fc.array(fc.string({ maxLength: 15 }), { maxLength: 5 }),
    configuracionComportamiento: fc.dictionary(
        fc.string({ maxLength: 8 }),
        fc.oneof(fc.string({ maxLength: 12 }), fc.integer(), fc.boolean()),
        { maxKeys: 4 },
    ),
    parametros: fc.dictionary(
        fc.string({ maxLength: 8 }),
        fc.oneof(fc.string({ maxLength: 12 }), fc.integer(), fc.boolean()),
        { maxKeys: 4 },
    ),
    esPredefinido: fc.boolean(),
});

/** Configuracion del `Analisis` a crear (nombre, radio, semanas <=24). */
const configAnalisisArb = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 60 }),
    radioAnalisis: fc.integer({ min: 1, max: 5000 }),
    semanasTotales: fc.integer({ min: 1, max: 24 }),
});

/**
 * Generador de un cambio de edicion sobre un escenario. Cada edicion toca un
 * subconjunto arbitrario de campos (no vacio), simulando una modificacion real
 * de la biblioteca tras crear el analisis.
 */
const edicionArb = fc
    .record(
        {
            nombre: fc.string({ minLength: 1, maxLength: 40 }),
            descripcion: fc.string({ maxLength: 80 }),
            contexto: fc.string({ minLength: 1, maxLength: 200 }),
            intensidad: intensidadArb,
            duracionEsperada: fc.integer({ min: 0, max: 52 }),
            eventosDetonantes: fc.array(fc.string({ maxLength: 20 }), {
                maxLength: 5,
            }),
            actoresInvolucrados: fc.array(fc.string({ maxLength: 20 }), {
                maxLength: 5,
            }),
            categoria: fc.string({ minLength: 1, maxLength: 20 }),
            tags: fc.array(fc.string({ maxLength: 15 }), { maxLength: 5 }),
        },
        { requiredKeys: [] },
    )
    .filter((cambios) => Object.keys(cambios).length > 0);

/** Secuencia de ediciones posteriores a la creacion del analisis. */
const secuenciaEdicionesArb = fc.array(edicionArb, {
    minLength: 1,
    maxLength: 6,
});

/** Instituciones disponibles en la persistencia (con coordenadas para la zona). */
const INSTITUCIONES: FilaInstitucion[] = [
    { id: 'inst-1', latitud: -16.5, longitud: -68.15 },
    { id: 'inst-2', latitud: -17.4, longitud: -66.16 },
];

function construirServicio(): {
    service: AnalysisService;
    prisma: PrismaEnMemoria;
    motor: MotorEscenariosService;
    repo: BibliotecaEnMemoria;
} {
    const prisma = new PrismaEnMemoria();
    prisma.instituciones = INSTITUCIONES.map((i) => ({ ...i }));
    const repo = new BibliotecaEnMemoria();
    const motor = new MotorEscenariosService(repo);
    const service = new AnalysisService(
        prisma as unknown as PrismaService,
        motor,
        new DisparadorInerte(),
    );
    return { service, prisma, motor, repo };
}

// --- Propiedad ---------------------------------------------------------------

describe('Property 30: Inmutabilidad del escenario copiado al crear el análisis', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 30: Inmutabilidad del escenario copiado al crear el análisis

    it('editar el escenario tras crear el analisis no altera la copia persistida ni (escenario_id, escenario_version) (Req. 29.4, 29.5, 29.6)', async () => {
        await fc.assert(
            fc.asyncProperty(
                definicionEscenarioArb,
                configAnalisisArb,
                secuenciaEdicionesArb,
                async (def, config, ediciones) => {
                    const { service, motor, repo } = construirServicio();

                    // 1) Se define un `Escenario_Reutilizable` en la biblioteca (version = 1).
                    const original = await motor.guardar(def);

                    // 2) Se CREA el `Analisis` desde la biblioteca: AnalysisService.crear
                    //    fija la COPIA INMUTABLE via fijarParaAnalisis y la persiste.
                    const dto: CrearAnalisisDto = {
                        nombre: config.nombre,
                        institucionIds: ['inst-1', 'inst-2'],
                        radioAnalisis: config.radioAnalisis,
                        semanasTotales: config.semanasTotales,
                        escenarioId: original.id,
                    };
                    const creado = await service.crear(dto);

                    // Invariantes en el momento de la creacion: copia + trazabilidad.
                    // La copia fijada antepone la intensidad declarada (carrier que
                    // el generador lee para calibrar el riesgo); sigue siendo INMUTABLE.
                    expect(creado.escenario).toBe(
                        `Scenario intensity (intensidad declarada): ${original.intensidad}.\n\n${original.contexto}`,
                    );
                    expect(creado.escenarioId).toBe(original.id);
                    expect(creado.escenarioVersion).toBe(1);
                    expect(creado.escenarioEsPersonalizado).toBe(false);

                    // Instantanea de los campos del escenario fijado en el analisis.
                    const snapshot = {
                        escenario: creado.escenario,
                        escenarioId: creado.escenarioId,
                        escenarioVersion: creado.escenarioVersion,
                        escenarioEsPersonalizado: creado.escenarioEsPersonalizado,
                    };

                    // 3) Se edita el escenario varias veces TRAS crear el analisis:
                    //    cada edicion genera una NUEVA version sin mutar la previa.
                    for (const cambios of ediciones) {
                        const nueva = await motor.editar(original.id, cambios);
                        expect(nueva.id).not.toBe(original.id);
                        expect(nueva.version).toBeGreaterThan(original.version);
                    }

                    // 4) Se RECARGA el analisis desde la persistencia: la copia
                    //    fijada y la trazabilidad permanecen IDENTICAS (inmutables).
                    const recargado = await service.obtener(creado.id);
                    expect({
                        escenario: recargado.escenario,
                        escenarioId: recargado.escenarioId,
                        escenarioVersion: recargado.escenarioVersion,
                        escenarioEsPersonalizado: recargado.escenarioEsPersonalizado,
                    }).toEqual(snapshot);
                    expect(recargado.escenario).toBe(
                        `Scenario intensity (intensidad declarada): ${original.intensidad}.\n\n${original.contexto}`,
                    );
                    expect(recargado.escenarioId).toBe(original.id);
                    expect(recargado.escenarioVersion).toBe(1);

                    // 5) La version 1 original sigue recuperable e intacta en la biblioteca.
                    const v1 = await repo.obtenerPorId(original.id);
                    expect(v1).not.toBeNull();
                    expect(v1?.contexto).toBe(original.contexto);
                    expect(v1?.version).toBe(1);
                },
            ),
            { numRuns: 100 },
        );
    });
});
