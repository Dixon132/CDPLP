/**
 * Cliente HTTP del proveedor de generacion **Google Gemini API** (tarea 11.2).
 *
 * La llamada HTTP a Gemini vive DETRAS de esta interfaz inyectable
 * ({@link GeminiClient}) para que el `GeminiProvider` quede desacoplado del
 * transporte y para que las pruebas unitarias puedan sustituirlo por un doble
 * sin tocar la red (NestJS DI). El `GeminiProvider` solo conoce esta interfaz;
 * nunca construye peticiones HTTP por su cuenta (D1, Req. 4.1).
 *
 * La implementacion por defecto ({@link GeminiHttpClient}) consume la API
 * `generateContent` de Google Gemini sobre HTTP (NestJS `HttpModule`/Axios),
 * con la API key, el modelo y la URL base **configurables** por entorno
 * (`ConfigService`): `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL`.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)".
 * _Requirements: 4.2, 4.3, 4.4_
 */
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

/** Parametros de una invocacion de generacion a Gemini. */
export interface GeminiSolicitud {
    /** Prompt completo que se envia al modelo (contexto longitudinal incluido). */
    readonly prompt: string;
    /**
     * Temperatura opcional de muestreo. El `GeminiProvider` la fija para obtener
     * salidas coherentes con el `Escenario`; si se omite, usa el valor por
     * defecto del modelo.
     */
    readonly temperatura?: number;
}

/**
 * Interfaz estable del cliente de Google Gemini. Devuelve el **texto crudo**
 * generado por el modelo (se espera un JSON del `Contrato_Normalizado`, sin
 * metadata), que el `GeminiProvider` transforma y valida.
 */
export interface GeminiClient {
    /** Invoca Gemini y devuelve el texto generado por el modelo. */
    generar(solicitud: GeminiSolicitud): Promise<string>;
}

/** Token DI de la interfaz {@link GeminiClient} (inyectable y sustituible en pruebas). */
export const GEMINI_CLIENT = Symbol("GEMINI_CLIENT");

/** Variable de entorno con la API key de Google Gemini. */
export const GEMINI_API_KEY_ENV = "GEMINI_API_KEY" as const;
/** Variable de entorno con el modelo Gemini a usar. */
export const GEMINI_MODEL_ENV = "GEMINI_MODEL" as const;
/** Variable de entorno con la URL base de la API de Gemini. */
export const GEMINI_API_URL_ENV = "GEMINI_API_URL" as const;

/** Modelo Gemini por defecto si no se configura `GEMINI_MODEL`. */
export const GEMINI_MODEL_DEFAULT = "gemini-1.5-flash" as const;
/** URL base por defecto de la API `generateContent` de Gemini. */
export const GEMINI_API_URL_DEFAULT =
    "https://generativelanguage.googleapis.com/v1beta" as const;

/** Forma (subconjunto) de la respuesta `generateContent` de Gemini. */
interface GeminiGenerateContentResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

/**
 * Implementacion por defecto del {@link GeminiClient} sobre la API HTTP
 * `generateContent` de Google Gemini. La API key, el modelo y la URL base se
 * resuelven por `ConfigService` (Req. 4.3, 4.4): cambiar el proveedor o sus
 * credenciales es configuracion, no codigo.
 */
@Injectable()
export class GeminiHttpClient implements GeminiClient {
    private readonly apiKey: string;
    private readonly modelo: string;
    private readonly baseUrl: string;

    constructor(
        private readonly http: HttpService,
        config: ConfigService,
    ) {
        this.apiKey = config.get<string>(GEMINI_API_KEY_ENV, "");
        this.modelo = config.get<string>(GEMINI_MODEL_ENV, GEMINI_MODEL_DEFAULT);
        this.baseUrl = config
            .get<string>(GEMINI_API_URL_ENV, GEMINI_API_URL_DEFAULT)
            .replace(/\/+$/, "");
    }

    async generar(solicitud: GeminiSolicitud): Promise<string> {
        if (!this.apiKey) {
            throw new Error(
                "GeminiProvider: falta GEMINI_API_KEY; configure la API key de Google Gemini.",
            );
        }
        const url = `${this.baseUrl}/models/${this.modelo}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        const body = {
            contents: [{ role: "user", parts: [{ text: solicitud.prompt }] }],
            generationConfig: {
                temperature: solicitud.temperatura ?? 0.9,
                responseMimeType: "application/json",
            },
        };
        const respuesta = await firstValueFrom(
            this.http.post<GeminiGenerateContentResponse>(url, body),
        );
        return extraerTexto(respuesta.data);
    }
}

/** Extrae el texto generado de la respuesta `generateContent` de Gemini. */
export function extraerTexto(data: GeminiGenerateContentResponse): string {
    const partes = data.candidates?.[0]?.content?.parts ?? [];
    const texto = partes
        .map((p) => p.text ?? "")
        .join("")
        .trim();
    if (!texto) {
        throw new Error("GeminiProvider: la respuesta de Gemini no contiene texto generado.");
    }
    return texto;
}
