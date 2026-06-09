/**
 * Pruebas unitarias del `ProveedorOllamaMistral` (Req. 4.2, 4.5, 4.6, 4.7, 4.8, 27.1).
 *
 * Se inyecta un cliente HTTP doble (sin red real) y un registrador en memoria
 * (sin base de datos) para ejercer de forma determinista:
 *  - exito: el proveedor devuelve un `Contrato_Normalizado` valido (Req. 4.6).
 *  - no-respuesta / error del proveedor: se registra y se reintenta; al persistir
 *    se lanza `ErrorGeneracionReintentable` (Req. 4.5, 4.7, 27.1).
 *  - datos malformados normalizables: la normalizacion de respaldo produce un
 *    contrato valido (Req. 4.8).
 *  - datos no normalizables: tras reintentar, se marca FALLIDA/reintentable (Req. 4.8, 27.1).
 *
 * _Requirements: 4.2, 4.5, 4.6, 4.7, 4.8, 27.1_
 */
import { describe, expect, it, vi } from "vitest";

import { ContratoNormalizadoSchema } from "../contracts/contratoNormalizado";
import type { ContextoGeneracion } from "./proveedorGeneracion";
import {
    ClienteHttp,
    EntradaLogGeneracion,
    ErrorGeneracionReintentable,
    ProveedorOllamaMistral,
    RegistradorGeneracion,
    RespuestaHttp,
} from "./proveedorOllamaMistral";

// ---------------------------------------------------------------------------
// Utilidades de prueba: contexto y dobles inyectables.
// ---------------------------------------------------------------------------

function contexto(overrides: Partial<ContextoGeneracion> = {}): ContextoGeneracion {
    return {
        escenario: "Conflicto Universitario",
        contextoMemoria: "Resumen jerarquico de las semanas previas.",
        patronesAcumulados: [],
        usuariosSinteticos: [
            {
                id: "u-1",
                seudonimo: "anon-aa",
                perfilConductual: "participativo",
                frecuencia: 0.5,
                estiloEscritura: "informal",
                intereses: ["politica"],
                nivelParticipacion: "alto",
            },
        ],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 1500 },
        semana: 3,
        comunidad: { institucionId: "inst-1", analisisId: "ana-1" },
        ...overrides,
    };
}

/** Respuesta HTTP doble a partir de un cuerpo JSON arbitrario. */
function respuestaOk(cuerpo: unknown): RespuestaHttp {
    return {
        ok: true,
        status: 200,
        json: async () => cuerpo,
        text: async () => JSON.stringify(cuerpo),
    };
}

/** Envuelve un candidato como lo haria Ollama (`/api/generate` con `format: json`). */
function cuerpoOllama(candidato: unknown): unknown {
    return { response: JSON.stringify(candidato), done: true };
}

const RELOJ_FIJO = () => new Date("2024-03-01T12:00:00.000Z");

function registradorEnMemoria(): {
    registrador: RegistradorGeneracion;
    entradas: EntradaLogGeneracion[];
} {
    const entradas: EntradaLogGeneracion[] = [];
    return {
        entradas,
        registrador: (entrada) => {
            entradas.push(entrada);
        },
    };
}

const CONTRATO_VALIDO = {
    post: { autorId: "anon-aa", texto: "Hoy hubo asamblea en la facultad." },
    comments: [{ autorId: "anon-bb", texto: "Que paso?", enRespuestaA: null }],
    image_description: "Estudiantes reunidos en un patio.",
    hashtags: ["#asamblea"],
    metadata: {
        version: "1.0.0",
        fuente: "ollama-mistral",
        generadoEn: "2024-03-01T12:00:00.000Z",
        semana: 3,
        idioma: "es-BO",
    },
};

// ---------------------------------------------------------------------------
// Caso 1: exito - contrato valido (Req. 4.6).
// ---------------------------------------------------------------------------

describe("ProveedorOllamaMistral - exito", () => {
    it("devuelve un Contrato_Normalizado valido en el primer intento (Req. 4.6)", async () => {
        const cliente: ClienteHttp = vi.fn(async () => respuestaOk(cuerpoOllama(CONTRATO_VALIDO)));
        const { registrador, entradas } = registradorEnMemoria();
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 3 },
            { clienteHttp: cliente, registrador, ahora: RELOJ_FIJO },
        );

        const contrato = await proveedor.generar(contexto());

        expect(() => ContratoNormalizadoSchema.parse(contrato)).not.toThrow();
        expect(contrato.post.texto).toBe("Hoy hubo asamblea en la facultad.");
        expect(cliente).toHaveBeenCalledTimes(1);
        // En el camino feliz no se registran fallos.
        expect(entradas).toHaveLength(0);
    });

    it("expone nombre y limiteTokens configurable (Req. 4.2)", () => {
        const proveedor = new ProveedorOllamaMistral({ limiteTokens: 4096 });
        expect(proveedor.nombre).toBe("ollama");
        expect(proveedor.limiteTokens).toBe(4096);
    });
});

// ---------------------------------------------------------------------------
// Caso 2: no-respuesta / error del proveedor (Req. 4.5, 4.7, 27.1).
// ---------------------------------------------------------------------------

describe("ProveedorOllamaMistral - no-respuesta / error", () => {
    it("reintenta y, al persistir el fallo de red, marca FALLIDA/reintentable (Req. 4.5, 27.1)", async () => {
        const cliente: ClienteHttp = vi.fn(async () => {
            throw new Error("ECONNREFUSED");
        });
        const { registrador, entradas } = registradorEnMemoria();
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 3 },
            { clienteHttp: cliente, registrador, ahora: RELOJ_FIJO },
        );

        await expect(proveedor.generar(contexto())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        // Se intento exactamente maxIntentos veces.
        expect(cliente).toHaveBeenCalledTimes(3);
        // Cada fallo se registro (3 intentos + 1 log final de FALLIDA).
        expect(entradas.filter((e) => e.nivel === "ERROR").length).toBeGreaterThanOrEqual(4);
    });

    it("captura el estado y la bandera reintentable del error (Req. 27.1)", async () => {
        const cliente: ClienteHttp = vi.fn(async () => {
            throw new Error("timeout");
        });
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 2 },
            { clienteHttp: cliente, registrador: () => undefined, ahora: RELOJ_FIJO },
        );

        try {
            await proveedor.generar(contexto());
            expect.unreachable("deberia lanzar ErrorGeneracionReintentable");
        } catch (error) {
            expect(error).toBeInstanceOf(ErrorGeneracionReintentable);
            const e = error as ErrorGeneracionReintentable;
            expect(e.reintentable).toBe(true);
            expect(e.estado).toBe("FALLIDA");
            expect(e.intentos).toBe(2);
        }
    });

    it("trata un estado HTTP no-ok como error del proveedor (Req. 4.7)", async () => {
        const cliente: ClienteHttp = vi.fn(async () => ({
            ok: false,
            status: 500,
            json: async () => ({}),
            text: async () => "error interno",
        }));
        const { registrador, entradas } = registradorEnMemoria();
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 1 },
            { clienteHttp: cliente, registrador, ahora: RELOJ_FIJO },
        );

        await expect(proveedor.generar(contexto())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        expect(entradas.some((e) => e.mensaje.includes("Fallo del proveedor Ollama"))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Caso 3: datos malformados normalizables (Req. 4.8).
// ---------------------------------------------------------------------------

describe("ProveedorOllamaMistral - malformados normalizables", () => {
    it("normaliza una salida parcial sin metadata en un contrato valido (Req. 4.8)", async () => {
        // Falta metadata, hashtags es string y faltan campos: normalizable.
        const parcial = {
            post: { autorId: "anon-zz", texto: "Subio el pasaje del minibus otra vez." },
            hashtags: "#transporte",
        };
        const cliente: ClienteHttp = vi.fn(async () => respuestaOk(cuerpoOllama(parcial)));
        const { registrador, entradas } = registradorEnMemoria();
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 3 },
            { clienteHttp: cliente, registrador, ahora: RELOJ_FIJO },
        );

        const contrato = await proveedor.generar(contexto());

        expect(() => ContratoNormalizadoSchema.parse(contrato)).not.toThrow();
        expect(contrato.post.texto).toBe("Subio el pasaje del minibus otra vez.");
        expect(contrato.hashtags).toEqual(["#transporte"]);
        expect(contrato.metadata.version).toBe("1.0.0");
        expect(contrato.metadata.semana).toBe(3);
        // Se resolvio en el primer intento via respaldo (sin reintentos).
        expect(cliente).toHaveBeenCalledTimes(1);
        expect(entradas).toHaveLength(0);
    });

    it("trata texto crudo no-JSON como cuerpo de publicacion normalizable (Req. 4.8)", async () => {
        // Ollama devuelve texto que no es JSON parseable.
        const cliente: ClienteHttp = vi.fn(async () =>
            respuestaOk({ response: "No pude formatear pero el campus esta tenso hoy.", done: true }),
        );
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 2 },
            { clienteHttp: cliente, registrador: () => undefined, ahora: RELOJ_FIJO },
        );

        const contrato = await proveedor.generar(contexto());

        expect(() => ContratoNormalizadoSchema.parse(contrato)).not.toThrow();
        expect(contrato.post.texto).toBe("No pude formatear pero el campus esta tenso hoy.");
        // Autor por defecto tomado del usuario sintetico del contexto.
        expect(contrato.post.autorId).toBe("anon-aa");
    });
});

// ---------------------------------------------------------------------------
// Caso 4: datos no normalizables (Req. 4.8, 27.1).
// ---------------------------------------------------------------------------

describe("ProveedorOllamaMistral - no normalizables", () => {
    it("reintenta y marca FALLIDA cuando no hay texto recuperable (Req. 4.8, 27.1)", async () => {
        // Sin ningun texto de publicacion: no es normalizable.
        const cliente: ClienteHttp = vi.fn(async () =>
            respuestaOk(cuerpoOllama({ foo: 1, hashtags: ["#x"] })),
        );
        const { registrador, entradas } = registradorEnMemoria();
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 3 },
            { clienteHttp: cliente, registrador, ahora: RELOJ_FIJO },
        );

        await expect(proveedor.generar(contexto())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        // Se reintento maxIntentos veces antes de fallar.
        expect(cliente).toHaveBeenCalledTimes(3);
        expect(entradas.some((e) => e.mensaje.includes("no normalizables"))).toBe(true);
        expect(
            entradas.some((e) => e.mensaje.includes("FALLIDA/reintentable tras agotar reintentos")),
        ).toBe(true);
    });

    it("se recupera si un intento posterior devuelve datos validos (Req. 4.8)", async () => {
        let llamada = 0;
        const cliente: ClienteHttp = vi.fn(async () => {
            llamada += 1;
            if (llamada === 1) {
                return respuestaOk(cuerpoOllama({ foo: "sin texto" }));
            }
            return respuestaOk(cuerpoOllama(CONTRATO_VALIDO));
        });
        const proveedor = new ProveedorOllamaMistral(
            { maxIntentos: 3 },
            { clienteHttp: cliente, registrador: () => undefined, ahora: RELOJ_FIJO },
        );

        const contrato = await proveedor.generar(contexto());
        expect(() => ContratoNormalizadoSchema.parse(contrato)).not.toThrow();
        expect(cliente).toHaveBeenCalledTimes(2);
    });
});
