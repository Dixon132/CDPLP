/**
 * Modulo `adquisicion` - Modulo_Simulacion, ProveedorGeneracion, Motor_Memoria_Contextual.
 * Andamiaje: las implementaciones concretas se desarrollan en las tareas 5 y 6.
 */
export const MODULE_NAME = "adquisicion" as const;

// Interfaz comun del proveedor de generacion intercambiable (tarea 5.1).
export type {
    ZonaGeografica,
    ContextoGeneracion,
    ProveedorGeneracion,
    FabricaProveedor,
} from "./proveedorGeneracion";

// Tipos compartidos ligeros referenciados por ContextoGeneracion (tarea 5.1).
export type { PerfilUsuario, Patron } from "./tiposCompartidos";

// ProveedorOllamaMistral (HTTP local) con manejo de fallos (tarea 5.2,
// Req. 4.2, 4.5, 4.6, 4.7, 4.8, 27.1).
export {
    ProveedorOllamaMistral,
    ErrorGeneracionReintentable,
    clienteHttpFetch,
    crearRegistradorPrisma,
    registradorConsola,
    configuracionDesdeEntorno,
    construirPrompt,
    extraerCandidato,
    normalizarRespaldo,
} from "./proveedorOllamaMistral";
export type {
    ClienteHttp,
    ClienteLogGeneracion,
    ConfiguracionOllama,
    DependenciasOllama,
    EntradaLogGeneracion,
    NivelLog,
    PeticionHttp,
    RegistradorGeneracion,
    RespuestaHttp,
} from "./proveedorOllamaMistral";

// FabricaProveedor: selecciona el proveedor por configuracion; Ollama/Mistral
// por defecto; registrar Gemini u otros sin cambios de codigo (tarea 5.3,
// Req. 4.3, 4.4).
export {
    FabricaProveedorRegistro,
    ErrorProveedorDesconocido,
    PROVEEDOR_POR_DEFECTO,
    fabricaProveedor,
} from "./fabricaProveedor";
export type {
    ConstructorProveedor,
    OpcionesFabricaProveedor,
} from "./fabricaProveedor";

// Usuario_Sintetico persistente: representacion, reutilizacion entre semanas y
// acumulacion monotonica del historial (tarea 15.1, Req. 10.1, 10.2, 10.3, 10.5).
export {
    ServicioUsuariosSinteticosPrisma,
    servicioUsuariosSinteticos,
    agregarPatronesInteraccion,
    mapHistorialRowToRegistro,
    mapUsuarioRowToDominio,
    parsearActividad,
    parsearIntereses,
    serializarActividad,
    serializarIntereses,
} from "./usuarioSintetico";
export type {
    ClienteUsuarios,
    PatronInteraccion,
    RegistroActividad,
    SemillaUsuarioSintetico,
    ServicioUsuariosSinteticos,
    UsuarioSinteticoPersistente,
} from "./usuarioSintetico";

// Derivacion de la Zona_Geografica (coordenadas de la Institucion + radio de
// analisis) y su anclaje en el ContextoGeneracion (tarea 15.2, Req. 33.1, 33.2).
export {
    derivarZonaGeografica,
    derivarZonaDeInstitucion,
    anclarZonaEnContexto,
    anclarZonaDerivada,
} from "./zonaGeografica";
export type { CoordenadasInstitucion } from "./zonaGeografica";
