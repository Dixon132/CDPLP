/**
 * Reaccion de los `Usuario_Sintetico` a eventos del `Escenario` (tarea 11.6).
 *
 * Ante un evento relevante del `Escenario`, los `Usuario_Sintetico` AFECTADOS
 * modifican su comportamiento de forma COHERENTE con su perfil conductual y con
 * su historial acumulado; el resultado se integra en el `ContextoGeneracion` de
 * la SIGUIENTE generacion para que el `IDataProvider` produzca contenido que
 * refleje esa reaccion (Req. 10.4).
 *
 * Principios de diseno (todo es PURO y DETERMINISTA, sin E/S ni red):
 *
 *  - **Identidad persistente (Req. 10.3):** la reaccion NUNCA regenera al
 *    usuario; conserva `id`, `seudonimo`, `perfilConductual`, `estiloEscritura`
 *    e `intereses`. Solo ajusta su estado conductual (`frecuencia`,
 *    `nivelParticipacion`) y enfoca sus temas.
 *  - **Coherencia con el perfil:** la MAGNITUD del cambio (`factorReaccion`) la
 *    determina la receptividad derivada del perfil (`nivelParticipacion` +
 *    rasgos de `perfilConductual`). Un perfil reservado/pasivo reacciona poco;
 *    uno activo/reactivo reacciona mas. La intensidad del evento la escala.
 *  - **Coherencia con el historial:** los temas de la reaccion CONTINUAN los
 *    temas recientes del historial del usuario, sumando los del evento; nunca
 *    los contradicen ni los descartan.
 *  - **Solo afectados cambian:** un usuario no afectado por el evento conserva
 *    su comportamiento sin cambios.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)" y
 * Requirement 10.4; usa el `ContextoGeneracion`/`PerfilUsuario` de la frontera
 * de la `Capa_Adquisicion`.
 *
 * _Requirements: 10.4_
 */
import type { ContextoGeneracion, PerfilUsuario } from "./dataProvider";

// ---------------------------------------------------------------------------
// Modelo del evento y de la entrada (perfil + historial).
// ---------------------------------------------------------------------------

/** Grado de impacto de un evento del `Escenario` sobre la comunidad simulada. */
export type IntensidadEvento = "baja" | "media" | "alta";

/**
 * Evento relevante del `Escenario` que puede alterar el comportamiento de los
 * `Usuario_Sintetico`. Se deriva de los `eventosDetonantes` del
 * `Escenario_Reutilizable` (ver `escenarios.types.ts`).
 */
export interface EventoEscenario {
    /** Identificador/etiqueta del evento (uno de los `eventosDetonantes`). */
    id: string;
    /** Descripcion legible del evento, util para la nota de contexto. */
    descripcion: string;
    /** Intensidad del impacto del evento. */
    intensidad: IntensidadEvento;
    /** Temas/topicos que toca el evento; matchean intereses/historial. */
    temasAfectados: string[];
    /** Actores/roles afectados; matchean `perfilConductual`/`nivelParticipacion`. */
    actoresAfectados?: string[];
    /** `Semana_Simulada` en la que ocurre el evento. */
    semana: number;
}

/**
 * Registro minimo de actividad historica necesario para razonar la coherencia
 * de la reaccion con el historial. Es estructuralmente compatible con el
 * `RegistroActividad` del `Usuario_Sintetico` persistente.
 */
export interface RegistroHistorialMinimo {
    /** Semana del registro (1..N). */
    numeroSemana: number;
    /** Temas tratados por el usuario en la semana. */
    temas: string[];
    /** Numero de publicaciones del usuario en la semana. */
    publicaciones?: number;
    /** Numero de comentarios del usuario en la semana. */
    comentarios?: number;
}

/**
 * `Usuario_Sintetico` con su historial acumulado, entrada de la reaccion.
 * Estructuralmente compatible con `UsuarioSinteticoPersistente`.
 */
export type UsuarioConHistorial = PerfilUsuario & {
    historial: RegistroHistorialMinimo[];
};

/**
 * Resultado de la reaccion de un `Usuario_Sintetico` a un evento del
 * `Escenario`. El `perfilModificado` se integra en el `ContextoGeneracion` de
 * la siguiente generacion (Req. 10.4).
 */
export interface ReaccionUsuario {
    /** Id del `Usuario_Sintetico` (se conserva; no se regenera). */
    usuarioId: string;
    /** `true` si el evento afecta a este usuario. */
    afectado: boolean;
    /** Perfil ajustado a integrar en la proxima generacion. */
    perfilModificado: PerfilUsuario;
    /** Magnitud de la reaccion en [0, 1]; 0 si no afectado. */
    factorReaccion: number;
    /** Temas en los que el usuario enfocara su comportamiento (historial + evento). */
    temasReaccion: string[];
    /** Nota legible y coherente para inyectar en el contexto/prompt. */
    nota: string;
}

// ---------------------------------------------------------------------------
// Helpers puros.
// ---------------------------------------------------------------------------

/** Acota `valor` al intervalo cerrado `[min, max]`. */
function clamp(valor: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, valor));
}

/** Redondea a 2 decimales para `factorReaccion` estable y comparable. */
function redondear2(valor: number): number {
    return Math.round(valor * 100) / 100;
}

/** Normaliza texto: minusculas y sin diacriticos, para matching robusto. */
function normalizar(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/** Une listas conservando el primer casing visto y eliminando duplicados. */
function unicos(...listas: string[][]): string[] {
    const vistos = new Set<string>();
    const salida: string[] = [];
    for (const lista of listas) {
        for (const valor of lista) {
            const clave = normalizar(valor);
            if (clave.length > 0 && !vistos.has(clave)) {
                vistos.add(clave);
                salida.push(valor);
            }
        }
    }
    return salida;
}

/** `true` si alguna entrada de `a` solapa (substring en cualquier sentido) con `b`. */
function solapan(a: string[], b: string[]): boolean {
    const na = a.map(normalizar).filter((x) => x.length > 0);
    const nb = b.map(normalizar).filter((x) => x.length > 0);
    return na.some((x) => nb.some((y) => x.includes(y) || y.includes(x)));
}

/** Rasgos de perfil que AMPLIFICAN la reaccion. */
const RASGOS_AMPLIFICAN = ["activ", "lider", "reactiv", "impulsiv", "expresiv", "extrovert"];
/** Rasgos de perfil que ATENUAN la reaccion. */
const RASGOS_ATENUAN = ["reservad", "pasiv", "observad", "timid", "introvert", "calmad"];

/** Tres niveles de participacion en orden ascendente. */
const TIERS_PARTICIPACION = ["bajo", "medio", "alto"] as const;

/**
 * Receptividad del usuario al evento, en `[0, 1]`, derivada de su perfil:
 * `nivelParticipacion` como base y los rasgos de `perfilConductual` como ajuste.
 * Coherencia con el perfil: a mayor receptividad, mayor magnitud de reaccion.
 */
export function receptividadPerfil(usuario: PerfilUsuario): number {
    const nivel = normalizar(usuario.nivelParticipacion);
    let base = nivel.startsWith("alt")
        ? 0.9
        : nivel.startsWith("med")
            ? 0.6
            : nivel.startsWith("baj")
                ? 0.3
                : 0.5;
    const perfil = normalizar(usuario.perfilConductual);
    if (RASGOS_AMPLIFICAN.some((k) => perfil.includes(k))) base += 0.1;
    if (RASGOS_ATENUAN.some((k) => perfil.includes(k))) base -= 0.2;
    return clamp(redondear2(base), 0.1, 1);
}

/** Factor de intensidad del evento: baja=0.25, media=0.5, alta=1.0. */
export function factorIntensidad(intensidad: IntensidadEvento): number {
    switch (intensidad) {
        case "alta":
            return 1;
        case "media":
            return 0.5;
        case "baja":
        default:
            return 0.25;
    }
}

/**
 * Indica si un evento es RELEVANTE: debe acotar a quien afecta mediante temas
 * o actores. Un evento sin temas ni actores no altera a ningun usuario.
 */
export function eventoEsRelevante(evento: EventoEscenario): boolean {
    return evento.temasAfectados.length > 0 || (evento.actoresAfectados ?? []).length > 0;
}

/**
 * Decide si un `Usuario_Sintetico` esta afectado por el evento: por solape de
 * sus intereses o temas historicos con los temas del evento, o por coincidencia
 * de su perfil/participacion/intereses con los actores afectados.
 */
export function usuarioAfectado(usuario: UsuarioConHistorial, evento: EventoEscenario): boolean {
    if (!eventoEsRelevante(evento)) return false;

    const temasHistoricos = usuario.historial.flatMap((r) => r.temas);
    const temasUsuario = [...usuario.intereses, ...temasHistoricos];
    const matchTema = solapan(temasUsuario, evento.temasAfectados);

    const actores = evento.actoresAfectados ?? [];
    const senalesActor = [usuario.perfilConductual, usuario.nivelParticipacion, ...usuario.intereses];
    const matchActor = actores.length > 0 && solapan(senalesActor, actores);

    return matchTema || matchActor;
}

/** Escala un nivel de participacion un escalon hacia arriba (bajo->medio->alto). */
function escalarParticipacion(nivel: string): string {
    const n = normalizar(nivel);
    const idx = TIERS_PARTICIPACION.findIndex((t) => n.startsWith(t.slice(0, 3)));
    if (idx < 0 || idx >= TIERS_PARTICIPACION.length - 1) return nivel;
    return TIERS_PARTICIPACION[idx + 1];
}

/** Devuelve el `RegistroHistorial` mas reciente por `numeroSemana`, o `undefined`. */
function ultimoRegistro(usuario: UsuarioConHistorial): RegistroHistorialMinimo | undefined {
    if (usuario.historial.length === 0) return undefined;
    return [...usuario.historial].sort((a, b) => a.numeroSemana - b.numeroSemana).at(-1);
}

/** Extrae los campos de `PerfilUsuario` de una entrada con historial. */
function aPerfil(usuario: UsuarioConHistorial): PerfilUsuario {
    const perfil: PerfilUsuario = {
        id: usuario.id,
        perfilConductual: usuario.perfilConductual,
        frecuencia: usuario.frecuencia,
        estiloEscritura: usuario.estiloEscritura,
        intereses: [...usuario.intereses],
        nivelParticipacion: usuario.nivelParticipacion,
    };
    if (usuario.seudonimo !== undefined) perfil.seudonimo = usuario.seudonimo;
    return perfil;
}

// ---------------------------------------------------------------------------
// Reaccion (logica central).
// ---------------------------------------------------------------------------

/**
 * Calcula la reaccion de UN `Usuario_Sintetico` a un evento del `Escenario`.
 *
 * - No afectado: conserva su comportamiento (`factorReaccion = 0`).
 * - Afectado: intensifica su actividad de forma proporcional a su receptividad
 *   (coherente con el perfil), enfoca los temas continuando su historial
 *   (coherente con el historial) y, ante reacciones fuertes, escala su nivel de
 *   participacion. Conserva su identidad (Req. 10.3).
 */
export function reaccionarUsuario(
    usuario: UsuarioConHistorial,
    evento: EventoEscenario,
): ReaccionUsuario {
    const perfilBase = aPerfil(usuario);

    if (!usuarioAfectado(usuario, evento)) {
        return {
            usuarioId: usuario.id,
            afectado: false,
            perfilModificado: perfilBase,
            factorReaccion: 0,
            temasReaccion: [],
            nota: `${usuario.id} no se ve afectado por "${evento.descripcion}"; mantiene su comportamiento.`,
        };
    }

    const factorReaccion = redondear2(receptividadPerfil(usuario) * factorIntensidad(evento.intensidad));

    // Coherencia con el perfil: la frecuencia sube proporcional al factor; se
    // garantiza un cambio observable (al menos +1) para un usuario afectado.
    const frecuenciaSugerida = Math.round(usuario.frecuencia * (1 + factorReaccion));
    const frecuenciaModificada = clamp(
        Math.max(frecuenciaSugerida, usuario.frecuencia + 1),
        1,
        100000,
    );

    // Coherencia con el perfil: reacciones fuertes escalan la participacion.
    const nivelParticipacion =
        factorReaccion >= 0.5 ? escalarParticipacion(usuario.nivelParticipacion) : usuario.nivelParticipacion;

    // Coherencia con el historial: continua los temas recientes + los del evento.
    const reciente = ultimoRegistro(usuario);
    const temasReaccion = unicos(reciente?.temas ?? [], evento.temasAfectados);

    const perfilModificado: PerfilUsuario = {
        ...perfilBase,
        frecuencia: frecuenciaModificada,
        nivelParticipacion,
    };

    const nota =
        `${usuario.id} (perfil ${usuario.perfilConductual}) reacciona a "${evento.descripcion}" ` +
        `con intensidad ${factorReaccion}: frecuencia ${usuario.frecuencia}->${frecuenciaModificada}, ` +
        `participacion ${usuario.nivelParticipacion}->${nivelParticipacion}, ` +
        `enfocando temas [${temasReaccion.join(", ")}].`;

    return {
        usuarioId: usuario.id,
        afectado: true,
        perfilModificado,
        factorReaccion,
        temasReaccion,
        nota,
    };
}

/**
 * Calcula las reacciones de un conjunto de `Usuario_Sintetico` a un evento.
 * El orden de salida coincide con el de entrada (estable).
 */
export function reaccionarAEvento(
    usuarios: readonly UsuarioConHistorial[],
    evento: EventoEscenario,
): ReaccionUsuario[] {
    return usuarios.map((u) => reaccionarUsuario(u, evento));
}

/**
 * Integra las reacciones en el `ContextoGeneracion` de la SIGUIENTE generacion:
 *
 *  - Reemplaza cada `Usuario_Sintetico` del contexto por su `perfilModificado`
 *    (emparejando por `id`); conserva el orden y a los usuarios sin reaccion.
 *  - Anexa una nota de reacciones a `contextoMemoria` para que el
 *    `IDataProvider` genere contenido coherente con la reaccion (Req. 10.4).
 *
 * Es una transformacion pura: no muta el `ctx` recibido.
 */
export function integrarReaccionesEnContexto(
    ctx: ContextoGeneracion,
    reacciones: readonly ReaccionUsuario[],
): ContextoGeneracion {
    const porId = new Map(reacciones.map((r) => [r.usuarioId, r]));

    const usuariosSinteticos = ctx.usuariosSinteticos.map(
        (u) => porId.get(u.id)?.perfilModificado ?? u,
    );

    const notasAfectados = reacciones.filter((r) => r.afectado).map((r) => r.nota);
    const contextoMemoria =
        notasAfectados.length > 0
            ? `${ctx.contextoMemoria}\n[Reacciones al evento] ${notasAfectados.join(" | ")}`.trim()
            : ctx.contextoMemoria;

    return { ...ctx, usuariosSinteticos, contextoMemoria };
}

/**
 * Punto de entrada de alto nivel del `Modulo_Simulacion`: dado el contexto de la
 * proxima generacion, los usuarios persistentes con historial y un evento del
 * `Escenario`, calcula las reacciones y devuelve el contexto ya integrado para
 * la siguiente generacion (Req. 10.4).
 */
export function aplicarReaccionEscenario(
    ctx: ContextoGeneracion,
    usuarios: readonly UsuarioConHistorial[],
    evento: EventoEscenario,
): { contexto: ContextoGeneracion; reacciones: ReaccionUsuario[] } {
    const reacciones = reaccionarAEvento(usuarios, evento);
    const contexto = integrarReaccionesEnContexto(ctx, reacciones);
    return { contexto, reacciones };
}
