/**
 * Pruebas unitarias INTEGRADAS de NLP / Vision / Temporal tras las interfaces
 * estables (tarea 12.6).
 *
 * Objetivo: verificar la FORMA de las salidas y la INTEGRACION de los tres
 * servicios analiticos consumiendolos UNICAMENTE a traves de sus interfaces
 * estables (`ServicioNLP`, `ServicioVision`, `MotorTemporal`), sin red real. Se
 * usan como dobles deterministas las implementaciones TS de fallback
 * (`ServicioNLPBase`, `ServicioVisionMock`, `MotorTemporalService` +
 * `FuenteResultadosEnMemoria`), de modo que estas pruebas valen igual para el
 * `Servicio_IA` en Python que cumpla las mismas interfaces (Req. 14.5, 15.4).
 *
 * Cubre:
 * - `Servicio_NLP`: forma del `ResultadoNLP` (semantico, emocional, tematico,
 *   elementos causales/eventos/detonantes y tendencias) (Req. 14.1, 14.2, 14.4).
 * - `Servicio_Vision`: forma estable `{ scene, objects[], emotion_context }`
 *   derivada de `image_description` (Req. 14.x integracion / 15.1).
 * - `Motor_Temporal`: correlacion en `EvolucionTemporal` (series + relaciones),
 *   incluido el caso de CERO relaciones, que es valido (Req. 16.2).
 * - Integracion NLP -> Temporal: los temas dominantes que produce el NLP
 *   alimentan, tras la interfaz estable, la correlacion del `Motor_Temporal`.
 * - Reemplazabilidad: un doble alternativo que cumple la interfaz `ServicioNLP`
 *   se consume sin cambiar el codigo cliente (Req. 14.5).
 *
 * _Requirements: 14.1, 14.2, 14.4, 14.5, 16.2_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import {
    FuenteResultadosEnMemoria,
    MotorTemporalService,
    ServicioNLPBase,
    ServicioVisionMock,
    type MotorTemporal,
    type ResultadoNLP,
    type ResultadoSemanalTemporal,
    type ServicioNLP,
    type ServicioVision,
} from "../analisis";
import type { EvolucionTemporal, ZonaGeografica } from "../ml";

// ---------------------------------------------------------------------------
// Fixtures deterministas (sin red): contenido y zona geografica de prueba.
// ---------------------------------------------------------------------------

const ZONA: ZonaGeografica = { latitud: -17.39, longitud: -66.16, radioMetros: 1500 };

function contratoBase(
    sobreescritura: Partial<ContratoNormalizado> = {},
): ContratoNormalizado {
    return {
        post: {
            autorId: "seudo-1",
            texto: "El examen final genero mucha tension en el curso de algebra",
        },
        comments: [
            {
                autorId: "seudo-2",
                texto: "estoy preocupado por el examen, no entiendo algebra",
                enRespuestaA: "seudo-1",
            },
            {
                autorId: "seudo-3",
                texto: "el examen me dejo agotado!!! demasiada presion",
                enRespuestaA: "seudo-1",
            },
            {
                autorId: "seudo-2",
                texto: "alguien sabe cuando es la recuperacion del examen?",
                enRespuestaA: "seudo-3",
            },
        ],
        image_description:
            "Estudiantes reunidos frente al aula revisando apuntes antes del examen",
        hashtags: ["#examen", "#estres"],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
        ...sobreescritura,
    };
}

/** Consumidores tipados SOLO por la interfaz estable (no por la clase concreta). */
const servicioNLP: ServicioNLP = new ServicioNLPBase();
const servicioVision: ServicioVision = new ServicioVisionMock();

function dentroDe(valor: number, lo: number, hi: number): boolean {
    return Number.isFinite(valor) && valor >= lo && valor <= hi;
}

// ---------------------------------------------------------------------------
// Servicio_NLP: forma del ResultadoNLP (Req. 14.1, 14.2, 14.4)
// ---------------------------------------------------------------------------

describe("Servicio_NLP (interfaz estable): forma de la salida (Req. 14.1, 14.2, 14.4)", () => {
    it("produce un ResultadoNLP con todas las secciones bien formadas", async () => {
        const r: ResultadoNLP = await servicioNLP.analizar(contratoBase());

        // --- Semantico (Req. 14.1) ---
        expect(r.semantico).toBeDefined();
        expect(typeof r.semantico.totalItems).toBe("number");
        expect(r.semantico.totalItems).toBe(4); // post + 3 comentarios
        expect(r.semantico.totalTokens).toBeGreaterThan(0);
        expect(dentroDe(r.semantico.diversidadLexica, 0, 1)).toBe(true);
        expect(Array.isArray(r.semantico.terminosClave)).toBe(true);
        for (const t of r.semantico.terminosClave) {
            expect(typeof t.termino).toBe("string");
            expect(t.frecuencia).toBeGreaterThan(0);
            expect(t.dispersion).toBeGreaterThan(0);
            expect(Number.isFinite(t.pesoContextual)).toBe(true);
        }
        // Terminos clave ordenados por peso contextual descendente.
        const pesos = r.semantico.terminosClave.map((t) => t.pesoContextual);
        const ordenado = [...pesos].sort((a, b) => b - a);
        expect(pesos).toEqual(ordenado);

        // --- Emocional (Req. 14.1) ---
        expect(dentroDe(r.emocional.senal.valencia, -1, 1)).toBe(true);
        expect(dentroDe(r.emocional.senal.activacion, 0, 1)).toBe(true);
        expect(dentroDe(r.emocional.senal.intensidad, 0, 1)).toBe(true);
        expect(dentroDe(r.emocional.senal.dispersion, 0, 1)).toBe(true);
        // Distribucion graduada sobre categorias emergentes (suma ~1).
        const probas = Object.values(r.emocional.distribucion);
        expect(probas.length).toBeGreaterThan(0);
        for (const p of probas) {
            expect(dentroDe(p, 0, 1)).toBe(true);
        }
        const suma = probas.reduce((a, b) => a + b, 0);
        expect(suma).toBeCloseTo(1, 6);

        // --- Tematico: los temas EMERGEN del corpus (Req. 14.1, 14.3) ---
        expect(Array.isArray(r.tematico.grupos)).toBe(true);
        for (const g of r.tematico.grupos) {
            expect(typeof g.id).toBe("string");
            expect(Array.isArray(g.terminos)).toBe(true);
            expect(Array.isArray(g.itemRefs)).toBe(true);
            expect(g.itemRefs.length).toBeGreaterThan(0);
            expect(dentroDe(g.peso, 0, 1)).toBe(true);
        }

        // --- Elementos causales / eventos / detonantes (Req. 14.2) ---
        expect(Array.isArray(r.elementosCausales)).toBe(true);
        for (const e of r.elementosCausales) {
            expect(["causa", "evento", "detonante"]).toContain(e.tipo);
            expect(typeof e.descripcion).toBe("string");
            expect(Array.isArray(e.soporteRefs)).toBe(true);
            expect(dentroDe(e.confianza, 0, 1)).toBe(true);
        }
        // Los hashtags del ecosistema emergen como EVENTOS (Req. 14.2).
        const eventos = r.elementosCausales.filter((e) => e.tipo === "evento");
        expect(eventos.length).toBeGreaterThanOrEqual(1);

        // --- Conversacional (Req. 14.3) ---
        expect(r.conversacional.interacciones).toHaveLength(4);
        expect(r.conversacional.hilos).toBeGreaterThanOrEqual(1);
        expect(r.conversacional.profundidadMaxima).toBeGreaterThanOrEqual(0);

        // --- Tendencias (Req. 14.4) ---
        expect(Array.isArray(r.tendencias)).toBe(true);
        for (const t of r.tendencias) {
            expect(["ascendente", "descendente", "estable"]).toContain(t.direccion);
            expect(dentroDe(t.magnitud, 0, 1)).toBe(true);
        }

        // Marca de comprension contextual (no reglas lexicas fijas, Req. 16.1).
        expect(r.derivadoDeComprensionContextual).toBe(true);
    });

    it("es determinista: la misma entrada produce la misma salida (sin red)", async () => {
        const a = await servicioNLP.analizar(contratoBase());
        const b = await servicioNLP.analizar(contratoBase());
        expect(a).toEqual(b);
    });

    it("acepta cero elementos causales y cero tendencias ante contenido minimo (Req. 16.2)", async () => {
        // Un solo item, sin hashtags ni respuestas: sin senal suficiente.
        const minimo = contratoBase({
            post: { autorId: "seudo-1", texto: "hola" },
            comments: [],
            hashtags: [],
            image_description: "imagen simple",
        });
        const r = await servicioNLP.analizar(minimo);
        expect(r.elementosCausales).toEqual([]);
        expect(r.tendencias).toEqual([]); // menos de 2 items: sin interpretacion
        expect(r.semantico.totalItems).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Servicio_Vision: forma estable { scene, objects[], emotion_context }
// ---------------------------------------------------------------------------

describe("Servicio_Vision (interfaz estable): forma { scene, objects[], emotion_context }", () => {
    it("deriva la salida de image_description con la forma estable", async () => {
        const contrato = contratoBase();
        const v = await servicioVision.analizar(contrato.image_description);

        expect(typeof v.scene).toBe("string");
        expect(v.scene.length).toBeGreaterThan(0); // no plantilla vacia (Req. 15.3)
        expect(Array.isArray(v.objects)).toBe(true);
        expect(v.objects.length).toBeGreaterThan(0);
        for (const o of v.objects) {
            expect(typeof o).toBe("string");
        }
        expect(typeof v.emotion_context).toBe("string");
        expect(v.emotion_context.length).toBeGreaterThan(0);
    });

    it("es determinista y rechaza descripciones vacias (sin plantillas por defecto)", async () => {
        const desc = contratoBase().image_description;
        const a = await servicioVision.analizar(desc);
        const b = await servicioVision.analizar(desc);
        expect(a).toEqual(b);

        await expect(servicioVision.analizar("   ")).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Motor_Temporal: correlacion (series + relaciones) y CERO relaciones (Req. 16.2)
// ---------------------------------------------------------------------------

/** Construye un `MotorTemporal` (interfaz estable) sobre una fuente en memoria. */
function motorConResultados(
    resultados: ResultadoSemanalTemporal[],
): MotorTemporal {
    return new MotorTemporalService(new FuenteResultadosEnMemoria(resultados));
}

describe("Motor_Temporal (interfaz estable): forma de EvolucionTemporal y cero relaciones (Req. 16.2)", () => {
    it("correlaciona varias semanas: series por dimension + relaciones evento->variacion", async () => {
        const resultados: ResultadoSemanalTemporal[] = [
            {
                numeroSemana: 1,
                zona: ZONA,
                dimensiones: { estres: 0.2, ansiedad: 0.1 },
                temas: ["examen"],
                eventos: ["semana de examenes"],
            },
            {
                numeroSemana: 2,
                zona: ZONA,
                dimensiones: { estres: 0.5, ansiedad: 0.3 },
                temas: ["examen", "recuperacion"],
                eventos: ["semana de examenes"],
            },
            {
                numeroSemana: 3,
                zona: ZONA,
                dimensiones: { estres: 0.8, ansiedad: 0.6 },
                temas: ["recuperacion"],
                eventos: ["resultados publicados"],
            },
        ];
        const motor = motorConResultados(resultados);

        const ev: EvolucionTemporal = await motor.correlacionar("a1", "i1", 3);

        // Forma base de la evolucion.
        expect(ev.analisisId).toBe("a1");
        expect(ev.institucionId).toBe("i1");
        expect(ev.hastaSemana).toBe(3);

        // Series por dimension, en orden cronologico de semanas.
        expect(ev.series).toBeDefined();
        expect(ev.series!.estres).toEqual([0.2, 0.5, 0.8]);
        expect(ev.series!.ansiedad).toEqual([0.1, 0.3, 0.6]);

        // Relaciones evento/tema -> variacion de dimension (Req. 16.2).
        expect(Array.isArray(ev.relaciones)).toBe(true);
        expect(ev.relaciones!.length).toBeGreaterThan(0);
        for (const rel of ev.relaciones!) {
            expect(typeof rel.desde).toBe("string");
            expect(typeof rel.hacia).toBe("string");
            expect(typeof rel.descripcion).toBe("string");
            expect(rel.hacia.startsWith("dimension:")).toBe(true);
        }
        // Con eventos presentes, las causas se anclan a eventos (no a temas).
        expect(ev.relaciones!.every((rel) => rel.desde.startsWith("evento:"))).toBe(true);
    });

    it("acepta CERO relaciones cuando ninguna dimension varia significativamente (Req. 16.2)", async () => {
        const resultados: ResultadoSemanalTemporal[] = [
            { numeroSemana: 1, zona: ZONA, dimensiones: { estres: 0.4 }, eventos: ["evento X"] },
            { numeroSemana: 2, zona: ZONA, dimensiones: { estres: 0.4 }, eventos: ["evento X"] },
        ];
        const ev = await motorConResultados(resultados).correlacionar("a1", "i1", 2);

        expect(ev.series!.estres).toEqual([0.4, 0.4]); // serie presente
        expect(ev.relaciones).toEqual([]); // sin variacion: cero relaciones
    });

    it("acepta CERO relaciones cuando hay variacion pero ningun evento ni tema la explica (Req. 16.2)", async () => {
        const resultados: ResultadoSemanalTemporal[] = [
            { numeroSemana: 1, zona: ZONA, dimensiones: { estres: 0.2 } },
            { numeroSemana: 2, zona: ZONA, dimensiones: { estres: 0.9 } },
        ];
        const ev = await motorConResultados(resultados).correlacionar("a1", "i1", 2);

        expect(ev.series!.estres).toEqual([0.2, 0.9]); // hay variacion
        expect(ev.relaciones).toEqual([]); // sin causas observadas
    });

    it("acepta una evolucion vacia (sin resultados): series {} y relaciones []", async () => {
        const ev = await motorConResultados([]).correlacionar("a1", "i1", 5);
        expect(ev.series).toEqual({});
        expect(ev.relaciones).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Integracion NLP -> Temporal tras las interfaces estables
// ---------------------------------------------------------------------------

describe("Integracion NLP -> Motor_Temporal tras interfaces estables", () => {
    it("los temas dominantes del NLP alimentan la correlacion temporal como causas de respaldo (Req. 16.2)", async () => {
        // El NLP produce los temas dominantes de cada semana...
        const nlp = await servicioNLP.analizar(contratoBase());
        const temasSemana = nlp.tematico.grupos.flatMap((g) => g.terminos).slice(0, 3);
        // (el corpus de prueba contiene "examen", que debe emerger como tema)
        expect(temasSemana.length).toBeGreaterThan(0);

        // ...y se inyectan, tras la interfaz estable, en el Motor_Temporal.
        const resultados: ResultadoSemanalTemporal[] = [
            { numeroSemana: 1, zona: ZONA, dimensiones: { estres: 0.3 }, temas: temasSemana },
            { numeroSemana: 2, zona: ZONA, dimensiones: { estres: 0.7 }, temas: temasSemana },
        ];
        const ev = await motorConResultados(resultados).correlacionar("a1", "i1", 2);

        expect(ev.series!.estres).toEqual([0.3, 0.7]);
        // Sin eventos, las causas de respaldo provienen de los temas del NLP.
        expect(ev.relaciones!.length).toBeGreaterThan(0);
        expect(ev.relaciones!.every((rel) => rel.desde.startsWith("tema:"))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Reemplazabilidad de la interfaz estable (Req. 14.5)
// ---------------------------------------------------------------------------

describe("Reemplazabilidad de los servicios tras la interfaz estable (Req. 14.5)", () => {
    it("un doble alternativo que cumple ServicioNLP se consume sin cambiar el cliente", async () => {
        // Doble minimo que respeta la forma del contrato de la interfaz estable.
        const nlpDoble: ServicioNLP = {
            analizar: async (): Promise<ResultadoNLP> => ({
                semantico: { totalItems: 0, totalTokens: 0, diversidadLexica: 0, terminosClave: [] },
                emocional: {
                    senal: { valencia: 0, activacion: 0, intensidad: 0, dispersion: 0 },
                    distribucion: { neutral: 1 },
                },
                tematico: { grupos: [] },
                elementosCausales: [],
                conversacional: { interacciones: [], hilos: 0, profundidadMaxima: 0 },
                tendencias: [],
                derivadoDeComprensionContextual: true,
            }),
        };

        // Codigo cliente generico: consume cualquier ServicioNLP por su interfaz.
        const consumir = async (svc: ServicioNLP): Promise<number> =>
            (await svc.analizar(contratoBase())).semantico.totalItems;

        // La forma de la salida es compatible en ambas implementaciones.
        expect(await consumir(servicioNLP)).toBe(4);
        expect(await consumir(nlpDoble)).toBe(0);
    });
});
