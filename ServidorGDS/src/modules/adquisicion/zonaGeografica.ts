/**
 * Derivacion y anclaje de la `Zona_Geografica` (tarea 15.2).
 *
 * La `Zona_Geografica` de una `Comunidad_Digital` se define combinando las
 * coordenadas almacenadas de su `Institucion` (latitud, longitud) con el radio
 * de analisis recibido del `Frontend_GDS` (Req. 33.1). Esa zona se incluye en
 * el `ContextoGeneracion` para anclar el contenido simulado por el
 * `Modulo_Simulacion` (Req. 33.2).
 *
 * Todas las funciones de este modulo son PURAS y deterministas: no acceden a
 * red ni a BD, no mutan sus argumentos y devuelven nuevos valores. Esto las
 * hace directamente testeables (unit + PBT Property 37, tarea 15.5).
 *
 * Diseno: design.md > "Capa_Adquisicion (anclaje Zona_Geografica)" y ERD
 * (`gds_comunidad_digital` con su `Zona_Geografica`).
 * _Requirements: 33.1, 33.2_
 */
import type { ContextoGeneracion, ZonaGeografica } from "./proveedorGeneracion";

/**
 * Coordenadas almacenadas de la `Institucion` (Req. 33.1). Se corresponden con
 * la latitud/longitud persistidas por el `Gestor_Instituciones` (Req. 24.3).
 */
export interface CoordenadasInstitucion {
    latitud: number;
    longitud: number;
}

/**
 * Deriva la `Zona_Geografica` combinando EXACTAMENTE las coordenadas de la
 * `Institucion` con el radio de analisis (Req. 33.1, Property 37).
 *
 * Funcion pura: el resultado contiene los mismos valores numericos recibidos,
 * sin transformarlos ni redondearlos. Rechaza valores no finitos para evitar
 * anclar el contenido a una zona invalida.
 *
 * @param latitud      Latitud almacenada de la `Institucion`.
 * @param longitud     Longitud almacenada de la `Institucion`.
 * @param radioMetros  Radio de analisis (en metros) recibido del frontend.
 * @throws RangeError  Si alguna coordenada no es finita o el radio es no finito
 *                     o negativo.
 */
export function derivarZonaGeografica(
    latitud: number,
    longitud: number,
    radioMetros: number,
): ZonaGeografica {
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
        throw new RangeError(
            `Coordenadas no finitas para la Zona_Geografica: (${latitud}, ${longitud}).`,
        );
    }
    if (!Number.isFinite(radioMetros) || radioMetros < 0) {
        throw new RangeError(
            `Radio de analisis invalido para la Zona_Geografica: ${radioMetros}.`,
        );
    }
    return { latitud, longitud, radioMetros };
}

/**
 * Variante que toma las coordenadas ya agrupadas de la `Institucion`. Conserva
 * la combinacion exacta coordenadas + radio (Req. 33.1).
 */
export function derivarZonaDeInstitucion(
    coordenadas: CoordenadasInstitucion,
    radioMetros: number,
): ZonaGeografica {
    return derivarZonaGeografica(coordenadas.latitud, coordenadas.longitud, radioMetros);
}

/**
 * Ancla una `Zona_Geografica` ya derivada en un `ContextoGeneracion`,
 * devolviendo un NUEVO contexto (no muta el original) con la zona fijada
 * (Req. 33.2). El resto del contexto longitudinal se preserva intacto.
 */
export function anclarZonaEnContexto(
    contexto: ContextoGeneracion,
    zona: ZonaGeografica,
): ContextoGeneracion {
    return { ...contexto, zonaGeografica: zona };
}

/**
 * Conveniencia que deriva la `Zona_Geografica` desde las coordenadas de la
 * `Institucion` y el radio de analisis, y la ancla en el `ContextoGeneracion`
 * en un solo paso (Req. 33.1, 33.2).
 */
export function anclarZonaDerivada(
    contexto: ContextoGeneracion,
    coordenadas: CoordenadasInstitucion,
    radioMetros: number,
): ContextoGeneracion {
    const zona = derivarZonaDeInstitucion(coordenadas, radioMetros);
    return anclarZonaEnContexto(contexto, zona);
}
