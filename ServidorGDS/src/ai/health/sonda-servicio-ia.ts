/**
 * Sonda de disponibilidad del `Servicio_IA` (tarea 8.2, Req. 35.5).
 *
 * Expone de forma CONSULTABLE si el cerebro analitico en Python (`Servicio_IA`,
 * FastAPI) esta disponible, consultando el endpoint `GET /health` del contrato
 * HTTP (design.md > "Contrato HTTP del `Servicio_IA`": respuesta
 * `{ status, modelos[], device }`).
 *
 * La sonda es la pieza que permite al {@link ProxyDegradacion} decidir entre la
 * implementacion primaria (cliente HTTP del `Servicio_IA`) y el FALLBACK
 * determinista TS, y reanudar el consumo del primario en cuanto el servicio se
 * recupera, SIN cambios de codigo (Req. 35.4).
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`" y la interfaz
 * `SondaServicioIA`.
 * _Requirements: 35.4, 35.5_
 */
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, firstValueFrom, of, timeout } from "rxjs";

import { ServicioIaHttpBase } from "../servicio-ia.client";

/**
 * Sonda de disponibilidad del `Servicio_IA` (Req. 35.5).
 *
 * Implementada en la frontera HTTP por {@link SondaServicioIaHttp}; se modela
 * como interfaz para que el {@link ProxyDegradacion} dependa del contrato y no
 * de la implementacion concreta (reemplazable, Req. 35).
 */
export interface SondaServicioIA {
    /**
     * Consulta `GET /health` del `Servicio_IA` y expone su disponibilidad de
     * forma consultable (Req. 35.5). NUNCA lanza: ante fallo HTTP, timeout o
     * respuesta no saludable devuelve `false`, de modo que la indisponibilidad
     * se traduce en degradacion segura y nunca bloquea el ciclo (Req. 35.3).
     */
    disponible(): Promise<boolean>;
}

/**
 * Tiempo maximo (ms) que la sonda espera por `GET /health` antes de considerar
 * al `Servicio_IA` indisponible. Acotado para no bloquear el ciclo de analisis
 * (Req. 35.3): una sonda que cuelga equivaldria a un servicio caido.
 */
export const SONDA_HEALTH_TIMEOUT_MS = 2000 as const;

/** Ruta del endpoint de salud del `Servicio_IA` en su contrato HTTP. */
export const RUTA_HEALTH = "/health" as const;

/** Forma (parcial) de la respuesta de `GET /health` del `Servicio_IA`. */
interface HealthResponseDTO {
    status?: string;
    modelos?: string[];
    device?: string;
}

/**
 * Estados textuales de `status` que el `Servicio_IA` puede reportar como
 * SALUDABLE en `GET /health`. Cualquier otro valor (p. ej. `degraded`, `down`)
 * se interpreta como indisponible.
 */
const ESTADOS_SALUDABLES = new Set([
    "ok",
    "healthy",
    "up",
    "available",
    "disponible",
    "ready",
]);

/**
 * Implementacion HTTP de la {@link SondaServicioIA}: consulta `GET /health` del
 * `Servicio_IA` reutilizando la base HTTP comun ({@link ServicioIaHttpBase}),
 * con timeout acotado y resolucion segura a `false` ante cualquier error.
 */
@Injectable()
export class SondaServicioIaHttp extends ServicioIaHttpBase implements SondaServicioIA {
    private readonly logger = new Logger(SondaServicioIaHttp.name);

    constructor(http: HttpService, config: ConfigService) {
        super(http, config);
    }

    async disponible(): Promise<boolean> {
        // `null` es un centinela interno que distingue el fallo (timeout/red)
        // de una respuesta real; ambos se reducen a un booleano consultable.
        const respuesta = await firstValueFrom(
            this.http.get<HealthResponseDTO>(this.endpoint(RUTA_HEALTH)).pipe(
                timeout(SONDA_HEALTH_TIMEOUT_MS),
                catchError((error: unknown) => {
                    this.logger.debug(
                        `Sonda /health del Servicio_IA fallo: ${descripcionError(error)}`,
                    );
                    return of(null);
                }),
            ),
        );

        if (respuesta === null) {
            return false;
        }

        const httpOk = respuesta.status >= 200 && respuesta.status < 300;
        if (!httpOk) {
            return false;
        }

        return esEstadoSaludable(respuesta.data);
    }
}

/** Determina si el cuerpo de `GET /health` indica un `Servicio_IA` saludable. */
function esEstadoSaludable(cuerpo: HealthResponseDTO | null | undefined): boolean {
    // Sin campo `status` pero con 2xx, asumimos saludable (contrato minimo).
    const status = cuerpo?.status;
    if (status === undefined || status === null || status === "") {
        return true;
    }
    return ESTADOS_SALUDABLES.has(status.toString().trim().toLowerCase());
}

/** Resumen legible de un error arbitrario para el log de la sonda. */
function descripcionError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
