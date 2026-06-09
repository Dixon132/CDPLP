/**
 * `GestorEjecucion` - orquestador de los tres `Modo_Ejecucion` (Manual /
 * Automatico / Tiempo_Real) y del ciclo de pausa/reanudacion de un `Analisis`
 * (tarea 17.1).
 *
 * El `GestorEjecucion` controla QUIEN dispara el avance y CUANDO, pero NUNCA QUE
 * se ejecuta: los tres modos encolan `procesarSemana` en la MISMA
 * `Cola_Trabajos` reutilizando los mismos disparadores, sin ruta alternativa por
 * modo. Esto garantiza que el resultado del `Analisis` sea equivalente sea cual
 * sea el modo (Req. 32.7, coherente con 18.4):
 *
 *  - **Manual** (Req. 32.2): cada solicitud explicita avanza EXACTAMENTE la
 *    siguiente `Semana_Simulada` pendiente por institucion, reutilizando
 *    `HerramientaAceleracion.avanzarUnaSemana` (1 semana).
 *  - **Automatico** (Req. 32.3): encola de corrido TODAS las semanas pendientes
 *    en orden estrictamente creciente, reutilizando
 *    `HerramientaAceleracion.avanzarHastaElFinal`.
 *  - **Tiempo_Real** (Req. 32.4, 32.5): encola una semana, arranca un contador
 *    inyectable con el intervalo configurado y, al vencer, encola la siguiente
 *    pendiente reutilizando `ProgramadorTemporal.tick`.
 *
 * Pausar/reanudar conserva el estado de forma consistente (Req. 32.6, 32.8):
 * pausar cancela el contador del Tiempo_Real y detiene el encolado; las semanas
 * ya completadas permanecen firmes (las persiste `procesarSemana` de forma
 * atomica) y la reanudacion continua EXACTAMENTE desde la siguiente pendiente,
 * sin repetir ni omitir semanas, gracias al `jobId` determinista y al orden
 * contiguo de `encolarAvance`.
 *
 * Diseno: design.md > "Modos de ejecucion (control desde el frontend)".
 * _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
 */
import type {
    EstadoEjecucion,
    ModoEjecucion,
} from '../../analysis/analysis.types';
import { MODOS_EJECUCION } from '../../analysis/analysis.types';
import type { ResultadoAvance } from '../programador/encolar-avance';
import type { HerramientaAceleracion } from '../programador/herramienta-aceleracion';
import type { ProgramadorTemporal } from '../programador/programador-temporal';
import {
    INTERVALO_TIEMPO_REAL_DEFECTO_MS,
    type AlmacenEstadoEjecucion,
    type CancelarTemporizador,
    type Temporizador,
} from './puertos-gestor';

/** Resultado de una operacion de avance/reanudacion del `GestorEjecucion`. */
export interface ResultadoEjecucion {
    /** `Analisis` afectado. */
    analisisId: string;
    /** `Modo_Ejecucion` con el que se ejecuto la operacion. */
    modoEjecucion: ModoEjecucion;
    /** `Estado_Ejecucion` resultante tras la operacion. */
    estadoEjecucion: EstadoEjecucion;
    /** Trabajos `(A,I,N)` encolados en esta operacion (en orden creciente). */
    avance: ResultadoAvance;
}

/** Dependencias (puertos) del `GestorEjecucion`. Inyectables por constructor. */
export interface DependenciasGestorEjecucion {
    /** Estado de modo/intervalo/ejecucion del `Analisis` (Req. 32.1, 32.5, 32.6). */
    almacen: AlmacenEstadoEjecucion;
    /** Disparador de salto (Manual = 1 semana; Automatico = hasta el final). */
    herramienta: HerramientaAceleracion;
    /** Disparador del Tiempo_Real (un `tick` encola la siguiente semana). */
    programador: ProgramadorTemporal;
    /** Contador inyectable del Tiempo_Real (Req. 32.5, 18.4). */
    temporizador: Temporizador;
    /** Intervalo por defecto del Tiempo_Real en ms (Req. 32.5). */
    intervaloTiempoRealPorDefectoMs?: number;
}

export class GestorEjecucionService {
    private readonly intervaloPorDefectoMs: number;

    /** Contadores del Tiempo_Real ACTIVOS por `Analisis` (para cancelarlos). */
    private readonly contadores = new Map<string, CancelarTemporizador>();

    constructor(private readonly deps: DependenciasGestorEjecucion) {
        this.intervaloPorDefectoMs =
            deps.intervaloTiempoRealPorDefectoMs ??
            INTERVALO_TIEMPO_REAL_DEFECTO_MS;
    }

    /**
     * Selecciona el `Modo_Ejecucion` del `Analisis` (Req. 32.1) y, para el
     * Tiempo_Real, el intervalo del contador (Req. 32.5). Cambiar de modo CANCELA
     * cualquier contador activo y deja el `Analisis` listo para avanzar
     * (`Estado_Ejecucion` DETENIDO), sin alterar las semanas ya completadas.
     */
    async seleccionarModo(
        analisisId: string,
        modo: ModoEjecucion,
        intervaloTiempoRealMs?: number,
    ): Promise<void> {
        if (!MODOS_EJECUCION.includes(modo)) {
            throw new Error(
                `GestorEjecucion: Modo_Ejecucion invalido (${modo}); valores: ${MODOS_EJECUCION.join(', ')}.`,
            );
        }

        let intervalo: number | null = null;
        if (modo === 'TIEMPO_REAL') {
            intervalo = intervaloTiempoRealMs ?? this.intervaloPorDefectoMs;
            this.validarIntervalo(intervalo);
        }

        // Cambiar de modo detiene cualquier contador del Tiempo_Real en curso.
        this.cancelarContador(analisisId);

        await this.deps.almacen.fijarModo(analisisId, modo, intervalo);

        // Una nueva seleccion de modo deja la ejecucion DETENIDA (lista para
        // avanzar). Las semanas completadas permanecen firmes (no se tocan).
        const { estadoEjecucion } = await this.deps.almacen.obtener(analisisId);
        if (estadoEjecucion === 'EN_EJECUCION' || estadoEjecucion === 'PAUSADO') {
            await this.deps.almacen.fijarEstado(analisisId, 'DETENIDO');
        }
    }

    /**
     * Avance generico segun el `Modo_Ejecucion` seleccionado (endpoint
     * `POST /analisis/:id/avanzar`):
     *  - Manual -> avanza una semana (Req. 32.2);
     *  - Automatico -> encola hasta el final (Req. 32.3);
     *  - Tiempo_Real -> encola una semana y arranca el contador (Req. 32.4, 32.5).
     */
    async avanzar(analisisId: string): Promise<ResultadoEjecucion> {
        const { modoEjecucion, intervaloTiempoRealMs } =
            await this.deps.almacen.obtener(analisisId);

        switch (modoEjecucion) {
            case 'MANUAL':
                return this.avanzarManual(analisisId);
            case 'AUTOMATICO':
                return this.ejecutarAutomatico(analisisId);
            case 'TIEMPO_REAL':
                return this.iniciarTiempoReal(analisisId, intervaloTiempoRealMs);
            default:
                throw new Error(
                    `GestorEjecucion: Modo_Ejecucion no soportado (${String(modoEjecucion)}).`,
                );
        }
    }

    /**
     * Modo Manual (Req. 32.2): procesa UNICAMENTE la siguiente `Semana_Simulada`
     * pendiente por institucion por cada solicitud explicita, reutilizando
     * `HerramientaAceleracion.avanzarUnaSemana`. Si no quedan pendientes, marca el
     * `Analisis` COMPLETADO sin encolar nada.
     */
    async avanzarManual(analisisId: string): Promise<ResultadoEjecucion> {
        const { modoEjecucion } = await this.deps.almacen.obtener(analisisId);
        if (modoEjecucion !== 'MANUAL') {
            throw new Error(
                `GestorEjecucion: avanzarManual requiere Modo_Ejecucion Manual (actual: ${modoEjecucion}).`,
            );
        }

        const avance = await this.deps.herramienta.avanzarUnaSemana(analisisId);
        const estado: EstadoEjecucion =
            avance.encolados.length > 0 ? 'DETENIDO' : 'COMPLETADO';
        await this.deps.almacen.fijarEstado(analisisId, estado);

        return {
            analisisId,
            modoEjecucion: 'MANUAL',
            estadoEjecucion: estado,
            avance,
        };
    }

    /**
     * Pausa un `Analisis` en Automatico o Tiempo_Real (Req. 32.6, 32.8): cancela
     * el contador del Tiempo_Real (si lo hubiera) y detiene el encolado de nuevas
     * semanas. Las `Semana_Simulada` ya completadas permanecen firmes; la
     * reanudacion continuara desde la siguiente pendiente. El modo Manual no se
     * pausa (avanza bajo demanda).
     */
    async pausar(analisisId: string): Promise<void> {
        const { modoEjecucion, estadoEjecucion } =
            await this.deps.almacen.obtener(analisisId);

        if (modoEjecucion === 'MANUAL') {
            throw new Error(
                'GestorEjecucion: el Modo_Ejecucion Manual no se pausa (avanza bajo demanda).',
            );
        }
        if (estadoEjecucion !== 'EN_EJECUCION') {
            throw new Error(
                `GestorEjecucion: solo se pausa un Analisis EN_EJECUCION (actual: ${estadoEjecucion}).`,
            );
        }

        this.cancelarContador(analisisId);
        await this.deps.almacen.fijarEstado(analisisId, 'PAUSADO');
    }

    /**
     * Reanuda un `Analisis` PAUSADO (Req. 32.6, 32.8) desde la siguiente
     * `Semana_Simulada` pendiente, sin repetir ni omitir semanas:
     *  - Automatico -> encola las pendientes restantes hasta el final;
     *  - Tiempo_Real -> encola la siguiente y rearranca el contador.
     */
    async reanudar(analisisId: string): Promise<ResultadoEjecucion> {
        const { modoEjecucion, intervaloTiempoRealMs, estadoEjecucion } =
            await this.deps.almacen.obtener(analisisId);

        if (estadoEjecucion !== 'PAUSADO') {
            throw new Error(
                `GestorEjecucion: solo se reanuda un Analisis PAUSADO (actual: ${estadoEjecucion}).`,
            );
        }

        switch (modoEjecucion) {
            case 'AUTOMATICO':
                return this.ejecutarAutomatico(analisisId);
            case 'TIEMPO_REAL':
                return this.iniciarTiempoReal(analisisId, intervaloTiempoRealMs);
            default:
                throw new Error(
                    `GestorEjecucion: el Modo_Ejecucion ${modoEjecucion} no admite reanudacion.`,
                );
        }
    }

    // --- Internos ----------------------------------------------------------

    /**
     * Automatico (Req. 32.3): encola TODAS las semanas pendientes en orden
     * creciente reutilizando `avanzarHastaElFinal`. Si no quedaban pendientes,
     * el `Analisis` queda COMPLETADO; si encolo trabajo, queda EN_EJECUCION.
     */
    private async ejecutarAutomatico(
        analisisId: string,
    ): Promise<ResultadoEjecucion> {
        const avance = await this.deps.herramienta.avanzarHastaElFinal(analisisId);
        const estado: EstadoEjecucion =
            avance.encolados.length > 0 ? 'EN_EJECUCION' : 'COMPLETADO';
        await this.deps.almacen.fijarEstado(analisisId, estado);

        return {
            analisisId,
            modoEjecucion: 'AUTOMATICO',
            estadoEjecucion: estado,
            avance,
        };
    }

    /**
     * Tiempo_Real (Req. 32.4, 32.5): encola la siguiente `Semana_Simulada`
     * pendiente (un `tick`) y, si quedan mas, arranca el contador inyectable con
     * el intervalo configurado para encolar las siguientes al vencer. Si no
     * quedaban pendientes, marca el `Analisis` COMPLETADO sin arrancar contador.
     */
    private async iniciarTiempoReal(
        analisisId: string,
        intervaloTiempoRealMs: number | null,
    ): Promise<ResultadoEjecucion> {
        const intervalo = intervaloTiempoRealMs ?? this.intervaloPorDefectoMs;
        this.validarIntervalo(intervalo);

        // Procesa una semana de inmediato (Req. 32.4).
        const avance = await this.deps.programador.tick(analisisId);

        if (avance.encolados.length === 0) {
            // Nada pendiente: ya esta completo. No se arranca contador.
            this.cancelarContador(analisisId);
            await this.deps.almacen.fijarEstado(analisisId, 'COMPLETADO');
            return {
                analisisId,
                modoEjecucion: 'TIEMPO_REAL',
                estadoEjecucion: 'COMPLETADO',
                avance,
            };
        }

        await this.deps.almacen.fijarEstado(analisisId, 'EN_EJECUCION');
        this.programarContador(analisisId, intervalo);

        return {
            analisisId,
            modoEjecucion: 'TIEMPO_REAL',
            estadoEjecucion: 'EN_EJECUCION',
            avance,
        };
    }

    /**
     * Programa el contador del Tiempo_Real: al vencer cada intervalo, encola la
     * siguiente `Semana_Simulada` pendiente (`tick`). Cuando ya no quedan
     * pendientes, cancela el contador y marca el `Analisis` COMPLETADO.
     */
    private programarContador(analisisId: string, intervaloMs: number): void {
        this.cancelarContador(analisisId);
        const cancelar = this.deps.temporizador.programar(
            intervaloMs,
            async () => {
                const avance = await this.deps.programador.tick(analisisId);
                if (avance.encolados.length === 0) {
                    this.cancelarContador(analisisId);
                    await this.deps.almacen.fijarEstado(analisisId, 'COMPLETADO');
                }
            },
        );
        this.contadores.set(analisisId, cancelar);
    }

    /** Cancela y olvida el contador del Tiempo_Real de un `Analisis`, si existe. */
    private cancelarContador(analisisId: string): void {
        const cancelar = this.contadores.get(analisisId);
        if (cancelar) {
            cancelar();
            this.contadores.delete(analisisId);
        }
    }

    private validarIntervalo(intervaloMs: number): void {
        if (!Number.isInteger(intervaloMs) || intervaloMs <= 0) {
            throw new Error(
                `GestorEjecucion: intervalo del Tiempo_Real invalido (${intervaloMs}); debe ser un entero de ms > 0.`,
            );
        }
    }
}

/** Token DI re-exportado por conveniencia desde el modulo del gestor. */
export { GESTOR_EJECUCION } from './puertos-gestor';
