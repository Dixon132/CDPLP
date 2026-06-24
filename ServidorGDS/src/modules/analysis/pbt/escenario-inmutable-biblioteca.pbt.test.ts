/**
 * Prueba basada en propiedades (PBT) de la **inmutabilidad del escenario
 * copiado DESDE LA BIBLIOTECA al crear un `Analisis`, bajo VERSIONADO**,
 * ejercitada sobre el `Motor_Escenarios` (`MotorEscenariosService`,
 * `fijarParaAnalisis`/`editar`, tarea 21.2) y la `Biblioteca_Escenarios`
 * (modelo enriquecido `gds_scenarios`), con Jest + fast-check (minimo 100
 * iteraciones, `{ numRuns: 100 }`).
 *
 * Property 41: Inmutabilidad del escenario copiado desde la biblioteca al
 * crear el analisis.
 *
 * *Para todo* `Analisis` creado a partir de un `Escenario_Reutilizable` de la
 * `Biblioteca_Escenarios` (`gds_scenarios`) y *para toda* secuencia posterior
 * de ediciones de ese escenario (que incrementan su `version`), la copia
 * inmutable del escenario fijada en el `Analisis` y la pareja
 * `(escenario_id, escenario_version)` registrada para trazabilidad permanecen
 * IDENTICAS a las del momento de creacion, sin verse afectadas por ninguna
 * edicion posterior de la biblioteca.
 *
 * DISTINCION respecto de la Property 30 (tarea 21.4): la Property 30 verifica
 * la inmutabilidad END-TO-END del camino real de creacion del analisis
 * (`AnalysisService.crear` + PERSISTENCIA en `gds_analisis` + recarga), sobre
 * el `contexto` copiado. Esta Property 41 REFINA y FORTALECE esa garantia desde
 * el angulo de la BIBLIOTECA y el VERSIONADO del modelo enriquecido
 * `gds_scenarios`: ejercita el `Motor_Escenarios` (la fijacion por valor que
 * `AnalysisService.crear` delega en `fijarParaAnalisis`) y una CADENA de
 * ediciones que incrementan la `version` MONOTONICAMENTE (v2, v3, ...), y
 * comprueba que (a) la version exacta fijada en el analisis sigue siendo
 * plenamente recuperable e identica en TODOS sus campos, (b) re-fijar el mismo
 * escenario reproduce la misma copia inmutable y (c) el corpus de versiones
 * crece sin mutar las previas.
 *
 * Se usan DOBLES EN MEMORIA del puerto `BibliotecaEscenariosRepositorio`,
 * siguiendo las convenciones de `analysis.controller.test.ts`,
 * `pbt/borrado-cascada.pbt.test.ts` y `pbt/escenario-inmutable-al-crear.pbt.test.ts`:
 * sin BD viva, sin red ni BullMQ, de forma determinista.
 *
 * **Validates: Requirements 29.4, 29.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 41: Inmutabilidad del escenario copiado desde la biblioteca al crear el análisis
import fc from 'fast-check';

import { MotorEscenariosService } from '../escenarios/motor-escenarios.service';
import type {
    BibliotecaEscenariosRepositorio,
    DefinicionEscenario,
    EscenarioReutilizable,
    EscenarioSinId,
    IntensidadEscenario,
} from '../escenarios/escenarios.types';

// --- Doble en memoria de la Biblioteca_Escenarios ----------------------------

/**
 * Doble en memoria del puerto de persistencia de la `Biblioteca_Escenarios`.
 * Clona por valor al crear y al leer, modelando la semantica de la BD real
 * (`gds_scenarios`): editar crea una NUEVA fila/version y NO muta las previas,
 * por lo que cada version queda recuperable de forma independiente.
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

// --- Generadores -------------------------------------------------------------

const intensidadArb: fc.Arbitrary<IntensidadEscenario> = fc.constantFrom(
    'baja',
    'media',
    'alta',
);

/**
 * Generador de un `Escenario_Reutilizable` de la `Biblioteca_Escenarios`
 * (definicion completa sin `id` ni `version`), cubriendo el modelo enriquecido
 * `gds_scenarios`: incluye casos limite (listas y diccionarios vacios,
 * predefinido vs personalizado).
 */
const escenarioBibliotecaArb: fc.Arbitrary<DefinicionEscenario> = fc.record({
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

/**
 * Generador de un cambio de edicion sobre un escenario. Cada edicion toca un
 * subconjunto arbitrario de campos (no vacio), simulando una modificacion real
 * de la biblioteca tras fijar el escenario en el analisis.
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

/**
 * Secuencia de ediciones posteriores a la fijacion del escenario. Cada edicion
 * de la cadena se aplica sobre la version mas reciente, incrementando la
 * `version` de forma monotonica (v2, v3, ...).
 */
const secuenciaEdicionesArb = fc.array(edicionArb, {
    minLength: 1,
    maxLength: 6,
});

// --- Helpers -----------------------------------------------------------------

function construirMotor(): {
    motor: MotorEscenariosService;
    repo: BibliotecaEnMemoria;
} {
    const repo = new BibliotecaEnMemoria();
    const motor = new MotorEscenariosService(repo);
    return { motor, repo };
}

/** Instantanea serializable de TODOS los campos de una version de escenario. */
function instantanea(esc: EscenarioReutilizable): string {
    return JSON.stringify(esc);
}

// --- Propiedad ---------------------------------------------------------------

describe('Property 41: Inmutabilidad del escenario copiado desde la biblioteca al crear el análisis', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 41: Inmutabilidad del escenario copiado desde la biblioteca al crear el análisis

    it('editar la biblioteca (cadena de versiones) no altera la copia fijada ni (escenario_id, escenario_version), y la version fijada sigue recuperable intacta (Req. 29.4, 29.5)', async () => {
        await fc.assert(
            fc.asyncProperty(
                escenarioBibliotecaArb,
                secuenciaEdicionesArb,
                async (def, ediciones) => {
                    const { motor, repo } = construirMotor();

                    // 1) Se define un `Escenario_Reutilizable` en la biblioteca (version = 1).
                    const original = await motor.guardar(def);
                    expect(original.version).toBe(1);

                    // Instantanea COMPLETA de la version 1 (modelo enriquecido).
                    const snapshotV1 = instantanea(original);

                    // 2) Al CREAR el analisis se fija una COPIA INMUTABLE desde la
                    //    biblioteca: AnalysisService.crear delega esto en
                    //    `fijarParaAnalisis`. Capturamos la copia + trazabilidad.
                    const fijado = await motor.fijarParaAnalisis({
                        escenarioId: original.id,
                    });
                    expect(fijado.contexto).toBe(
                        `Scenario intensity (intensidad declarada): ${original.intensidad}.\n\n${original.contexto}`,
                    );
                    expect(fijado.escenarioId).toBe(original.id);
                    expect(fijado.version).toBe(1);

                    const snapshotFijado = JSON.stringify(fijado);

                    // 3) Se edita el escenario en CADENA tras fijarlo: cada edicion
                    //    genera una NUEVA version (id distinto) e incrementa la
                    //    `version` de forma monotonica, sin mutar las previas.
                    let ultimo = original;
                    const idsVistos = new Set<string>([original.id]);
                    for (const cambios of ediciones) {
                        const versionPrevia = ultimo.version;
                        const nueva = await motor.editar(ultimo.id, cambios);

                        // Nueva fila/version distinta y estrictamente creciente.
                        expect(nueva.id).not.toBe(ultimo.id);
                        expect(idsVistos.has(nueva.id)).toBe(false);
                        idsVistos.add(nueva.id);
                        expect(nueva.version).toBe(versionPrevia + 1);

                        // La version 1 fijada permanece intacta en cada paso.
                        const v1EnPaso = await repo.obtenerPorId(original.id);
                        expect(v1EnPaso).not.toBeNull();
                        expect(instantanea(v1EnPaso!)).toBe(snapshotV1);

                        ultimo = nueva;
                    }

                    // 4) La copia fijada en el analisis NO se ve afectada: re-fijar
                    //    el escenario reproduce EXACTAMENTE la misma copia inmutable
                    //    y la misma pareja (escenario_id, escenario_version).
                    const refijado = await motor.fijarParaAnalisis({
                        escenarioId: original.id,
                    });
                    expect(JSON.stringify(refijado)).toBe(snapshotFijado);
                    expect(refijado.contexto).toBe(
                        `Scenario intensity (intensidad declarada): ${original.intensidad}.\n\n${original.contexto}`,
                    );
                    expect(refijado.escenarioId).toBe(original.id);
                    expect(refijado.version).toBe(1);

                    // 5) La version EXACTA fijada sigue plenamente recuperable e
                    //    identica en TODOS sus campos (modelo enriquecido).
                    const v1Final = await repo.obtenerPorId(original.id);
                    expect(v1Final).not.toBeNull();
                    expect(instantanea(v1Final!)).toBe(snapshotV1);

                    // 6) El corpus de versiones CRECE sin mutar las previas: la
                    //    biblioteca conserva la v1 + una version por cada edicion.
                    const todas = await repo.listar();
                    expect(todas.length).toBe(1 + ediciones.length);
                    const versionesOriginal = todas.filter((e) =>
                        idsVistos.has(e.id),
                    );
                    expect(versionesOriginal.length).toBe(1 + ediciones.length);
                    // La version maxima de la cadena coincide con su longitud + 1.
                    const versionMax = Math.max(
                        ...versionesOriginal.map((e) => e.version),
                    );
                    expect(versionMax).toBe(1 + ediciones.length);
                },
            ),
            { numRuns: 100 },
        );
    });
});
