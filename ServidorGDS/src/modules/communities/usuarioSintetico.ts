/**
 * `Usuario_Sintetico` persistente con historial y reutilizacion entre semanas
 * (Req. 10) — modulo de dominio `communities`.
 *
 * Representa una identidad sintetica persistente con perfil conductual,
 * frecuencia de actividad, estilo de escritura, intereses, nivel de
 * participacion, patrones de interaccion e historial acumulado (Req. 10.1). El
 * `Usuario_Sintetico` se mantiene durante todo el ciclo de vida del `Analisis`
 * (Req. 10.2) y se REUTILIZA entre semanas en lugar de regenerarse (Req. 10.3);
 * su historial crece de forma MONOTONICA por `numero_semana`, conservando las
 * semanas previas sin reescribirlas (Req. 10.5).
 *
 * Migracion (tarea 14.2): el nucleo de dominio, construido previamente en el
 * modulo `adquisicion`, se reposiciona aqui como su hogar canonico dentro del
 * subdominio `communities` (Comunidad_Digital / Usuario_Sintetico /
 * Score_Asociacion / Zona_Geografica), de forma analoga a `Score_Asociacion`
 * (tarea 14.1).
 *
 * Diseno:
 * - Los helpers de (de)serializacion, agregacion de patrones de interaccion y
 *   mapeo fila<->dominio son PUROS y deterministas (sin E/S), validables de
 *   forma aislada.
 * - La persistencia a `gds_usuario_sintetico` / `gds_historial_usuario` vive en
 *   `UsuariosSinteticosService`, un provider NestJS inyectable que usa el
 *   `PrismaService` dedicado y se expone tras el token estable
 *   {@link USUARIOS_SINTETICOS}.
 *
 * Diseno: design.md > ERD (`gds_usuario_sintetico`, `gds_historial_usuario`),
 * "Property 14: Persistencia y reutilizacion de usuarios sinteticos".
 * _Requirements: 10.1, 10.2, 10.3, 10.5_
 */
import { Injectable } from '@nestjs/common';
import type {
    HistorialUsuario as HistorialRow,
    Prisma,
    PrismaClient,
    UsuarioSintetico as UsuarioRow,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { prisma as defaultPrisma } from '../../utils/prismaClient';

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
 * `Usuario_Sintetico` persistente completo (Req. 10.1): identificador, perfil
 * conductual, frecuencia, estilo, intereses, participacion, patrones de
 * interaccion e historial acumulado.
 */
export interface UsuarioSinteticoPersistente {
    /** Identificador estable del usuario (no se regenera entre semanas). */
    id: string;
    /** `Comunidad_Digital` a la que pertenece (cascade desde comunidad). */
    comunidadId: string;
    /** Seudonimo anonimizado (siempre presente una vez persistido). */
    seudonimo: string;
    /** Perfil conductual del usuario. */
    perfilConductual: string;
    /** Frecuencia de actividad. */
    frecuencia: number;
    /** Estilo de escritura. */
    estiloEscritura: string;
    /** Intereses del usuario. */
    intereses: string[];
    /** Nivel de participacion. */
    nivelParticipacion: string;
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
        if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
    } catch {
        // Compatibilidad: un valor no-JSON se interpreta como un unico interes.
    }
    return raw.length > 0 ? [raw] : [];
}

/** Normaliza un valor desconocido a un `PatronInteraccion` valido (o `null`). */
function aPatronInteraccion(valor: unknown): PatronInteraccion | null {
    if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;
    const obj = valor as Record<string, unknown>;
    if (typeof obj.tipo !== 'string') return null;
    const conteo = typeof obj.conteo === 'number' ? obj.conteo : 0;
    return typeof obj.con === 'string'
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
        valor !== null && typeof valor === 'object' && !Array.isArray(valor)
            ? (valor as Record<string, unknown>)
            : {};
    const interacciones = Array.isArray(obj.interacciones)
        ? obj.interacciones
            .map(aPatronInteraccion)
            .filter((p): p is PatronInteraccion => p !== null)
        : [];
    const temas = Array.isArray(obj.temas)
        ? obj.temas.filter((t): t is string => typeof t === 'string')
        : [];
    const registro: RegistroActividad = {
        numeroSemana,
        publicaciones: typeof obj.publicaciones === 'number' ? obj.publicaciones : 0,
        comentarios: typeof obj.comentarios === 'number' ? obj.comentarios : 0,
        interacciones,
        temas,
    };
    if (typeof obj.notas === 'string') registro.notas = obj.notas;
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
            const clave = `${it.tipo}::${it.con ?? ''}`;
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
// Frontera estable del servicio.
// ---------------------------------------------------------------------------

/** Porcion minima del cliente Prisma que necesita el servicio. */
export type ClienteUsuarios = Pick<PrismaClient, 'usuarioSintetico' | 'historialUsuario'>;

/**
 * Interfaz estable del servicio de `Usuario_Sintetico` persistente.
 * Los consumidores (Controlador_Ciclo, Modulo_Simulacion) la usan sin conocer
 * el almacen subyacente (Req. 10.2, 10.3, 10.5).
 */
export interface GestorUsuariosSinteticos {
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

/** Token DI estable para inyectar el gestor de `Usuario_Sintetico`. */
export const USUARIOS_SINTETICOS = Symbol('USUARIOS_SINTETICOS');

// ---------------------------------------------------------------------------
// Logica de persistencia compartida (reutilizacion + acumulacion monotonica).
// ---------------------------------------------------------------------------

/** Carga el historial de varias filas de usuario y construye el dominio. */
async function hidratar(
    cliente: ClienteUsuarios,
    rows: UsuarioRow[],
): Promise<UsuarioSinteticoPersistente[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const historiales = await cliente.historialUsuario.findMany({
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

/**
 * Reutiliza los usuarios existentes de la comunidad o, si no hay ninguno, los
 * crea a partir de las semillas. NUNCA regenera identificadores existentes
 * (Req. 10.2, 10.3).
 */
async function obtenerOReutilizarImpl(
    cliente: ClienteUsuarios,
    comunidadId: string,
    semillas: SemillaUsuarioSintetico[],
): Promise<UsuarioSinteticoPersistente[]> {
    const existentes = await cliente.usuarioSintetico.findMany({ where: { comunidadId } });

    // Reutilizacion: si la comunidad ya tiene usuarios, NO se regeneran.
    if (existentes.length > 0) {
        return hidratar(cliente, existentes);
    }

    // Siembra inicial: se crean los usuarios a partir de las semillas.
    const creados: UsuarioRow[] = [];
    for (const semilla of semillas) {
        const row = await cliente.usuarioSintetico.create({
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
    return hidratar(cliente, creados);
}

/** Lista los usuarios persistentes de una comunidad con su historial acumulado. */
async function listarImpl(
    cliente: ClienteUsuarios,
    comunidadId: string,
): Promise<UsuarioSinteticoPersistente[]> {
    const rows = await cliente.usuarioSintetico.findMany({ where: { comunidadId } });
    return hidratar(cliente, rows);
}

/**
 * Acumula un `RegistroActividad` monotonicamente por `numero_semana`,
 * conservando las semanas previas y rechazando una semana no estrictamente
 * creciente (Req. 10.5).
 */
async function acumularHistorialImpl(
    cliente: ClienteUsuarios,
    usuarioId: string,
    registro: RegistroActividad,
): Promise<RegistroActividad> {
    const previos = await cliente.historialUsuario.findMany({ where: { usuarioId } });
    const ultimaSemana = previos.reduce((max, h) => Math.max(max, h.numeroSemana), 0);

    // Invariante de monotonia: la nueva semana debe ser estrictamente mayor
    // que la ultima registrada, conservando las semanas previas (Req. 10.5).
    if (registro.numeroSemana <= ultimaSemana) {
        throw new Error(
            `Historial no monotonico para usuario ${usuarioId}: semana ${registro.numeroSemana} ` +
            `no es mayor que la ultima registrada (${ultimaSemana}).`,
        );
    }

    const row = await cliente.historialUsuario.create({
        data: {
            usuarioId,
            numeroSemana: registro.numeroSemana,
            actividad: serializarActividad(registro),
        },
    });
    return mapHistorialRowToRegistro(row);
}

/** Devuelve el historial acumulado de un usuario, ordenado por semana ascendente. */
async function obtenerHistorialImpl(
    cliente: ClienteUsuarios,
    usuarioId: string,
): Promise<RegistroActividad[]> {
    const rows = await cliente.historialUsuario.findMany({ where: { usuarioId } });
    return rows.map(mapHistorialRowToRegistro).sort((a, b) => a.numeroSemana - b.numeroSemana);
}

// ---------------------------------------------------------------------------
// Provider NestJS y servicio de compatibilidad.
// ---------------------------------------------------------------------------

/**
 * Provider NestJS que gestiona los `Usuario_Sintetico` persistentes sobre el
 * `PrismaService` dedicado, garantizando reutilizacion entre semanas (Req. 10.2,
 * 10.3) y acumulacion monotonica del historial (Req. 10.5).
 *
 * Implementa la frontera estable {@link GestorUsuariosSinteticos}; se expone
 * tras el token {@link USUARIOS_SINTETICOS} en `CommunitiesModule`.
 */
@Injectable()
export class UsuariosSinteticosService implements GestorUsuariosSinteticos {
    constructor(private readonly prisma: PrismaService) { }

    obtenerOReutilizar(
        comunidadId: string,
        semillas: SemillaUsuarioSintetico[],
    ): Promise<UsuarioSinteticoPersistente[]> {
        return obtenerOReutilizarImpl(this.prisma, comunidadId, semillas);
    }

    listar(comunidadId: string): Promise<UsuarioSinteticoPersistente[]> {
        return listarImpl(this.prisma, comunidadId);
    }

    acumularHistorial(
        usuarioId: string,
        registro: RegistroActividad,
    ): Promise<RegistroActividad> {
        return acumularHistorialImpl(this.prisma, usuarioId, registro);
    }

    obtenerHistorial(usuarioId: string): Promise<RegistroActividad[]> {
        return obtenerHistorialImpl(this.prisma, usuarioId);
    }
}

/**
 * Servicio delgado de COMPATIBILIDAD (no-Nest) que reutiliza un cliente Prisma
 * inyectable (por defecto el `prismaClient` compartido). Mantiene la API previa
 * del modulo `adquisicion` para los consumidores que aun no se han migrado a la
 * inyeccion de dependencias y para pruebas con dobles en memoria.
 *
 * @deprecated Prefiera `UsuariosSinteticosService` (token {@link USUARIOS_SINTETICOS})
 * en contextos NestJS.
 */
export class ServicioUsuariosSinteticosPrisma implements GestorUsuariosSinteticos {
    private readonly cliente: ClienteUsuarios;

    constructor(cliente: ClienteUsuarios = defaultPrisma) {
        this.cliente = cliente;
    }

    obtenerOReutilizar(
        comunidadId: string,
        semillas: SemillaUsuarioSintetico[],
    ): Promise<UsuarioSinteticoPersistente[]> {
        return obtenerOReutilizarImpl(this.cliente, comunidadId, semillas);
    }

    listar(comunidadId: string): Promise<UsuarioSinteticoPersistente[]> {
        return listarImpl(this.cliente, comunidadId);
    }

    acumularHistorial(
        usuarioId: string,
        registro: RegistroActividad,
    ): Promise<RegistroActividad> {
        return acumularHistorialImpl(this.cliente, usuarioId, registro);
    }

    obtenerHistorial(usuarioId: string): Promise<RegistroActividad[]> {
        return obtenerHistorialImpl(this.cliente, usuarioId);
    }
}

/** Instancia reutilizable de compatibilidad sobre el `prismaClient` del servicio. */
export const servicioUsuariosSinteticos: GestorUsuariosSinteticos =
    new ServicioUsuariosSinteticosPrisma();
