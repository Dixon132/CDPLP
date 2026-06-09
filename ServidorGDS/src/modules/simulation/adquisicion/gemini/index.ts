/**
 * Frontera del `GeminiProvider` (Google Gemini API), proveedor de generacion
 * por defecto en la nube de la `Capa_Adquisicion` (tarea 11.2).
 *
 * Reexporta el proveedor, su cliente HTTP inyectable y los tokens/constantes
 * de configuracion para que el `SimulationModule` los registre en
 * `DATA_PROVIDERS` sin acoplarse a la implementacion concreta.
 */
export {
    GeminiProvider,
    construirPrompt,
    parsearJson,
    GEMINI_LIMITE_TOKENS_ENV,
    GEMINI_LIMITE_TOKENS_DEFAULT,
} from "./geminiProvider";
export {
    GEMINI_CLIENT,
    GeminiHttpClient,
    extraerTexto,
    GEMINI_API_KEY_ENV,
    GEMINI_MODEL_ENV,
    GEMINI_API_URL_ENV,
    GEMINI_MODEL_DEFAULT,
    GEMINI_API_URL_DEFAULT,
} from "./geminiClient";
export type { GeminiClient, GeminiSolicitud } from "./geminiClient";
