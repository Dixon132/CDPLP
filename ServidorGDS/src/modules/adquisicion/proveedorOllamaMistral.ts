/**
 * `ProveedorOllamaMistral` - implementacion de `ProveedorGeneracion` sobre
 * Ollama (HTTP local, modelo Mistral por defecto).
 *
 * Invoca el endpoint local de Ollama (`POST {baseUrl}/api/generate`), transforma
 * la salida del LLM a un `Contrato_Normalizado` ya valido (Req. 4.6) y lo
 * devuelve listo para la `Capa_Analisis`. El manejo de fallos sigue los
 * Req. 4.5, 4.7, 4.8 y 27.1:
 *
 *  - **No-respuesta / error del proveedor:** se captura, se REGISTRA en
 *    `gds_log_generacion` (registrador inyectable) y se reintenta.
 *  - **Datos malformados:** primero se intenta validar la salida tal cual; si no
 *    conforma, se aplica una **normalizacion de respaldo** que reconstruye el
 *    contrato a partir de lo recuperable; si tampoco conforma, se reintenta.
 *  - **Persistencia del fallo:** si tras agotar los reintentos no se obtiene un
 *    contrato valido, se registra el fallo final y se lanza un
 *    `ErrorGeneracionReintentable` (la generacion queda marcada como
 *    `FALLIDA`/reintentable) **sin** devolver ni persistir datos corruptos, de
 *    modo que el historial acumulado nunca se corrompe (Req. 4.5, 27.1).
 *
 * Inyectables para que las pruebas corran SIN red ni base de datos:
 *  - `clienteHttp`: cliente HTTP minimo (por defecto envuelve el `fetch` global).
 *  - `registrador`: destino de los logs de fallo (por defecto, consola; en
 *    produccion se puede inyectar uno que escriba en `gds_log_generacion`).
 *  - `ahora`: reloj inyectable para `metadata.generadoEn` determinista.
 *
 * Diseno: design.md > "Proveedor de generacion (intercambiable)".
 * _Requirements: 4.2, 4.5, 4.6, 4.7, 4.8, 27.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../contracts/contratoNormalizado";
import type { ValidadorContrato } from "../contracts/validadorContrato";
import { validadorContrato as validadorPorDefecto } from "../contracts/validadorContrato";
import type { ContextoGeneracion, ProveedorGeneracion } from "./proveedorGeneracion";

// ---------------------------------------------------------------------------
// Cliente HTTP minimo inyectable (desacoplado del `fetch`/DOM concreto).
// ---------------------------------------------------------------------------

/** Respuesta HTTP minima que necesita el proveedor (subconjunto de `Response`). */
export interface RespuestaHttp {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
}

/** Peticion HTTP minima (subconjunto compatible con `RequestInit`). */
export interface PeticionHttp {
    method: string;
    headers: Record<string, string>;
    body: string;
}

/**
 * Cliente HTTP inyectable. Su firma es estructuralmente compatible con el
 * `fetch` global, pero se mantiene minima para poder inyectar dobles en las
 * pruebas sin red.
 */
export type ClienteHttp = (url: string, peticion: PeticionHttp) => Promise<RespuestaHttp>;

/** Cliente HTTP por defecto: envuelve el `fetch` global del runtime. */
export const clienteHttpFetch: ClienteHttp = async (url, peticion) => {
    const respuesta = await fetch(url, {
        method: peticion.method,
        headers: peticion.headers,
        body: peticion.body,
    });
    return {
        ok: respuesta.ok,
        status: respuesta.status,
        json: () => respuesta.json() as Promise<unknown>,
        text: () => respuesta.text(),
    };
};

// ---------------------------------------------------------------------------
// Registrador de fallos (gds_log_generacion) inyectable y opcional.
// ---------------------------------------------------------------------------

/** Niveles de severidad registrados en `gds_log_generacion`. */
export type NivelLog = "ERROR" | "WARN" | "INFO";

/** Entrada de log de generacion. */
export interface EntradaLogGeneracion {
    nivel: NivelLog;
    mensaje: string;
    detalle?: unknown;
}

/**
 * Destino de los logs de fallo de generacion. Es inyectable y opcional para que
 * las pruebas unitarias corran sin base de datos. En produccion se inyecta un
 * registrador que escribe en `gds_log_generacion` (ver `crearRegistradorPrisma`).
 */
export type RegistradorGeneracion = (entrada: EntradaLogGeneracion) => Promise<void> | void;

/** Porcion minima del cliente Prisma para escribir en `gds_log_generacion`. */
export interface ClienteLogGeneracion {
    logGeneracion: {
        create(args: {
            data: { cicloId: string; nivel: string; mensaje: string; detalle?: unknown };
        }): Promise<unknown>;
    };
}

/**
 * Construye un `RegistradorGeneracion` que persiste cada fallo en
 * `gds_log_generacion` asociado a un `Ciclo_Semanal` (Req. 4.7, 27.1). Si la
 * escritura falla, degrada a consola para no enmascarar el fallo original.
 */
export function crearRegistradorPrisma(
    cliente: ClienteLogGeneracion,
    cicloId: string,
): RegistradorGeneracion {
    return async (entrada) => {
        try {
            await cliente.logGeneracion.create({
                data: {
                    cicloId,
                    nivel: entrada.nivel,
                    mensaje: entrada.mensaje,
                    detalle:
                        entrada.detalle === undefined
                            ? undefined
                            : (JSON.parse(JSON.stringify(entrada.detalle)) as unknown),
                },
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("No se pudo persistir el log de generacion", error, entrada);
        }
    };
}

/** Registrador por defecto: escribe a consola (sin base de datos). */
export const registradorConsola: RegistradorGeneracion = (entrada) => {
    // eslint-disable-next-line no-console
    console.error(`[gds_log_generacion:${entrada.nivel}] ${entrada.mensaje}`, entrada.detalle ?? "");
};

// ---------------------------------------------------------------------------
// Error reintentable: la generacion queda marcada FALLIDA sin corromper datos.
// ---------------------------------------------------------------------------

/**
 * Error lanzado cuando, tras agotar los reintentos, no se obtiene un contrato
 * valido. Marca la generacion como FALLIDA/reintentable (Req. 4.5, 27.1). El
 * proveedor nunca devuelve datos corruptos: ante fallo persistente lanza este
 * error para que el `Controlador_Ciclo` lo aisle y reintente.
 */
export class ErrorGeneracionReintentable extends Error {
    /** Indica que la generacion puede reintentarse de forma segura (Req. 27.1). */
    readonly reintentable = true;
    /** Estado de la generacion afectada (Req. 4.5). */
    readonly estado = "FALLIDA" as const;
    /** Numero de intentos realizados antes de fallar. */
    readonly intentos: number;

    constructor(mensaje: string, intentos: number, causa?: unknown) {
        super(mensaje);
        this.name = "ErrorGeneracionReintentable";
        this.intentos = intentos;
        if (causa !== undefined) {
            (this as { cause?: unknown }).cause = causa;
        }
    }
}

// ---------------------------------------------------------------------------
// Configuracion del proveedor (URL base / modelo / limites) configurable.
// ---------------------------------------------------------------------------

/** Configuracion del `ProveedorOllamaMistral`. Todos los campos son opcionales. */
export interface ConfiguracionOllama {
    /** URL base del servidor Ollama local. */
    baseUrl?: string;
    /** Modelo a invocar (Mistral por defecto). */
    modelo?: string;
    /** Limite de tokens de contexto del proveedor (Req. 5.2, 28.6). */
    limiteTokens?: number;
    /** Numero maximo de intentos totales (incluye el primero). */
    maxIntentos?: number;
    /** Tiempo de espera por solicitud en ms (informativo para la peticion). */
    timeoutMs?: number;
}

/** Valores por defecto, configurables por entorno (`OLLAMA_*`). */
export function configuracionDesdeEntorno(
    sobrescritura: ConfiguracionOllama = {},
): Required<ConfiguracionOllama> {
    const entorno = process.env;
    return {
        baseUrl: sobrescritura.baseUrl ?? entorno.OLLAMA_BASE_URL ?? "http://localhost:11434",
        modelo: sobrescritura.modelo ?? entorno.OLLAMA_MODEL ?? "mistral",
        limiteTokens:
            sobrescritura.limiteTokens ?? numeroEntorno(entorno.OLLAMA_LIMITE_TOKENS, 8192),
        maxIntentos: sobrescritura.maxIntentos ?? numeroEntorno(entorno.OLLAMA_MAX_INTENTOS, 3),
        timeoutMs: sobrescritura.timeoutMs ?? numeroEntorno(entorno.OLLAMA_TIMEOUT_MS, 60_000),
    };
}

function numeroEntorno(valor: string | undefined, porDefecto: number): number {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

// ---------------------------------------------------------------------------
// Helpers puros de extraccion y normalizacion de respaldo.
// ---------------------------------------------------------------------------

function esObjeto(valor: unknown): valor is Record<string, unknown> {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function comoStringNoVacio(valor: unknown): string | undefined {
    if (typeof valor === "string") {
        const limpio = valor.trim();
        return limpio.length > 0 ? valor : undefined;
    }
    return undefined;
}

function comoArrayString(valor: unknown): string[] {
    if (Array.isArray(valor)) {
        return valor.filter((v): v is string => typeof v === "string");
    }
    if (typeof valor === "string" && valor.trim().length > 0) {
        return [valor];
    }
    return [];
}

/**
 * Extrae el candidato a contrato del cuerpo de la respuesta de Ollama. El
 * endpoint `/api/generate` devuelve `{ response: string|object, ... }`; cuando
 * `response` es texto se intenta parsear como JSON y, si no es JSON, se trata el
 * texto crudo como el cuerpo de una publicacion (normalizable de respaldo).
 */
export function extraerCandidato(cuerpo: unknown): unknown {
    if (esObjeto(cuerpo) && "response" in cuerpo) {
        const resp = (cuerpo as Record<string, unknown>).response;
        if (typeof resp === "string") {
            try {
                return JSON.parse(resp);
            } catch {
                return { texto: resp };
            }
        }
        return resp;
    }
    return cuerpo;
}

/**
 * Normalizacion de respaldo (Req. 4.8): reconstruye un `Contrato_Normalizado` a
 * partir de lo recuperable del candidato, anclando metadata (version, semana,
 * idioma) y zona. Devuelve `null` cuando los datos no son normalizables: el
 * minimo imprescindible es un texto de publicacion recuperable.
 */
export function normalizarRespaldo(
    candidato: unknown,
    ctx: ContextoGeneracion,
    ahora: Date,
): ContratoNormalizado | null {
    const raiz = esObjeto(candidato) ? candidato : {};
    const postObj = esObjeto(raiz.post) ? raiz.post : {};

    // El texto de la publicacion es el minimo imprescindible: sin el, el
    // contenido no es normalizable (Req. 4.8 -> reintento / fallo).
    const textoPost =
        comoStringNoVacio(postObj.texto) ??
        comoStringNoVacio(raiz.texto) ??
        comoStringNoVacio(candidato);
    if (textoPost === undefined) {
        return null;
    }

    const autorPorDefecto =
        ctx.usuariosSinteticos[0]?.seudonimo ?? ctx.usuariosSinteticos[0]?.id ?? "anonimo";
    const autorId = comoStringNoVacio(postObj.autorId) ?? autorPorDefecto;

    const comentariosCrudos = Array.isArray(raiz.comments) ? raiz.comments : [];
    const comments = comentariosCrudos.map((c) => {
        const obj = esObjeto(c) ? c : {};
        const enRespuestaA = comoStringNoVacio(obj.enRespuestaA);
        return {
            autorId: comoStringNoVacio(obj.autorId) ?? autorPorDefecto,
            texto: typeof obj.texto === "string" ? obj.texto : "",
            enRespuestaA: enRespuestaA ?? null,
        };
    });

    const contrato: ContratoNormalizado = {
        post: { autorId, texto: textoPost },
        comments,
        image_description: comoStringNoVacio(raiz.image_description) ?? "",
        hashtags: comoArrayString(raiz.hashtags),
        metadata: {
            version: CONTRATO_VERSION,
            // Etiqueta opaca: NO revela "simulado/real" a la Capa_Analisis (Req. 2.2).
            fuente: "ollama-mistral",
            generadoEn: ahora.toISOString(),
            semana: ctx.semana,
            idioma: "es-BO",
        },
    };
    return contrato;
}

/** Construye el prompt de generacion a partir del contexto longitudinal. */
export function construirPrompt(ctx: ContextoGeneracion): string {
    const usuarios = ctx.usuariosSinteticos
        .map((u) => `- ${u.seudonimo ?? u.id}: ${u.perfilConductual} (${u.estiloEscritura})`)
        .join("\n");
    const patrones = ctx.patronesAcumulados.map((p) => `- ${p.tipo}: ${p.descripcion}`).join("\n");
    return [
        "Eres un generador de ecosistemas digitales sinteticos en espanol andino (Bolivia).",
        `Escenario (inmutable): ${ctx.escenario}`,
        `Semana a generar: ${ctx.semana}`,
        `Zona geografica: lat ${ctx.zonaGeografica.latitud}, lon ${ctx.zonaGeografica.longitud}, radio ${ctx.zonaGeografica.radioMetros} m`,
        "Memoria contextual (resumida):",
        ctx.contextoMemoria,
        usuarios.length > 0 ? `Usuarios sinteticos persistentes:\n${usuarios}` : "",
        patrones.length > 0 ? `Patrones acumulados:\n${patrones}` : "",
        "Devuelve UNICAMENTE un JSON con la forma:",
        '{ "post": { "autorId": string, "texto": string }, "comments": [{ "autorId": string, "texto": string, "enRespuestaA": string|null }], "image_description": string, "hashtags": string[] }',
    ]
        .filter((linea) => linea.length > 0)
        .join("\n\n");
}

// ---------------------------------------------------------------------------
// ProveedorOllamaMistral.
// ---------------------------------------------------------------------------

/** Dependencias inyectables del proveedor (todas con valores por defecto). */
export interface DependenciasOllama {
    clienteHttp?: ClienteHttp;
    validador?: ValidadorContrato;
    registrador?: RegistradorGeneracion;
    /** Reloj inyectable para `metadata.generadoEn` determinista en pruebas. */
    ahora?: () => Date;
}

/**
 * Implementacion de `ProveedorGeneracion` sobre Ollama/Mistral (HTTP local).
 */
export class ProveedorOllamaMistral implements ProveedorGeneracion {
    readonly nombre = "ollama" as const;
    readonly limiteTokens: number;

    private readonly config: Required<ConfiguracionOllama>;
    private readonly clienteHttp: ClienteHttp;
    private readonly validador: ValidadorContrato;
    private readonly registrador: RegistradorGeneracion;
    private readonly ahora: () => Date;

    constructor(config: ConfiguracionOllama = {}, deps: DependenciasOllama = {}) {
        this.config = configuracionDesdeEntorno(config);
        this.limiteTokens = this.config.limiteTokens;
        this.clienteHttp = deps.clienteHttp ?? clienteHttpFetch;
        this.validador = deps.validador ?? validadorPorDefecto;
        this.registrador = deps.registrador ?? registradorConsola;
        this.ahora = deps.ahora ?? (() => new Date());
    }

    /**
     * Genera y devuelve un `Contrato_Normalizado` valido (Req. 4.6). Ante
     * no-respuesta, error o datos malformados, registra el fallo e intenta
     * normalizacion de respaldo / reintento (Req. 4.5, 4.7, 4.8); si persiste,
     * lanza `ErrorGeneracionReintentable` sin corromper el historial (Req. 27.1).
     */
    async generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        const prompt = construirPrompt(ctx);
        let ultimoFallo: unknown;

        for (let intento = 1; intento <= this.config.maxIntentos; intento += 1) {
            try {
                const cuerpo = await this.invocar(prompt);
                const candidato = extraerCandidato(cuerpo);

                // 1) Validacion directa: si el LLM ya produjo un contrato conforme,
                //    se devuelve tal cual para preservar fidelidad (Req. 4.6).
                const directo = this.validador.validar(candidato);
                if (directo.ok && directo.contrato) {
                    return directo.contrato;
                }

                // 2) Normalizacion de respaldo de datos malformados (Req. 4.8).
                const respaldo = normalizarRespaldo(candidato, ctx, this.ahora());
                if (respaldo) {
                    const validado = this.validador.validar(respaldo);
                    if (validado.ok && validado.contrato) {
                        return validado.contrato;
                    }
                    ultimoFallo = { tipo: "respaldo-invalido", errores: validado.errores };
                    await this.registrar({
                        nivel: "WARN",
                        mensaje: `Normalizacion de respaldo invalida (intento ${intento}/${this.config.maxIntentos})`,
                        detalle: { semana: ctx.semana, comunidad: ctx.comunidad, errores: validado.errores },
                    });
                } else {
                    ultimoFallo = { tipo: "no-normalizable", errores: directo.errores };
                    await this.registrar({
                        nivel: "WARN",
                        mensaje: `Datos malformados no normalizables (intento ${intento}/${this.config.maxIntentos})`,
                        detalle: { semana: ctx.semana, comunidad: ctx.comunidad, errores: directo.errores },
                    });
                }
            } catch (error) {
                // No-respuesta / error del proveedor (Req. 4.5, 4.7, 27.1).
                ultimoFallo = error;
                await this.registrar({
                    nivel: "ERROR",
                    mensaje: `Fallo del proveedor Ollama (intento ${intento}/${this.config.maxIntentos})`,
                    detalle: {
                        semana: ctx.semana,
                        comunidad: ctx.comunidad,
                        error: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        }

        // Reintentos agotados: marcar FALLIDA/reintentable sin corromper datos.
        await this.registrar({
            nivel: "ERROR",
            mensaje: "Generacion marcada FALLIDA/reintentable tras agotar reintentos",
            detalle: {
                semana: ctx.semana,
                comunidad: ctx.comunidad,
                intentos: this.config.maxIntentos,
            },
        });
        throw new ErrorGeneracionReintentable(
            `Generacion fallida tras ${this.config.maxIntentos} intentos para la semana ${ctx.semana}`,
            this.config.maxIntentos,
            ultimoFallo,
        );
    }

    /** Invoca el endpoint local de Ollama y devuelve el cuerpo JSON parseado. */
    private async invocar(prompt: string): Promise<unknown> {
        const url = `${this.config.baseUrl.replace(/\/+$/, "")}/api/generate`;
        const respuesta = await this.clienteHttp(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: this.config.modelo,
                prompt,
                stream: false,
                format: "json",
            }),
        });
        if (!respuesta.ok) {
            throw new Error(`Ollama respondio con estado HTTP ${respuesta.status}`);
        }
        return respuesta.json();
    }

    /** Registra un fallo sin propagar errores del propio registrador. */
    private async registrar(entrada: EntradaLogGeneracion): Promise<void> {
        try {
            await this.registrador(entrada);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Fallo el registrador de generacion", error);
        }
    }
}
