/**
 * Pruebas unitarias del `GeminiProvider` (tarea 11.2).
 *
 * Verifican que el proveedor:
 *  - invoca Gemini SOLO a traves del {@link GeminiClient} inyectable (mock, sin
 *    red real) y le pasa un prompt construido desde el `ContextoGeneracion`;
 *  - transforma el texto del LLM en un `Contrato_Normalizado` VALIDO usando el
 *    `Validador_Contrato` (Req. 4.6), tolerando vallas de codigo Markdown;
 *  - expone `nombre = "gemini"` (coincide con el proveedor por defecto) y un
 *    `limiteTokens` numerico (Req. 4.2, 4.3);
 *  - es seleccionado por la `FabricaDataProvider` cuando no se especifica
 *    proveedor (Req. 4.3) y por nombre (Req. 4.4);
 *  - rechaza con error descriptivo si la salida del LLM no es normalizable.
 *
 * _Requirements: 4.2, 4.3, 4.4_
 */
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoService } from "../../contracts/validadorContrato";
import {
    FabricaDataProviderRegistro,
    PROVEEDOR_POR_DEFECTO,
    type ContextoGeneracion,
} from "../dataProvider";
import { GeminiProvider, GEMINI_LIMITE_TOKENS_DEFAULT } from "./geminiProvider";
import type { GeminiClient, GeminiSolicitud } from "./geminiClient";

/** Doble del `GeminiClient` que devuelve un texto fijo y registra la llamada. */
function clienteFalso(texto: string): { cliente: GeminiClient; generar: jest.Mock } {
    const generar = jest.fn(async (_s: GeminiSolicitud) => texto);
    return { cliente: { generar }, generar };
}

/** JSON valido que un Gemini bien comportado devolveria (sin metadata). */
function jsonGeminiValido(): string {
    return JSON.stringify({
        post: { autorId: "u1", texto: "Hoy el examen estuvo durisimo, che" },
        comments: [
            { autorId: "u2", texto: "Misma vibra, no dormi nada", enRespuestaA: "u1" },
            { autorId: "u3", texto: "Animo pues!", enRespuestaA: null },
        ],
        image_description: "Estudiantes saliendo del aula con caras de cansancio",
        hashtags: ["#examenes", "#colegio"],
    });
}

function contextoEjemplo(semana = 3): ContextoGeneracion {
    return {
        escenario: "tension por epoca de examenes",
        contextoMemoria: "la semana previa subio el estres academico",
        contextoSemantico: ["frag-1", "frag-2"],
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

function nuevoProveedor(texto: string): {
    provider: GeminiProvider;
    generar: jest.Mock;
} {
    const { cliente, generar } = clienteFalso(texto);
    const provider = new GeminiProvider(cliente, new ValidadorContratoService());
    return { provider, generar };
}

describe("GeminiProvider (tarea 11.2)", () => {
    it("expone nombre 'gemini' (proveedor por defecto) y un limiteTokens numerico", () => {
        const { provider } = nuevoProveedor(jsonGeminiValido());
        expect(provider.nombre).toBe("gemini");
        expect(provider.nombre).toBe(PROVEEDOR_POR_DEFECTO);
        expect(typeof provider.limiteTokens).toBe("number");
        expect(provider.limiteTokens).toBe(GEMINI_LIMITE_TOKENS_DEFAULT);
    });

    it("invoca el GeminiClient con un prompt derivado del contexto y produce un Contrato_Normalizado valido", async () => {
        const { provider, generar } = nuevoProveedor(jsonGeminiValido());
        const ctx = contextoEjemplo(4);

        const contrato = await provider.generar(ctx);

        // Invoca el cliente exactamente una vez con un prompt no vacio.
        expect(generar).toHaveBeenCalledTimes(1);
        const solicitud = generar.mock.calls[0][0] as GeminiSolicitud;
        expect(typeof solicitud.prompt).toBe("string");
        expect(solicitud.prompt).toContain("tension por epoca de examenes");
        expect(solicitud.prompt).toContain("u1");

        // La salida es un Contrato_Normalizado valido y normalizado.
        expect(contrato.post.autorId).toBe("u1");
        expect(contrato.post.texto).toContain("examen");
        expect(contrato.comments).toHaveLength(2);
        expect(contrato.comments[1].enRespuestaA).toBeNull();
        expect(contrato.hashtags).toEqual(["#examenes", "#colegio"]);
        expect(contrato.metadata.version).toBe(CONTRATO_VERSION);
        expect(contrato.metadata.fuente).toBe("gemini");
        expect(contrato.metadata.semana).toBe(4);
        expect(contrato.metadata.idioma).toBe("es-BO");
        expect(() => new Date(contrato.metadata.generadoEn).toISOString()).not.toThrow();
    });

    it("tolera vallas de codigo Markdown (```json) en la respuesta del modelo", async () => {
        const conVallas = "```json\n" + jsonGeminiValido() + "\n```";
        const { provider } = nuevoProveedor(conVallas);
        const contrato = await provider.generar(contextoEjemplo());
        expect(contrato.post.autorId).toBe("u1");
        expect(contrato.metadata.version).toBe(CONTRATO_VERSION);
    });

    it("rechaza con error descriptivo si la respuesta no es JSON parseable", async () => {
        const { provider } = nuevoProveedor("esto no es json");
        await expect(provider.generar(contextoEjemplo())).rejects.toThrow(
            /no es JSON parseable/i,
        );
    });

    it("rechaza con error descriptivo si el contrato resultante no es valido (post.autorId vacio)", async () => {
        const malo = JSON.stringify({
            post: { texto: "sin autor" },
            comments: [],
            image_description: "algo",
            hashtags: [],
        });
        const { provider } = nuevoProveedor(malo);
        await expect(provider.generar(contextoEjemplo())).rejects.toThrow(
            /Contrato_Normalizado valido/i,
        );
    });

    it("normaliza comments faltantes a lista vacia y entrega un contrato valido", async () => {
        const sinComments = JSON.stringify({
            post: { autorId: "u1", texto: "hola comunidad" },
            image_description: "patio escolar",
            hashtags: [],
        });
        const { provider } = nuevoProveedor(sinComments);
        const contrato = await provider.generar(contextoEjemplo());
        expect(contrato.comments).toEqual([]);
    });
});

describe("GeminiProvider + FabricaDataProvider (proveedor por defecto, Req. 4.3/4.4)", () => {
    it("la fabrica selecciona GeminiProvider cuando no se especifica proveedor", () => {
        const { provider } = nuevoProveedor(jsonGeminiValido());
        const fabrica = new FabricaDataProviderRegistro([provider]);
        expect(fabrica.crear()).toBe(provider);
        expect(fabrica.crear({}).nombre).toBe("gemini");
    });

    it("la fabrica selecciona GeminiProvider por nombre explicito", () => {
        const { provider } = nuevoProveedor(jsonGeminiValido());
        const fabrica = new FabricaDataProviderRegistro([provider]);
        expect(fabrica.crear({ proveedor: "gemini" })).toBe(provider);
    });
});
