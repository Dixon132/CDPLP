/**
 * `Motor_Memoria_Contextual` - contrato y tipos de la memoria jerarquica de
 * 5 niveles (semanal/mensual/trimestral/semestral/global).
 *
 * Este archivo define UNICAMENTE el contrato (interfaz) y los tipos del motor.
 * La logica de consolidacion acumulativa (tarea 6.2) y `construirContexto`
 * (tarea 6.3) se implementan en tareas posteriores. La persistencia sobre
 * `gds_memoria_*` se expone como puerto reutilizable en `memoriaRepositorio.ts`.
 *
 * El motor es una memoria contextual jerarquica INDEPENDIENTE del historial
 * bruto: el historial COMPLETO se conserva en la BD (tablas `gds_*`) y estos
 * niveles solo generan resumenes inteligentes que alimentan al
 * `ProveedorGeneracion` sin reprocesar semanas crudas ni exceder el umbral de
 * tokens del proveedor activo (Req. 28.5, 28.6).
 *
 * Diseno: design.md > "Motor de Memoria Contextual (memoria jerarquica)".
 *
 * _Requirements: 28.1, 28.8, 28.9_
 */
import type { ContextoGeneracion } from "../adquisicion/proveedorGeneracion";

/**
 * Los cinco niveles de la `Memoria_Jerarquica`, de menor a mayor agregacion.
 *
 * `SEMESTRAL` es un nivel intermedio que este diseno anade, extendiendo la
 * jerarquia de cuatro niveles del Req. 28 y alineado con el horizonte semestral
 * del Req. 19.
 */
export enum NivelMemoria {
    SEMANAL = "SEMANAL",
    MENSUAL = "MENSUAL",
    TRIMESTRAL = "TRIMESTRAL",
    SEMESTRAL = "SEMESTRAL",
    GLOBAL = "GLOBAL",
}

/**
 * Orden canonico de los niveles de menor a mayor agregacion. La compactacion
 * bajo umbral de tokens recorta de menor a mayor detalle (descarta primero
 * `SEMANAL`, luego `MENSUAL`, etc.) conservando los de mayor agregacion
 * (Req. 28.6). Lo consumira `construirContexto` en la tarea 6.3.
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
 * Contrato del `Motor_Memoria_Contextual`.
 *
 * Las implementaciones (tareas 6.2 y 6.3) se apoyan en el puerto de persistencia
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
}
