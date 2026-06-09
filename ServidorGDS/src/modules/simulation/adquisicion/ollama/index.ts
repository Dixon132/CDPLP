/**
 * Frontera del `OllamaProvider` (Ollama local), proveedor de generacion LOCAL
 * alternativo y configurable de la `Capa_Adquisicion` (tarea 11.3).
 *
 * Reexporta el proveedor, su cliente HTTP inyectable y los tokens/constantes
 * de configuracion para que el `SimulationModule` los registre en
 * `DATA_PROVIDERS` sin acoplarse a la implementacion concreta ni tocar el
 * pipeline.
 */
export {
    OllamaProvider,
    construirPrompt,
    parsearJson,
    PROVEEDOR_OLLAMA,
    OLLAMA_LIMITE_TOKENS_ENV,
    OLLAMA_LIMITE_TOKENS_DEFAULT,
} from "./ollamaProvider";
export {
    OLLAMA_CLIENT,
    OllamaHttpClient,
    extraerTexto,
    OLLAMA_API_URL_ENV,
    OLLAMA_MODEL_ENV,
    OLLAMA_API_URL_DEFAULT,
    OLLAMA_MODEL_DEFAULT,
} from "./ollamaClient";
export type { OllamaClient, OllamaSolicitud } from "./ollamaClient";
