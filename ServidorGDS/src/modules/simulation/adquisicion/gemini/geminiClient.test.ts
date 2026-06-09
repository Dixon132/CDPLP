/**
 * Pruebas unitarias del `GeminiHttpClient` (tarea 11.2).
 *
 * Verifican que el cliente:
 *  - construye el REQUEST de `generateContent` (URL con modelo + key, cuerpo
 *    `contents[]`) usando `ConfigService` para API key/modelo/URL;
 *  - extrae el texto generado de la respuesta de Gemini;
 *  - falla con error claro si falta la API key o si la respuesta no trae texto.
 *
 * Se mockea `HttpService`/Axios: NO hay red real.
 *
 * _Requirements: 4.2, 4.3, 4.4_
 */
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import type { AxiosResponse } from "axios";

import {
    GeminiHttpClient,
    GEMINI_API_KEY_ENV,
    GEMINI_MODEL_ENV,
    GEMINI_API_URL_ENV,
    GEMINI_MODEL_DEFAULT,
    GEMINI_API_URL_DEFAULT,
    extraerTexto,
} from "./geminiClient";

function axiosOk<T>(data: T): AxiosResponse<T> {
    return {
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} as never },
    } as AxiosResponse<T>;
}

function fakeHttp(body: unknown): { http: HttpService; post: jest.Mock } {
    const post = jest.fn((_url: string, _b: unknown) => of(axiosOk(body)));
    return { http: { post } as unknown as HttpService, post };
}

/** `ConfigService` falso que resuelve las claves de Gemini al mapa dado. */
function fakeConfig(valores: Record<string, string>): ConfigService {
    return {
        get: (key: string, def?: string) => valores[key] ?? def,
    } as unknown as ConfigService;
}

const respuestaGemini = {
    candidates: [
        { content: { parts: [{ text: '{"post":{"autorId":"u1","texto":"hola"}}' }] } },
    ],
};

describe("GeminiHttpClient (tarea 11.2)", () => {
    it("construye la URL con modelo + API key y envia contents[] con el prompt", async () => {
        const { http, post } = fakeHttp(respuestaGemini);
        const client = new GeminiHttpClient(
            http,
            fakeConfig({
                [GEMINI_API_KEY_ENV]: "secreto-123",
                [GEMINI_MODEL_ENV]: "gemini-1.5-pro",
                [GEMINI_API_URL_ENV]: "https://gen.example/v1beta",
            }),
        );

        const texto = await client.generar({ prompt: "genera algo", temperatura: 0.5 });

        expect(post).toHaveBeenCalledTimes(1);
        const [url, body] = post.mock.calls[0];
        expect(url).toBe(
            "https://gen.example/v1beta/models/gemini-1.5-pro:generateContent?key=secreto-123",
        );
        expect(body).toEqual({
            contents: [{ role: "user", parts: [{ text: "genera algo" }] }],
            generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
        });
        expect(texto).toBe('{"post":{"autorId":"u1","texto":"hola"}}');
    });

    it("usa modelo y URL por defecto cuando no se configuran", async () => {
        const { http, post } = fakeHttp(respuestaGemini);
        const client = new GeminiHttpClient(
            http,
            fakeConfig({ [GEMINI_API_KEY_ENV]: "k" }),
        );
        await client.generar({ prompt: "x" });
        const [url] = post.mock.calls[0];
        expect(url).toBe(
            `${GEMINI_API_URL_DEFAULT}/models/${GEMINI_MODEL_DEFAULT}:generateContent?key=k`,
        );
    });

    it("lanza un error claro si falta la API key", async () => {
        const { http } = fakeHttp(respuestaGemini);
        const client = new GeminiHttpClient(http, fakeConfig({}));
        await expect(client.generar({ prompt: "x" })).rejects.toThrow(/GEMINI_API_KEY/);
    });
});

describe("extraerTexto", () => {
    it("concatena las partes de texto del primer candidato", () => {
        expect(
            extraerTexto({
                candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }],
            }),
        ).toBe("ab");
    });

    it("lanza si la respuesta no contiene texto generado", () => {
        expect(() => extraerTexto({ candidates: [] })).toThrow(/no contiene texto/i);
    });
});
