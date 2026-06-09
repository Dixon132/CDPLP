/**
 * Adaptadores del `Temporizador` del `Modo_Ejecucion` Tiempo_Real (tarea 17.1).
 *
 * El contador del Tiempo_Real es INYECTABLE (Req. 32.5, 18.4) para que la logica
 * del `GestorEjecucion` no dependa del reloj real: en produccion vence con
 * `setInterval`; en pruebas, un doble determinista (`TemporizadorManual`) dispara
 * los vencimientos a voluntad, de modo que "procesar una semana, iniciar el
 * contador y, al vencer, encolar la siguiente" se verifique de forma SINCRONA y
 * sin esperas reales.
 *
 * _Requirements: 32.4, 32.5, 18.4_
 */
import type { CancelarTemporizador, Temporizador } from './puertos-gestor';

/**
 * `Temporizador` de produccion basado en `setInterval`.
 *
 * Programa el vencimiento periodico del intervalo del Tiempo_Real. Usa `unref`
 * (si esta disponible) para que un contador activo no impida que el proceso
 * termine, y serializa la ejecucion del callback para no solapar dos ticks si
 * uno tarda mas que el intervalo.
 */
export class TemporizadorIntervalo implements Temporizador {
    programar(
        intervaloMs: number,
        alVencer: () => void | Promise<void>,
    ): CancelarTemporizador {
        if (!Number.isFinite(intervaloMs) || intervaloMs <= 0) {
            throw new Error(
                `TemporizadorIntervalo: intervaloMs invalido (${intervaloMs}); debe ser > 0.`,
            );
        }

        let ejecutando = false;
        const handle = setInterval(() => {
            // Evita solapar ticks: si el anterior aun no termino, omite este.
            if (ejecutando) return;
            ejecutando = true;
            void Promise.resolve()
                .then(() => alVencer())
                .finally(() => {
                    ejecutando = false;
                });
        }, intervaloMs);

        // No mantener vivo el proceso solo por el contador (entornos Node).
        (handle as { unref?: () => void }).unref?.();

        return () => clearInterval(handle);
    }
}

/**
 * `Temporizador` doble para pruebas DETERMINISTAS (Req. 18.4).
 *
 * No usa el reloj real: registra cada contador programado y permite dispararlos
 * a voluntad con `disparar` (un vencimiento) o `disparcarVeces` (varios), de modo
 * que las pruebas controlen exactamente cuando "vence el intervalo" del
 * Tiempo_Real. `cancelar` desactiva el contador, igual que al pausar o completar.
 */
export class TemporizadorManual implements Temporizador {
    private readonly contadores: Array<{
        intervaloMs: number;
        alVencer: () => void | Promise<void>;
        cancelado: boolean;
    }> = [];

    programar(
        intervaloMs: number,
        alVencer: () => void | Promise<void>,
    ): CancelarTemporizador {
        const contador = { intervaloMs, alVencer, cancelado: false };
        this.contadores.push(contador);
        return () => {
            contador.cancelado = true;
        };
    }

    /** Numero de contadores ACTIVOS (no cancelados) en este momento. */
    get activos(): number {
        return this.contadores.filter((c) => !c.cancelado).length;
    }

    /** Dispara UN vencimiento de todos los contadores activos, en orden. */
    async disparar(): Promise<void> {
        // Copia para tolerar que un callback cancele/agregue contadores.
        for (const contador of [...this.contadores]) {
            if (!contador.cancelado) {
                await contador.alVencer();
            }
        }
    }

    /** Dispara `veces` vencimientos consecutivos (util para avanzar varias semanas). */
    async dispararVeces(veces: number): Promise<void> {
        for (let i = 0; i < veces; i++) {
            await this.disparar();
        }
    }
}
