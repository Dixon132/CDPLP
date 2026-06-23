/**
 * Proveedor de datos intercambiable (`IDataProvider`) de la `Capa_Adquisicion`.
 *
 * Interfaz comun que el `Modulo_Simulacion` usa para invocar al proveedor de
 * datos concreto sin acoplarse a una implementacion. La salida es siempre un
 * `Contrato_Normalizado` ya valido, anclado a la `Zona_Geografica` (Req. 4.1,
 * 4.6, 33.2). El `Modulo_Simulacion` invoca SOLO esta interfaz; nunca conoce el
 * LLM o la fuente de datos concreta (D1, Req. 4).
 *
 * Implementaciones contempladas detras de la misma interfaz:
 *  - `GeminiProvider` (Google Gemini API) -> por defecto en la nube (tarea 11.2).
 *  - `OllamaProvider` (local) -> alternativa preparada (tarea 11.3).
 *  - `MetaProvider`, `TwitterProvider`, `ScrapingProvider`, `HistoricalProvider`
 *    -> contemplados; se implementan en tareas posteriores.
 *
 * Esta tarea (11.1) define UNICAMENTE los tipos, la abstraccion de fabrica y los
 * tokens de inyeccion. Los proveedores concretos y el `Modulo_Simulacion`
 * (tareas 11.2, 11.3, 11.5) se desarrollan despues.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)".
 * _Requirements: 4.1, 4.2, 4.6_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";

/**
 * `Zona_Geografica` que ancla el contenido generado: coordenadas de la
 * `Institucion` mas el radio de analisis recibido del frontend (Req. 33.1).
 *
 * Declaracion local autonoma para mantener el `Modulo_Simulacion` desacoplado
 * de los demas modulos de dominio; el ensamblaje completo del contexto se
 * realiza en la tarea 22.x.
 */
export interface ZonaGeografica {
    /** Latitud de la `Institucion` (Req. 33.1). */
    latitud: number;
    /** Longitud de la `Institucion` (Req. 33.1). */
    longitud: number;
    /** Radio de analisis recibido del frontend, en metros (Req. 33.1). */
    radioMetros: number;
}

/**
 * Perfil conductual de un `Usuario_Sintetico` persistente que se reutiliza
 * entre semanas, no se regenera (Req. 10.3). Placeholder estructural ligero; la
 * representacion completa con historial se define en la tarea 14.2/15.x.
 */
export interface PerfilUsuario {
    id: string;
    /** Seudonimo hash una vez anonimizado (Req. 23.x); opcional en generacion. */
    seudonimo?: string;
    perfilConductual: string;
    frecuencia: number;
    estiloEscritura: string;
    intereses: string[];
    nivelParticipacion: string;
}

/**
 * Patron/tendencia recurrente detectado hasta la semana actual, anclado a su
 * `Zona_Geografica` (Req. 33.3, 33.4). Placeholder estructural ligero; lo
 * completa el `Detector_Patrones` en la tarea 14.3.
 */
export interface Patron {
    id: string;
    tipo: string;
    descripcion: string;
    zona: ZonaGeografica;
}

/**
 * Contexto longitudinal que el `Motor_Memoria_Contextual` construye y entrega
 * al `IDataProvider` para generar una `Semana_Simulada`.
 *
 * Se construye desde la `Memoria_Jerarquica` mas el contexto recuperado por
 * `Embeddings_Search` sobre la `Memoria_Semantica` (Req. 28.5, 36.3); al
 * proveedor NUNCA se le envian las publicaciones crudas de todas las semanas.
 * El ensamblaje completo del contexto es responsabilidad de la tarea 22.x; aqui
 * solo se define su forma estructural estable.
 */
export interface ContextoGeneracion {
    /** Escenario inmutable durante todo el analisis (Req. 5.3, 8.6, 29.4). */
    escenario: string;
    /**
     * Memoria resumida construida desde la `Memoria_Jerarquica`, NO desde las
     * semanas crudas (Req. 28.5). Prioriza niveles de mayor agregacion cuando
     * se supera el umbral de tokens del proveedor activo (Req. 28.6).
     */
    contextoMemoria: string;
    /**
     * Fragmentos recuperados por similitud vectorial mediante `Embeddings_Search`
     * sobre la `Memoria_Semantica` (Req. 36.3).
     */
    contextoSemantico: string[];
    /** Patrones/tendencias acumulados detectados hasta la semana actual. */
    patronesAcumulados: Patron[];
    /** Usuarios sinteticos que se reutilizan, no se regeneran (Req. 10.3). */
    usuariosSinteticos: PerfilUsuario[];
    /** Ancla el contenido a la zona (Req. 33.2). */
    zonaGeografica: ZonaGeografica;
    /** Numero de `Semana_Simulada` a generar. */
    semana: number;
    /** Identificadores de la `Comunidad_Digital` destino. */
    comunidad: { institucionId: string; analisisId: string };
}

/**
 * Nombres de los proveedores de datos contemplados por el diseno. Es un tipo
 * abierto (`| string`) para no acoplar la interfaz a un conjunto cerrado y
 * permitir proveedores futuros sin tocar el pipeline (D1, Req. 4.2).
 */
export type NombreProveedor =
    | "gemini"
    | "ollama"
    | "meta"
    | "twitter"
    | "scraping"
    | "historical"
    | (string & {});

/**
 * Proveedor por defecto cuando no se especifica configuracion: `GeminiProvider`
 * (Google Gemini API) en la nube (Req. 4.3, 4.4).
 */
export const PROVEEDOR_POR_DEFECTO: NombreProveedor = "openai";

/**
 * Interfaz comun de los proveedores de datos. El `Modulo_Simulacion` invoca
 * exclusivamente esta interfaz (Req. 4.1) y recibe siempre un
 * `Contrato_Normalizado` ya valido (Req. 4.6).
 */
export interface IDataProvider {
    /** Nombre del proveedor concreto (p. ej. "gemini", "ollama"). */
    readonly nombre: NombreProveedor;
    /** Limite de tokens de contexto del proveedor activo (Req. 5.2, 28.6). */
    readonly limiteTokens: number;
    /**
     * Genera y devuelve un `Contrato_Normalizado` ya valido, anclado a la zona
     * (Req. 4.6, 33.2).
     */
    generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado>;
}

/** Configuracion opcional para seleccionar un proveedor concreto. */
export interface ConfigFabricaDataProvider {
    /** Nombre del proveedor a crear; si se omite usa `PROVEEDOR_POR_DEFECTO`. */
    proveedor?: NombreProveedor;
}

/**
 * Fabrica que selecciona la implementacion de `IDataProvider` por configuracion.
 * Usa `GeminiProvider` por defecto si no se especifica; `OllamaProvider` local
 * como alternativa preparada; otros proveedores quedan contemplados (Req. 4.2,
 * 4.3, 4.4). Las implementaciones concretas se registran en tareas posteriores.
 */
export interface FabricaDataProvider {
    crear(config?: ConfigFabricaDataProvider): IDataProvider;
}

/**
 * Token DI del conjunto de implementaciones `IDataProvider` disponibles.
 * Las tareas 11.2 (`GeminiProvider`) y 11.3 (`OllamaProvider`) registran sus
 * proveedores en este token; la `FabricaDataProvider` selecciona entre ellos.
 */
export const DATA_PROVIDERS = Symbol("DATA_PROVIDERS");

/** Token DI de la `FabricaDataProvider` (interfaz estable). */
export const FABRICA_DATA_PROVIDER = Symbol("FABRICA_DATA_PROVIDER");

/**
 * Implementacion de `FabricaDataProvider` basada en un registro de proveedores.
 *
 * No implementa ningun proveedor concreto: recibe las implementaciones de
 * `IDataProvider` disponibles (registradas via DI por las tareas 11.2/11.3) y
 * selecciona la solicitada por configuracion, con `GeminiProvider` por defecto
 * (Req. 4.2, 4.3, 4.4). Mantiene el `Modulo_Simulacion` desacoplado del
 * proveedor concreto (D1, Req. 4.1).
 */
export class FabricaDataProviderRegistro implements FabricaDataProvider {
    private readonly porNombre: ReadonlyMap<string, IDataProvider>;

    constructor(
        proveedores: readonly IDataProvider[],
        private readonly porDefecto: NombreProveedor = PROVEEDOR_POR_DEFECTO,
    ) {
        const mapa = new Map<string, IDataProvider>();
        for (const proveedor of proveedores) {
            mapa.set(proveedor.nombre, proveedor);
        }
        this.porNombre = mapa;
    }

    /**
     * Crea/selecciona el `IDataProvider` configurado. Si no se especifica
     * proveedor, usa `GeminiProvider` (por defecto en la nube). Lanza un error
     * claro si el proveedor solicitado no esta registrado.
     */
    crear(config?: ConfigFabricaDataProvider): IDataProvider {
        const nombre = config?.proveedor ?? this.porDefecto;
        const proveedor = this.porNombre.get(nombre);
        if (!proveedor) {
            const disponibles = [...this.porNombre.keys()].join(", ") || "(ninguno)";
            throw new Error(
                `IDataProvider no registrado: "${nombre}". Proveedores disponibles: ${disponibles}.`,
            );
        }
        return proveedor;
    }
}
