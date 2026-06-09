/**
 * Pruebas unitarias del `OllamaHttpClient` (tarea 11.3).
 *
 * Verifican que el cliente:
 *  - construye el REQUEST de `generate` (URL `/api/generate`, cuerpo con
 *    `model`/`prompt`/`stream:false`/`format:json`/`options.temperature`)
 *    usando `ConfigService` para modelo/URL (configurables, Req. 4.4);
 *  - extrae el texto generado de la respuesta de Ollama;
 *  - usa modelo y URL por defecto cuando no se configuran;
 *  - falla con error claro si la respuesta no trae texto.
 *
 * Se mockea `HttpService`/Axios: NO hay red real.
 *
 * _Requirements: 4.2, 4.4_
 */
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import type { AxiosResponse } from "axios";

import {
    OllamaHttpClient,
    OLLAMA_API_URL_ENV,
    OLLAMA_MODEL_ENV,
    OLLAMA_API_URL_DEFAULT,
    OLLAMA_MODEL_DEFAULT,
    extraerTexto,
} from "./ollamaClient";

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

/** `ConfigService` falso que resuelve las claves de Ollama al mapa dado. */
function fakeConfig(valores: Record<string, string>): ConfigService {
    return {
        get: (key: string, def?: string) => valores[key] ?? def,
    } as unknown as ConfigService;
}

const respuestaOllama = {
    response: '{"post":{"autorId":"u1","texto":"hola"}}',
};

describe("OllamaHttpClient (tarea 11.3)", () => {
    it("construye la URL /api/generate y envia el cuerpo con modelo, prompt y opciones", async () => {
        const { http, post } = fakeHttp(respuestaOllama);
        const client = new OllamaHttpClient(
            http,
            fakeConfig({
                [OLLAMA_API_URL_ENV]: "http://ollama.local:11434",
                [OLLAMA_MODEL_ENV]: "mistral",
            }),
        );

        const texto = await client.generar({ prompt: "genera algo", temperatura: 0.5 });

        expect(post).toHaveBeenCalledTimes(1);
        const [url, body] = post.mock.calls[0];
        expect(url).toBe("http://ollama.local:11434/api/generate");
        expect(body).toEqual({
            model: "mistral",
            prompt: "genera algo",
            stream: false,
            format: "json",
            options: { temperature: 0.5 },
        });
        expect(texto).toBe('{"post":{"autorId":"u1","texto":"hola"}}');
    });

    it("usa modelo y URL por defecto cuando no se configuran", async () => {
        const { http, post } = fakeHttp(respuestaOllama);
        const client = new OllamaHttpClient(http, fakeConfig({}));
        await client.generar({ prompt: "x" });
        const [url, body] = post.mock.calls[0];
        expect(url).toBe(`${OLLAMA_API_URL_DEFAULT}/api/generate`);
        expect((body as { model: string }).model).toBe(OLLAMA_MODEL_DEFAULT);
    });

    it("normaliza la URL base con barra final", async () => {
        const { http, post } = fakeHttp(respuestaOllama);
        const client = new OllamaHttpClient(
            http,
            fakeConfig({ [OLLAMA_API_URL_ENV]: "http://ollama.local:11434/" }),
        );
        await client.generar({ prompt: "x" });
        const [url] = post.mock.calls[0];
        expect(url).toBe("http://ollama.local:11434/api/generate");
    });
});

describe("extraerTexto (Ollama)", () => {
    it("devuelve el campo response recortado", () => {
        expect(extraerTexto({ response: "  hola  " })).toBe("hola");
    });

    it("lanza si la respuesta no contiene texto generado", () => {
        expect(() => extraerTexto({})).toThrow(/no contiene texto/i);
        expect(() => extraerTexto({ response: "   " })).toThrow(/no contiene texto/i);
    });
});
