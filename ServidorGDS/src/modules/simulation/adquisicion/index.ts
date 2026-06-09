/**
 * Frontera de la `Capa_Adquisicion` del `Modulo_Simulacion`: tipos del
 * proveedor de datos intercambiable (`IDataProvider`), el `ContextoGeneracion`,
 * la abstraccion de fabrica (`FabricaDataProvider`) y los tokens DI (tarea 11.1).
 *
 * Punto unico de importacion para los proveedores concretos (tareas 11.2/11.3)
 * y el `Modulo_Simulacion` (tarea 11.5).
 */
export {
    PROVEEDOR_POR_DEFECTO,
    DATA_PROVIDERS,
    FABRICA_DATA_PROVIDER,
    FabricaDataProviderRegistro,
} from "./dataProvider";
export type {
    ZonaGeografica,
    PerfilUsuario,
    Patron,
    ContextoGeneracion,
    NombreProveedor,
    IDataProvider,
    ConfigFabricaDataProvider,
    FabricaDataProvider,
} from "./dataProvider";

// Proveedor por defecto en la nube: GeminiProvider (Google Gemini API), tarea 11.2.
export {
    GeminiProvider,
    GeminiHttpClient,
    GEMINI_CLIENT,
    GEMINI_LIMITE_TOKENS_ENV,
    GEMINI_LIMITE_TOKENS_DEFAULT,
    GEMINI_API_KEY_ENV,
    GEMINI_MODEL_ENV,
    GEMINI_API_URL_ENV,
    GEMINI_MODEL_DEFAULT,
    GEMINI_API_URL_DEFAULT,
} from "./gemini";
export type { GeminiClient, GeminiSolicitud } from "./gemini";

// Alternativa LOCAL configurable: OllamaProvider (Ollama local), tarea 11.3.
// Detras de la MISMA interfaz IDataProvider; registrarlo no toca el pipeline.
export {
    OllamaProvider,
    OllamaHttpClient,
    OLLAMA_CLIENT,
    PROVEEDOR_OLLAMA,
    OLLAMA_LIMITE_TOKENS_ENV,
    OLLAMA_LIMITE_TOKENS_DEFAULT,
    OLLAMA_API_URL_ENV,
    OLLAMA_MODEL_ENV,
    OLLAMA_API_URL_DEFAULT,
    OLLAMA_MODEL_DEFAULT,
} from "./ollama";
export type { OllamaClient, OllamaSolicitud } from "./ollama";

// Reaccion de los Usuario_Sintetico a eventos del Escenario: usuarios afectados
// modifican su comportamiento coherente con perfil e historial, integrandose en
// el ContextoGeneracion de la siguiente generacion (tarea 11.6, Req. 10.4).
export {
    aplicarReaccionEscenario,
    eventoEsRelevante,
    factorIntensidad,
    integrarReaccionesEnContexto,
    reaccionarAEvento,
    reaccionarUsuario,
    receptividadPerfil,
    usuarioAfectado,
} from "./reaccionEscenario";
export type {
    EventoEscenario,
    IntensidadEvento,
    ReaccionUsuario,
    RegistroHistorialMinimo,
    UsuarioConHistorial,
} from "./reaccionEscenario";

// Capa de orquestacion de fallos del proveedor (tarea 11.4). Envuelve cualquier
// IDataProvider para registrar fallos en `gds_log_generacion`, intentar
// normalizacion de respaldo / reintento y marcar la generacion FALLIDA/
// reintentable sin corromper el historial (Req. 4.5, 4.7, 4.8, 27.1).
export {
    ManejadorFallosGeneracion,
    ErrorGeneracionReintentable,
    crearRegistradorPrisma,
    registradorConsola,
    clasificarFallo,
    MAX_INTENTOS_DEFAULT,
} from "./manejadorFallosGeneracion";
export type {
    NivelLog,
    CausaFallo,
    EntradaLogGeneracion,
    RegistradorGeneracion,
    ClienteLogGeneracion,
    NormalizadorRespaldo,
    OpcionesManejadorFallos,
} from "./manejadorFallosGeneracion";
