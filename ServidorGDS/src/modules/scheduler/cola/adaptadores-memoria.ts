/**
 * Adaptadores por defecto (en memoria / del sistema) de los puertos de la
 * `Cola_Trabajos` (tarea 16.2).
 *
 * Son implementaciones DETERMINISTAS y sin dependencias externas que sirven
 * tanto de valor por defecto inyectable en NestJS como de doble en pruebas:
 *  - `RelojSistema` / `RelojFijo`: fuente de "ahora" inyectable (Req. 18.4).
 *  - `GeneradorIdSecuencial` / `GeneradorIdUuid`: IDs inyectables.
 *  - `CerrojoConcurrenciaEnMemoria`: cerrojo NO bloqueante por clave `(A,I,N)`
 *    (Req. 27.3, 38.2). En produccion se sustituye por un advisory lock de
 *    PostgreSQL o un lock de Redis.
 *  - `RegistroEstadoTrabajosEnMemoria`: estado consultable de cada trabajo
 *    (Req. 27.5, 38.5). En produccion lo respalda `gds_ciclo_semanal`/Redis.
 *
 * _Requirements: 18.4, 27.3, 27.5, 38.2, 38.5_
 */
import { randomUUID } from 'node:crypto';

import { EstadoTrabajo } from './estados-trabajo';
import type {
    CerrojoConcurrencia,
    GeneradorId,
    RegistroEstadoTrabajo,
    RegistroEstadoTrabajos,
    Reloj,
    TransicionEstado,
} from './puertos-cola';
import { claveTrabajo } from './trabajo-semana';

/** Reloj del sistema (produccion): delega en `Date`. */
export class RelojSistema implements Reloj {
    ahora(): Date {
        return new Date();
    }
}

/** Reloj fijo/controlable para pruebas deterministas (Req. 18.4). */
export class RelojFijo implements Reloj {
    constructor(private instante: Date = new Date('2024-01-01T00:00:00.000Z')) { }
    ahora(): Date {
        return new Date(this.instante.getTime());
    }
    /** Avanza el reloj `ms` milisegundos (util para verificar timestamps). */
    avanzar(ms: number): void {
        this.instante = new Date(this.instante.getTime() + ms);
    }
    /** Fija el instante actual. */
    fijar(instante: Date): void {
        this.instante = new Date(instante.getTime());
    }
}

/** Generador de IDs UUID (produccion). */
export class GeneradorIdUuid implements GeneradorId {
    nuevoId(): string {
        return randomUUID();
    }
}

/** Generador de IDs secuencial y determinista para pruebas. */
export class GeneradorIdSecuencial implements GeneradorId {
    private n = 0;
    constructor(private readonly prefijo = 'reg') { }
    nuevoId(): string {
        this.n += 1;
        return `${this.prefijo}-${this.n}`;
    }
}

/**
 * Cerrojo de concurrencia en memoria: mantiene un conjunto de claves tomadas.
 *
 * `adquirir(clave)` es NO bloqueante: si la clave esta libre la toma y devuelve
 * una funcion `liberar` idempotente; si ya esta tomada devuelve `null` para que
 * el llamador se abstenga de procesar (impide el procesamiento concurrente de la
 * misma `Semana_Simulada` de la misma `Institucion`, Req. 27.3, 38.2).
 *
 * Es valido dentro de un mismo proceso (suficiente para `--runInBand` y para un
 * unico worker); en despliegue multi-worker se sustituye por un lock distribuido.
 */
export class CerrojoConcurrenciaEnMemoria implements CerrojoConcurrencia {
    private readonly tomadas = new Set<string>();

    async adquirir(clave: string): Promise<(() => Promise<void>) | null> {
        if (this.tomadas.has(clave)) {
            return null;
        }
        this.tomadas.add(clave);
        let liberado = false;
        return async () => {
            if (liberado) return;
            liberado = true;
            this.tomadas.delete(clave);
        };
    }

    /** `true` si la clave esta tomada (solo para inspeccion en pruebas). */
    estaTomada(clave: string): boolean {
        return this.tomadas.has(clave);
    }
}

/**
 * Registro consultable de estado de trabajos en memoria (Req. 27.5, 38.5).
 *
 * Indexa por la clave `(A,I,N)`. `marcar` crea el registro la primera vez y
 * actualiza el estado/intentos/error en las siguientes; conserva `creadoEn` y
 * `registroId` originales. Sella los tiempos con el `Reloj` inyectable y genera
 * `registroId` con el `GeneradorId` inyectable (deterministas en pruebas).
 */
export class RegistroEstadoTrabajosEnMemoria implements RegistroEstadoTrabajos {
    private readonly registros = new Map<string, RegistroEstadoTrabajo>();

    constructor(
        private readonly reloj: Reloj = new RelojSistema(),
        private readonly generadorId: GeneradorId = new GeneradorIdUuid(),
    ) { }

    async marcar(transicion: TransicionEstado): Promise<RegistroEstadoTrabajo> {
        const clave = claveTrabajo(transicion.datos);
        const ahora = this.reloj.ahora();
        const previo = this.registros.get(clave);

        const registro: RegistroEstadoTrabajo = previo
            ? {
                ...previo,
                estado: transicion.estado,
                jobId: transicion.jobId,
                intentos: transicion.intentos ?? previo.intentos,
                actualizadoEn: ahora,
                // Limpia el error al salir de un estado de fallo; lo fija si llega.
                ...(transicion.error !== undefined
                    ? { error: transicion.error }
                    : transicion.estado === EstadoTrabajo.COMPLETADO
                        ? { error: undefined }
                        : {}),
            }
            : {
                clave,
                jobId: transicion.jobId,
                datos: { ...transicion.datos },
                estado: transicion.estado,
                intentos: transicion.intentos ?? 0,
                registroId: this.generadorId.nuevoId(),
                creadoEn: ahora,
                actualizadoEn: ahora,
                ...(transicion.error !== undefined
                    ? { error: transicion.error }
                    : {}),
            };

        this.registros.set(clave, registro);
        return { ...registro, datos: { ...registro.datos } };
    }

    async consultar(
        datos: TransicionEstado['datos'],
    ): Promise<RegistroEstadoTrabajo | undefined> {
        const registro = this.registros.get(claveTrabajo(datos));
        return registro
            ? { ...registro, datos: { ...registro.datos } }
            : undefined;
    }

    async listar(): Promise<RegistroEstadoTrabajo[]> {
        return [...this.registros.values()].map((r) => ({
            ...r,
            datos: { ...r.datos },
        }));
    }
}

/**
 * `ConsultaResultadoSemana` por defecto: asume que ninguna semana fue procesada
 * todavia (idempotencia delegada a `procesarSemana` + `jobId` de BullMQ).
 *
 * Es un valor por defecto SEGURO mientras la capa de persistencia (Prisma) no
 * provee una consulta real de existencia de resultado: nunca reporta falsos
 * positivos (no marca como "ya procesada" una semana que no lo esta), por lo que
 * jamas omite trabajo legitimo. El adaptador Prisma definitivo se cablea junto
 * con `PersistorSemana` (tareas de persistencia).
 */
export class ConsultaResultadoSemanaSiempreNueva {
    async yaProcesada(): Promise<boolean> {
        return false;
    }
}
