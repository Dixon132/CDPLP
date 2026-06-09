/**
 * Puertos (interfaces estables) del procesamiento por `Cola_Trabajos` (tarea
 * 16.2). El `EjecutorTrabajoSemana` depende SOLO de estos puertos, de modo que:
 *
 *  - es agnostico del framework (NestJS), de la cola (BullMQ) y de la BD;
 *  - relojes e IDs son INYECTABLES, para pruebas deterministas (Req. 18.4);
 *  - el bloqueo de concurrencia, el registro de estado y la verificacion de
 *    idempotencia se sustituyen por dobles en pruebas o por adaptadores
 *    Redis/Prisma en produccion sin tocar la logica del motor.
 *
 * _Requirements: 9.5, 27.2, 27.3, 27.5, 38.2, 38.3, 38.4, 38.5_
 */
import type {
    OpcionesProcesarSemana,
    ResultadoProcesarSemana,
} from '../procesarSemana';
import { EstadoTrabajo } from './estados-trabajo';
import type { DatosTrabajoSemana } from './trabajo-semana';

/** Reloj inyectable: fuente unica de "ahora" para sellos de tiempo deterministas. */
export interface Reloj {
    ahora(): Date;
}

/** Generador de IDs inyectable: identificadores de registro de estado trazables. */
export interface GeneradorId {
    nuevoId(): string;
}

/**
 * Puerto del UNICO `procesarSemana` transaccional (tarea 16.1). Se expresa como
 * puerto (no como la clase concreta) para que la cola dependa de la frontera
 * estable y permita un doble determinista en pruebas o un stub mientras se
 * cablean sus dependencias en tareas posteriores.
 */
export interface ProcesadorSemanaPort {
    procesarSemana(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
        opciones?: OpcionesProcesarSemana,
    ): Promise<ResultadoProcesarSemana>;
}

/**
 * Cerrojo de concurrencia sobre la clave `(A,I,N)` (Req. 27.3, 38.2).
 *
 * `adquirir` intenta tomar el cerrojo de forma NO bloqueante:
 *  - devuelve una funcion `liberar` si lo obtuvo (el llamador la invoca al
 *    terminar, exito o fallo);
 *  - devuelve `null` si la clave ya esta tomada (otro worker procesa esa misma
 *    `Semana_Simulada` de esa misma `Institucion`): el llamador debe ABSTENERSE
 *    de procesar para no duplicar (impide el procesamiento concurrente).
 *
 * En produccion lo respalda un advisory lock de PostgreSQL o un lock de Redis;
 * en pruebas, un doble en memoria determinista.
 */
export interface CerrojoConcurrencia {
    adquirir(clave: string): Promise<(() => Promise<void>) | null>;
}

/**
 * Verificacion de idempotencia: indica si la `Semana_Simulada` `(A,I,N)` YA tiene
 * resultado persistido (Req. 27.2, 38.3). Si es `true`, el trabajo se trata como
 * ya completado y NO se reprocesa, evitando duplicar resultados al reintentar.
 *
 * Como `procesarSemana` persiste su resultado de forma ATOMICA (tarea 16.1), un
 * intento fallido no deja resultado: `yaProcesada` seguira devolviendo `false`,
 * permitiendo reanudar sin duplicar (idempotencia real, no solo a nivel cola).
 */
export interface ConsultaResultadoSemana {
    yaProcesada(datos: DatosTrabajoSemana): Promise<boolean>;
}

/** Instantanea consultable del estado de un trabajo `(A,I,N)` (Req. 27.5, 38.5). */
export interface RegistroEstadoTrabajo {
    /** Clave `(A,I,N)` del trabajo. */
    clave: string;
    /** `jobId` determinista asociado en BullMQ. */
    jobId: string;
    /** Coordenadas de la `Semana_Simulada`. */
    datos: DatosTrabajoSemana;
    /** Estado actual dentro del dominio cerrado (Req. 38.5). */
    estado: EstadoTrabajo;
    /** Numero de intentos consumidos hasta ahora. */
    intentos: number;
    /** Id del registro (trazable, generado por `GeneradorId`). */
    registroId: string;
    /** Momento de creacion del registro (del `Reloj` inyectable). */
    creadoEn: Date;
    /** Momento de la ultima actualizacion de estado. */
    actualizadoEn: Date;
    /** Mensaje de error de la ultima falla, si la hubo. */
    error?: string;
}

/** Datos de una transicion de estado a registrar. */
export interface TransicionEstado {
    datos: DatosTrabajoSemana;
    jobId: string;
    estado: EstadoTrabajo;
    /** Intentos consumidos al momento de la transicion (opcional). */
    intentos?: number;
    /** Mensaje de error asociado (para FALLIDO o reintentos). */
    error?: string;
}

/**
 * Registro CONSULTABLE del estado de los trabajos de la cola (Req. 27.5, 38.5).
 *
 * `marcar` actualiza (o crea) el estado de un `(A,I,N)`; `consultar` lo recupera.
 * En produccion lo respalda una tabla (`gds_ciclo_semanal`) o Redis; en pruebas,
 * un mapa en memoria. Es la frontera que expone el estado de cada ciclo/trabajo
 * de forma consultable, coherente entre el Req. 27.5 y el 38.5.
 */
export interface RegistroEstadoTrabajos {
    /** Crea o actualiza el estado del trabajo `(A,I,N)`. Devuelve el registro. */
    marcar(transicion: TransicionEstado): Promise<RegistroEstadoTrabajo>;
    /** Recupera el estado del trabajo `(A,I,N)`, o `undefined` si no existe. */
    consultar(
        datos: DatosTrabajoSemana,
    ): Promise<RegistroEstadoTrabajo | undefined>;
    /** Lista todos los registros conocidos (para inspeccion/diagnostico). */
    listar(): Promise<RegistroEstadoTrabajo[]>;
}

// --- Tokens de inyeccion (NestJS) -----------------------------------------

/** Token DI del `Reloj` inyectable (Req. 18.4). */
export const RELOJ_COLA = Symbol('GDS:RELOJ_COLA');
/** Token DI del `GeneradorId` inyectable. */
export const GENERADOR_ID_COLA = Symbol('GDS:GENERADOR_ID_COLA');
/** Token DI del `CerrojoConcurrencia` (Req. 27.3, 38.2). */
export const CERROJO_CONCURRENCIA = Symbol('GDS:CERROJO_CONCURRENCIA');
/** Token DI de la `ConsultaResultadoSemana` (idempotencia, Req. 27.2, 38.3). */
export const CONSULTA_RESULTADO_SEMANA = Symbol('GDS:CONSULTA_RESULTADO_SEMANA');
/** Token DI del `RegistroEstadoTrabajos` consultable (Req. 27.5, 38.5). */
export const REGISTRO_ESTADO_TRABAJOS = Symbol('GDS:REGISTRO_ESTADO_TRABAJOS');
/** Token DI del `EjecutorTrabajoSemana` (logica del procesador, agnostica de cola). */
export const EJECUTOR_TRABAJO_SEMANA = Symbol('GDS:EJECUTOR_TRABAJO_SEMANA');
