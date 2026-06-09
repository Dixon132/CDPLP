/**
 * Asociacion de patrones/tendencias a su `Zona_Geografica` (`Detector_Patrones`).
 *
 * Cada patron o tendencia detectado se persiste junto a la zona (coordenadas de
 * la `Institucion` + radio del `Analisis`) de la `Comunidad_Digital` de origen,
 * de modo que toda conclusion sea TRAZABLE a su ubicacion y comparable entre las
 * distintas `Comunidad_Digital` de un mismo `Analisis` (Req. 33.3, 33.4, 33.5).
 *
 * Diseno: este modulo cubre EXCLUSIVAMENTE la asociacion patron -> zona y su
 * persistencia en `gds_patron`. NO implementa el algoritmo de deteccion de
 * patrones (Req. 16), que entrega los `PatronDetectado` ya identificados.
 *
 * El nucleo de mapeo (`zonaAColumnas`, `aRegistroPatron`, `asociarPatronesAZona`,
 * `agruparPorZona`) es PURO y DETERMINISTA, sin estado ni efectos secundarios,
 * y por tanto directamente testeable. La persistencia a `gds_patron` vive en un
 * servicio delgado (`ServicioDetectorPatrones`) que reutiliza el `prismaClient`
 * compartido del servicio (inyectable para pruebas).
 *
 * Diseno: design.md > "DetectorPatrones" y ERD (`gds_patron`).
 * _Requirements: 33.3, 33.4, 33.5_
 */
import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../utils/prismaClient";
import type { ZonaGeografica } from "../adquisicion/proveedorGeneracion";

/**
 * Patron/tendencia ya detectado, ANTES de asociarse a una zona. El algoritmo de
 * deteccion (Req. 16) produce estos elementos; aqui solo se les ancla su
 * `Zona_Geografica` de origen.
 */
export interface PatronDetectado {
    /** Tipo/categoria del patron o tendencia (p. ej. "tendencia", "anomalia"). */
    tipo: string;
    /** Descripcion legible del patron detectado. */
    descripcion: string;
}

/**
 * Identificadores de la `Comunidad_Digital` (y su `Analisis`) de origen del
 * patron, necesarios para la trazabilidad y la comparacion por zona (Req. 33.4).
 */
export interface OrigenComunidad {
    analisisId: string;
    comunidadId: string;
}

/**
 * Columnas de `Zona_Geografica` tal como se persisten en `gds_patron`
 * (`zona_latitud`, `zona_longitud`, `zona_radio_metros`).
 */
export interface ColumnasZona {
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
}

/**
 * Registro listo para persistir en `gds_patron`: el patron detectado mas su
 * `Zona_Geografica` de origen y los identificadores de comunidad/analisis.
 */
export interface RegistroPatron extends ColumnasZona, OrigenComunidad {
    tipo: string;
    descripcion: string;
}

/**
 * Saneo del radio a entero NO NEGATIVO: `zona_radio_metros` es `Int` en el
 * esquema. Los valores no finitos se tratan como 0; los negativos se acotan a 0;
 * el resto se redondea al entero mas cercano.
 */
export function aRadioMetrosEntero(radioMetros: number): number {
    if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
        return 0;
    }
    return Math.round(radioMetros);
}

/**
 * Mapea una `ZonaGeografica` del dominio a las columnas persistidas en
 * `gds_patron`. Funcion PURA: el corazon de la asociacion patron -> zona.
 *
 * La latitud/longitud (`Float`) se conservan tal cual cuando son finitas; un
 * valor no finito se normaliza a 0 para no corromper la fila. El radio se
 * convierte a entero no negativo (`Int`).
 */
export function zonaAColumnas(zona: ZonaGeografica): ColumnasZona {
    return {
        zonaLatitud: Number.isFinite(zona.latitud) ? zona.latitud : 0,
        zonaLongitud: Number.isFinite(zona.longitud) ? zona.longitud : 0,
        zonaRadioMetros: aRadioMetrosEntero(zona.radioMetros),
    };
}

/**
 * Asocia UN patron detectado a su `Zona_Geografica` y origen, produciendo un
 * `RegistroPatron` listo para persistir. Funcion PURA y DETERMINISTA.
 */
export function aRegistroPatron(
    patron: PatronDetectado,
    zona: ZonaGeografica,
    origen: OrigenComunidad,
): RegistroPatron {
    return {
        analisisId: origen.analisisId,
        comunidadId: origen.comunidadId,
        ...zonaAColumnas(zona),
        tipo: patron.tipo,
        descripcion: patron.descripcion,
    };
}

/**
 * Asocia una lista de patrones detectados a la MISMA `Zona_Geografica` y origen
 * (todos los patrones de una `Comunidad_Digital` comparten su zona). Funcion
 * PURA: preserva el orden y la cardinalidad de la entrada (Req. 33.4).
 */
export function asociarPatronesAZona(
    patrones: readonly PatronDetectado[],
    zona: ZonaGeografica,
    origen: OrigenComunidad,
): RegistroPatron[] {
    return patrones.map((patron) => aRegistroPatron(patron, zona, origen));
}

/**
 * Clave estable de agrupacion por `Zona_Geografica` (coordenadas + radio), usada
 * para comparar patrones entre zonas (Req. 33.5).
 */
export function claveZona(zona: ColumnasZona): string {
    return `${zona.zonaLatitud}|${zona.zonaLongitud}|${zona.zonaRadioMetros}`;
}

/**
 * Agrupa registros de patrones por su `Zona_Geografica` para habilitar la
 * comparacion por zona entre las distintas `Comunidad_Digital` de un `Analisis`
 * (Req. 33.5). Funcion PURA: no muta la entrada y conserva el orden de aparicion.
 */
export function agruparPorZona(
    registros: readonly RegistroPatron[],
): Map<string, RegistroPatron[]> {
    const grupos = new Map<string, RegistroPatron[]>();
    for (const registro of registros) {
        const clave = claveZona(registro);
        const grupo = grupos.get(clave);
        if (grupo) {
            grupo.push(registro);
        } else {
            grupos.set(clave, [registro]);
        }
    }
    return grupos;
}

/**
 * Servicio delgado que persiste los patrones detectados anclados a su
 * `Zona_Geografica` en `gds_patron` (Req. 33.4). El mapeo se delega a las
 * funciones puras de este modulo; el servicio solo orquesta la persistencia.
 *
 * El cliente Prisma es inyectable para facilitar las pruebas y, por defecto,
 * reutiliza el `prismaClient` compartido del servicio.
 */
export class ServicioDetectorPatrones {
    constructor(private readonly client: PrismaClient = prisma) { }

    /**
     * Asocia y persiste los `patrones` detectados a la `zona` de su comunidad de
     * `origen`. Devuelve los registros persistidos (con su zona embebida) para
     * trazabilidad inmediata. Una lista vacia no realiza ninguna escritura.
     */
    async persistirPatrones(
        patrones: readonly PatronDetectado[],
        zona: ZonaGeografica,
        origen: OrigenComunidad,
    ): Promise<RegistroPatron[]> {
        const registros = asociarPatronesAZona(patrones, zona, origen);
        if (registros.length === 0) {
            return [];
        }
        await this.client.patron.createMany({ data: registros });
        return registros;
    }
}

/** Instancia reutilizable lista para inyectarse en el `Controlador_Ciclo`. */
export const servicioDetectorPatrones = new ServicioDetectorPatrones();
