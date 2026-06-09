/**
 * `Zona_Geografica` de una `Comunidad_Digital` (Req. 33) — modulo de dominio
 * `communities`, hogar canonico de la zona.
 *
 * La `Zona_Geografica` se DERIVA combinando las coordenadas almacenadas de la
 * `Institucion` con el radio de analisis recibido del `Frontend_GDS` (Req.
 * 33.1). Esa zona:
 *
 *  - se INCLUYE en el `ContextoGeneracion` para anclar el contenido generado por
 *    el `Modulo_Simulacion` (Req. 33.2); y
 *  - se PERSISTE junto a cada patron/tendencia detectado para su trazabilidad
 *    por ubicacion (Req. 33.4) y la comparacion por zona entre las distintas
 *    `Comunidad_Digital` de un mismo `Analisis` (Req. 33.5).
 *
 * Diseno (separacion pura/efectos): el nucleo de derivacion, anclaje, mapeo a
 * columnas y comparacion (`derivarZona`, `anclarZona`, `zonaAColumnas`,
 * `claveZona`, `agruparPatronesPorZona`) es PURO y DETERMINISTA, sin estado ni
 * efectos secundarios, y por tanto directamente testeable. La persistencia a
 * `gds_comunidad_digital` (zona de la comunidad) y a `gds_patron` (patrones
 * anclados) vive en el provider NestJS {@link ZonaGeograficaService}, que usa el
 * `PrismaService` dedicado y se expone tras el token estable
 * {@link ZONA_GEOGRAFICA}.
 *
 * Diseno: design.md > "Communities (… Zona_Geografica)", Property 37
 * ("Derivacion y presencia de la zona geografica") y Property 38 ("Trazabilidad
 * de patrones a su zona geografica"); ERD (`gds_comunidad_digital`,
 * `gds_patron`).
 * _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * `Zona_Geografica` de una `Comunidad_Digital`: coordenadas de la `Institucion`
 * combinadas con el radio de analisis recibido del frontend (Req. 33.1).
 *
 * Hogar canonico del tipo dentro del subdominio `communities`. Otros modulos
 * (p. ej. `simulation`/`analisis`) mantienen declaraciones estructuralmente
 * equivalentes hasta su alineacion.
 */
export interface ZonaGeografica {
    /** Latitud de la `Institucion` (Req. 33.1). */
    latitud: number;
    /** Longitud de la `Institucion` (Req. 33.1). */
    longitud: number;
    /** Radio de analisis recibido del frontend, en metros (Req. 33.1). */
    radioMetros: number;
}

/**
 * Coordenadas almacenadas de una `Institucion` (Req. 33.1). Es la parte de la
 * `Zona_Geografica` que NO depende del `Analisis`.
 */
export interface CoordenadasInstitucion {
    latitud: number;
    longitud: number;
}

/**
 * Columnas de `Zona_Geografica` tal como se persisten (`zona_latitud`,
 * `zona_longitud`, `zona_radio_metros`) en `gds_comunidad_digital` y
 * `gds_patron`.
 */
export interface ColumnasZona {
    zonaLatitud: number;
    zonaLongitud: number;
    zonaRadioMetros: number;
}

/**
 * Patron/tendencia ya detectado, ANTES de anclarse a una zona. El algoritmo de
 * deteccion (Req. 16, `Capa_ML`/`Motor_Temporal`/`Detector_Patrones`) produce
 * estos elementos; aqui solo se les asocia su `Zona_Geografica` de origen.
 */
export interface PatronDetectado {
    /** Tipo/categoria del patron o tendencia (p. ej. "tendencia", "anomalia"). */
    tipo: string;
    /** Descripcion legible del patron detectado. */
    descripcion: string;
}

/**
 * Identificadores de la `Comunidad_Digital` (y su `Analisis`) de origen del
 * patron, necesarios para la trazabilidad por zona (Req. 33.4).
 */
export interface OrigenComunidad {
    analisisId: string;
    comunidadId: string;
}

/** Registro listo para persistir en `gds_patron`: patron + zona + origen. */
export interface RegistroPatron extends ColumnasZona, OrigenComunidad {
    tipo: string;
    descripcion: string;
}

/**
 * Saneo del radio a entero NO NEGATIVO: `zona_radio_metros` y `radio_analisis`
 * son `Int` en el esquema. Los valores no finitos o <= 0 se tratan como 0; el
 * resto se redondea al entero mas cercano.
 */
export function aRadioMetrosEntero(radioMetros: number): number {
    if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
        return 0;
    }
    return Math.round(radioMetros);
}

/** Conserva una coordenada finita; normaliza un valor no finito a 0. */
function coordenadaFinita(valor: number): number {
    return Number.isFinite(valor) ? valor : 0;
}

/**
 * DERIVA la `Zona_Geografica` de una `Comunidad_Digital` combinando EXACTAMENTE
 * las coordenadas almacenadas de su `Institucion` con el radio de analisis
 * recibido del frontend (Req. 33.1). Funcion PURA y DETERMINISTA.
 *
 * Las coordenadas finitas se conservan tal cual (una zona refleja la ubicacion
 * real de la institucion); el radio se sanea a entero no negativo para ser
 * coherente con su tipo `Int` persistido y para no corromper la zona ante
 * entradas degeneradas.
 *
 * @param institucion Coordenadas almacenadas de la `Institucion`.
 * @param radioAnalisisMetros Radio de analisis recibido del frontend, en metros.
 */
export function derivarZona(
    institucion: CoordenadasInstitucion,
    radioAnalisisMetros: number,
): ZonaGeografica {
    return {
        latitud: coordenadaFinita(institucion.latitud),
        longitud: coordenadaFinita(institucion.longitud),
        radioMetros: aRadioMetrosEntero(radioAnalisisMetros),
    };
}

/**
 * INCLUYE la `Zona_Geografica` derivada en un `ContextoGeneracion` (Req. 33.2):
 * devuelve una copia del contexto base con su campo `zonaGeografica` fijado a la
 * `zona`, anclando asi el contenido que generara el `Modulo_Simulacion`.
 *
 * Es generica para mantener `communities` desacoplado del tipo concreto
 * `ContextoGeneracion` (definido en `simulation`); cualquier contexto recibe su
 * zona sin mutar la entrada. Funcion PURA.
 */
export function anclarZona<T extends object>(
    contextoBase: T,
    zona: ZonaGeografica,
): T & { zonaGeografica: ZonaGeografica } {
    return { ...contextoBase, zonaGeografica: zona };
}

/**
 * Mapea una `ZonaGeografica` del dominio a las columnas persistidas
 * (`zona_latitud`, `zona_longitud`, `zona_radio_metros`). Funcion PURA: corazon
 * de la asociacion zona -> fila para `gds_comunidad_digital` y `gds_patron`.
 */
export function zonaAColumnas(zona: ZonaGeografica): ColumnasZona {
    return {
        zonaLatitud: coordenadaFinita(zona.latitud),
        zonaLongitud: coordenadaFinita(zona.longitud),
        zonaRadioMetros: aRadioMetrosEntero(zona.radioMetros),
    };
}

/**
 * Asocia UN patron detectado a su `Zona_Geografica` y origen, produciendo un
 * `RegistroPatron` listo para persistir (Req. 33.4). Funcion PURA.
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
 * Ancla una lista de patrones detectados a la MISMA `Zona_Geografica` y origen
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
 * Clave estable de agrupacion por `Zona_Geografica` (coordenadas + radio), para
 * comparar patrones entre zonas (Req. 33.5).
 */
export function claveZona(zona: ColumnasZona): string {
    return `${zona.zonaLatitud}|${zona.zonaLongitud}|${zona.zonaRadioMetros}`;
}

/**
 * Agrupa registros de patrones por su `Zona_Geografica` para habilitar la
 * comparacion por zona entre las distintas `Comunidad_Digital` de un `Analisis`
 * (Req. 33.5). Funcion PURA: no muta la entrada y conserva el orden de aparicion.
 */
export function agruparPatronesPorZona(
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
 * Frontera estable del derivador/anclador de la `Zona_Geografica`. Los
 * consumidores (`Modulo_Simulacion`, `Controlador_Ciclo`) dependen de esta
 * interfaz y no de la implementacion concreta.
 */
export interface DerivadorZonaGeografica {
    /**
     * Deriva la `Zona_Geografica` de `(analisisId, institucionId)` y la persiste
     * en `gds_comunidad_digital` (Req. 33.1).
     */
    derivarYPersistirZonaComunidad(
        analisisId: string,
        institucionId: string,
    ): Promise<ZonaGeografica>;
    /** Persiste los patrones detectados anclados a su zona (Req. 33.4). */
    persistirPatronesConZona(
        patrones: readonly PatronDetectado[],
        zona: ZonaGeografica,
        origen: OrigenComunidad,
    ): Promise<RegistroPatron[]>;
}

/** Token DI estable para inyectar el derivador de la `Zona_Geografica`. */
export const ZONA_GEOGRAFICA = Symbol('ZONA_GEOGRAFICA');

/**
 * Provider NestJS que deriva la `Zona_Geografica` de una `Comunidad_Digital`
 * (coordenadas de la `Institucion` + radio del `Analisis`), la persiste en
 * `gds_comunidad_digital` y ancla cada patron detectado a su zona en
 * `gds_patron` para la trazabilidad y la comparacion por zona (Req. 33.1, 33.4,
 * 33.5). Usa el `PrismaService` dedicado.
 *
 * Implementa la frontera estable {@link DerivadorZonaGeografica}; se expone tras
 * el token {@link ZONA_GEOGRAFICA} en `CommunitiesModule`.
 */
@Injectable()
export class ZonaGeograficaService implements DerivadorZonaGeografica {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lee las coordenadas de la `Institucion` y el radio del `Analisis`, deriva
     * la `Zona_Geografica` (Req. 33.1) y la persiste de forma idempotente en la
     * fila de `gds_comunidad_digital` de `(analisisId, institucionId)`. Devuelve
     * la zona derivada, lista para incluirse en el `ContextoGeneracion` (Req.
     * 33.2) via {@link anclarZona}.
     */
    async derivarYPersistirZonaComunidad(
        analisisId: string,
        institucionId: string,
    ): Promise<ZonaGeografica> {
        const [institucion, analisis] = await Promise.all([
            this.prisma.institucion.findUniqueOrThrow({
                where: { id: institucionId },
                select: { latitud: true, longitud: true },
            }),
            this.prisma.analisis.findUniqueOrThrow({
                where: { id: analisisId },
                select: { radioAnalisis: true },
            }),
        ]);

        const zona = derivarZona(institucion, analisis.radioAnalisis);
        const columnas = zonaAColumnas(zona);

        await this.prisma.comunidad.update({
            where: { analisisId_institucionId: { analisisId, institucionId } },
            data: columnas,
        });

        return zona;
    }

    /**
     * Asocia y persiste los `patrones` detectados a la `zona` de su comunidad de
     * `origen` en `gds_patron` (Req. 33.4). Devuelve los registros persistidos
     * (con su zona embebida) para trazabilidad inmediata. Una lista vacia no
     * realiza ninguna escritura (Req. 16.2: cero patrones es valido).
     */
    async persistirPatronesConZona(
        patrones: readonly PatronDetectado[],
        zona: ZonaGeografica,
        origen: OrigenComunidad,
    ): Promise<RegistroPatron[]> {
        const registros = asociarPatronesAZona(patrones, zona, origen);
        if (registros.length === 0) {
            return [];
        }
        await this.prisma.patron.createMany({ data: registros });
        return registros;
    }
}
