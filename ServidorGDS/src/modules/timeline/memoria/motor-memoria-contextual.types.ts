/**
 * `Motor_Memoria_Contextual` - contrato y tipos de la memoria jerarquica de
 * 5 niveles (semanal/mensual/trimestral/semestral/global), migrado al modulo de
 * dominio `timeline` (tarea 3.5).
 *
 * El motor es una memoria contextual jerarquica INDEPENDIENTE del historial
 * bruto: el historial COMPLETO se conserva en la BD (tablas `gds_*`) y estos
 * niveles solo generan resumenes inteligentes que alimentan al
 * `Proveedor_Generacion` sin reprocesar semanas crudas ni exceder el umbral de
 * tokens del proveedor activo (Req. 28.5, 28.6).
 *
 * Nota de migracion base: el `ContextoGeneracion` se declara localmente para
 * mantener el modulo `timeline` autonomo y desacoplado del `Modulo_Simulacion`
 * (que se migra en paralelo). La integracion del contexto con el proveedor de
 * generacion se completa en la tarea 22.x; la forma del contrato se preserva
 * identica a la del trabajo previo.
 *
 * Diseno: design.md > "Motor de Memoria Contextual (memoria jerarquica)".
 *
 * _Requirements: 5.1, 5.2, 28.1, 28.5, 28.6, 28.7, 28.8, 28.9_
 */

/**
 * `Zona_Geografica` que ancla el contenido simulado: coordenadas de la
 * `Institucion` mas el radio de analisis recibido del frontend (Req. 33.1).
 */
export interface ZonaGeografica {
    latitud: number;
    longitud: number;
    radioMetros: number;
}

/**
 * Contexto longitudinal que el `Motor_Memoria_Contextual` construye y entrega
 * al `Proveedor_Generacion` para generar una `Semana_Simulada`.
 *
 * Declaracion local autonoma (ver nota de migracion). El `Modulo_Simulacion`
 * completa los campos de orquestacion (`patronesAcumulados`,
 * `usuariosSinteticos`, `zonaGeografica`) sobre el contexto base que produce el
 * motor.
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
     * Fragmentos de contexto recuperados por similitud vectorial
     * (`Embeddings_Search`) sobre la `Memoria_Semantica`, que COMPLEMENTAN la
     * `Memoria_Jerarquica` (Req. 28.5, 36.3). Si el `Embeddings_Search` no esta
     * disponible, se DEGRADA de forma segura a la `Memoria_Jerarquica`
     * (arreglo vacio) sin bloquear el ciclo (Req. 28.5, 35.3).
     */
    contextoSemantico: string[];
    /** Patrones/tendencias acumulados detectados hasta la semana actual. */
    patronesAcumulados: unknown[];
    /** Usuarios sinteticos que se reutilizan, no se regeneran (Req. 10.3). */
    usuariosSinteticos: unknown[];
    /** Ancla el contenido a la zona (Req. 33.2). */
    zonaGeografica: ZonaGeografica;
    /** Numero de `Semana_Simulada` a generar. */
    semana: number;
    /** Identificadores de la `Comunidad_Digital` destino. */
    comunidad: { institucionId: string; analisisId: string };
}

/**
 * Los cinco niveles de la `Memoria_Jerarquica`, de menor a mayor agregacion.
 *
 * `SEMESTRAL` es un nivel intermedio que este diseno anade, extendiendo la
 * jerarquia de cuatro niveles del Req. 28 y alineado con el horizonte semestral
 * del Req. 19.
 */
export enum NivelMemoria {
    SEMANAL = 'SEMANAL',
    MENSUAL = 'MENSUAL',
    TRIMESTRAL = 'TRIMESTRAL',
    SEMESTRAL = 'SEMESTRAL',
    GLOBAL = 'GLOBAL',
}

/**
 * Orden canonico de los niveles de menor a mayor agregacion. La compactacion
 * bajo umbral de tokens recorta de menor a mayor detalle (descarta primero
 * `SEMANAL`, luego `MENSUAL`, etc.) conservando los de mayor agregacion
 * (Req. 28.6).
 */
export const ORDEN_NIVELES: readonly NivelMemoria[] = [
    NivelMemoria.SEMANAL,
    NivelMemoria.MENSUAL,
    NivelMemoria.TRIMESTRAL,
    NivelMemoria.SEMESTRAL,
    NivelMemoria.GLOBAL,
] as const;

/**
 * Una entrada de memoria consolidada en un nivel concreto de la jerarquia.
 *
 * Modela el dominio de los modelos `gds_memoria_*`. El `Escenario` original se
 * preserva identico en todos los niveles (Req. 28.7) y la referencia a
 * `Institucion`/`Comunidad_Digital` mantiene la integridad referencial
 * (Req. 28.9).
 */
export interface MemoriaNivel {
    /** Nivel de agregacion al que pertenece esta memoria. */
    nivel: NivelMemoria;
    /** `Analisis` de origen (integridad referencial, Req. 28.9). */
    analisisId: string;
    /** `Institucion` referenciada a traves de la `Comunidad_Digital` (Req. 28.9). */
    institucionId: string;
    /** `Comunidad_Digital` de origen (vacio en `GLOBAL`, no esta acotado a comunidad). */
    comunidadId: string;
    /** Periodo del nivel: n.o de semana/mes/trimestre/semestre, o 0 para `GLOBAL`. */
    periodo: number;
    /** `Escenario` original preservado en todo nivel (Req. 28.7). */
    escenario: string;
    /** Resumen estructurado/consolidado de ese nivel. */
    resumen: string;
    /** Eventos relevantes que se inyectan al contexto del LLM. */
    eventosRelevantes: string[];
    /** Cambios importantes detectados en el periodo. */
    cambiosImportantes: string[];
    /** Anomalias detectadas en el periodo. */
    anomalias: string[];
    /** Tendencias detectadas en el periodo. */
    tendencias: string[];
    /** Estimacion de tokens para la priorizacion por umbral (Req. 28.6). */
    tokensAprox: number;
}

/**
 * Fragmento de contexto recuperado por `Embeddings_Search` sobre la
 * `Memoria_Semantica` (forma minima que necesita el motor para complementar la
 * `Memoria_Jerarquica`). Se declara LOCALMENTE para mantener el modulo
 * `timeline` desacoplado del modulo `ai-engine` (el cableado por DI conecta este
 * puerto con la `MemoriaSemantica` real).
 */
export interface FragmentoSemantico {
    /** Id estable del fragmento embebido (trazabilidad). */
    refId: string;
    /** Similitud dentro del rango definido, ordenable descendente (Req. 36.6). */
    similitud: number;
    /** Referencia al contenido anonimizado de origen recuperado. */
    refContenido: string;
    /** `Semana_Simulada` de origen del fragmento. */
    numeroSemana: number;
}

/**
 * Puerto de recuperacion semantica (`Embeddings_Search`) que el
 * `Motor_Memoria_Contextual` consume para COMPLEMENTAR la `Memoria_Jerarquica`
 * con contexto recuperado por similitud vectorial (Req. 28.5, 36.3).
 *
 * Su forma coincide estructuralmente con `MemoriaSemantica.buscarSimilares`
 * (modulo `ai-engine`), de modo que el cableado por DI puede satisfacerlo con la
 * implementacion real (`MEMORIA_SEMANTICA`). El recuperador real DEGRADA de
 * forma segura (devuelve `[]` y registra el incidente) si el `Embeddings_Search`
 * falla, por lo que el motor nunca bloquea el ciclo (Req. 28.5, 35.3).
 */
export interface RecuperadorSemantico {
    buscarSimilares(
        consulta: { texto?: string; vector?: number[] },
        k: number,
        filtro: { analisisId: string; comunidadId?: string },
    ): Promise<FragmentoSemantico[]>;
}

/**
 * Registro de una TENDENCIA detectada en una `Semana_Simulada`, persistible en
 * la memoria historica (`gds_tendencia_historica`) con sus referencias
 * trazables y anclaje a la `Zona_Geografica` de origen (Req. 39.1-39.3).
 */
export interface TendenciaHistoricaRegistro {
    analisisId: string;
    comunidadId: string;
    numeroSemana: number;
    dimension: string;
    direccion: string;
    magnitud: number;
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
}

/**
 * Registro de un EVENTO detectado en una `Semana_Simulada`, persistible en la
 * memoria historica (`gds_evento_historico`) trazable a su semana/comunidad de
 * origen (Req. 39.1, 39.3).
 */
export interface EventoHistoricoRegistro {
    analisisId: string;
    comunidadId: string;
    numeroSemana: number;
    tipo: string;
    descripcion: string;
}

/** Filtro relacional de recuperacion de la memoria historica (Req. 39.4). */
export interface FiltroHistoria {
    analisisId: string;
    comunidadId?: string;
    numeroSemana?: number;
}

/**
 * Memoria historica detectada en una `Semana_Simulada` lista para registrar en
 * BD al completarse el analisis de la semana (Req. 39.3).
 */
export interface HistoriaSemana {
    tendencias: TendenciaHistoricaRegistro[];
    eventos: EventoHistoricoRegistro[];
}

/**
 * Contrato del `Motor_Memoria_Contextual`.
 *
 * Las implementaciones se apoyan en el puerto de persistencia
 * `MemoriaRepositorio` sobre `gds_memoria_*` y nunca devuelven publicaciones
 * crudas completas al LLM (Req. 28.5).
 */
export interface MotorMemoriaContextual {
    /** Genera/actualiza la `Memoria_Semanal` al cerrar la semana N (Req. 28.1). */
    consolidarSemanal(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
    ): Promise<MemoriaNivel>;

    /**
     * Consolida el nivel superior (mensual/trimestral/semestral/global) de forma
     * acumulativa a partir de los niveles inferiores ya cerrados (Req. 28.2-28.4).
     */
    consolidarNivel(
        analisisId: string,
        comunidadId: string,
        nivel: NivelMemoria,
        periodo: number,
    ): Promise<MemoriaNivel>;

    /**
     * Construye el `ContextoGeneracion` de la semana N a partir de la
     * `Memoria_Jerarquica` (no de semanas crudas), priorizando niveles de mayor
     * agregacion si se supera el umbral de tokens del proveedor activo
     * (Req. 28.5, 28.6).
     */
    construirContexto(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
        limiteTokens: number,
    ): Promise<ContextoGeneracion>;

    /**
     * Devuelve la memoria consultable/trazable conservando el historial completo
     * (Req. 28.8). Si se omite `nivel`, devuelve todos los niveles disponibles.
     */
    consultar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]>;

    /**
     * Registra en la memoria historica las tendencias y eventos detectados al
     * completarse el analisis de una `Semana_Simulada`, con sus referencias
     * trazables a semana/comunidad/institucion de origen (Req. 39.1, 39.3). El
     * historial queda recuperable de forma relacional (este motor) y vectorial
     * (`Memoria_Semantica`/`Embeddings_Search`).
     */
    registrarHistoria(historia: HistoriaSemana): Promise<void>;

    /**
     * Recupera de forma RELACIONAL las tendencias historicas registradas para el
     * `Analisis`/`Comunidad_Digital` indicados, conservando el historial completo
     * (Req. 39.2, 39.4).
     */
    consultarTendencias(filtro: FiltroHistoria): Promise<TendenciaHistoricaRegistro[]>;

    /**
     * Recupera de forma RELACIONAL los eventos historicos registrados para el
     * `Analisis`/`Comunidad_Digital` indicados (Req. 39.2, 39.4).
     */
    consultarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]>;
}

/** Token DI del puerto de persistencia de la `Memoria_Jerarquica`. */
export const MEMORIA_REPOSITORIO = Symbol('MEMORIA_REPOSITORIO');

/** Token DI del puerto de persistencia de la memoria historica (Req. 39). */
export const MEMORIA_HISTORICA_REPOSITORIO = Symbol('MEMORIA_HISTORICA_REPOSITORIO');

/**
 * Token DI del puerto de recuperacion semantica (`Embeddings_Search`) que
 * complementa la `Memoria_Jerarquica` (Req. 28.5, 36.3). Es OPCIONAL: si no se
 * cablea, el motor construye el contexto solo desde la `Memoria_Jerarquica`.
 */
export const RECUPERADOR_SEMANTICO = Symbol('RECUPERADOR_SEMANTICO');

/** Token DI de la fuente de resumenes semanales crudos (provista por el ciclo). */
export const FUENTE_RESUMEN_SEMANAL = Symbol('FUENTE_RESUMEN_SEMANAL');

/** Token DI del `Motor_Memoria_Contextual` (interfaz estable). */
export const MOTOR_MEMORIA_CONTEXTUAL = Symbol('MOTOR_MEMORIA_CONTEXTUAL');
