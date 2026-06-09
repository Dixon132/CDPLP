/**
 * `Usuario_Sintetico` persistente con historial y reutilizacion entre semanas.
 *
 * Representa una identidad sintetica persistente con perfil conductual,
 * frecuencia de actividad, estilo de escritura, intereses, nivel de
 * participacion, patrones de interaccion e historial acumulado (Req. 10.1).
 *
 * El servicio se apoya en el `prismaClient` reutilizable del servicio sobre la
 * base de datos dedicada (`gds_usuario_sintetico` / `gds_historial_usuario`,
 * tarea 2.1) y garantiza dos invariantes centrales:
 *
 *  - **Reutilizacion (Req. 10.2, 10.3):** los `Usuario_Sintetico` existentes de
 *    una `Comunidad_Digital` se reutilizan entre semanas, NO se regeneran; sus
 *    identificadores se conservan.
 *  - **Acumulacion monotonica (Req. 10.5):** el historial de actividad de cada
 *    usuario crece de forma monotonica por `numero_semana`, conservando las
 *    semanas previas y sin reescribirlas.
 *
 * La logica de reutilizacion/acumulacion es pura respecto al cliente Prisma: se
 * inyecta una porcion minima del cliente (`ClienteUsuarios`), de modo que las
 * pruebas la ejercen con dobles en memoria, sin red.
 *
 * Diseno: design.md > ERD (`gds_usuario_sintetico`, `gds_historial_usuario`),
 * "Property 14: Persistencia y reutilizacion de usuarios sinteticos".
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.5_
 */
import type {
    HistorialUsuario as HistorialRow,
    Prisma,
    PrismaClient,
    UsuarioSintetico as UsuarioRow,
} from "@prisma/client";

import { prisma as defaultPrisma } from "../../utils/prismaClient";
import type { PerfilUsuario } from "./tiposCompartidos";

// ---------------------------------------------------------------------------
// Modelo de dominio del `Usuario_Sintetico` persistente.
// ---------------------------------------------------------------------------

/**
 * Patron de interaccion observado de un `Usuario_Sintetico` (Req. 10.1).
 *
 * Describe con quien y como interactua el usuario (p. ej. responder, mencionar,
 * reaccionar) y cuantas veces. Los patrones se acumulan a partir del historial
 * semanal (`patrones de interaccion e historial` van de la mano en el Req.).
 */
export interface PatronInteraccion {
    /** Seudonimo/id (anonimizado) del usuario con quien interactua. */
    con?: string;
    /** Tipo de interaccion: "responde" | "menciona" | "reacciona" | ... */
    tipo: string;
    /** Numero de ocurrencias en la semana. */
    conteo: number;
}

/**
 * Registro de actividad de una `Semana_Simulada` para un `Usuario_Sintetico`.
 * Es la unidad que se acumula monotonicamente en el historial (Req. 10.5).
 */
export interface RegistroActividad {
    /** Semana del registro (1..N), estrictamente creciente por usuario. */
    numeroSemana: number;
    /** Numero de publicaciones del usuario en la semana. */
    publicaciones: number;
    /** Numero de comentarios del usuario en la semana. */
    comentarios: number;
    /** Patrones de interaccion observados en la semana. */
    interacciones: PatronInteraccion[];
    /** Temas tratados por el usuario en la semana. */
    temas: string[];
    /** Notas libres opcionales (eventos, reacciones al escenario, etc.). */
    notas?: string;
}

/**
 * Semilla para crear un `Usuario_Sintetico` la primera vez que se siembra una
 * `Comunidad_Digital`. Tras la creacion, el usuario se reutiliza (Req. 10.3).
 */
export interface SemillaUsuarioSintetico {
    perfilConductual: string;
    frecuencia: number;
    estiloEscritura: string;
    intereses: string[];
    nivelParticipacion: string;
    /** Seudonimo anonimizado expuesto al frontend (Req. 23.5). */
    seudonimo: string;
}

/**
 * `Usuario_Sintetico` persistente completo (Req. 10.1): perfil conductual,
 * frecuencia, estilo, intereses, participacion, patrones de interaccion e
 * historial acumulado.
 */
export interface UsuarioSinteticoPersistente extends PerfilUsuario {
    /** `Comunidad_Digital` a la que pertenece (cascade desde comunidad). */
    comunidadId: string;
    /** Seudonimo anonimizado (siempre presente una vez persistido). */
    seudonimo: string;
    /** Intereses del usuario. */
    intereses: string[];
    /** Patrones de interaccion agregados a partir del historial acumulado. */
    patronesInteraccion: PatronInteraccion[];
    /** Historial acumulado de actividad, ordenado por semana ascendente. */
    historial: RegistroActividad[];
}

// ---------------------------------------------------------------------------
// Helpers puros (sin E/S) entre la fila Prisma y el dominio. Se exportan para
// validarlos de forma determinista en pruebas unitarias.
// ---------------------------------------------------------------------------

/** Serializa la lista de intereses al string persistido (columna `intereses`). */
export function serializarIntereses(intereses: string[]): string {
    return JSON.stringify(intereses);
}

/** Deserializa el string persistido de intereses a una lista de strings. */
export function parsearIntereses(raw: string): string[] {
    try {
        const v: unknown = JSON.parse(raw);
        if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    } catch {
        // Compatibilidad: un valor no-JSON se interpreta como un unico interes.
    }
    return raw.length > 0 ? [raw] : [];
}

/** Normaliza un valor desconocido a un `PatronInteraccion` valido (o `null`). */
function aPatronInteraccion(valor: unknown): PatronInteraccion | null {
    if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return null;
    const obj = valor as Record<string, unknown>;
    if (typeof obj.tipo !== "string") return null;
    const conteo = typeof obj.conteo === "number" ? obj.conteo : 0;
    return typeof obj.con === "string"
        ? { con: obj.con, tipo: obj.tipo, conteo }
        : { tipo: obj.tipo, conteo };
}

/** Convierte un `PatronInteraccion` a un objeto Json apto para Prisma (sin `undefined`). */
function patronAJson(it: PatronInteraccion): Prisma.InputJsonValue {
    return it.con !== undefined
        ? { con: it.con, tipo: it.tipo, conteo: it.conteo }
        : { tipo: it.tipo, conteo: it.conteo };
}

/** Serializa un `RegistroActividad` al Json persistido en `gds_historial_usuario.actividad`. */
export function serializarActividad(registro: RegistroActividad): Prisma.InputJsonValue {
    const base: Record<string, Prisma.InputJsonValue> = {
        publicaciones: registro.publicaciones,
        comentarios: registro.comentarios,
        interacciones: registro.interacciones.map(patronAJson),
        temas: [...registro.temas],
    };
    if (registro.notas !== undefined) base.notas = registro.notas;
    return base;
}

/** Reconstruye un `RegistroActividad` a partir de la semana y el Json `actividad`. */
export function parsearActividad(
    numeroSemana: number,
    valor: Prisma.JsonValue | null | undefined,
): RegistroActividad {
    const obj =
        valor !== null && typeof valor === "object" && !Array.isArray(valor)
            ? (valor as Record<string, unknown>)
            : {};
    const interacciones = Array.isArray(obj.interacciones)
        ? obj.interacciones
            .map(aPatronInteraccion)
            .filter((p): p is PatronInteraccion => p !== null)
        : [];
    const temas = Array.isArray(obj.temas)
        ? obj.temas.filter((t): t is string => typeof t === "string")
        : [];
    const registro: RegistroActividad = {
        numeroSemana,
        publicaciones: typeof obj.publicaciones === "number" ? obj.publicaciones : 0,
        comentarios: typeof obj.comentarios === "number" ? obj.comentarios : 0,
        interacciones,
        temas,
    };
    if (typeof obj.notas === "string") registro.notas = obj.notas;
    return registro;
}

/** Mapea una fila `gds_historial_usuario` a un `RegistroActividad` de dominio. */
export function mapHistorialRowToRegistro(row: HistorialRow): RegistroActividad {
    return parsearActividad(row.numeroSemana, row.actividad);
}

/**
 * Agrega los patrones de interaccion de todo el historial acumulado sumando los
 * conteos por `(tipo, con)`. Pura: representa "patrones de interaccion" (Req. 10.1)
 * como funcion del historial monotonicamente acumulado.
 */
export function agregarPatronesInteraccion(historial: RegistroActividad[]): PatronInteraccion[] {
    const mapa = new Map<string, PatronInteraccion>();
    for (const registro of historial) {
        for (const it of registro.interacciones) {
            const clave = `${it.tipo}::${it.con ?? ""}`;
            const previo = mapa.get(clave);
            if (previo) previo.conteo += it.conteo;
            else mapa.set(clave, { ...it });
        }
    }
    return [...mapa.values()];
}

/** Mapea una fila `gds_usuario_sintetico` + su historial al dominio persistente. */
export function mapUsuarioRowToDominio(
    row: UsuarioRow,
    historialRows: HistorialRow[],
): UsuarioSinteticoPersistente {
    const historial = historialRows
        .map(mapHistorialRowToRegistro)
        .sort((a, b) => a.numeroSemana - b.numeroSemana);
    return {
        id: row.id,
        comunidadId: row.comunidadId,
        seudonimo: row.seudonimo,
        perfilConductual: row.perfilConductual,
        frecuencia: row.frecuencia,
        estiloEscritura: row.estiloEscritura,
        intereses: parsearIntereses(row.intereses),
        nivelParticipacion: row.nivelParticipacion,
        patronesInteraccion: agregarPatronesInteraccion(historial),
        historial,
    };
}

// ---------------------------------------------------------------------------
// Servicio de usuarios sinteticos.
// ---------------------------------------------------------------------------

/** Porcion minima del cliente Prisma que necesita el servicio. */
export type ClienteUsuarios = Pick<PrismaClient, "usuarioSintetico" | "historialUsuario">;

/**
 * Interfaz estable del servicio de `Usuario_Sintetico` persistente.
 * Los consumidores (Controlador_Ciclo, Modulo_Simulacion) la usan sin conocer
 * el almacen subyacente (Req. 10.2, 10.3, 10.5).
 */
export interface ServicioUsuariosSinteticos {
    /**
     * Reutiliza (NO regenera) los `Usuario_Sintetico` existentes de la comunidad;
     * si todavia no existe ninguno, los crea a partir de las semillas (Req. 10.3).
     */
    obtenerOReutilizar(
        comunidadId: string,
        semillas: SemillaUsuarioSintetico[],
    ): Promise<UsuarioSinteticoPersistente[]>;
    /** Lista los `Usuario_Sintetico` persistentes de una comunidad con su historial. */
    listar(comunidadId: string): Promise<UsuarioSinteticoPersistente[]>;
    /**
     * Acumula un `RegistroActividad` monotonicamente: rechaza semanas no
     * estrictamente crecientes para conservar las previas (Req. 10.5).
     */
    acumularHistorial(usuarioId: string, registro: RegistroActividad): Promise<RegistroActividad>;
    /** Devuelve el historial acumulado de un usuario, ordenado por semana ascendente. */
    obtenerHistorial(usuarioId: string): Promise<RegistroActividad[]>;
}

/**
 * Implementacion del servicio sobre el `prismaClient` reutilizable del servicio.
 * El cliente se inyecta para permitir dobles en memoria en las pruebas.
 */
export class ServicioUsuariosSinteticosPrisma implements ServicioUsuariosSinteticos {
    private readonly cliente: ClienteUsuarios;

    constructor(cliente: ClienteUsuarios = defaultPrisma) {
        this.cliente = cliente;
    }

    async obtenerOReutilizar(
        comunidadId: string,
        semillas: SemillaUsuarioSintetico[],
    ): Promise<UsuarioSinteticoPersistente[]> {
        const existentes = await this.cliente.usuarioSintetico.findMany({
            where: { comunidadId },
        });

        // Reutilizacion: si la comunidad ya tiene usuarios, NO se regeneran.
        if (existentes.length > 0) {
            return this.hidratar(existentes);
        }

        // Siembra inicial: se crean los usuarios a partir de las semillas.
        const creados: UsuarioRow[] = [];
        for (const semilla of semillas) {
            const row = await this.cliente.usuarioSintetico.create({
                data: {
                    comunidadId,
                    seudonimo: semilla.seudonimo,
                    perfilConductual: semilla.perfilConductual,
                    frecuencia: semilla.frecuencia,
                    estiloEscritura: semilla.estiloEscritura,
                    intereses: serializarIntereses(semilla.intereses),
                    nivelParticipacion: semilla.nivelParticipacion,
                },
            });
            creados.push(row);
        }
        return this.hidratar(creados);
    }

    async listar(comunidadId: string): Promise<UsuarioSinteticoPersistente[]> {
        const rows = await this.cliente.usuarioSintetico.findMany({ where: { comunidadId } });
        return this.hidratar(rows);
    }

    async acumularHistorial(
        usuarioId: string,
        registro: RegistroActividad,
    ): Promise<RegistroActividad> {
        const previos = await this.cliente.historialUsuario.findMany({ where: { usuarioId } });
        const ultimaSemana = previos.reduce((max, h) => Math.max(max, h.numeroSemana), 0);

        // Invariante de monotonia: la nueva semana debe ser estrictamente mayor
        // que la ultima registrada, conservando las semanas previas (Req. 10.5).
        if (registro.numeroSemana <= ultimaSemana) {
            throw new Error(
                `Historial no monotonico para usuario ${usuarioId}: semana ${registro.numeroSemana} ` +
                `no es mayor que la ultima registrada (${ultimaSemana}).`,
            );
        }

        const row = await this.cliente.historialUsuario.create({
            data: {
                usuarioId,
                numeroSemana: registro.numeroSemana,
                actividad: serializarActividad(registro),
            },
        });
        return mapHistorialRowToRegistro(row);
    }

    async obtenerHistorial(usuarioId: string): Promise<RegistroActividad[]> {
        const rows = await this.cliente.historialUsuario.findMany({ where: { usuarioId } });
        return rows
            .map(mapHistorialRowToRegistro)
            .sort((a, b) => a.numeroSemana - b.numeroSemana);
    }

    /** Carga el historial de varias filas de usuario y construye el dominio. */
    private async hidratar(rows: UsuarioRow[]): Promise<UsuarioSinteticoPersistente[]> {
        if (rows.length === 0) return [];
        const ids = rows.map((r) => r.id);
        const historiales = await this.cliente.historialUsuario.findMany({
            where: { usuarioId: { in: ids } },
        });
        const porUsuario = new Map<string, HistorialRow[]>();
        for (const h of historiales) {
            const arr = porUsuario.get(h.usuarioId) ?? [];
            arr.push(h);
            porUsuario.set(h.usuarioId, arr);
        }
        return rows.map((r) => mapUsuarioRowToDominio(r, porUsuario.get(r.id) ?? []));
    }
}

/** Instancia reutilizable del servicio sobre el `prismaClient` del servicio. */
export const servicioUsuariosSinteticos: ServicioUsuariosSinteticos =
    new ServicioUsuariosSinteticosPrisma();
