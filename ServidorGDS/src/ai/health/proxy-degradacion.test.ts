/**
 * Pruebas unitarias del proxy de degradacion segura del `Servicio_IA` (tarea 8.2).
 *
 * Simulan disponibilidad/indisponibilidad del `Servicio_IA` mediante una sonda
 * falsa y un fallo HTTP en tiempo de llamada para verificar que
 * {@link ProxyDegradacionServicioIA}:
 *  - usa el PRIMARIO cuando la sonda lo reporta disponible;
 *  - DELEGA en el fallback determinista TS ante indisponibilidad de la sonda
 *    o ante fallo HTTP, sin propagar el error (no bloquea el ciclo);
 *  - REGISTRA el incidente de degradacion;
 *  - expone el estado `degradado` de forma consultable;
 *  - REANUDA el primario al recuperarse el `Servicio_IA` sin cambios de codigo.
 *
 * _Requirements: 35.3, 35.4, 35.5_
 */
import {
    ProxyDegradacionServicioIA,
    type RegistroIncidente,
} from "./proxy-degradacion";
import type { SondaServicioIA } from "./sonda-servicio-ia";

/** Interfaz estable de juguete `T` para ejercitar el proxy de forma aislada. */
interface ServicioDemo {
    analizar(entrada: string): Promise<string>;
}

/** Sonda falsa controlable: devuelve la secuencia/valor de disponibilidad dado. */
function fakeSonda(disponibleFn: () => boolean): {
    sonda: SondaServicioIA;
    disponible: jest.Mock;
} {
    const disponible = jest.fn(async () => disponibleFn());
    return { sonda: { disponible }, disponible };
}

/** Registro de incidentes falso para verificar el log de degradacion/recuperacion. */
function fakeLogger(): RegistroIncidente & { warn: jest.Mock; log: jest.Mock } {
    return { warn: jest.fn(), log: jest.fn() };
}

describe("ProxyDegradacionServicioIA - degradacion segura del Servicio_IA (tarea 8.2)", () => {
    const primario: ServicioDemo = { analizar: jest.fn(async () => "PRIMARIO") };
    const fallback: ServicioDemo = { analizar: jest.fn(async () => "FALLBACK") };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("resolver() (contrato del diseno)", () => {
        it("devuelve el primario cuando la sonda reporta disponibilidad", async () => {
            const { sonda } = fakeSonda(() => true);
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda);
            await expect(proxy.resolver()).resolves.toBe(primario);
            expect(proxy.degradado).toBe(false);
        });

        it("devuelve el fallback y marca degradado cuando la sonda reporta indisponibilidad", async () => {
            const { sonda } = fakeSonda(() => false);
            const logger = fakeLogger();
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                nombre: "Servicio_NLP",
                logger,
            });
            await expect(proxy.resolver()).resolves.toBe(fallback);
            expect(proxy.degradado).toBe(true);
            expect(logger.warn).toHaveBeenCalledTimes(1);
        });
    });

    describe("ejecutar() con degradacion segura", () => {
        it("usa el primario cuando el Servicio_IA esta disponible", async () => {
            const { sonda } = fakeSonda(() => true);
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda);

            const r = await proxy.ejecutar((s) => s.analizar("x"));

            expect(r).toBe("PRIMARIO");
            expect(primario.analizar).toHaveBeenCalledWith("x");
            expect(fallback.analizar).not.toHaveBeenCalled();
            expect(proxy.degradado).toBe(false);
        });

        it("delega en el fallback y registra el incidente cuando la sonda reporta indisponibilidad", async () => {
            const { sonda } = fakeSonda(() => false);
            const logger = fakeLogger();
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                logger,
            });

            const r = await proxy.ejecutar((s) => s.analizar("x"));

            expect(r).toBe("FALLBACK");
            expect(primario.analizar).not.toHaveBeenCalled();
            expect(fallback.analizar).toHaveBeenCalledWith("x");
            expect(proxy.degradado).toBe(true);
            expect(logger.warn).toHaveBeenCalledTimes(1);
        });

        it("delega en el fallback ante fallo HTTP del primario sin propagar el error", async () => {
            const { sonda } = fakeSonda(() => true);
            const logger = fakeLogger();
            const primarioCaido: ServicioDemo = {
                analizar: jest.fn(async () => {
                    throw new Error("HTTP 500");
                }),
            };
            const proxy = new ProxyDegradacionServicioIA(
                primarioCaido,
                fallback,
                sonda,
                { logger },
            );

            const r = await proxy.ejecutar((s) => s.analizar("x"));

            expect(r).toBe("FALLBACK");
            expect(primarioCaido.analizar).toHaveBeenCalledWith("x");
            expect(fallback.analizar).toHaveBeenCalledWith("x");
            expect(proxy.degradado).toBe(true);
            expect(logger.warn).toHaveBeenCalledTimes(1);
        });

        it("reanuda el primario al recuperarse el Servicio_IA (sin cambios de codigo)", async () => {
            let disponible = false;
            const { sonda } = fakeSonda(() => disponible);
            const logger = fakeLogger();
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                nombre: "Capa_ML",
                logger,
            });

            // 1) Servicio caido -> fallback + degradado.
            await expect(proxy.ejecutar((s) => s.analizar("a"))).resolves.toBe(
                "FALLBACK",
            );
            expect(proxy.degradado).toBe(true);

            // 2) Servicio recuperado -> reanuda el primario y restablece el estado.
            disponible = true;
            await expect(proxy.ejecutar((s) => s.analizar("b"))).resolves.toBe(
                "PRIMARIO",
            );
            expect(proxy.degradado).toBe(false);
            expect(logger.log).toHaveBeenCalledTimes(1); // recuperacion registrada
        });

        it("registra la degradacion una sola vez mientras persiste la indisponibilidad", async () => {
            const { sonda } = fakeSonda(() => false);
            const logger = fakeLogger();
            const proxy = new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                logger,
            });

            await proxy.ejecutar((s) => s.analizar("a"));
            await proxy.ejecutar((s) => s.analizar("b"));
            await proxy.ejecutar((s) => s.analizar("c"));

            expect(logger.warn).toHaveBeenCalledTimes(1);
            expect(proxy.degradado).toBe(true);
        });
    });
});
