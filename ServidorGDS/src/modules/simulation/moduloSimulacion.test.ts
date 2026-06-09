/**
 * Pruebas deterministas del `Modulo_Simulacion` (tarea 11.5).
 *
 * Con dobles/fixtures (proveedor doble, motor de memoria doble, validador real)
 * verifican la ORQUESTACION sin red ni base de datos:
 *  - selecciona el `IDataProvider` via `FabricaDataProvider` (Gemini por defecto);
 *  - construye el `ContextoGeneracion` desde el `Motor_Memoria_Contextual`
 *    (memoria jerarquica, no semanas crudas) respetando el `limiteTokens`;
 *  - enriquece el contexto con escenario inmutable, usuarios persistentes,
 *    patrones, contexto semantico y `Zona_Geografica`;
 *  - integra la reaccion de los usuarios a un evento del `Escenario` (Req. 10.4);
 *  - devuelve un `Contrato_Normalizado` valido atribuido a usuarios persistentes;
 *  - propaga el `ErrorGeneracionReintentable` del manejador de fallos (11.4)
 *    cuando el proveedor falla de forma persistente, sin corromper el historial.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6_
 */
import type { ContratoNormalizado } from "./contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "./contracts/contratoNormalizado";
import { ValidadorContratoZod } from "./contracts/validadorContrato";
import type {
    ConfigFabricaDataProvider,
    ContextoGeneracion,
    FabricaDataProvider,
    IDataProvider,
    PerfilUsuario,
} from "./adquisicion/dataProvider";
import { ErrorGeneracionReintentable } from "./adquisicion/manejadorFallosGeneracion";
import type { EventoEscenario, UsuarioConHistorial } from "./adquisicion/reaccionEscenario";
import {
    ModuloSimulacion,
    type ConstructorContextoMemoria,
    type SolicitudGeneracion,
} from "./moduloSimulacion";

// ---------------------------------------------------------------------------
// Dobles deterministas.
// ---------------------------------------------------------------------------

/** Construye un `Contrato_Normalizado` valido atribuido a los ids dados. */
function contratoValido(ids: string[]): ContratoNormalizado {
    const [autor = "u1", segundo = autor] = ids;
    return {
        post: { autorId: autor, texto: "Che, el bloqueo nos dejo sin pasar, que rabia" },
        comments: [
            { autorId: segundo, texto: "Jaja claaaro, 'todo va a mejorar' (ironia)", enRespuestaA: autor },
            { autorId: autor, texto: "tranquilo nomas, ya pasara", enRespuestaA: null },
        ],
        image_description: "estudiantes en la avenida con pancartas",
        hashtags: ["#paro", "#launiver"],
        metadata: {
            version: CONTRATO_VERSION,
            fuente: "gemini",
            generadoEn: new Date("2024-01-01T00:00:00.000Z").toISOString(),
            semana: 1,
            idioma: "es-BO",
        },
    };
}

/**
 * Proveedor doble que captura el contexto recibido y devuelve un contrato valido
 * atribuido a los usuarios persistentes del contexto.
 */
class ProveedorDoble implements IDataProvider {
    readonly nombre = "gemini";
    readonly limiteTokens = 12345;
    contextoRecibido?: ContextoGeneracion;
    llamadas = 0;

    async generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        this.llamadas += 1;
        this.contextoRecibido = ctx;
        const ids = ctx.usuariosSinteticos.map((u) => u.id);
        return contratoValido(ids.length > 0 ? ids : ["u1"]);
    }
}

/** Proveedor doble que siempre falla (no-respuesta), para verificar el manejo de fallos. */
class ProveedorQueFalla implements IDataProvider {
    readonly nombre = "gemini";
    readonly limiteTokens = 9999;
    llamadas = 0;
    async generar(): Promise<ContratoNormalizado> {
        this.llamadas += 1;
        throw new Error("ETIMEDOUT: el proveedor no responde");
    }
}

/** Fabrica doble que devuelve siempre el proveedor dado y registra la config. */
function fabricaDoble(proveedor: IDataProvider): {
    fabrica: FabricaDataProvider;
    configs: (ConfigFabricaDataProvider | undefined)[];
} {
    const configs: (ConfigFabricaDataProvider | undefined)[] = [];
    const fabrica: FabricaDataProvider = {
        crear(config) {
            configs.push(config);
            return proveedor;
        },
    };
    return { fabrica, configs };
}

/** Motor de memoria doble: registra los argumentos y devuelve un contexto base. */
function motorDoble(base: { escenario: string; contextoMemoria: string }): {
    memoria: ConstructorContextoMemoria;
    llamadas: Array<{ analisisId: string; comunidadId: string; semana: number; limite: number }>;
} {
    const llamadas: Array<{
        analisisId: string;
        comunidadId: string;
        semana: number;
        limite: number;
    }> = [];
    const memoria: ConstructorContextoMemoria = {
        async construirContexto(analisisId, comunidadId, semanaN, limiteTokens) {
            llamadas.push({ analisisId, comunidadId, semana: semanaN, limite: limiteTokens });
            return base;
        },
    };
    return { memoria, llamadas };
}

const USUARIOS: PerfilUsuario[] = [
    {
        id: "u1",
        perfilConductual: "activo y reactivo",
        frecuencia: 6,
        estiloEscritura: "informal con sarcasmo",
        intereses: ["politica estudiantil"],
        nivelParticipacion: "alto",
    },
    {
        id: "u2",
        perfilConductual: "reservado",
        frecuencia: 2,
        estiloEscritura: "breve",
        intereses: ["musica"],
        nivelParticipacion: "bajo",
    },
];

function solicitudBase(over: Partial<SolicitudGeneracion> = {}): SolicitudGeneracion {
    return {
        analisisId: "an-1",
        institucionId: "inst-1",
        comunidadId: "com-1",
        semana: 3,
        escenario: "conflicto universitario por el alza de pasajes",
        usuariosSinteticos: USUARIOS,
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        patronesAcumulados: [
            {
                id: "p1",
                tipo: "polarizacion",
                descripcion: "dos bandos por el bloqueo",
                zona: { latitud: -16.5, longitud: -68.15, radioMetros: 800 },
            },
        ],
        contextoSemantico: ["frag-protesta"],
        ...over,
    };
}

function nuevoModulo(proveedor: IDataProvider, base = {
    escenario: "memoria-escenario",
    contextoMemoria: "resumen jerarquico de la semana previa",
}) {
    const { fabrica, configs } = fabricaDoble(proveedor);
    const { memoria, llamadas } = motorDoble(base);
    const modulo = new ModuloSimulacion(fabrica, memoria, new ValidadorContratoZod(() => { }));
    return { modulo, configs, llamadas };
}

// ---------------------------------------------------------------------------
// Pruebas.
// ---------------------------------------------------------------------------

describe("ModuloSimulacion.generarSemana (tarea 11.5)", () => {
    it("orquesta motor de memoria + proveedor y devuelve un Contrato_Normalizado valido", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo, configs, llamadas } = nuevoModulo(proveedor);

        const resultado = await modulo.generarSemana(solicitudBase());

        // Selecciona el proveedor via fabrica (sin proveedor explicito -> Gemini).
        expect(configs).toHaveLength(1);
        expect(resultado.proveedor).toBe("gemini");

        // Construye el contexto desde el motor con el limiteTokens del proveedor.
        expect(llamadas).toHaveLength(1);
        expect(llamadas[0]).toEqual({
            analisisId: "an-1",
            comunidadId: "com-1",
            semana: 3,
            limite: proveedor.limiteTokens,
        });

        // Salida valida atribuida a usuarios persistentes.
        expect(proveedor.llamadas).toBe(1);
        expect(["u1", "u2"]).toContain(resultado.contrato.post.autorId);
        expect(resultado.contrato.metadata.version).toBe(CONTRATO_VERSION);
    });

    it("ancla el contexto: escenario inmutable, usuarios, patrones, semantico y zona", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo } = nuevoModulo(proveedor);

        await modulo.generarSemana(solicitudBase());

        const ctx = proveedor.contextoRecibido!;
        // Escenario de la solicitud es autoritativo (inmutable del Analisis).
        expect(ctx.escenario).toBe("conflicto universitario por el alza de pasajes");
        // contextoMemoria proviene del motor (memoria jerarquica, no semanas crudas).
        expect(ctx.contextoMemoria).toBe("resumen jerarquico de la semana previa");
        expect(ctx.usuariosSinteticos.map((u) => u.id)).toEqual(["u1", "u2"]);
        expect(ctx.patronesAcumulados).toHaveLength(1);
        expect(ctx.contextoSemantico).toEqual(["frag-protesta"]);
        expect(ctx.zonaGeografica.radioMetros).toBe(800);
        expect(ctx.semana).toBe(3);
        expect(ctx.comunidad).toEqual({ institucionId: "inst-1", analisisId: "an-1" });
    });

    it("usa el escenario derivado de la memoria si la solicitud no lo trae", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo } = nuevoModulo(proveedor, {
            escenario: "escenario-desde-memoria",
            contextoMemoria: "mem",
        });

        await modulo.generarSemana(solicitudBase({ escenario: "   " }));

        expect(proveedor.contextoRecibido!.escenario).toBe("escenario-desde-memoria");
    });

    it("pasa la seleccion de proveedor a la fabrica (Req. 4.4)", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo, configs } = nuevoModulo(proveedor);

        await modulo.generarSemana(solicitudBase({ proveedor: { proveedor: "ollama" } }));

        expect(configs[0]).toEqual({ proveedor: "ollama" });
    });

    it("integra la reaccion de los usuarios a un evento del Escenario (Req. 10.4)", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo } = nuevoModulo(proveedor);

        const usuariosConHistorial: UsuarioConHistorial[] = [
            {
                ...USUARIOS[0],
                historial: [{ numeroSemana: 2, temas: ["politica estudiantil"], publicaciones: 3 }],
            },
            { ...USUARIOS[1], historial: [{ numeroSemana: 2, temas: ["musica"] }] },
        ];
        const evento: EventoEscenario = {
            id: "bloqueo",
            descripcion: "bloqueo de avenidas por la federacion",
            intensidad: "alta",
            temasAfectados: ["politica estudiantil"],
            semana: 3,
        };

        const resultado = await modulo.generarSemana(
            solicitudBase({ evento, usuariosConHistorial }),
        );

        // u1 (interes politico) reacciona; u2 (musica) no.
        const afectados = resultado.reacciones.filter((r) => r.afectado).map((r) => r.usuarioId);
        expect(afectados).toContain("u1");
        expect(afectados).not.toContain("u2");

        // La reaccion se integra en el contexto: nota anexada y perfil ajustado.
        const ctx = proveedor.contextoRecibido!;
        expect(ctx.contextoMemoria).toMatch(/Reacciones al evento/);
        const u1 = ctx.usuariosSinteticos.find((u) => u.id === "u1")!;
        expect(u1.frecuencia).toBeGreaterThan(USUARIOS[0].frecuencia);
    });

    it("no aplica reaccion si falta el evento o el historial", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo } = nuevoModulo(proveedor);

        const resultado = await modulo.generarSemana(solicitudBase());

        expect(resultado.reacciones).toEqual([]);
        expect(proveedor.contextoRecibido!.contextoMemoria).not.toMatch(/Reacciones al evento/);
    });

    it("propaga ErrorGeneracionReintentable cuando el proveedor falla de forma persistente (Req. 4.5, 27.1)", async () => {
        const proveedor = new ProveedorQueFalla();
        const { fabrica } = fabricaDoble(proveedor);
        const { memoria } = motorDoble({ escenario: "e", contextoMemoria: "m" });
        const registros: string[] = [];
        const modulo = new ModuloSimulacion(
            fabrica,
            memoria,
            new ValidadorContratoZod(() => { }),
            { maxIntentos: 2, registrador: (e) => void registros.push(e.causa) },
        );

        await expect(modulo.generarSemana(solicitudBase())).rejects.toBeInstanceOf(
            ErrorGeneracionReintentable,
        );
        // Reintenta hasta maxIntentos y registra los fallos (incl. agotamiento).
        expect(proveedor.llamadas).toBe(2);
        expect(registros).toContain("NO_RESPUESTA");
        expect(registros).toContain("REINTENTOS_AGOTADOS");
    });

    it("rechaza una semana invalida (< 1) antes de invocar al proveedor", async () => {
        const proveedor = new ProveedorDoble();
        const { modulo } = nuevoModulo(proveedor);

        await expect(modulo.generarSemana(solicitudBase({ semana: 0 }))).rejects.toThrow(
            /numero de semana invalido/i,
        );
        expect(proveedor.llamadas).toBe(0);
    });
});
