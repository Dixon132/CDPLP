/**
 * Adaptador en memoria del `AlmacenEstadoEjecucion` (tarea 17.1).
 *
 * Implementacion DETERMINISTA y sin dependencias externas del puerto de estado
 * de ejecucion del `Analisis`, util como doble en pruebas y como valor por
 * defecto inyectable mientras la capa de persistencia (Prisma sobre
 * `gds_analisis`) no provee el adaptador definitivo. Sustituir el provider del
 * token `ALMACEN_ESTADO_EJECUCION` por el adaptador Prisma no requiere tocar el
 * `GestorEjecucion`.
 *
 * Estado inicial de un `Analisis` no registrado: `Modo_Ejecucion` Manual, sin
 * intervalo y `Estado_Ejecucion` DETENIDO (coherente con el valor inicial de
 * `gds_analisis`, Req. 32).
 *
 * _Requirements: 32.1, 32.5, 32.6, 32.8_
 */
import type {
    EstadoEjecucion,
    ModoEjecucion,
} from '../../analysis/analysis.types';
import type {
    AlmacenEstadoEjecucion,
    EstadoEjecucionAnalisis,
} from './puertos-gestor';

/** Estado de ejecucion por defecto de un `Analisis` recien creado (Req. 32). */
const ESTADO_INICIAL: EstadoEjecucionAnalisis = {
    modoEjecucion: 'MANUAL',
    intervaloTiempoRealMs: null,
    estadoEjecucion: 'DETENIDO',
};

export class AlmacenEstadoEjecucionEnMemoria implements AlmacenEstadoEjecucion {
    private readonly estados = new Map<string, EstadoEjecucionAnalisis>();

    constructor(inicial?: Record<string, Partial<EstadoEjecucionAnalisis>>) {
        if (inicial) {
            for (const [analisisId, parcial] of Object.entries(inicial)) {
                this.estados.set(analisisId, { ...ESTADO_INICIAL, ...parcial });
            }
        }
    }

    async obtener(analisisId: string): Promise<EstadoEjecucionAnalisis> {
        return { ...(this.estados.get(analisisId) ?? ESTADO_INICIAL) };
    }

    async fijarModo(
        analisisId: string,
        modo: ModoEjecucion,
        intervaloTiempoRealMs: number | null,
    ): Promise<void> {
        const previo = this.estados.get(analisisId) ?? ESTADO_INICIAL;
        this.estados.set(analisisId, {
            ...previo,
            modoEjecucion: modo,
            intervaloTiempoRealMs,
        });
    }

    async fijarEstado(
        analisisId: string,
        estado: EstadoEjecucion,
    ): Promise<void> {
        const previo = this.estados.get(analisisId) ?? ESTADO_INICIAL;
        this.estados.set(analisisId, { ...previo, estadoEjecucion: estado });
    }
}
