/**
 * Pruebas unitarias de la reaccion de los `Usuario_Sintetico` a eventos del
 * `Escenario` (tarea 11.6).
 *
 * Verifican que ante un evento relevante los usuarios AFECTADOS modifican su
 * comportamiento de forma COHERENTE con su perfil e historial, conservando su
 * identidad, y que el resultado se integra en el `ContextoGeneracion` de la
 * siguiente generacion.
 *
 * _Requirements: 10.4_
 */
import type { ContextoGeneracion, PerfilUsuario } from "./dataProvider";
import {
    aplicarReaccionEscenario,
    eventoEsRelevante,
    factorIntensidad,
    integrarReaccionesEnContexto,
    reaccionarAEvento,
    reaccionarUsuario,
    receptividadPerfil,
    usuarioAfectado,
    type EventoEscenario,
    type UsuarioConHistorial,
} from "./reaccionEscenario";

function usuario(over: Partial<UsuarioConHistorial> = {}): UsuarioConHistorial {
    return {
        id: "u1",
        seudonimo: "seud-u1",
        perfilConductual: "activo",
        frecuencia: 4,
        estiloEscritura: "informal",
        intereses: ["examenes", "deportes"],
        nivelParticipacion: "medio",
        historial: [
            { numeroSemana: 1, temas: ["clases"], publicaciones: 2, comentarios: 3 },
            { numeroSemana: 2, temas: ["examenes", "estres"], publicaciones: 3, comentarios: 5 },
        ],
        ...over,
    };
}

function evento(over: Partial<EventoEscenario> = {}): EventoEscenario {
    return {
        id: "ev-examen",
        descripcion: "se anuncian examenes finales sorpresa",
        intensidad: "alta",
        temasAfectados: ["examenes"],
        actoresAfectados: [],
        semana: 3,
        ...over,
    };
}

function contexto(usuarios: PerfilUsuario[]): ContextoGeneracion {
    return {
        escenario: "tension academica",
        contextoMemoria: "resumen previo",
        contextoSemantico: ["frag-1"],
        patronesAcumulados: [],
        usuariosSinteticos: usuarios,
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 500 },
        semana: 3,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    };
}

describe("eventoEsRelevante / factorIntensidad / receptividadPerfil", () => {
    it("un evento sin temas ni actores no es relevante", () => {
        expect(eventoEsRelevante(evento({ temasAfectados: [], actoresAfectados: [] }))).toBe(false);
        expect(eventoEsRelevante(evento({ temasAfectados: ["x"] }))).toBe(true);
        expect(eventoEsRelevante(evento({ temasAfectados: [], actoresAfectados: ["lideres"] }))).toBe(
            true,
        );
    });

    it("la intensidad escala el factor (baja < media < alta)", () => {
        expect(factorIntensidad("baja")).toBeLessThan(factorIntensidad("media"));
        expect(factorIntensidad("media")).toBeLessThan(factorIntensidad("alta"));
    });

    it("la receptividad depende del perfil: activo/alto > reservado/bajo", () => {
        const activo = receptividadPerfil(usuario({ perfilConductual: "activo", nivelParticipacion: "alto" }));
        const reservado = receptividadPerfil(
            usuario({ perfilConductual: "reservado", nivelParticipacion: "bajo" }),
        );
        expect(activo).toBeGreaterThan(reservado);
        expect(activo).toBeLessThanOrEqual(1);
        expect(reservado).toBeGreaterThanOrEqual(0.1);
    });
});

describe("usuarioAfectado", () => {
    it("afecta por solape de intereses con los temas del evento", () => {
        expect(usuarioAfectado(usuario({ intereses: ["examenes"] }), evento())).toBe(true);
    });

    it("afecta por solape de temas del historial con el evento", () => {
        const u = usuario({ intereses: ["musica"], historial: [{ numeroSemana: 1, temas: ["examenes"] }] });
        expect(usuarioAfectado(u, evento())).toBe(true);
    });

    it("afecta por coincidencia con actores afectados", () => {
        const u = usuario({ intereses: ["musica"], historial: [{ numeroSemana: 1, temas: ["fiesta"] }] });
        expect(usuarioAfectado(u, evento({ temasAfectados: ["politica"], actoresAfectados: ["activo"] }))).toBe(
            true,
        );
    });

    it("NO afecta cuando no hay solape de temas ni actores", () => {
        const u = usuario({ intereses: ["musica"], historial: [{ numeroSemana: 1, temas: ["fiesta"] }] });
        expect(usuarioAfectado(u, evento({ temasAfectados: ["politica"], actoresAfectados: [] }))).toBe(false);
    });
});

describe("reaccionarUsuario - usuario afectado", () => {
    it("modifica el comportamiento y conserva la identidad (Req. 10.3, 10.4)", () => {
        const u = usuario();
        const r = reaccionarUsuario(u, evento());

        expect(r.afectado).toBe(true);
        expect(r.factorReaccion).toBeGreaterThan(0);
        // Cambio observable: la frecuencia aumenta.
        expect(r.perfilModificado.frecuencia).toBeGreaterThan(u.frecuencia);
        // Identidad conservada: no se regenera.
        expect(r.perfilModificado.id).toBe(u.id);
        expect(r.perfilModificado.seudonimo).toBe(u.seudonimo);
        expect(r.perfilModificado.perfilConductual).toBe(u.perfilConductual);
        expect(r.perfilModificado.estiloEscritura).toBe(u.estiloEscritura);
        expect(r.perfilModificado.intereses).toEqual(u.intereses);
    });

    it("coherencia con el historial: continua los temas recientes + el evento", () => {
        const u = usuario({
            historial: [
                { numeroSemana: 1, temas: ["clases"] },
                { numeroSemana: 2, temas: ["estres"] },
            ],
        });
        const r = reaccionarUsuario(u, evento({ temasAfectados: ["examenes"] }));
        // Toma los temas de la ultima semana (estres) y suma los del evento.
        expect(r.temasReaccion).toEqual(expect.arrayContaining(["estres", "examenes"]));
        expect(r.temasReaccion).not.toContain("clases"); // solo el registro reciente
    });

    it("coherencia con el perfil: un perfil activo reacciona mas que uno reservado", () => {
        const activo = reaccionarUsuario(
            usuario({ perfilConductual: "activo", nivelParticipacion: "alto" }),
            evento(),
        );
        const reservado = reaccionarUsuario(
            usuario({ perfilConductual: "reservado", nivelParticipacion: "bajo" }),
            evento(),
        );
        expect(activo.factorReaccion).toBeGreaterThan(reservado.factorReaccion);
    });

    it("una reaccion fuerte escala el nivel de participacion", () => {
        const u = usuario({ perfilConductual: "activo", nivelParticipacion: "medio" });
        const r = reaccionarUsuario(u, evento({ intensidad: "alta" }));
        // factorReaccion >= 0.5 escala medio -> alto.
        expect(r.factorReaccion).toBeGreaterThanOrEqual(0.5);
        expect(r.perfilModificado.nivelParticipacion).toBe("alto");
    });

    it("una reaccion debil (perfil de baja participacion) no escala la participacion", () => {
        const u = usuario({ perfilConductual: "reservado", nivelParticipacion: "bajo" });
        const r = reaccionarUsuario(u, evento({ intensidad: "alta" }));
        // Coherente con el perfil: una participacion baja no escala ante el evento.
        expect(r.factorReaccion).toBeLessThan(0.5);
        expect(r.perfilModificado.nivelParticipacion).toBe("bajo");
    });
});

describe("reaccionarUsuario - usuario no afectado", () => {
    it("conserva el comportamiento sin cambios (factorReaccion 0)", () => {
        const u = usuario({ intereses: ["musica"], historial: [{ numeroSemana: 1, temas: ["fiesta"] }] });
        const r = reaccionarUsuario(u, evento({ temasAfectados: ["politica"], actoresAfectados: [] }));

        expect(r.afectado).toBe(false);
        expect(r.factorReaccion).toBe(0);
        expect(r.temasReaccion).toEqual([]);
        expect(r.perfilModificado.frecuencia).toBe(u.frecuencia);
        expect(r.perfilModificado.nivelParticipacion).toBe(u.nivelParticipacion);
    });

    it("un evento no relevante no altera a ningun usuario", () => {
        const u = usuario();
        const r = reaccionarUsuario(u, evento({ temasAfectados: [], actoresAfectados: [] }));
        expect(r.afectado).toBe(false);
        expect(r.perfilModificado.frecuencia).toBe(u.frecuencia);
    });
});

describe("reaccionarAEvento", () => {
    it("mantiene el orden de entrada y discrimina afectados de no afectados", () => {
        const afectado = usuario({ id: "u1", intereses: ["examenes"] });
        const indiferente = usuario({
            id: "u2",
            intereses: ["musica"],
            historial: [{ numeroSemana: 1, temas: ["fiesta"] }],
        });
        const reacciones = reaccionarAEvento([afectado, indiferente], evento());

        expect(reacciones.map((r) => r.usuarioId)).toEqual(["u1", "u2"]);
        expect(reacciones[0].afectado).toBe(true);
        expect(reacciones[1].afectado).toBe(false);
    });
});

describe("integrarReaccionesEnContexto", () => {
    it("reemplaza los perfiles afectados y anexa la nota de reaccion al contexto", () => {
        const u = usuario();
        const ctx = contexto([
            {
                id: u.id,
                seudonimo: u.seudonimo,
                perfilConductual: u.perfilConductual,
                frecuencia: u.frecuencia,
                estiloEscritura: u.estiloEscritura,
                intereses: u.intereses,
                nivelParticipacion: u.nivelParticipacion,
            },
        ]);
        const reacciones = reaccionarAEvento([u], evento());
        const nuevo = integrarReaccionesEnContexto(ctx, reacciones);

        // El perfil integrado refleja la reaccion.
        expect(nuevo.usuariosSinteticos[0].frecuencia).toBeGreaterThan(u.frecuencia);
        expect(nuevo.usuariosSinteticos[0].id).toBe(u.id);
        // La memoria de contexto incorpora la nota de reaccion.
        expect(nuevo.contextoMemoria).toContain("[Reacciones al evento]");
        expect(nuevo.contextoMemoria).toContain("resumen previo");
        // No muta el contexto original (transformacion pura).
        expect(ctx.contextoMemoria).toBe("resumen previo");
        expect(ctx.usuariosSinteticos[0].frecuencia).toBe(u.frecuencia);
    });

    it("sin afectados, conserva el contexto de memoria intacto", () => {
        const u = usuario({ intereses: ["musica"], historial: [{ numeroSemana: 1, temas: ["fiesta"] }] });
        const ctx = contexto([
            {
                id: u.id,
                perfilConductual: u.perfilConductual,
                frecuencia: u.frecuencia,
                estiloEscritura: u.estiloEscritura,
                intereses: u.intereses,
                nivelParticipacion: u.nivelParticipacion,
            },
        ]);
        const reacciones = reaccionarAEvento([u], evento({ temasAfectados: ["politica"], actoresAfectados: [] }));
        const nuevo = integrarReaccionesEnContexto(ctx, reacciones);
        expect(nuevo.contextoMemoria).toBe("resumen previo");
    });

    it("conserva usuarios del contexto sin reaccion asociada", () => {
        const ctx = contexto([
            { id: "ux", perfilConductual: "p", frecuencia: 1, estiloEscritura: "e", intereses: [], nivelParticipacion: "bajo" },
        ]);
        const nuevo = integrarReaccionesEnContexto(ctx, []);
        expect(nuevo.usuariosSinteticos[0].id).toBe("ux");
    });
});

describe("aplicarReaccionEscenario (entrada de alto nivel)", () => {
    it("integra las reacciones en el ContextoGeneracion de la siguiente generacion (Req. 10.4)", () => {
        const afectado = usuario({ id: "u1", intereses: ["examenes"], frecuencia: 4 });
        const indiferente = usuario({
            id: "u2",
            intereses: ["musica"],
            frecuencia: 2,
            historial: [{ numeroSemana: 1, temas: ["fiesta"] }],
        });
        const ctx = contexto([
            { id: "u1", perfilConductual: "activo", frecuencia: 4, estiloEscritura: "informal", intereses: ["examenes"], nivelParticipacion: "medio" },
            { id: "u2", perfilConductual: "activo", frecuencia: 2, estiloEscritura: "informal", intereses: ["musica"], nivelParticipacion: "medio" },
        ]);

        const { contexto: siguiente, reacciones } = aplicarReaccionEscenario(
            ctx,
            [afectado, indiferente],
            evento(),
        );

        const u1 = siguiente.usuariosSinteticos.find((u) => u.id === "u1")!;
        const u2 = siguiente.usuariosSinteticos.find((u) => u.id === "u2")!;

        expect(u1.frecuencia).toBeGreaterThan(4); // afectado cambia
        expect(u2.frecuencia).toBe(2); // no afectado se conserva
        expect(reacciones.find((r) => r.usuarioId === "u1")!.afectado).toBe(true);
        expect(reacciones.find((r) => r.usuarioId === "u2")!.afectado).toBe(false);
        expect(siguiente.escenario).toBe(ctx.escenario); // escenario inmutable
    });
});
