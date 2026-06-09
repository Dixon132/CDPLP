/**
 * Pruebas unitarias de la sonda de disponibilidad del `Servicio_IA` (tarea 8.2).
 *
 * Verifican que {@link SondaServicioIaHttp}:
 *  - consulta `GET /health` sobre la URL `SERVICIO_IA_URL`;
 *  - resuelve `true` solo ante una respuesta 2xx con `status` saludable;
 *  - resuelve `false` de forma SEGURA ante error de red, timeout, codigo no 2xx
 *    o `status` no saludable (degradacion segura, nunca lanza, Req. 35.3, 35.5).
 *
 * Se mockea `HttpService`/Axios: NO hay red real (Jest, deterministico).
 *
 * _Requirements: 35.4, 35.5_
 */
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { of, throwError } from "rxjs";
import type { AxiosResponse } from "axios";

import { SondaServicioIaHttp, RUTA_HEALTH } from "./sonda-servicio-ia";

const BASE_URL = "http://servicio-ia:8000";

/** Construye un `AxiosResponse` con el cuerpo y codigo dados. */
function axiosResp<T>(data: T, status = 200): AxiosResponse<T> {
    return {
        data,
        status,
        statusText: "OK",
        headers: {},
        config: { headers: {} as never },
    } as AxiosResponse<T>;
}

/** `HttpService` falso cuyo `get` devuelve un observable configurado. */
function fakeHttp(observableFactory: () => ReturnType<HttpService["get"]>): {
    http: HttpService;
    get: jest.Mock;
} {
    const get = jest.fn((_url: string) => observableFactory());
    const http = { get } as unknown as HttpService;
    return { http, get };
}

/** `ConfigService` falso que resuelve `SERVICIO_IA_URL` al valor dado. */
function fakeConfig(url: string): ConfigService {
    return {
        get: (_key: string, def?: string) => url ?? def,
    } as unknown as ConfigService;
}

describe("SondaServicioIaHttp - sonda GET /health del Servicio_IA (tarea 8.2)", () => {
    it("consulta GET /health en SERVICIO_IA_URL", async () => {
        const { http, get } = fakeHttp(() =>
            of(axiosResp({ status: "ok", modelos: ["bge-m3"], device: "cuda" })),
        );
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));

        await sonda.disponible();

        expect(get).toHaveBeenCalledTimes(1);
        expect(get.mock.calls[0][0]).toBe(`${BASE_URL}${RUTA_HEALTH}`);
    });

    it("devuelve true ante 2xx con status saludable", async () => {
        const { http } = fakeHttp(() =>
            of(axiosResp({ status: "ok", modelos: [], device: "cuda" })),
        );
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));
        await expect(sonda.disponible()).resolves.toBe(true);
    });

    it("devuelve true ante 2xx sin campo status (contrato minimo)", async () => {
        const { http } = fakeHttp(() => of(axiosResp({ modelos: [] })));
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));
        await expect(sonda.disponible()).resolves.toBe(true);
    });

    it("devuelve false ante status no saludable (p. ej. degraded)", async () => {
        const { http } = fakeHttp(() => of(axiosResp({ status: "degraded" })));
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));
        await expect(sonda.disponible()).resolves.toBe(false);
    });

    it("devuelve false ante codigo HTTP no 2xx", async () => {
        const { http } = fakeHttp(() => of(axiosResp({ status: "ok" }, 503)));
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));
        await expect(sonda.disponible()).resolves.toBe(false);
    });

    it("devuelve false de forma segura ante error de red (no lanza)", async () => {
        const { http } = fakeHttp(() =>
            throwError(() => new Error("ECONNREFUSED")),
        );
        const sonda = new SondaServicioIaHttp(http, fakeConfig(BASE_URL));
        await expect(sonda.disponible()).resolves.toBe(false);
    });
});
