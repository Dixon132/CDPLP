/**
 * `EjecutorTrabajoSemana` - logica del PROCESADOR de la `Cola_Trabajos` que
 * ejecuta `procesarSemana` con todas las garantias del motor de ciclos, de forma
 * AGNOSTICA del framework y de BullMQ (tarea 16.2).
 *
 * El procesador BullMQ (NestJS `WorkerHost`) es un envoltorio delgado que extrae
 * `(intento, maxIntentos)` del `Job` y delega aqui. Aislar la logica permite
 * probarla de forma SINCRONA y DETERMINISTA con dobles (sin Redis ni BD), tal
 * como exige el entorno Windows/cmd del plan.
 *
 * Garantias implementadas (sobre la triada `(A,I,N)`):
 *  - **Idempotencia** (Req. 27.2, 38.3): antes de procesar, consulta si la semana
 *    ya tiene resultado persistido; si lo tiene, marca COMPLETADO y NO reprocesa.
 *  - **Bloqueo de concurrencia** (Req. 27.3, 38.2): adquiere un cerrojo NO
 *    bloqueante sobre `(A,I,N)`; si no lo obtiene (otro worker procesa), se
 *    abstiene sin duplicar.
 *  - **Estado consultable** (Req. 27.5, 38.5): transiciona PENDIENTE -> EN_PROCESO
 *    -> {COMPLETADO | FALLIDO} en el `RegistroEstadoTrabajos`.
 *  - **Reintentos acotados** (Req. 38.4): NO reintenta por su cuenta; relanza el
 *    error para que BullMQ aplique su politica acotada (backoff). Solo marca
 *    FALLIDO cuando se agota el ultimo intento.
 *  - **Aislamiento de fallos por institucion** (Req. 9.5, 38.4): cada `(A,I,N)`
 *    es un trabajo independiente; este ejecutor no comparte estado entre
 *    instituciones, de modo que el fallo de una no detiene a las demas.
 *  - **Relojes/IDs inyectables** (Req. 18.4): via el `RegistroEstadoTrabajos`.
 *
 * _Requirements: 9.1, 9.5, 27.2, 27.3, 27.5, 38.2, 38.3, 38.4, 38.5, 10.6_
 */
import type { ResultadoProcesarSemana } from '../procesarSemana';
import { EstadoTrabajo } from './estados-trabajo';
import type {
    CerrojoConcurrencia,
    ConsultaResultadoSemana,
    ProcesadorSemanaPort,
    RegistroEstadoTrabajos,
} from './puertos-cola';
import { claveTrabajo, jobIdSemana, type DatosTrabajoSemana } from './trabajo-semana';

/** Motivo por el que un trabajo se omitio sin reprocesar. */
export type MotivoOmision = 'idempotencia' | 'concurrencia';

/** Contexto del intento actual, derivado del `Job` de BullMQ por el envoltorio. */
export interface ContextoIntento {
    /** Numero de intento ACTUAL (1-indexado: el primer intento es 1). */
    intento: number;
    /** Maximo de intentos acotado (politica de la cola, Req. 38.4). */
    maxIntentos: number;
}

/** Resultado de ejecutar un trabajo de la cola. */
export interface ResultadoEjecucionTrabajo {
    /** Clave `(A,I,N)` del trabajo. */
    clave: string;
    /** `jobId` determinista. */
    jobId: string;
    /** Estado final del trabajo tras este intento. */
    estado: EstadoTrabajo;
    /** `true` si el trabajo se omitio (idempotencia o concurrencia). */
    omitido: boolean;
    /** Motivo de la omision, si la hubo. */
    motivoOmision?: MotivoOmision;
    /** Resultado de `procesarSemana` cuando se completo en este intento. */
    resultado?: ResultadoProcesarSemana;
}

/** Dependencias (puertos) del `EjecutorTrabajoSemana`. */
export interface DependenciasEjecutor {
    /** El UNICO `procesarSemana` transaccional (tarea 16.1). */
    procesador: ProcesadorSemanaPort;
    /** Cerrojo de concurrencia sobre `(A,I,N)` (Req. 27.3, 38.2). */
    cerrojo: CerrojoConcurrencia;
    /** Verificacion de idempotencia (Req. 27.2, 38.3). */
    consultaResultado: ConsultaResultadoSemana;
    /** Registro consultable de estado (Req. 27.5, 38.5). */
    registro: RegistroEstadoTrabajos;
}

/**
 * Ejecutor del procesamiento de una `Semana_Simulada` desde la cola.
 *
 * No conoce BullMQ: recibe el contexto de intento ya extraido. Devuelve el
 * resultado de la ejecucion en los casos de exito/omision, y RELANZA el error en
 * los fallos para que la cola aplique su politica de reintentos acotada.
 */
export class EjecutorTrabajoSemana {
    constructor(private readonly deps: DependenciasEjecutor) { }

    async ejecutar(
        datos: DatosTrabajoSemana,
        contexto: ContextoIntento,
    ): Promise<ResultadoEjecucionTrabajo> {
        const clave = claveTrabajo(datos);
        const jobId = jobIdSemana(datos);
        const { intento, maxIntentos } = contexto;
        const esUltimoIntento = intento >= maxIntentos;

        // 1) IDEMPOTENCIA (Req. 27.2, 38.3): si la semana ya tiene resultado
        //    persistido, NO se reprocesa. Se asegura el estado COMPLETADO y se
        //    omite el trabajo (un reintento de algo ya hecho no duplica filas).
        if (await this.deps.consultaResultado.yaProcesada(datos)) {
            await this.deps.registro.marcar({
                datos,
                jobId,
                estado: EstadoTrabajo.COMPLETADO,
                intentos: intento,
            });
            return {
                clave,
                jobId,
                estado: EstadoTrabajo.COMPLETADO,
                omitido: true,
                motivoOmision: 'idempotencia',
            };
        }

        // 2) BLOQUEO DE CONCURRENCIA (Req. 27.3, 38.2): cerrojo NO bloqueante
        //    sobre `(A,I,N)`. Si otro worker ya lo posee, este intento se ABSTIENE
        //    de procesar para no duplicar; el estado permanece EN_PROCESO (lo
        //    gestiona quien tiene el cerrojo).
        const liberar = await this.deps.cerrojo.adquirir(clave);
        if (liberar === null) {
            return {
                clave,
                jobId,
                estado: EstadoTrabajo.EN_PROCESO,
                omitido: true,
                motivoOmision: 'concurrencia',
            };
        }

        try {
            // 3) EN_PROCESO: el cerrojo esta tomado; marcamos el estado consultable.
            await this.deps.registro.marcar({
                datos,
                jobId,
                estado: EstadoTrabajo.EN_PROCESO,
                intentos: intento,
            });

            // 4) Ejecutar el UNICO `procesarSemana` transaccional (tarea 16.1).
            const resultado = await this.deps.procesador.procesarSemana(
                datos.analisisId,
                datos.institucionId,
                datos.numeroSemana,
            );

            // 5) COMPLETADO: resultado persistido atomicamente.
            await this.deps.registro.marcar({
                datos,
                jobId,
                estado: EstadoTrabajo.COMPLETADO,
                intentos: intento,
            });

            return {
                clave,
                jobId,
                estado: EstadoTrabajo.COMPLETADO,
                omitido: false,
                resultado,
            };
        } catch (causa) {
            const mensaje = causa instanceof Error ? causa.message : String(causa);

            // 6) Politica de reintentos ACOTADA (Req. 38.4): NO reintentamos aqui.
            //    - Si quedan intentos: el trabajo vuelve a PENDIENTE y se RELANZA
            //      el error para que BullMQ lo reintente con backoff (idempotente:
            //      al no haber resultado persistido, reprocesa sin duplicar).
            //    - Si era el ultimo intento: se marca FALLIDO (estado terminal),
            //      aislado de las demas instituciones (cada `(A,I,N)` es un job).
            await this.deps.registro.marcar({
                datos,
                jobId,
                estado: esUltimoIntento
                    ? EstadoTrabajo.FALLIDO
                    : EstadoTrabajo.PENDIENTE,
                intentos: intento,
                error: mensaje,
            });
            throw causa;
        } finally {
            // El cerrojo se libera SIEMPRE (exito o fallo) para permitir el
            // siguiente intento/trabajo sobre la misma clave.
            await liberar();
        }
    }
}
