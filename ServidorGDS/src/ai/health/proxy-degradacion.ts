/**
 * Proxy de degradacion segura del `Servicio_IA` (tarea 8.2, Req. 35.3, 35.4, 35.5).
 *
 * Envuelve una implementacion PRIMARIA (cliente HTTP del `Servicio_IA` en
 * Python) y un FALLBACK determinista TS de la MISMA interfaz estable
 * (`Servicio_NLP`, `Servicio_Vision`, `Capa_ML` o `Filtro_Relevancia`). Si la
 * {@link SondaServicioIA} reporta indisponibilidad o la llamada HTTP falla, el
 * proxy DELEGA en el fallback determinista TS:
 *  - sin bloquear el ciclo de analisis (la indisponibilidad nunca propaga un
 *    error: siempre hay calculo base) (Req. 35.3);
 *  - registrando el incidente (Req. 35.3);
 *  - exponiendo el estado `degradado` de forma consultable (Req. 35.5).
 *
 * Cuando el `Servicio_IA` vuelve a estar disponible, el proxy reanuda el consumo
 * del primario como implementacion principal SIN cambios de codigo: cada
 * operacion vuelve a intentar el primario y el estado `degradado` se restablece
 * automaticamente (Req. 35.4).
 *
 * Como ambos lados cumplen la misma interfaz estable `T`, el `Pipeline_Analisis`
 * los consume de forma intercambiable; la tarea 8.3 enlaza este proxy a los
 * tokens DI (`SERVICIO_NLP`, `SERVICIO_VISION`, `FILTRO_RELEVANCIA`, `CAPA_ML`).
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`" e interfaz
 * `ProxyDegradacion<T>`.
 * _Requirements: 35.3, 35.4, 35.5_
 */
import { Logger } from "@nestjs/common";

import type { SondaServicioIA } from "./sonda-servicio-ia";

/**
 * Contrato del proxy de degradacion segura (design.md). Decide entre `primario`
 * (via `Servicio_IA` HTTP) y `fallback` (determinista TS) segun la sonda
 * `GET /health`, devolviendo `primario` si el servicio esta disponible y
 * `fallback` en caso contrario.
 */
export interface ProxyDegradacion<T> {
    /** Implementacion via `Servicio_IA` (cliente HTTP). */
    readonly primario: T;
    /** Implementacion determinista TS (degradacion segura). */
    readonly fallback: T;
    /** `primario` si `/health` reporta disponibilidad; `fallback` en caso contrario. */
    resolver(): Promise<T>;
}

/**
 * Receptor minimo de incidentes de degradacion. Compatible con el `Logger` de
 * NestJS; se modela como interfaz para poder inyectar un doble en pruebas.
 */
export interface RegistroIncidente {
    warn(mensaje: string, contexto?: string): void;
    log(mensaje: string, contexto?: string): void;
}

/** Opciones de construccion del {@link ProxyDegradacionServicioIA}. */
export interface OpcionesProxyDegradacion {
    /** Nombre del subsistema envuelto (p. ej. `Servicio_NLP`) para los logs. */
    nombre?: string;
    /** Receptor de incidentes; por defecto un `Logger` de NestJS. */
    logger?: RegistroIncidente;
}

/**
 * Implementacion del {@link ProxyDegradacion} para los subsistemas del
 * `Servicio_IA`.
 *
 * Ofrece dos puntos de entrada complementarios:
 *  - {@link resolver}: selecciona la implementacion segun la sonda `/health`
 *    (contrato del diseno);
 *  - {@link ejecutar}: ejecuta una operacion concreta de la interfaz `T` con
 *    degradacion segura, intentando el primario y delegando en el fallback ante
 *    indisponibilidad O fallo HTTP en tiempo de llamada, sin bloquear el ciclo.
 */
export class ProxyDegradacionServicioIA<T> implements ProxyDegradacion<T> {
    private readonly logger: RegistroIncidente;
    private readonly nombre: string;

    /** Estado consultable: `true` mientras se sirve desde el fallback (Req. 35.5). */
    private _degradado = false;

    constructor(
        public readonly primario: T,
        public readonly fallback: T,
        private readonly sonda: SondaServicioIA,
        opciones: OpcionesProxyDegradacion = {},
    ) {
        this.nombre = opciones.nombre ?? "Servicio_IA";
        this.logger = opciones.logger ?? new Logger(`ProxyDegradacion:${this.nombre}`);
    }

    /**
     * Estado de disponibilidad consultable del `Servicio_IA` a traves de este
     * subsistema: `true` si actualmente se esta degradado al fallback TS,
     * `false` si se consume el primario (Req. 35.5).
     */
    get degradado(): boolean {
        return this._degradado;
    }

    /** {@inheritDoc ProxyDegradacion.resolver} */
    async resolver(): Promise<T> {
        const disponible = await this.sonda.disponible();
        if (disponible) {
            this.marcarDisponible();
            return this.primario;
        }
        this.marcarDegradado("la sonda GET /health reporta indisponibilidad");
        return this.fallback;
    }

    /**
     * Ejecuta `operacion` con degradacion segura sobre la interfaz estable `T`.
     *
     * Intenta el primario cuando la sonda lo permite y, ante cualquier fallo
     * HTTP en tiempo de llamada, DELEGA en el fallback determinista TS
     * registrando el incidente. Nunca propaga un fallo de indisponibilidad: el
     * ciclo siempre obtiene un calculo base (Req. 35.3). Si el `Servicio_IA`
     * vuelve a responder, la siguiente ejecucion reanuda el primario y
     * restablece `degradado` (Req. 35.4).
     */
    async ejecutar<R>(operacion: (implementacion: T) => Promise<R>): Promise<R> {
        const disponible = await this.sonda.disponible();

        if (disponible) {
            try {
                const resultado = await operacion(this.primario);
                this.marcarDisponible();
                return resultado;
            } catch (error: unknown) {
                this.marcarDegradado(
                    `fallo HTTP al consumir el Servicio_IA: ${descripcionError(error)}`,
                );
                return operacion(this.fallback);
            }
        }

        this.marcarDegradado("la sonda GET /health reporta indisponibilidad");
        return operacion(this.fallback);
    }

    /** Marca el subsistema como degradado, registrando el incidente una sola vez. */
    private marcarDegradado(motivo: string): void {
        if (!this._degradado) {
            // Solo se registra la TRANSICION a degradado para evitar inundar el
            // log en cada semana mientras el Servicio_IA siga caido (Req. 35.3).
            this.logger.warn(
                `Degradacion segura de ${this.nombre} al fallback determinista TS: ${motivo}`,
                this.nombre,
            );
        }
        this._degradado = true;
    }

    /** Restablece el estado al consumir el primario; registra la recuperacion. */
    private marcarDisponible(): void {
        if (this._degradado) {
            this.logger.log(
                `Recuperacion de ${this.nombre}: se reanuda el consumo del Servicio_IA como primario`,
                this.nombre,
            );
        }
        this._degradado = false;
    }
}

/** Resumen legible de un error arbitrario para el registro de incidentes. */
function descripcionError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
