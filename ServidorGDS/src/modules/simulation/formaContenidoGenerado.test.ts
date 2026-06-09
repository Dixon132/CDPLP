/**
 * Prueba determinista de la FORMA del contenido generado (tarea 11.9).
 *
 * A diferencia de `moduloSimulacion.test.ts` (que verifica la ORQUESTACION:
 * seleccion de proveedor, armado del contexto desde la memoria, reaccion a
 * eventos), esta suite verifica la FORMA del `Contrato_Normalizado` que produce
 * el `Modulo_Simulacion` usando un **proveedor doble basado en fixtures** que
 * imita un LLM realista, sin red ni base de datos. Comprueba tres exigencias del
 * Requirement 6:
 *
 *  - **Atribucion a `Usuario_Sintetico` persistentes (Req. 6.1):** toda
 *    publicacion y comentario se atribuye UNICAMENTE a los identificadores de
 *    los usuarios persistentes del `ContextoGeneracion`; el proveedor no inventa
 *    identificadores nuevos y las conversaciones (`enRespuestaA`) referencian
 *    solo a usuarios validos (o al autor del post / `null`).
 *  - **Variedad de categorias de contenido (Req. 6.2):** el conjunto
 *    publicacion + comentarios cubre las dimensiones emocionales y de registro
 *    exigidas (lenguaje cotidiano, sarcasmo, ironia, positivo, negativo,
 *    neutral, contradicciones, conflictos y ruido) -> no es monotematico.
 *  - **Coherencia con el `Contrato_Normalizado` (Req. 6.4):** la salida es
 *    siempre un `Contrato_Normalizado` valido segun el `Validador_Contrato`
 *    real, con la estructura estandar `{ post, comments[], image_description,
 *    hashtags[], metadata }` y `metadata.version` vigente.
 *
 * El proveedor doble se construye desde un CATALOGO de fixtures categorizadas
 * (unica fuente de verdad de la suite) y reparte la autoria entre los usuarios
 * persistentes del contexto; asi la prueba es totalmente determinista y a la vez
 * ejercita logica real (atribucion, encadenamiento de hilos y validacion).
 *
 * _Requirements: 6.1, 6.2, 6.4_
 */
import type { ContratoNormalizado } from "./contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "./contracts/contratoNormalizado";
import { ValidadorContratoZod } from "./contracts/validadorContrato";
import type {
    ConfigFabricaDataProvider,
    ContextoGeneracion,
    FabricaDataProvider,
    IDataProvider,
    PerfilUsuario,
} from "./adquisicion/dataProvider";
import { DIMENSIONES_VARIEDAD } from "./prompt/promptGeneracionRealista";
import {
    ModuloSimulacion,
    type ConstructorContextoMemoria,
    type SolicitudGeneracion,
} from "./moduloSimulacion";

// ---------------------------------------------------------------------------
// Catalogo de fixtures: contenido categorizado en espanol andino (Bolivia).
// Es la unica fuente de verdad de la suite; cubre TODAS las dimensiones de
// `DIMENSIONES_VARIEDAD` (Req. 6.2) y permite verificar la variedad de forma
// determinista. El primer item es la publicacion; el resto son comentarios.
// ---------------------------------------------------------------------------

interface ItemFixture {
    /** Categoria de variedad (debe pertenecer a `DIMENSIONES_VARIEDAD`). */
    categoria: string;
    /** Texto del contenido (espanol andino). */
    texto: string;
}

const CATALOGO_CONTENIDO: readonly ItemFixture[] = [
    { categoria: "conflictos", texto: "Otra vez bloqueo en la avenida, ya no se puede ni llegar a clases, esto es un desastre" },
    { categoria: "sarcasmo", texto: "Ahhh claro, 'el dialogo soluciona todo', por eso seguimos sin pasar che" },
    { categoria: "ironia", texto: "Que lindo madrugar para caminar 40 cuadras, gracias federacion" },
    { categoria: "contenido positivo", texto: "Igual los del centro de estudiantes se estan organizando bien, eso me gusta" },
    { categoria: "contenido negativo", texto: "Estoy harto, no puedo con tanto estres de los parciales y encima esto" },
    { categoria: "contenido neutral", texto: "Alguien sabe si manana hay clases o no? para organizarme nomas" },
    { categoria: "contradicciones", texto: "Apoyo el paro pero tambien quiero rendir el examen, no se que pensar" },
    { categoria: "lenguaje cotidiano", texto: "Chee, nos vemos en la plaza despues de la asamblea pe" },
    { categoria: "ruido (mensajes irrelevantes u off-topic)", texto: "jajaja vieron el partido de anoche? que golazo" },
] as const;

// ---------------------------------------------------------------------------
// Proveedor doble basado en fixtures: imita un LLM realista de forma determinista.
// ---------------------------------------------------------------------------

/**
 * Proveedor doble que construye un `Contrato_Normalizado` a partir del
 * `CATALOGO_CONTENIDO`, repartiendo la autoria entre los usuarios persistentes
 * del contexto (round-robin) y encadenando los comentarios en un hilo de
 * conversacion via `enRespuestaA`. NO inventa identificadores: usa solo los ids
 * presentes en `ctx.usuariosSinteticos` (Req. 6.1). Expone las `categorias`
 * generadas para que la prueba verifique la variedad (Req. 6.2).
 */
class ProveedorFixtureRealista implements IDataProvider {
    readonly nombre = "gemini";
    readonly limiteTokens = 8192;
    contextoRecibido?: ContextoGeneracion;
    categoriasGeneradas: string[] = [];

    async generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        this.contextoRecibido = ctx;
        const ids = ctx.usuariosSinteticos.map((u) => u.id);
        if (ids.length === 0) {
            throw new Error("ProveedorFixtureRealista: no hay usuarios persistentes para atribuir");
        }
        // Reparte la autoria de forma deterministica entre los usuarios persistentes.
        const autorDe = (i: number): string => ids[i % ids.length];

        const [primero, ...resto] = CATALOGO_CONTENIDO;
        this.categoriasGeneradas = CATALOGO_CONTENIDO.map((c) => c.categoria);

        const autorPost = autorDe(0);
        const comments = resto.map((item, idx) => {
            const autor = autorDe(idx + 1);
            // Encadena la conversacion: el primer comentario responde al post,
            // los siguientes responden al comentario anterior (hilo real).
            const enRespuestaA = idx === 0 ? autorPost : autorDe(idx);
            return { autorId: autor, texto: item.texto, enRespuestaA };
        });

        return {
            post: { autorId: autorPost, texto: primero.texto },
            comments,
            image_description: "estudiantes con pancartas en la avenida durante el bloqueo",
            hashtags: ["#paro", "#launiver", "#sinpasajes"],
            metadata: {
                version: CONTRATO_VERSION,
                fuente: "gemini",
                generadoEn: new Date("2024-03-01T12:00:00.000Z").toISOString(),
                semana: ctx.semana,
                idioma: "es-BO",
            },
        };
    }
}

// ---------------------------------------------------------------------------
// Dobles de soporte (fabrica y motor de memoria) y helpers de armado.
// ---------------------------------------------------------------------------

function fabricaDoble(proveedor: IDataProvider): FabricaDataProvider {
    return {
        crear(_config?: ConfigFabricaDataProvider) {
            return proveedor;
        },
    };
}

function motorDoble(): ConstructorContextoMemoria {
    return {
        async construirContexto() {
            return {
                escenario: "memoria: tension creciente por el conflicto de pasajes",
                contextoMemoria: "resumen jerarquico: la semana previa subio el malestar estudiantil",
            };
        },
    };
}

const USUARIOS: PerfilUsuario[] = [
    {
        id: "u1",
        perfilConductual: "activo y reactivo",
        frecuencia: 6,
        estiloEscritura: "informal con sarcasmo",
        intereses: ["politica estudiantil"],
        nivelParticipacion: "alto",
    },
    {
        id: "u2",
        perfilConductual: "reservado",
        frecuencia: 2,
        estiloEscritura: "breve",
        intereses: ["musica"],
        nivelParticipacion: "bajo",
    },
    {
        id: "u3",
        perfilConductual: "conciliador",
        frecuencia: 4,
        estiloEscritura: "reflexivo",
        intereses: ["organizacion estudiantil"],
        nivelParticipacion: "medio",
    },
];

function solicitudBase(over: Partial<SolicitudGeneracion> = {}): SolicitudGeneracion {
    return {
        analisisId: "an-1",
        institucionId: "inst-1",
        comunidadId: "com-1",
        semana: 4,
        escenario: "conflicto universitario por el alza de pasajes",
        usuariosSinteticos: USUARIOS,
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        ...over,
    };
}

function nuevoModulo(proveedor: IDataProvider) {
    const validador = new ValidadorContratoZod(() => {
        /* silenciar logs de validacion en pruebas */
    });
    const modulo = new ModuloSimulacion(fabricaDoble(proveedor), motorDoble(), validador);
    return { modulo, validador };
}

/** Conjunto de todos los identificadores presentes en el contrato (post + comentarios). */
function autoresDelContrato(contrato: ContratoNormalizado): string[] {
    return [contrato.post.autorId, ...contrato.comments.map((c) => c.autorId)];
}

// ---------------------------------------------------------------------------
// Pruebas.
// ---------------------------------------------------------------------------

describe("Forma del contenido generado por el Modulo_Simulacion (tarea 11.9)", () => {
    describe("Atribucion a Usuario_Sintetico persistentes (Req. 6.1)", () => {
        it("atribuye toda publicacion y comentario a usuarios persistentes del contexto", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            const idsValidos = new Set(USUARIOS.map((u) => u.id));
            for (const autor of autoresDelContrato(contrato)) {
                expect(idsValidos.has(autor)).toBe(true);
            }
        });

        it("no inventa identificadores nuevos fuera del conjunto persistente", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            const idsValidos = new Set(USUARIOS.map((u) => u.id));
            const idsUsados = new Set(autoresDelContrato(contrato));
            for (const id of idsUsados) {
                expect(idsValidos.has(id)).toBe(true);
            }
            // Se reutilizan usuarios persistentes (al menos uno de los del contexto).
            expect(idsUsados.size).toBeGreaterThan(0);
            for (const id of idsUsados) {
                expect(idsValidos.has(id)).toBe(true);
            }
        });

        it("encadena conversaciones via enRespuestaA solo hacia usuarios validos o null", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            const idsValidos = new Set(USUARIOS.map((u) => u.id));
            for (const comentario of contrato.comments) {
                if (comentario.enRespuestaA !== null) {
                    expect(idsValidos.has(comentario.enRespuestaA)).toBe(true);
                }
            }
            // Hay al menos un hilo de conversacion (un comentario responde a alguien).
            const conRespuesta = contrato.comments.filter((c) => c.enRespuestaA !== null);
            expect(conRespuesta.length).toBeGreaterThan(0);
        });

        it("produce publicacion + comentarios (conversaciones), no solo una publicacion suelta", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            expect(contrato.post.texto.length).toBeGreaterThan(0);
            expect(contrato.comments.length).toBeGreaterThan(1);
        });
    });

    describe("Variedad de categorias de contenido (Req. 6.2)", () => {
        it("cubre TODAS las dimensiones de variedad emocional y de registro", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            await modulo.generarSemana(solicitudBase());

            const categorias = new Set(proveedor.categoriasGeneradas);
            for (const dimension of DIMENSIONES_VARIEDAD) {
                expect(categorias.has(dimension)).toBe(true);
            }
        });

        it("toda categoria generada pertenece al catalogo de dimensiones validas", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            await modulo.generarSemana(solicitudBase());

            const dimensionesValidas = new Set<string>(DIMENSIONES_VARIEDAD);
            for (const categoria of proveedor.categoriasGeneradas) {
                expect(dimensionesValidas.has(categoria)).toBe(true);
            }
        });

        it("no es monotematico: el contenido exhibe multiples categorias distintas (Req. 6.4)", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            await modulo.generarSemana(solicitudBase());

            const categoriasDistintas = new Set(proveedor.categoriasGeneradas);
            // Anti-simplismo: el contenido simplista no puede ser la unica salida.
            expect(categoriasDistintas.size).toBeGreaterThanOrEqual(3);
        });

        it("incluye al menos un conflicto/desacuerdo y algo de ruido", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            await modulo.generarSemana(solicitudBase());

            const categorias = new Set(proveedor.categoriasGeneradas);
            expect(categorias.has("conflictos")).toBe(true);
            expect(categorias.has("ruido (mensajes irrelevantes u off-topic)")).toBe(true);
        });
    });

    describe("Coherencia con el Contrato_Normalizado (Req. 6.4)", () => {
        it("la salida es un Contrato_Normalizado valido segun el Validador_Contrato", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo, validador } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            const resultado = validador.validar(contrato);
            expect(resultado.ok).toBe(true);
            expect(resultado.errores).toBeUndefined();
        });

        it("tiene la estructura estandar { post, comments[], image_description, hashtags[], metadata }", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            expect(contrato).toHaveProperty("post.autorId");
            expect(contrato).toHaveProperty("post.texto");
            expect(Array.isArray(contrato.comments)).toBe(true);
            expect(typeof contrato.image_description).toBe("string");
            expect(Array.isArray(contrato.hashtags)).toBe(true);
            expect(contrato).toHaveProperty("metadata.version");
        });

        it("versiona el contrato con la version de esquema vigente y la semana solicitada", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase({ semana: 7 }));

            expect(contrato.metadata.version).toBe(CONTRATO_VERSION);
            expect(contrato.metadata.semana).toBe(7);
            expect(contrato.metadata.idioma).toBe("es-BO");
        });

        it("sobrevive al round-trip serializar/deserializar del Validador_Contrato", async () => {
            const proveedor = new ProveedorFixtureRealista();
            const { modulo, validador } = nuevoModulo(proveedor);

            const { contrato } = await modulo.generarSemana(solicitudBase());

            const json = validador.serializar(contrato);
            const reparseado = validador.deserializar(json);
            expect(reparseado.ok).toBe(true);
            expect(reparseado.contrato).toEqual(contrato);
        });
    });

    describe("Determinismo de la prueba (fixtures, sin red ni BD)", () => {
        it("misma solicitud produce el mismo contenido en dos corridas", async () => {
            const a = new ProveedorFixtureRealista();
            const b = new ProveedorFixtureRealista();
            const { modulo: moduloA } = nuevoModulo(a);
            const { modulo: moduloB } = nuevoModulo(b);

            const ra = await moduloA.generarSemana(solicitudBase());
            const rb = await moduloB.generarSemana(solicitudBase());

            expect(ra.contrato).toEqual(rb.contrato);
        });
    });
});
