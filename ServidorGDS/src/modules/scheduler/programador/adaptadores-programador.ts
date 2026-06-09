/**
 * Adaptadores por defecto / dobles de los puertos del `Programador_Temporal` y
 * de la `Herramienta_Aceleracion` (tarea 16.3).
 *
 * `PlanAnalisisEnMemoria` es una implementacion DETERMINISTA y sin dependencias
 * externas del puerto `PlanAnalisis`, util como doble en pruebas y como valor por
 * defecto inyectable mientras la capa de persistencia (Prisma sobre
 * `gds_analisis`/`gds_ciclo_semanal`) no provee el adaptador definitivo. Permite
 * declarar las instituciones, el total de `Semana_Simulada` y la ultima semana
 * completada de cada `(A,I)`, y avanzarla al simular el cierre de una semana.
 *
 * _Requirements: 12.4, 18.3_
 */
import type { PlanAnalisis } from './puertos-programador';

/** Configuracion de un `Analisis` en el plan en memoria. */
export interface ConfiguracionAnalisisMemoria {
    /** `Institucion` participantes. */
    instituciones: string[];
    /** Total de `Semana_Simulada` (entero >= 1). */
    totalSemanas: number;
    /**
     * Ultima `Semana_Simulada` completada por institucion (0 si ninguna). Las
     * instituciones ausentes se asumen en 0.
     */
    completadasPorInstitucion?: Record<string, number>;
}

/**
 * `PlanAnalisis` en memoria: estado de avance declarado y mutable para pruebas.
 *
 * Por defecto, ninguna semana esta completada (todas pendientes). `completar`
 * avanza la ultima semana completada de un `(A,I)` para simular el cierre de
 * ciclos entre disparos del avance.
 */
export class PlanAnalisisEnMemoria implements PlanAnalisis {
    private readonly analisis = new Map<
        string,
        { instituciones: string[]; totalSemanas: number; completadas: Map<string, number> }
    >();

    constructor(config?: Record<string, ConfiguracionAnalisisMemoria>) {
        if (config) {
            for (const [analisisId, cfg] of Object.entries(config)) {
                this.registrar(analisisId, cfg);
            }
        }
    }

    /** Registra o reemplaza la configuracion de un `Analisis`. */
    registrar(analisisId: string, cfg: ConfiguracionAnalisisMemoria): void {
        const completadas = new Map<string, number>();
        for (const inst of cfg.instituciones) {
            completadas.set(inst, cfg.completadasPorInstitucion?.[inst] ?? 0);
        }
        this.analisis.set(analisisId, {
            instituciones: [...cfg.instituciones],
            totalSemanas: cfg.totalSemanas,
            completadas,
        });
    }

    /** Fija la ultima semana completada de un `(A,I)` (simula cierre de ciclos). */
    fijarCompletadas(
        analisisId: string,
        institucionId: string,
        ultimaSemanaCompletada: number,
    ): void {
        const a = this.requerir(analisisId);
        a.completadas.set(institucionId, ultimaSemanaCompletada);
    }

    private requerir(analisisId: string) {
        const a = this.analisis.get(analisisId);
        if (!a) {
            throw new Error(
                `PlanAnalisisEnMemoria: analisis no registrado (${analisisId}).`,
            );
        }
        return a;
    }

    async institucionesDe(analisisId: string): Promise<string[]> {
        return [...this.requerir(analisisId).instituciones];
    }

    async totalSemanas(analisisId: string): Promise<number> {
        return this.requerir(analisisId).totalSemanas;
    }

    async ultimaSemanaCompletada(
        analisisId: string,
        institucionId: string,
    ): Promise<number> {
        return this.requerir(analisisId).completadas.get(institucionId) ?? 0;
    }
}
