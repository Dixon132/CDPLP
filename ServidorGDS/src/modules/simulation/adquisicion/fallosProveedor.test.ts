/**
 * Pruebas unitarias de FALLOS / REINTENTOS del proveedor (tarea 11.8).
 *
 * A diferencia de `manejadorFallosGeneracion.test.ts` (tarea 11.4, que usa
 * proveedores dobles abstractos), estas pruebas ejercitan las rutas de fallo a
 * traves de los **proveedores concretos reales** (`GeminiProvider` /
 * `OllamaProvider`) envueltos por el `ManejadorFallosGeneracion`, sustituyendo
 * unicamente el cliente HTTP por un doble (sin red). Asi se verifica el camino
 * completo "cliente falla -> proveedor clasifica -> manejador registra/reintenta"
 * que ve el `Modulo_Simulacion`.
 *
 * Cobertura exigida por la tarea 11.8:
 *  - **No-respuesta** del proveedor (timeout / red caida) -> NO_RESPUESTA.
 *  - **Error** del proveedor (cuota / HTTP 5xx-4xx) -> ERROR_PROVEEDOR.
 *  - **Datos malformados** (no JSON parseable) -> DATOS_MALFORMADOS.
 *  - **Datos no normalizables** (JSON que no es `Contrato_Normalizado`) ->
 *    CONTRATO_INVALIDO: se descarta, se registra el motivo y se solicita
 *    regeneracion antes de continuar (Req. 27.4); con normalizacion de respaldo
 *    se recupera sin marcar fallida (Req. 4.8).
 *  - **Registro de TODOS los fallos** independientemente de su causa (Req. 4.7),
 *    incluida la persistencia en `gds_log_generacion` (Req. 27.1).
 *  - **Marcado reintentable** sin corromper el historial acumulado (Req. 4.5,
 *    27.1).
 *
 * _Requirements: 4.5, 4.7, 4.8, 27.1, 27.4_
 */
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import { ValidadorContratoService } from "../contracts/validadorContrato";
import type { ContextoGeneracion } from "./dataProvider";
import { GeminiProvider } from "./gemini/geminiProvider";
import type { GeminiClient, GeminiSolicitud } from "./gemini/geminiClient";
import { OllamaProvider } from "./ollama/ollamaProvider";
import type { OllamaClient, OllamaSolicitud } from "./ollama/ollamaClient";
import {
    ManejadorFallosGeneracion,
    ErrorGeneracionReintentable,
    crearRegistradorPrisma,
    type ClienteLogGeneracion,
    type EntradaLogGeneracion,
    type NormalizadorRespaldo,
    type OpcionesManejadorFallos,
    type RegistradorGeneracion,
} from "./manejadorFallosGeneracion";

// ---------------------------------------------------------------------------
// Utilidades de prueba.
// ---------------------------------------------------------------------------

/** Contexto de generacion de ejemplo, suficiente para construir el prompt. */
function contextoEjemplo(semana = 3): ContextoGeneracion {
    return {
        escenario: "tension por epoca de examenes",
        contextoMemoria: "la semana previa subio el estres academico",
        contextoSemantico: ["frag-1"],
        patronesAcumulados: [],
        usuariosSinteticos: [
            {
                id: "u1",
                perfilConductual: "activo",
                frecuencia: 5,
                estiloEscritura: "informal",
                intereses: ["futbol"],
                nivelParticipacion: "alto",
            },
        ],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 500 },
        semana,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    };
}

/** JSON valido que un LLM bien comportado devolveria (sin metadata). */
function jsonValido(): string {
    return JSON.stringify({
        post: { autorId: "u1", texto: "Hoy el examen estuvo durisimo, che" },
        comments: [{ autorId: "u2", texto: "Misma vibra", enRespuestaA: "u1" }],
        image_description: "Estudiantes saliendo del aula",
        hashtags: ["#examenes"],
    });
}

/**
 * Doble del `GeminiClient` controlado por una cola de respuestas. Cada elemento
 * es una funcion que resuelve (texto del modelo) o rechaza (fallo de red/HTTP).
 * Registra el numero de invocaciones para verificar los reintentos.
 */
function clienteGeminiSecuencia(
    respuestas: Array<() => Promise<string>>,
): { cliente: GeminiClient; generar: jest.Mock } {
    let i = 0;
    const generar = jest.fn(async (_s: GeminiSolicitud) => {
        const fn = respuestas[Math.min(i, respuestas.length - 1)];
        i += 1;
        return fn();
    });
    return { cliente: { generar }, generar };
}

/** Doble analogo del `OllamaClient`. */
function clienteOllamaSecuencia(
    respuestas: Array<() => Promise<string>>,
): { cliente: OllamaClient; generar: jest.Mock } {
    let i = 0;
    const generar = jest.fn(async (_s: OllamaSolicitud) => {
        const fn = respuestas[Math.min(i, respuestas.length - 1)];
        i += 1;
        return fn();
    });
    return { cliente: { generar }, generar };
}

/** Registrador que captura todas las entradas para inspeccion. */
function registradorCaptura(): RegistradorGeneracion & { entradas: EntradaLogGeneracion[] } {
    const entradas: EntradaLogGeneracion[] = [];
    const fn = ((entrada: EntradaLogGeneracion) => {
        entradas.push(entrada);
    }) as RegistradorGeneracion & { entradas: EntradaLogGeneracion[] };
    fn.entradas = entradas;
    return fn;
}

/** Construye un `GeminiProvider` real envuelto por el manejador de fallos. */
function geminiConManejador(
    respuestas: Array<() => Promise<string>>,
    opciones: OpcionesManejadorFallos = {},
): { manejador: ManejadorFallosGeneracion; generar: jest.Mock } {
    const { cliente, generar } = clienteGeminiSecuencia(respuestas);
    const provider = new GeminiProvider(cliente, new ValidadorContratoService());
    const manejador = new ManejadorFallosGeneracion(provider, opciones);
    return { manejador, generar };
}

// ---------------------------------------------------------------------------
// No-respuesta del proveedor (timeout / red caida) -> NO_RESPUESTA.
// ---------------------------------------------------------------------------

describe("Fallos del proveedor: NO-RESPUESTA (Req. 4.5, 4.7, 27.1)", () => {
    it("clasifica el timeout como NO_RESPUESTA, reintenta y registra cada fallo", async () => {
        const registrador = registradorCaptura();
        const { manejador, generar } = geminiConManejador(
            [() => Promise.reject(new Error("ETIMEDOUT: el proveedor no responde"))],
            { registrador, maxIntentos: 3 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toMatchObject({
            name: "ErrorGeneracionReintentable",
            reintentable: true,
            estado: "FALLIDA",
            causa: "NO_RESPUESTA",
        });

        // Se invoco al cliente una vez por intento (reintentos efectivos).
        expect(generar).toHaveBeenCalledTimes(3);
        // 3 fallos por intento + 1 fallo final de reintentos agotados, TODOS registrados.
        expect(registrador.entradas).toHaveLength(4);
        expect(registrador.entradas.slice(0, 3).every((e) => e.causa === "NO_RESPUESTA")).toBe(true);
        expect(registrador.entradas.at(-1)?.causa).toBe("REINTENTOS_AGOTADOS");
    });

    it("se recupera (marca reintentable cumplida) cuando la no-respuesta es transitoria", async () => {
        const registrador = registradorCaptura();
        const { manejador, generar } = geminiConManejador(
            [
                () => Promise.reject(new Error("ECONNREFUSED: red caida")),
                () => Promise.resolve(jsonValido()),
            ],
            { registrador, maxIntentos: 3 },
        );

        const contrato = await manejador.generar(contextoEjemplo(4));

        expect(contrato.post.autorId).toBe("u1");
        expect(contrato.metadata.version).toBe(CONTRATO_VERSION);
        expect(generar).toHaveBeenCalledTimes(2);
        // El fallo transitorio quedo registrado aunque la generacion termino bien.
        expect(registrador.entradas).toHaveLength(1);
        expect(registrador.entradas[0].causa).toBe("NO_RESPUESTA");
    });
});

// ---------------------------------------------------------------------------
// Error del proveedor (cuota / HTTP) -> ERROR_PROVEEDOR.
// ---------------------------------------------------------------------------

describe("Fallos del proveedor: ERROR del proveedor (Req. 4.5, 4.7, 27.1)", () => {
    it("clasifica el error de cuota/HTTP como ERROR_PROVEEDOR y lo marca reintentable", async () => {
        const registrador = registradorCaptura();
        const { manejador } = geminiConManejador(
            [() => Promise.reject(new Error("Gemini respondio con estado HTTP 429 (cuota agotada)"))],
            { registrador, maxIntentos: 2 },
        );

        const error = await manejador.generar(contextoEjemplo()).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ErrorGeneracionReintentable);
        expect((error as ErrorGeneracionReintentable).causa).toBe("ERROR_PROVEEDOR");
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas).toEqual(["ERROR_PROVEEDOR", "ERROR_PROVEEDOR", "REINTENTOS_AGOTADOS"]);
    });

    it("clasifica una respuesta sin texto generado como ERROR_PROVEEDOR", async () => {
        const registrador = registradorCaptura();
        // El cliente real lanzaria al no haber texto; aqui simulamos ese error.
        const { manejador } = geminiConManejador(
            [() => Promise.reject(new Error("GeminiProvider: la respuesta de Gemini no contiene texto generado."))],
            { registrador, maxIntentos: 1 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        expect(registrador.entradas.some((e) => e.causa === "ERROR_PROVEEDOR")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Datos malformados (no JSON parseable) -> DATOS_MALFORMADOS.
// ---------------------------------------------------------------------------

describe("Fallos del proveedor: DATOS MALFORMADOS (Req. 4.7, 4.8)", () => {
    it("clasifica salida no parseable como DATOS_MALFORMADOS y marca fallida sin respaldo", async () => {
        const registrador = registradorCaptura();
        const { manejador } = geminiConManejador(
            [() => Promise.resolve("esto no es json {roto")],
            { registrador, maxIntentos: 2 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas.filter((c) => c === "DATOS_MALFORMADOS").length).toBeGreaterThanOrEqual(2);
        expect(causas.at(-1)).toBe("REINTENTOS_AGOTADOS");
    });

    it("recupera datos malformados normalizables aplicando la normalizacion de respaldo (Req. 4.8)", async () => {
        const registrador = registradorCaptura();
        const respaldo: NormalizadorRespaldo = (ctx) => ({
            post: { autorId: "u1", texto: "reconstruido tras malformacion" },
            comments: [],
            image_description: "patio",
            hashtags: [],
            metadata: {
                version: CONTRATO_VERSION,
                fuente: "respaldo",
                generadoEn: "2024-01-01T00:00:00.000Z",
                semana: ctx.semana,
                idioma: "es-BO",
            },
        });
        const { manejador, generar } = geminiConManejador(
            [() => Promise.resolve("no-json-malformado")],
            {
                registrador,
                validador: new ValidadorContratoService(),
                normalizadorRespaldo: respaldo,
                maxIntentos: 3,
            },
        );

        const contrato = await manejador.generar(contextoEjemplo(7));

        expect(contrato.post.texto).toContain("reconstruido");
        expect(contrato.metadata.semana).toBe(7);
        // Se resuelve en el primer intento via respaldo (no se reintenta el cliente).
        expect(generar).toHaveBeenCalledTimes(1);
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas).toContain("DATOS_MALFORMADOS");
        expect(registrador.entradas.some((e) => e.nivel === "INFO")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Datos no normalizables (JSON valido pero no es Contrato_Normalizado).
// Req. 27.4: descartar, registrar el motivo y solicitar regeneracion.
// ---------------------------------------------------------------------------

describe("Fallos del proveedor: CONTRATO INVALIDO / no normalizable (Req. 27.4, 4.8)", () => {
    /** JSON sintacticamente valido pero que no cumple el `Contrato_Normalizado`. */
    function jsonNoNormalizable(): string {
        return JSON.stringify({ post: { texto: "sin autorId" }, comments: "no-es-lista" });
    }

    it("descarta el contrato invalido, registra el motivo y solicita regeneracion (reintento)", async () => {
        const registrador = registradorCaptura();
        // Primer intento: JSON no normalizable -> CONTRATO_INVALIDO; segundo: valido.
        const { manejador, generar } = geminiConManejador(
            [() => Promise.resolve(jsonNoNormalizable()), () => Promise.resolve(jsonValido())],
            { registrador, maxIntentos: 3 },
        );

        const contrato = await manejador.generar(contextoEjemplo());

        // La regeneracion solicitada se cumple: el contrato final es valido.
        expect(contrato.post.autorId).toBe("u1");
        expect(generar).toHaveBeenCalledTimes(2);
        // El contrato invalido fue descartado y su motivo registrado (Req. 27.4).
        expect(registrador.entradas.some((e) => e.causa === "CONTRATO_INVALIDO")).toBe(true);
    });

    it("marca FALLIDA/reintentable si el contrato sigue no siendo normalizable tras los reintentos", async () => {
        const registrador = registradorCaptura();
        const { manejador } = geminiConManejador(
            [() => Promise.resolve(jsonNoNormalizable())],
            { registrador, maxIntentos: 2 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toMatchObject({
            name: "ErrorGeneracionReintentable",
            causa: "CONTRATO_INVALIDO",
            estado: "FALLIDA",
        });
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas.filter((c) => c === "CONTRATO_INVALIDO").length).toBe(2);
        expect(causas.at(-1)).toBe("REINTENTOS_AGOTADOS");
    });

    it("descarta el respaldo si tampoco es conforme (RESPALDO_INVALIDO) y marca fallida", async () => {
        const registrador = registradorCaptura();
        const { manejador } = geminiConManejador(
            [() => Promise.resolve(jsonNoNormalizable())],
            {
                registrador,
                validador: new ValidadorContratoService(),
                // El respaldo produce algo, pero sigue sin ser un Contrato_Normalizado.
                normalizadorRespaldo: () => ({ post: { texto: "todavia invalido" } }),
                maxIntentos: 1,
            },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        expect(registrador.entradas.some((e) => e.causa === "RESPALDO_INVALIDO")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Registro de TODOS los fallos independientemente de su causa (Req. 4.7) y
// persistencia en gds_log_generacion (Req. 27.1).
// ---------------------------------------------------------------------------

describe("Registro de todos los fallos del proveedor (Req. 4.7, 27.1)", () => {
    function clienteLogFake(): ClienteLogGeneracion & {
        creados: Array<{ cicloId: string; nivel: string; mensaje: string; detalle?: unknown }>;
    } {
        const creados: Array<{ cicloId: string; nivel: string; mensaje: string; detalle?: unknown }> = [];
        return {
            creados,
            logGeneracion: {
                async create(args) {
                    creados.push(args.data);
                    return args.data;
                },
            },
        };
    }

    it("persiste en gds_log_generacion cada fallo del proveedor con su codigo de causa", async () => {
        const cliente = clienteLogFake();
        const registrador = crearRegistradorPrisma(cliente, "ciclo-7");
        const { manejador } = geminiConManejador(
            [() => Promise.reject(new Error("ETIMEDOUT: no responde"))],
            { registrador, maxIntentos: 2 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );

        // 2 fallos por intento + 1 de reintentos agotados, todos asociados al ciclo.
        expect(cliente.creados).toHaveLength(3);
        for (const fila of cliente.creados) {
            expect(fila.cicloId).toBe("ciclo-7");
            expect(fila.nivel).toBe("ERROR");
            expect((fila.detalle as { causa: string }).causa).toBeDefined();
        }
        expect((cliente.creados.at(-1)?.detalle as { causa: string }).causa).toBe(
            "REINTENTOS_AGOTADOS",
        );
    });

    it("registra fallos de causas distintas a lo largo de los reintentos (todas las causas)", async () => {
        const registrador = registradorCaptura();
        // Intento 1: timeout (NO_RESPUESTA). Intento 2: malformado (DATOS_MALFORMADOS).
        // Intento 3: contrato invalido (CONTRATO_INVALIDO). Luego se agotan.
        const { manejador } = geminiConManejador(
            [
                () => Promise.reject(new Error("ETIMEDOUT")),
                () => Promise.resolve("no es json"),
                () => Promise.resolve(JSON.stringify({ post: { texto: "sin autor" } })),
            ],
            { registrador, maxIntentos: 3 },
        );

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );

        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas).toContain("NO_RESPUESTA");
        expect(causas).toContain("DATOS_MALFORMADOS");
        expect(causas).toContain("CONTRATO_INVALIDO");
        expect(causas.at(-1)).toBe("REINTENTOS_AGOTADOS");
    });

    it("nunca devuelve datos ante fallo persistente: el historial acumulado queda intacto (Req. 27.1)", async () => {
        const { manejador } = geminiConManejador(
            [() => Promise.reject(new Error("error del proveedor"))],
            { maxIntentos: 1 },
        );

        let devuelto: unknown;
        try {
            devuelto = await manejador.generar(contextoEjemplo());
        } catch {
            // esperado
        }
        expect(devuelto).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// El manejo de fallos es identico para cualquier IDataProvider concreto.
// ---------------------------------------------------------------------------

describe("El manejo de fallos no depende del proveedor concreto (OllamaProvider)", () => {
    it("aplica la misma clasificacion/reintento/registro con OllamaProvider", async () => {
        const registrador = registradorCaptura();
        const { cliente, generar } = clienteOllamaSecuencia([
            () => Promise.reject(new Error("ETIMEDOUT: ollama local no responde")),
            () => Promise.resolve(jsonValido()),
        ]);
        const provider = new OllamaProvider(cliente, new ValidadorContratoService());
        const manejador = new ManejadorFallosGeneracion(provider, { registrador, maxIntentos: 3 });

        const contrato = await manejador.generar(contextoEjemplo());

        expect(contrato.post.autorId).toBe("u1");
        expect(contrato.metadata.fuente).toBe("ollama");
        expect(generar).toHaveBeenCalledTimes(2);
        expect(registrador.entradas).toHaveLength(1);
        expect(registrador.entradas[0].causa).toBe("NO_RESPUESTA");
        // El manejador reusa nombre/limiteTokens del proveedor envuelto.
        expect(manejador.nombre).toBe("ollama");
        expect(typeof manejador.limiteTokens).toBe("number");
    });
});
