/**
 * Pruebas unitarias del `OllamaProvider` (tarea 11.3).
 *
 * Verifican que el proveedor LOCAL:
 *  - invoca Ollama SOLO a traves del {@link OllamaClient} inyectable (mock, sin
 *    red real) y le pasa un prompt construido desde el `ContextoGeneracion`;
 *  - transforma el texto del LLM en un `Contrato_Normalizado` VALIDO usando el
 *    `Validador_Contrato` (Req. 4.6), tolerando vallas de codigo Markdown;
 *  - expone `nombre = "ollama"` y un `limiteTokens` numerico (Req. 4.2);
 *  - es seleccionado por la `FabricaDataProvider` por nombre explicito
 *    "ollama" y convive con `GeminiProvider` sin clobber (Req. 4.4);
 *  - rechaza con error descriptivo si la salida del LLM no es normalizable.
 *
 * _Requirements: 4.2, 4.4_
 */
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoService } from "../../contracts/validadorContrato";
import {
    FabricaDataProviderRegistro,
    type ContextoGeneracion,
    type IDataProvider,
} from "../dataProvider";
import {
    OllamaProvider,
    PROVEEDOR_OLLAMA,
    OLLAMA_LIMITE_TOKENS_DEFAULT,
} from "./ollamaProvider";
import type { OllamaClient, OllamaSolicitud } from "./ollamaClient";

/** Doble del `OllamaClient` que devuelve un texto fijo y registra la llamada. */
function clienteFalso(texto: string): { cliente: OllamaClient; generar: jest.Mock } {
    const generar = jest.fn(async (_s: OllamaSolicitud) => texto);
    return { cliente: { generar }, generar };
}

/** JSON valido que un Ollama bien comportado devolveria (sin metadata). */
function jsonOllamaValido(): string {
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
    provider: OllamaProvider;
    generar: jest.Mock;
} {
    const { cliente, generar } = clienteFalso(texto);
    const provider = new OllamaProvider(cliente, new ValidadorContratoService());
    return { provider, generar };
}

describe("OllamaProvider (tarea 11.3)", () => {
    it("expone nombre 'ollama' (alternativa local) y un limiteTokens numerico", () => {
        const { provider } = nuevoProveedor(jsonOllamaValido());
        expect(provider.nombre).toBe("ollama");
        expect(provider.nombre).toBe(PROVEEDOR_OLLAMA);
        expect(typeof provider.limiteTokens).toBe("number");
        expect(provider.limiteTokens).toBe(OLLAMA_LIMITE_TOKENS_DEFAULT);
    });

    it("invoca el OllamaClient con un prompt derivado del contexto y produce un Contrato_Normalizado valido", async () => {
        const { provider, generar } = nuevoProveedor(jsonOllamaValido());
        const ctx = contextoEjemplo(4);

        const contrato = await provider.generar(ctx);

        // Invoca el cliente exactamente una vez con un prompt no vacio.
        expect(generar).toHaveBeenCalledTimes(1);
        const solicitud = generar.mock.calls[0][0] as OllamaSolicitud;
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
        expect(contrato.metadata.fuente).toBe("ollama");
        expect(contrato.metadata.semana).toBe(4);
        expect(contrato.metadata.idioma).toBe("es-BO");
        expect(() => new Date(contrato.metadata.generadoEn).toISOString()).not.toThrow();
    });

    it("tolera vallas de codigo Markdown (```json) en la respuesta del modelo", async () => {
        const conVallas = "```json\n" + jsonOllamaValido() + "\n```";
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

describe("OllamaProvider + FabricaDataProvider (alternativa local, Req. 4.2/4.4)", () => {
    it("la fabrica selecciona OllamaProvider por nombre explicito 'ollama'", () => {
        const { provider } = nuevoProveedor(jsonOllamaValido());
        const fabrica = new FabricaDataProviderRegistro([provider]);
        expect(fabrica.crear({ proveedor: "ollama" })).toBe(provider);
    });

    it("convive con otros proveedores en la fabrica sin clobber y se resuelve por nombre", () => {
        const { provider: ollama } = nuevoProveedor(jsonOllamaValido());
        // Doble minimo de otro proveedor (p. ej. Gemini) para verificar convivencia.
        const otro: IDataProvider = {
            nombre: "gemini",
            limiteTokens: 30000,
            generar: jest.fn(),
        };
        const fabrica = new FabricaDataProviderRegistro([otro, ollama]);
        // Por defecto (sin especificar) selecciona "gemini"; por nombre, "ollama".
        expect(fabrica.crear().nombre).toBe("gemini");
        expect(fabrica.crear({ proveedor: "ollama" })).toBe(ollama);
    });
});
