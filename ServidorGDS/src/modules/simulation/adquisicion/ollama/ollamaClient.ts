/**
 * Cliente HTTP del proveedor de generacion **local Ollama** (tarea 11.3).
 *
 * La llamada HTTP al endpoint local de Ollama vive DETRAS de esta interfaz
 * inyectable ({@link OllamaClient}) para que el `OllamaProvider` quede
 * desacoplado del transporte y para que las pruebas unitarias puedan
 * sustituirlo por un doble sin tocar la red (NestJS DI). El `OllamaProvider`
 * solo conoce esta interfaz; nunca construye peticiones HTTP por su cuenta
 * (D1, Req. 4.1).
 *
 * La implementacion por defecto ({@link OllamaHttpClient}) consume la API
 * `generate` de un servidor Ollama local sobre HTTP (NestJS `HttpModule`/Axios),
 * con el modelo y la URL base **configurables** por entorno (`ConfigService`):
 * `OLLAMA_API_URL`, `OLLAMA_MODEL`. Es la alternativa LOCAL detras de la misma
 * interfaz `IDataProvider` (D1, Req. 4.2): registrarla no toca el pipeline.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)".
 * _Requirements: 4.2, 4.4_
 */
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

/** Parametros de una invocacion de generacion a Ollama. */
export interface OllamaSolicitud {
    /** Prompt completo que se envia al modelo (contexto longitudinal incluido). */
    readonly prompt: string;
    /**
     * Temperatura opcional de muestreo. El `OllamaProvider` la fija para obtener
     * salidas coherentes con el `Escenario`; si se omite, usa el valor por
     * defecto del modelo.
     */
    readonly temperatura?: number;
}

/**
 * Interfaz estable del cliente de Ollama. Devuelve el **texto crudo** generado
 * por el modelo (se espera un JSON del `Contrato_Normalizado`, sin metadata),
 * que el `OllamaProvider` transforma y valida.
 */
export interface OllamaClient {
    /** Invoca Ollama y devuelve el texto generado por el modelo. */
    generar(solicitud: OllamaSolicitud): Promise<string>;
}

/** Token DI de la interfaz {@link OllamaClient} (inyectable y sustituible en pruebas). */
export const OLLAMA_CLIENT = Symbol("OLLAMA_CLIENT");

/** Variable de entorno con la URL base del servidor Ollama local. */
export const OLLAMA_API_URL_ENV = "OLLAMA_API_URL" as const;
/** Variable de entorno con el modelo Ollama a usar. */
export const OLLAMA_MODEL_ENV = "OLLAMA_MODEL" as const;

/** URL base por defecto del servidor Ollama local. */
export const OLLAMA_API_URL_DEFAULT = "http://localhost:11434" as const;
/** Modelo Ollama por defecto si no se configura `OLLAMA_MODEL`. */
export const OLLAMA_MODEL_DEFAULT = "llama3.1" as const;

/** Forma (subconjunto) de la respuesta `generate` de Ollama. */
interface OllamaGenerateResponse {
    response?: string;
}

/**
 * Implementacion por defecto del {@link OllamaClient} sobre la API HTTP
 * `generate` de un servidor Ollama local. El modelo y la URL base se resuelven
 * por `ConfigService` (Req. 4.4): cambiar el proveedor o su configuracion es
 * configuracion, no codigo.
 */
@Injectable()
export class OllamaHttpClient implements OllamaClient {
    private readonly modelo: string;
    private readonly baseUrl: string;

    constructor(
        private readonly http: HttpService,
        config: ConfigService,
    ) {
        this.modelo = config.get<string>(OLLAMA_MODEL_ENV, OLLAMA_MODEL_DEFAULT);
        this.baseUrl = config
            .get<string>(OLLAMA_API_URL_ENV, OLLAMA_API_URL_DEFAULT)
            .replace(/\/+$/, "");
    }

    async generar(solicitud: OllamaSolicitud): Promise<string> {
        const url = `${this.baseUrl}/api/generate`;
        const body = {
            model: this.modelo,
            prompt: solicitud.prompt,
            stream: false,
            format: "json",
            options: {
                temperature: solicitud.temperatura ?? 0.9,
            },
        };
        const respuesta = await firstValueFrom(
            this.http.post<OllamaGenerateResponse>(url, body),
        );
        return extraerTexto(respuesta.data);
    }
}

/** Extrae el texto generado de la respuesta `generate` de Ollama. */
export function extraerTexto(data: OllamaGenerateResponse): string {
    const texto = (data.response ?? "").trim();
    if (!texto) {
        throw new Error(
            "OllamaProvider: la respuesta de Ollama no contiene texto generado.",
        );
    }
    return texto;
}
