/**
 * `Modulo_Simulacion` - orquestador de la `Capa_Adquisicion` (tarea 11.5).
 *
 * Coordina la generacion de una `Semana_Simulada` componiendo tres piezas YA
 * existentes sin acoplarse a ninguna de ellas:
 *
 *  1. **`Motor_Memoria_Contextual`** (modulo `timeline`, tarea 3.5): construye
 *     el contexto base de la semana N a partir de la `Memoria_Jerarquica`
 *     (escenario + memoria resumida), NO de las semanas crudas (Req. 28.5), y
 *     respeta el umbral de tokens del proveedor activo (Req. 28.6).
 *  2. **`FabricaDataProvider`** (tarea 11.1): selecciona el `IDataProvider`
 *     configurado (GeminiProvider en la nube por defecto; OllamaProvider local)
 *     detras de la MISMA interfaz, de modo que el `Modulo_Simulacion` invoca
 *     SOLO `IDataProvider` y nunca conoce el LLM concreto (D1, Req. 4.1, 4.2).
 *  3. **`ManejadorFallosGeneracion`** (tarea 11.4): envuelve el proveedor para
 *     registrar fallos, intentar normalizacion de respaldo / reintento y, si
 *     persiste, marcar la generacion FALLIDA/reintentable sin corromper el
 *     historial (Req. 4.5, 4.7, 4.8, 27.1).
 *
 * Ademas ENRIQUECE el contexto base con la informacion de orquestacion que el
 * `IDataProvider` necesita para generar contenido realista: usuarios sinteticos
 * persistentes (Req. 6.1, 10.3), patrones acumulados, contexto semantico y la
 * `Zona_Geografica` que ancla el contenido (Req. 33.2). Opcionalmente integra la
 * reaccion de los usuarios a un evento del `Escenario` reutilizando
 * `aplicarReaccionEscenario` (tarea 11.6, Req. 10.4).
 *
 * El diseno del prompt realista (espanol andino, variedad emocional, coherencia
 * con el `Escenario`) vive en `prompt/promptGeneracionRealista.ts` y lo consume
 * cada `IDataProvider`; el `Modulo_Simulacion` arma el contexto del que ese
 * prompt se deriva.
 *
 * La salida es SIEMPRE un `Contrato_Normalizado` valido (Req. 4.6), listo para
 * la frontera de la `Capa_Analisis`.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)" y
 * "Motor de Memoria Contextual".
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6_
 */
import type { ContratoNormalizado } from "./contracts/contratoNormalizado";
import type { ValidadorContrato } from "./contracts/validadorContrato";
import type {
    ConfigFabricaDataProvider,
    ContextoGeneracion,
    FabricaDataProvider,
    IDataProvider,
    Patron,
    PerfilUsuario,
    ZonaGeografica,
} from "./adquisicion/dataProvider";
import {
    ManejadorFallosGeneracion,
    type NormalizadorRespaldo,
    type RegistradorGeneracion,
} from "./adquisicion/manejadorFallosGeneracion";
import {
    aplicarReaccionEscenario,
    type EventoEscenario,
    type ReaccionUsuario,
    type UsuarioConHistorial,
} from "./adquisicion/reaccionEscenario";

/**
 * Puerto minimo del `Motor_Memoria_Contextual` que el `Modulo_Simulacion`
 * necesita: construir el contexto base de la semana N desde la
 * `Memoria_Jerarquica` bajo el umbral de tokens del proveedor activo
 * (Req. 28.5, 28.6).
 *
 * Se declara como puerto estructural (no como dependencia del tipo concreto)
 * para mantener la `Capa_Adquisicion` desacoplada del modulo `timeline` y
 * habilitar dobles deterministas en pruebas. La implementacion concreta es
 * `MotorMemoriaContextualService`.
 */
export interface ConstructorContextoMemoria {
    /**
     * Construye el contexto base (escenario + `contextoMemoria`) de la semana N
     * desde la `Memoria_Jerarquica` (Req. 28.5). Los campos de orquestacion los
     * completa el `Modulo_Simulacion`.
     */
    construirContexto(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
        limiteTokens: number,
    ): Promise<{
        escenario: string;
        contextoMemoria: string;
    }>;
}

/**
 * Solicitud de generacion de una `Semana_Simulada`. Reune el destino, el
 * escenario inmutable del `Analisis` y los datos de orquestacion (usuarios
 * persistentes, patrones, contexto semantico, zona) que el proveedor necesita.
 */
export interface SolicitudGeneracion {
    /** `Analisis` de origen. */
    analisisId: string;
    /** `Institucion` de la `Comunidad_Digital` destino. */
    institucionId: string;
    /** `Comunidad_Digital` destino (clave de la `Memoria_Jerarquica`). */
    comunidadId: string;
    /** Numero de `Semana_Simulada` a generar (>= 1). */
    semana: number;
    /**
     * `Escenario` activo e inmutable del `Analisis` (Req. 6.5, 8.6). Es
     * autoritativo: prevalece sobre el escenario derivado de la memoria, lo que
     * permite generar la semana 1 cuando aun no hay memoria consolidada.
     */
    escenario: string;
    /** Usuarios sinteticos persistentes que se reutilizan (Req. 6.1, 10.3). */
    usuariosSinteticos: PerfilUsuario[];
    /** `Zona_Geografica` que ancla el contenido (Req. 33.2). */
    zonaGeografica: ZonaGeografica;
    /** Patrones/tendencias acumulados detectados hasta la semana actual. */
    patronesAcumulados?: Patron[];
    /** Fragmentos recuperados por `Embeddings_Search` (Req. 36.3). */
    contextoSemantico?: string[];
    /** Seleccion del proveedor; por defecto GeminiProvider (Req. 4.3, 4.4). */
    proveedor?: ConfigFabricaDataProvider;
    /**
     * Evento del `Escenario` que, si se proporciona junto con
     * `usuariosConHistorial`, dispara la reaccion de los usuarios afectados
     * antes de generar (Req. 10.4).
     */
    evento?: EventoEscenario;
    /**
     * Usuarios persistentes con su historial, requeridos para calcular la
     * reaccion al `evento`. Si se omite, no se aplica reaccion.
     */
    usuariosConHistorial?: UsuarioConHistorial[];
}

/** Configuracion del `Modulo_Simulacion` (manejo de fallos del proveedor). */
export interface OpcionesModuloSimulacion {
    /** Destino de los logs de fallo de generacion (`gds_log_generacion`). */
    registrador?: RegistradorGeneracion;
    /** Intento opcional de normalizacion de respaldo ante datos malformados. */
    normalizadorRespaldo?: NormalizadorRespaldo;
    /** Numero maximo de intentos totales del proveedor (incluye el primero). */
    maxIntentos?: number;
}

/** Resultado de una generacion orquestada por el `Modulo_Simulacion`. */
export interface ResultadoGeneracion {
    /** `Contrato_Normalizado` valido producido (Req. 4.6). */
    contrato: ContratoNormalizado;
    /** Nombre del proveedor que genero el contenido. */
    proveedor: string;
    /** Contexto final con el que se invoco al proveedor (auditable/trazable). */
    contexto: ContextoGeneracion;
    /** Reacciones aplicadas al evento del `Escenario`, si las hubo (Req. 10.4). */
    reacciones: ReaccionUsuario[];
}

/**
 * Orquestador del `Modulo_Simulacion`. Es agnostico del framework: recibe sus
 * dependencias por constructor, de modo que puede instanciarse en NestJS (DI) o
 * en pruebas con dobles deterministas, sin red ni base de datos.
 */
export class ModuloSimulacion {
    private readonly registrador?: RegistradorGeneracion;
    private readonly normalizadorRespaldo?: NormalizadorRespaldo;
    private readonly maxIntentos?: number;

    constructor(
        private readonly fabrica: FabricaDataProvider,
        private readonly memoria: ConstructorContextoMemoria,
        private readonly validador: ValidadorContrato,
        opciones: OpcionesModuloSimulacion = {},
    ) {
        this.registrador = opciones.registrador;
        this.normalizadorRespaldo = opciones.normalizadorRespaldo;
        this.maxIntentos = opciones.maxIntentos;
    }

    /**
     * Genera una `Semana_Simulada` y devuelve un `Contrato_Normalizado` valido.
     *
     * Flujo de orquestacion:
     *  1. Selecciona el `IDataProvider` configurado (Gemini por defecto).
     *  2. Lo envuelve con el `ManejadorFallosGeneracion` (registro + reintento +
     *     normalizacion de respaldo, sin corromper el historial).
     *  3. Construye el contexto base desde el `Motor_Memoria_Contextual` (memoria
     *     jerarquica, no semanas crudas) respetando el `limiteTokens` del
     *     proveedor activo.
     *  4. Enriquece el contexto con escenario inmutable, usuarios persistentes,
     *     patrones, contexto semantico y `Zona_Geografica`.
     *  5. Integra (opcional) la reaccion de los usuarios a un evento del
     *     `Escenario` (Req. 10.4).
     *  6. Invoca al proveedor y devuelve el contrato valido (Req. 4.6).
     */
    async generarSemana(solicitud: SolicitudGeneracion): Promise<ResultadoGeneracion> {
        if (!Number.isInteger(solicitud.semana) || solicitud.semana < 1) {
            throw new Error(
                `Modulo_Simulacion: numero de semana invalido (${solicitud.semana}); debe ser un entero >= 1.`,
            );
        }

        // 1-2. Proveedor seleccionado y envuelto con manejo robusto de fallos.
        const proveedorBase = this.fabrica.crear(solicitud.proveedor);
        const proveedor = this.envolverConManejoFallos(proveedorBase);

        // 3. Contexto base desde la Memoria_Jerarquica (no semanas crudas).
        const base = await this.memoria.construirContexto(
            solicitud.analisisId,
            solicitud.comunidadId,
            solicitud.semana,
            proveedorBase.limiteTokens,
        );

        // 4. Enriquecer el contexto con la informacion de orquestacion.
        let contexto = this.ensamblarContexto(solicitud, base);

        // 5. Reaccion de los usuarios al evento del Escenario (opcional).
        let reacciones: ReaccionUsuario[] = [];
        if (solicitud.evento && solicitud.usuariosConHistorial?.length) {
            const aplicado = aplicarReaccionEscenario(
                contexto,
                solicitud.usuariosConHistorial,
                solicitud.evento,
            );
            contexto = aplicado.contexto;
            reacciones = aplicado.reacciones;
        }

        // 6. Generar; la salida es siempre un Contrato_Normalizado valido.
        const contrato = await proveedor.generar(contexto);

        return { contrato, proveedor: proveedorBase.nombre, contexto, reacciones };
    }

    /**
     * Envuelve el proveedor con el `ManejadorFallosGeneracion` (tarea 11.4),
     * inyectando el `Validador_Contrato` para aceptar la normalizacion de
     * respaldo solo si produce un contrato conforme.
     */
    private envolverConManejoFallos(proveedor: IDataProvider): IDataProvider {
        return new ManejadorFallosGeneracion(proveedor, {
            validador: this.validador,
            ...(this.registrador ? { registrador: this.registrador } : {}),
            ...(this.normalizadorRespaldo
                ? { normalizadorRespaldo: this.normalizadorRespaldo }
                : {}),
            ...(this.maxIntentos !== undefined ? { maxIntentos: this.maxIntentos } : {}),
        });
    }

    /**
     * Ensambla el `ContextoGeneracion` que recibe el proveedor a partir del
     * contexto base de la memoria y la informacion de orquestacion de la
     * solicitud. El `Escenario` de la solicitud es autoritativo (inmutable del
     * `Analisis`, Req. 6.5, 8.6); se conserva la `contextoMemoria` del motor.
     */
    private ensamblarContexto(
        solicitud: SolicitudGeneracion,
        base: { escenario: string; contextoMemoria: string },
    ): ContextoGeneracion {
        const escenario = solicitud.escenario.trim().length > 0 ? solicitud.escenario : base.escenario;

        return {
            escenario,
            contextoMemoria: base.contextoMemoria,
            contextoSemantico: solicitud.contextoSemantico ?? [],
            patronesAcumulados: solicitud.patronesAcumulados ?? [],
            usuariosSinteticos: solicitud.usuariosSinteticos,
            zonaGeografica: solicitud.zonaGeografica,
            semana: solicitud.semana,
            comunidad: {
                institucionId: solicitud.institucionId,
                analisisId: solicitud.analisisId,
            },
        };
    }
}

/** Token DI del `Modulo_Simulacion` (interfaz estable de la `Capa_Adquisicion`). */
export const MODULO_SIMULACION = Symbol("MODULO_SIMULACION");
