/**
 * `ManejadorFallosGeneracion` - capa de orquestacion de fallos del proveedor de
 * datos del `Modulo_Simulacion` (tarea 11.4).
 *
 * Envuelve cualquier `IDataProvider` (Gemini/Ollama/futuros) detras de la MISMA
 * interfaz `IDataProvider` (patron decorador): el `Modulo_Simulacion` lo invoca
 * igual que a un proveedor concreto, sin acoplarse al manejo de fallos. NO
 * modifica los proveedores concretos (tareas 11.2/11.3): solo orquesta su
 * invocacion y el registro de fallos.
 *
 * Manejo de fallos (Req. 4.5, 4.7, 4.8, 27.1; design.md > "Errores de la Capa
 * de Adquisicion y `IDataProvider`"):
 *
 *  - **No-respuesta / error / cuota / timeout del proveedor:** se captura, se
 *    clasifica con un codigo de causa y se REGISTRA en `gds_log_generacion`
 *    (registrador inyectable), y se REINTENTA hasta `maxIntentos` (Req. 4.5,
 *    4.7, 27.1).
 *  - **Datos malformados / contrato invalido:** el proveedor concreto ya rechaza
 *    con un error descriptivo; antes de reintentar se intenta una
 *    **normalizacion de respaldo** opcional (`normalizadorRespaldo`) que, si
 *    produce un `Contrato_Normalizado` valido, evita marcar la generacion como
 *    fallida (Req. 4.8). Si no, se reintenta.
 *  - **Persistencia del fallo:** si tras agotar los reintentos no se obtiene un
 *    contrato valido, se registra el fallo final y se lanza un
 *    `ErrorGeneracionReintentable` (la generacion queda marcada
 *    `FALLIDA`/reintentable) **sin** devolver ni persistir datos corruptos, de
 *    modo que el historial acumulado NUNCA se corrompe (Req. 4.5, 27.1).
 *
 * Se registran **TODOS** los fallos de generacion con su codigo de causa
 * independientemente del origen (Req. 4.7).
 *
 * Inyectables para que las pruebas corran SIN red ni base de datos:
 *  - `registrador`: destino de los logs de fallo (por defecto, consola; en
 *    produccion se inyecta uno que escribe en `gds_log_generacion`).
 *  - `normalizadorRespaldo`: intento opcional de reconstruccion del contrato.
 *  - `maxIntentos`: numero maximo de intentos totales (incluye el primero).
 *
 * Diseno: design.md > "Errores de la Capa de Adquisicion y `IDataProvider`".
 * _Requirements: 4.5, 4.7, 4.8, 27.1_
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type { ValidadorContrato } from "../contracts/validadorContrato";
import type { ContextoGeneracion, IDataProvider, NombreProveedor } from "./dataProvider";

// ---------------------------------------------------------------------------
// Registrador de fallos (gds_log_generacion) inyectable y opcional.
// ---------------------------------------------------------------------------

/** Niveles de severidad registrados en `gds_log_generacion`. */
export type NivelLog = "ERROR" | "WARN" | "INFO";

/**
 * Codigo de causa del fallo de generacion para diagnostico (Req. 4.7). Permite
 * distinguir el origen del fallo al consultar `gds_log_generacion`.
 */
export type CausaFallo =
    | "NO_RESPUESTA" // el proveedor no responde / timeout / red caida
    | "ERROR_PROVEEDOR" // el proveedor responde con error / cuota agotada
    | "DATOS_MALFORMADOS" // salida del LLM no parseable / no normalizable
    | "CONTRATO_INVALIDO" // candidato no conforme al `Contrato_Normalizado`
    | "RESPALDO_INVALIDO" // la normalizacion de respaldo no produjo un contrato valido
    | "REINTENTOS_AGOTADOS"; // fallo persistente tras agotar los reintentos

/** Entrada de log de generacion que se persiste en `gds_log_generacion`. */
export interface EntradaLogGeneracion {
    nivel: NivelLog;
    /** Codigo de causa para diagnostico (Req. 4.7). */
    causa: CausaFallo;
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
 * `gds_log_generacion` asociado a un `Ciclo_Semanal` (Req. 4.7, 27.1). El codigo
 * de causa se preserva dentro de `detalle.causa` para diagnostico. Si la
 * escritura falla, degrada a consola para no enmascarar el fallo original (el
 * historial acumulado nunca se corrompe por un fallo de logging).
 */
export function crearRegistradorPrisma(
    cliente: ClienteLogGeneracion,
    cicloId: string,
): RegistradorGeneracion {
    return async (entrada) => {
        try {
            const detalleBase =
                entrada.detalle === undefined
                    ? {}
                    : (JSON.parse(JSON.stringify(entrada.detalle)) as Record<string, unknown>);
            await cliente.logGeneracion.create({
                data: {
                    cicloId,
                    nivel: entrada.nivel,
                    mensaje: entrada.mensaje,
                    detalle: { causa: entrada.causa, ...detalleBase },
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
    console.error(
        `[gds_log_generacion:${entrada.nivel}:${entrada.causa}] ${entrada.mensaje}`,
        entrada.detalle ?? "",
    );
};

// ---------------------------------------------------------------------------
// Error reintentable: la generacion queda marcada FALLIDA sin corromper datos.
// ---------------------------------------------------------------------------

/**
 * Error lanzado cuando, tras agotar los reintentos, no se obtiene un contrato
 * valido. Marca la generacion como `FALLIDA`/reintentable (Req. 4.5, 27.1). El
 * manejador nunca devuelve datos corruptos: ante fallo persistente lanza este
 * error para que el `Controlador_Ciclo` lo aisle y reintente sin corromper el
 * historial acumulado.
 */
export class ErrorGeneracionReintentable extends Error {
    /** Indica que la generacion puede reintentarse de forma segura (Req. 27.1). */
    readonly reintentable = true;
    /** Estado de la generacion afectada (Req. 4.5). */
    readonly estado = "FALLIDA" as const;
    /** Numero de intentos realizados antes de fallar. */
    readonly intentos: number;
    /** Codigo de la ultima causa observada, para diagnostico (Req. 4.7). */
    readonly causa: CausaFallo;

    constructor(mensaje: string, intentos: number, causa: CausaFallo, origen?: unknown) {
        super(mensaje);
        this.name = "ErrorGeneracionReintentable";
        this.intentos = intentos;
        this.causa = causa;
        if (origen !== undefined) {
            (this as { cause?: unknown }).cause = origen;
        }
    }
}

// ---------------------------------------------------------------------------
// Clasificacion del fallo a partir del error propagado por el proveedor.
// ---------------------------------------------------------------------------

/**
 * Clasifica el error propagado por un `IDataProvider` en un `CausaFallo`. Los
 * proveedores concretos (Gemini/Ollama) rechazan con mensajes descriptivos
 * (p. ej. "no es JSON parseable", "no es un Contrato_Normalizado valido"); el
 * resto se trata como no-respuesta o error del proveedor segun el indicio.
 */
export function clasificarFallo(error: unknown): CausaFallo {
    const mensaje = (error instanceof Error ? error.message : String(error)).toLowerCase();

    // El contrato invalido se reconoce primero: su mensaje contiene
    // "Contrato_Normalizado", que de otro modo activaria la regla de malformados.
    if (/contrato|conforme|campo (faltante|requerido)/.test(mensaje)) {
        return "CONTRATO_INVALIDO";
    }
    if (/json|parse|malform|no normaliz/.test(mensaje)) {
        return "DATOS_MALFORMADOS";
    }
    if (/timeout|timed out|no responde|econnrefused|enotfound|etimedout|network|red|abort/.test(mensaje)) {
        return "NO_RESPUESTA";
    }
    return "ERROR_PROVEEDOR";
}

// ---------------------------------------------------------------------------
// ManejadorFallosGeneracion.
// ---------------------------------------------------------------------------

/**
 * Funcion de normalizacion de respaldo opcional (Req. 4.8): intenta reconstruir
 * un `Contrato_Normalizado` candidato a partir del contexto y del error
 * observado cuando el proveedor produjo datos malformados o un contrato
 * invalido. Devuelve `null` cuando los datos no son normalizables. El resultado
 * se valida con el `Validador_Contrato` antes de aceptarse, de modo que nunca se
 * acepta un contrato no conforme.
 */
export type NormalizadorRespaldo = (
    ctx: ContextoGeneracion,
    error: unknown,
) => unknown | null | Promise<unknown | null>;

/** Dependencias y configuracion del manejador (todas con valores por defecto). */
export interface OpcionesManejadorFallos {
    /** Destino de los logs de fallo (por defecto, consola). */
    registrador?: RegistradorGeneracion;
    /**
     * Validador del `Contrato_Normalizado` usado para aceptar la salida de la
     * normalizacion de respaldo. Requerido solo si se usa `normalizadorRespaldo`.
     */
    validador?: ValidadorContrato;
    /** Intento opcional de normalizacion de respaldo ante datos malformados. */
    normalizadorRespaldo?: NormalizadorRespaldo;
    /** Numero maximo de intentos totales (incluye el primero). Por defecto 3. */
    maxIntentos?: number;
}

/** Numero de intentos por defecto (incluye el primero). */
export const MAX_INTENTOS_DEFAULT = 3;

/**
 * Decorador de `IDataProvider` que orquesta el manejo de fallos del proveedor.
 *
 * Implementa la MISMA interfaz `IDataProvider`, de modo que es sustituible por
 * el proveedor concreto sin tocar el `Modulo_Simulacion` (D1, Req. 4.1). Reusa
 * `nombre` y `limiteTokens` del proveedor envuelto.
 */
export class ManejadorFallosGeneracion implements IDataProvider {
    readonly nombre: NombreProveedor;
    readonly limiteTokens: number;

    private readonly registrador: RegistradorGeneracion;
    private readonly validador?: ValidadorContrato;
    private readonly normalizadorRespaldo?: NormalizadorRespaldo;
    private readonly maxIntentos: number;

    constructor(
        private readonly proveedor: IDataProvider,
        opciones: OpcionesManejadorFallos = {},
    ) {
        this.nombre = proveedor.nombre;
        this.limiteTokens = proveedor.limiteTokens;
        this.registrador = opciones.registrador ?? registradorConsola;
        this.validador = opciones.validador;
        this.normalizadorRespaldo = opciones.normalizadorRespaldo;
        const max = opciones.maxIntentos ?? MAX_INTENTOS_DEFAULT;
        this.maxIntentos = Number.isInteger(max) && max > 0 ? max : MAX_INTENTOS_DEFAULT;
    }

    /**
     * Genera y devuelve un `Contrato_Normalizado` valido (Req. 4.6). Ante
     * no-respuesta, error o datos malformados, registra el fallo e intenta
     * normalizacion de respaldo / reintento (Req. 4.5, 4.7, 4.8); si persiste,
     * lanza `ErrorGeneracionReintentable` sin corromper el historial (Req. 27.1).
     */
    async generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        let ultimoError: unknown;
        let ultimaCausa: CausaFallo = "ERROR_PROVEEDOR";

        for (let intento = 1; intento <= this.maxIntentos; intento += 1) {
            try {
                // El proveedor concreto devuelve SOLO un Contrato_Normalizado ya
                // valido (Req. 4.6); si no puede, rechaza con error descriptivo.
                return await this.proveedor.generar(ctx);
            } catch (error) {
                ultimoError = error;
                ultimaCausa = clasificarFallo(error);

                await this.registrar({
                    nivel: "ERROR",
                    causa: ultimaCausa,
                    mensaje: `Fallo de generacion del proveedor "${this.nombre}" (intento ${intento}/${this.maxIntentos})`,
                    detalle: this.detalleFallo(ctx, error),
                });

                // Normalizacion de respaldo ante datos malformados / contrato
                // invalido (Req. 4.8): intentar reconstruir antes de reintentar.
                if (ultimaCausa === "DATOS_MALFORMADOS" || ultimaCausa === "CONTRATO_INVALIDO") {
                    const respaldo = await this.intentarRespaldo(ctx, error, intento);
                    if (respaldo) {
                        return respaldo;
                    }
                }
            }
        }

        // Reintentos agotados: marcar FALLIDA/reintentable sin corromper datos
        // (Req. 4.5, 27.1). Nunca se devuelve ni persiste contenido parcial.
        await this.registrar({
            nivel: "ERROR",
            causa: "REINTENTOS_AGOTADOS",
            mensaje: `Generacion marcada FALLIDA/reintentable tras agotar ${this.maxIntentos} intentos`,
            detalle: this.detalleFallo(ctx, ultimoError),
        });
        throw new ErrorGeneracionReintentable(
            `Generacion fallida del proveedor "${this.nombre}" tras ${this.maxIntentos} intentos para la semana ${ctx.semana}`,
            this.maxIntentos,
            ultimaCausa,
            ultimoError,
        );
    }

    /**
     * Intenta la normalizacion de respaldo y valida su salida (Req. 4.8). Si no
     * hay normalizador, no produce nada o el resultado no es conforme, registra
     * el motivo y devuelve `null` para que el flujo reintente o marque fallida.
     */
    private async intentarRespaldo(
        ctx: ContextoGeneracion,
        error: unknown,
        intento: number,
    ): Promise<ContratoNormalizado | null> {
        if (!this.normalizadorRespaldo) {
            return null;
        }
        const candidato = await this.normalizadorRespaldo(ctx, error);
        if (candidato === null || candidato === undefined) {
            await this.registrar({
                nivel: "WARN",
                causa: "DATOS_MALFORMADOS",
                mensaje: `Datos no normalizables por respaldo (intento ${intento}/${this.maxIntentos})`,
                detalle: { semana: ctx.semana, comunidad: ctx.comunidad },
            });
            return null;
        }

        // Sin validador no se puede garantizar un contrato conforme: se rechaza
        // para no corromper el historial (Req. 4.6, 27.1).
        if (!this.validador) {
            await this.registrar({
                nivel: "WARN",
                causa: "RESPALDO_INVALIDO",
                mensaje: "Normalizacion de respaldo sin validador disponible; se descarta",
                detalle: { semana: ctx.semana, comunidad: ctx.comunidad },
            });
            return null;
        }

        const validado = this.validador.validar(candidato);
        if (validado.ok && validado.contrato) {
            await this.registrar({
                nivel: "INFO",
                causa: "DATOS_MALFORMADOS",
                mensaje: `Normalizacion de respaldo aplicada con exito (intento ${intento}/${this.maxIntentos})`,
                detalle: { semana: ctx.semana, comunidad: ctx.comunidad },
            });
            return validado.contrato;
        }

        await this.registrar({
            nivel: "WARN",
            causa: "RESPALDO_INVALIDO",
            mensaje: `Normalizacion de respaldo invalida (intento ${intento}/${this.maxIntentos})`,
            detalle: { semana: ctx.semana, comunidad: ctx.comunidad, errores: validado.errores },
        });
        return null;
    }

    /** Construye el detalle estructurado de un fallo para `gds_log_generacion`. */
    private detalleFallo(ctx: ContextoGeneracion, error: unknown): Record<string, unknown> {
        return {
            proveedor: this.nombre,
            semana: ctx.semana,
            comunidad: ctx.comunidad,
            error: error instanceof Error ? error.message : String(error),
        };
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
