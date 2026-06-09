/**
 * Pruebas unitarias del `ManejadorFallosGeneracion` (tarea 11.4): manejo de
 * fallos del proveedor de datos del `Modulo_Simulacion`.
 *
 * Cubre: no-respuesta, error del proveedor, datos malformados/no normalizables,
 * normalizacion de respaldo, marcado `FALLIDA`/reintentable sin corromper el
 * historial y registro de TODOS los fallos en `gds_log_generacion`.
 * _Requirements: 4.5, 4.7, 4.8, 27.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import { ValidadorContratoZod } from "../contracts/validadorContrato";
import type { ContextoGeneracion, IDataProvider, NombreProveedor } from "./dataProvider";
import {
    ManejadorFallosGeneracion,
    ErrorGeneracionReintentable,
    crearRegistradorPrisma,
    clasificarFallo,
    type ClienteLogGeneracion,
    type EntradaLogGeneracion,
    type RegistradorGeneracion,
} from "./manejadorFallosGeneracion";

// ---------------------------------------------------------------------------
// Utilidades de prueba.
// ---------------------------------------------------------------------------

function contratoEjemplo(semana = 3): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "hola comunidad" },
        comments: [{ autorId: "u2", texto: "respondo", enRespuestaA: null }],
        image_description: "una plaza",
        hashtags: ["#x"],
        metadata: {
            version: CONTRATO_VERSION,
            fuente: "simulacion",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana,
            idioma: "es-BO",
        },
    };
}

function contextoEjemplo(): ContextoGeneracion {
    return {
        escenario: "tension estudiantil",
        contextoMemoria: "resumen",
        contextoSemantico: ["frag-1"],
        patronesAcumulados: [],
        usuariosSinteticos: [{
            id: "u1",
            perfilConductual: "activo",
            frecuencia: 3,
            estiloEscritura: "informal",
            intereses: [],
            nivelParticipacion: "alto",
        }],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 500 },
        semana: 3,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    };
}

/** Proveedor doble cuyo `generar` se controla por una cola de resultados. */
function proveedorSecuencia(
    resultados: Array<() => Promise<ContratoNormalizado>>,
    nombre: NombreProveedor = "gemini",
): IDataProvider & { llamadas: number } {
    let i = 0;
    return {
        nombre,
        limiteTokens: 8000,
        llamadas: 0,
        async generar(): Promise<ContratoNormalizado> {
            (this as { llamadas: number }).llamadas += 1;
            const fn = resultados[Math.min(i, resultados.length - 1)];
            i += 1;
            return fn();
        },
    };
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

// ---------------------------------------------------------------------------
// clasificarFallo.
// ---------------------------------------------------------------------------

describe("clasificarFallo", () => {
    it("clasifica errores de parseo/normalizacion como DATOS_MALFORMADOS", () => {
        expect(clasificarFallo(new Error("la respuesta no es JSON parseable"))).toBe(
            "DATOS_MALFORMADOS",
        );
    });

    it("clasifica errores de contrato como CONTRATO_INVALIDO", () => {
        expect(
            clasificarFallo(new Error("la salida no es un Contrato_Normalizado valido")),
        ).toBe("CONTRATO_INVALIDO");
    });

    it("clasifica timeouts/red como NO_RESPUESTA", () => {
        expect(clasificarFallo(new Error("ETIMEDOUT: request timed out"))).toBe("NO_RESPUESTA");
        expect(clasificarFallo(new Error("ECONNREFUSED"))).toBe("NO_RESPUESTA");
    });

    it("clasifica el resto como ERROR_PROVEEDOR", () => {
        expect(clasificarFallo(new Error("HTTP 500 cuota agotada"))).toBe("ERROR_PROVEEDOR");
    });
});

// ---------------------------------------------------------------------------
// Camino feliz y reintentos.
// ---------------------------------------------------------------------------

describe("ManejadorFallosGeneracion - generacion", () => {
    it("devuelve el contrato del proveedor sin registrar fallos cuando todo va bien", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([() => Promise.resolve(contratoEjemplo())]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { registrador });

        const contrato = await manejador.generar(contextoEjemplo());

        expect(contrato.post.texto).toBe("hola comunidad");
        expect(proveedor.llamadas).toBe(1);
        expect(registrador.entradas).toHaveLength(0);
    });

    it("reusa nombre y limiteTokens del proveedor envuelto (sustituible como IDataProvider)", () => {
        const proveedor = proveedorSecuencia([() => Promise.resolve(contratoEjemplo())], "ollama");
        const manejador = new ManejadorFallosGeneracion(proveedor);
        expect(manejador.nombre).toBe("ollama");
        expect(manejador.limiteTokens).toBe(8000);
    });

    it("reintenta tras un fallo transitorio y registra cada fallo (Req. 4.5, 4.7)", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("ETIMEDOUT: no responde")),
            () => Promise.resolve(contratoEjemplo()),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { registrador, maxIntentos: 3 });

        const contrato = await manejador.generar(contextoEjemplo());

        expect(contrato.post.texto).toBe("hola comunidad");
        expect(proveedor.llamadas).toBe(2);
        // El fallo transitorio del primer intento queda registrado.
        expect(registrador.entradas).toHaveLength(1);
        expect(registrador.entradas[0].causa).toBe("NO_RESPUESTA");
        expect(registrador.entradas[0].nivel).toBe("ERROR");
    });
});

// ---------------------------------------------------------------------------
// No-respuesta y error del proveedor: marcar FALLIDA/reintentable.
// ---------------------------------------------------------------------------

describe("ManejadorFallosGeneracion - fallo persistente del proveedor", () => {
    it("marca FALLIDA/reintentable ante no-respuesta persistente sin corromper historial (Req. 4.5, 27.1)", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("ETIMEDOUT: el proveedor no responde")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { registrador, maxIntentos: 3 });

        await expect(manejador.generar(contextoEjemplo())).rejects.toMatchObject({
            name: "ErrorGeneracionReintentable",
            reintentable: true,
            estado: "FALLIDA",
            intentos: 3,
            causa: "NO_RESPUESTA",
        });

        expect(proveedor.llamadas).toBe(3);
        // 3 fallos por intento + 1 fallo final de reintentos agotados.
        expect(registrador.entradas).toHaveLength(4);
        expect(registrador.entradas.at(-1)?.causa).toBe("REINTENTOS_AGOTADOS");
    });

    it("clasifica el error del proveedor (cuota/HTTP) y lanza error reintentable", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("Gemini respondio con estado HTTP 429")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { registrador, maxIntentos: 2 });

        const error = await manejador
            .generar(contextoEjemplo())
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ErrorGeneracionReintentable);
        expect((error as ErrorGeneracionReintentable).causa).toBe("ERROR_PROVEEDOR");
        // Todos los fallos quedan registrados (Req. 4.7).
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas).toEqual(["ERROR_PROVEEDOR", "ERROR_PROVEEDOR", "REINTENTOS_AGOTADOS"]);
    });

    it("nunca devuelve datos: ante fallo persistente solo lanza (historial intacto)", async () => {
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("error del proveedor")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { maxIntentos: 1 });

        let devuelto: ContratoNormalizado | undefined;
        try {
            devuelto = await manejador.generar(contextoEjemplo());
        } catch {
            // esperado
        }
        expect(devuelto).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Datos malformados: normalizacion de respaldo (Req. 4.8).
// ---------------------------------------------------------------------------

describe("ManejadorFallosGeneracion - normalizacion de respaldo (Req. 4.8)", () => {
    it("recupera datos malformados normalizables aplicando el respaldo validado", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () =>
                Promise.reject(new Error("la salida no es un Contrato_Normalizado valido")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, {
            registrador,
            validador: new ValidadorContratoZod(() => undefined),
            // Respaldo: reconstruye un contrato valido a partir del contexto.
            normalizadorRespaldo: (ctx) => contratoEjemplo(ctx.semana),
            maxIntentos: 3,
        });

        const contrato = await manejador.generar(contextoEjemplo());

        expect(contrato.post.texto).toBe("hola comunidad");
        // No se agotan reintentos: se resuelve en el primer intento via respaldo.
        expect(proveedor.llamadas).toBe(1);
        // Se registra el fallo del proveedor (CONTRATO_INVALIDO) y el exito del respaldo.
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas).toContain("CONTRATO_INVALIDO");
        expect(registrador.entradas.some((e) => e.nivel === "INFO")).toBe(true);
    });

    it("marca FALLIDA cuando los datos malformados NO son normalizables (respaldo null)", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("la respuesta no es JSON parseable")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, {
            registrador,
            validador: new ValidadorContratoZod(() => undefined),
            normalizadorRespaldo: () => null, // no normalizable
            maxIntentos: 2,
        });

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        // Cada intento: fallo del proveedor (DATOS_MALFORMADOS) + WARN respaldo nulo.
        const causas = registrador.entradas.map((e) => e.causa);
        expect(causas.filter((c) => c === "DATOS_MALFORMADOS").length).toBeGreaterThanOrEqual(2);
        expect(causas.at(-1)).toBe("REINTENTOS_AGOTADOS");
    });

    it("descarta el respaldo si no es conforme al contrato (RESPALDO_INVALIDO)", async () => {
        const registrador = registradorCaptura();
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("contrato invalido: campo post faltante")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, {
            registrador,
            validador: new ValidadorContratoZod(() => undefined),
            // Respaldo produce algo, pero NO es un Contrato_Normalizado valido.
            normalizadorRespaldo: () => ({ post: { autorId: "u1" } }),
            maxIntentos: 1,
        });

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        expect(registrador.entradas.some((e) => e.causa === "RESPALDO_INVALIDO")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Persistencia en gds_log_generacion (Req. 4.7, 27.1).
// ---------------------------------------------------------------------------

describe("crearRegistradorPrisma -> gds_log_generacion", () => {
    function clienteFake(): ClienteLogGeneracion & {
        creados: Array<{ cicloId: string; nivel: string; mensaje: string; detalle?: unknown }>;
    } {
        const creados: Array<{
            cicloId: string;
            nivel: string;
            mensaje: string;
            detalle?: unknown;
        }> = [];
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

    it("persiste cada fallo en gds_log_generacion con su codigo de causa (Req. 4.7)", async () => {
        const cliente = clienteFake();
        const registrador = crearRegistradorPrisma(cliente, "ciclo-1");
        const proveedor = proveedorSecuencia([
            () => Promise.reject(new Error("ETIMEDOUT: no responde")),
        ]);
        const manejador = new ManejadorFallosGeneracion(proveedor, { registrador, maxIntentos: 2 });

        await expect(manejador.generar(contextoEjemplo())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );

        // 2 fallos por intento + 1 de reintentos agotados, todos en el ciclo.
        expect(cliente.creados).toHaveLength(3);
        for (const fila of cliente.creados) {
            expect(fila.cicloId).toBe("ciclo-1");
            expect(fila.nivel).toBe("ERROR");
            expect((fila.detalle as { causa: string }).causa).toBeDefined();
        }
        expect(
            (cliente.creados.at(-1)?.detalle as { causa: string }).causa,
        ).toBe("REINTENTOS_AGOTADOS");
    });

    it("degrada a consola sin propagar si la escritura en BD falla", async () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const clienteRoto: ClienteLogGeneracion = {
            logGeneracion: {
                create: () => Promise.reject(new Error("DB caida")),
            },
        };
        const registrador = crearRegistradorPrisma(clienteRoto, "ciclo-x");

        await expect(
            registrador({ nivel: "ERROR", causa: "NO_RESPUESTA", mensaje: "x" }),
        ).resolves.toBeUndefined();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
