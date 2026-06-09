/**
 * `Servicio_Vision` - Vision computacional con contrato estable (Req. 15).
 *
 * El flujo de vision existe desde la v1 mediante un MOCK con CONTRATO ESTABLE
 * para poder integrar modelos reales (BLIP, Florence-2, Qwen-VL, LLaVA u otros)
 * en el futuro sin cambiar la arquitectura ni el `Pipeline_Analisis`
 * (Req. 15.2, 15.4, D4).
 *
 * Se expone tras una INTERFAZ ESTABLE ({@link ServicioVision}) que recibe la
 * `image_description` textual del `Contrato_Normalizado` y devuelve un
 * {@link ResultadoVision} con `{ scene, objects[], emotion_context }`
 * (Req. 15.1). Aqui se implementa una IMPLEMENTACION MOCK DETERMINISTA
 * ({@link ServicioVisionMock}) apta para pruebas: pura, sin ML real ni red.
 *
 * **Principio clave (Req. 15.3): derivacion exclusiva de la descripcion.**
 * Cuando no hay imagenes reales disponibles, la salida se deriva EXCLUSIVAMENTE
 * de la descripcion visual textual generada por el `Modulo_Simulacion`, SIN
 * usar plantillas por defecto NI devolver respuestas vacias para una entrada no
 * vacia:
 * - `scene` resume la descripcion (frase principal saliente del texto), nunca
 *   un texto fijo;
 * - `objects[]` emergen de los sustantivos/terminos salientes de la propia
 *   descripcion (no de un catalogo fijo);
 * - `emotion_context` se infiere de features contextuales del discurso visual
 *   (intensidad de puntuacion, elongacion, mayusculas y participacion del
 *   vocabulario), no de un lexico palabra->emocion.
 *
 * Toda la logica vive en funciones PURAS y DETERMINISTAS para ser directamente
 * testeable; la clase es un envoltorio delgado e inyectable en el pipeline.
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)" (`ServicioVision`).
 * _Requirements: 15.1, 15.2, 15.3, 15.4_
 */

// ---------------------------------------------------------------------------
// Tipos del resultado de vision (forma fijada por el diseno)
// ---------------------------------------------------------------------------

/**
 * Salida estable del `Servicio_Vision` derivada de `image_description`
 * (Req. 15.1). La forma `{ scene, objects[], emotion_context }` es independiente
 * de la implementacion concreta (mock o modelo real, Req. 15.2).
 */
export interface ResultadoVision {
    /** Descripcion sintetica de la escena, derivada del texto (no plantilla). */
    scene: string;
    /** Objetos/entidades salientes que emergen de la descripcion. */
    objects: string[];
    /** Contexto emocional inferido de features del discurso visual. */
    emotion_context: string;
}

/**
 * `Servicio_Vision` (interfaz estable del diseno).
 *
 * Reemplazable por un modelo real de vision (BLIP/Florence-2/Qwen-VL/LLaVA) o un
 * microservicio Python sin tocar el `Pipeline_Analisis` (Req. 15.2, 15.4). En el
 * pipeline recibe la `image_description` ya proveniente de contenido anonimizado.
 */
export interface ServicioVision {
    /** Deriva la salida de `image_description`; sin plantillas vacias (Req. 15.1, 15.3). */
    analizar(imageDescription: string): Promise<ResultadoVision>;
}

// ---------------------------------------------------------------------------
// Nucleo de calculo: funciones puras y deterministas
// ---------------------------------------------------------------------------

/** Acota un valor al intervalo cerrado `[lo, hi]`. */
function clamp(valor: number, lo: number, hi: number): number {
    if (!Number.isFinite(valor)) {
        return lo;
    }
    return Math.min(hi, Math.max(lo, valor));
}

/** Indica si una descripcion es vacia (vacia o solo espacios en blanco). */
export function esDescripcionVacia(imageDescription: string): boolean {
    return imageDescription.trim().length === 0;
}

/**
 * Tokeniza la descripcion en terminos normalizados (minuscula) usando limites de
 * palabra Unicode, soportando acentos y caracteres no-ASCII del espanol andino.
 * Conserva tokens de longitud >= 3 para reducir ruido estructural (no es una
 * regla lexica de etiquetado).
 */
export function tokenizarDescripcion(imageDescription: string): string[] {
    const encontrados = imageDescription.toLowerCase().match(/[\p{L}\p{N}]+/gu);
    if (!encontrados) {
        return [];
    }
    return encontrados.filter((t) => t.length >= 3);
}

/** Cuenta cuantas veces aparece un patron en el texto. */
function contarCoincidencias(texto: string, patron: RegExp): number {
    const m = texto.match(patron);
    return m ? m.length : 0;
}

/**
 * Deriva el campo `scene`: toma el primer fragmento significativo de la
 * descripcion (hasta el primer separador de frase) y lo normaliza, garantizando
 * un texto NO vacio para una entrada no vacia (Req. 15.1, 15.3). Si la
 * descripcion no contiene separadores, se usa el texto completo recortado.
 */
export function derivarEscena(imageDescription: string): string {
    const limpio = imageDescription.trim().replace(/\s+/g, " ");
    // Primer fragmento hasta un separador de frase (deriva del texto, no fijo).
    const fragmento = limpio.split(/[.;\n!?\u00a1\u00bf]/u)[0]?.trim() ?? "";
    const escena = fragmento.length > 0 ? fragmento : limpio;
    // La escena emerge del propio texto; nunca es una plantilla por defecto.
    return escena;
}

/**
 * Deriva `objects[]`: los terminos salientes que EMERGEN de la descripcion por
 * frecuencia, ordenados por saliencia (frecuencia descendente, luego alfabetico)
 * (Req. 15.1, 15.3). No usa catalogo fijo de objetos. Para una descripcion no
 * vacia que contenga al menos un token, devuelve al menos un objeto.
 */
export function derivarObjetos(imageDescription: string): string[] {
    const tokens = tokenizarDescripcion(imageDescription);
    if (tokens.length === 0) {
        return [];
    }
    const frecuencia = new Map<string, number>();
    for (const tok of tokens) {
        frecuencia.set(tok, (frecuencia.get(tok) ?? 0) + 1);
    }
    return [...frecuencia.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([termino]) => termino)
        .slice(0, 8);
}

/**
 * Deriva `emotion_context`: infiere una etiqueta de contexto emocional a partir
 * de FEATURES CONTEXTUALES del discurso visual (intensidad de puntuacion,
 * elongacion, mayusculas y riqueza del vocabulario), nunca de un lexico
 * palabra->emocion (Req. 15.3). Devuelve siempre una etiqueta NO vacia para una
 * entrada no vacia, evitando respuestas vacias o plantillas fijas.
 */
export function derivarContextoEmocional(imageDescription: string): string {
    const texto = imageDescription.trim();
    const longitud = Math.max(1, texto.length);
    const exclam = contarCoincidencias(texto, /[!\u00a1]/g);
    const preguntas = contarCoincidencias(texto, /[?\u00bf]/g);
    const elong = contarCoincidencias(texto, /(\p{L})\1\1+/gu);
    const letras = contarCoincidencias(texto, /\p{L}/gu);
    const mayus = contarCoincidencias(texto, /\p{Lu}/gu);
    const ratioMayus = letras > 0 ? mayus / letras : 0;

    const intensidad = clamp(((exclam + elong) / longitud) * 12 + ratioMayus, 0, 1);
    const incertidumbre = clamp((preguntas / longitud) * 12, 0, 1);

    // Etiqueta derivada de la combinacion de features (no de palabras concretas).
    let tono: string;
    if (incertidumbre > intensidad && incertidumbre > 0.2) {
        tono = "incertidumbre";
    } else if (intensidad > 0.45) {
        tono = "alta carga";
    } else if (intensidad > 0.15) {
        tono = "carga moderada";
    } else {
        tono = "sereno";
    }

    // Se ancla la etiqueta a un termino saliente para reflejar la escena concreta.
    const objetos = derivarObjetos(imageDescription);
    const ancla = objetos.length > 0 ? ` en torno a "${objetos[0]}"` : "";
    return `contexto emocional ${tono}${ancla}`;
}

/**
 * Calcula el {@link ResultadoVision} completo de forma PURA y DETERMINISTA a
 * partir de `image_description` (Req. 15.1, 15.3). La misma entrada produce
 * siempre la misma salida; no tiene efectos secundarios.
 *
 * @throws {Error} si la descripcion es vacia o solo espacios: el contrato exige
 *   derivar la salida de una descripcion real, sin respuestas vacias ni
 *   plantillas por defecto (Req. 15.3).
 */
export function analizarDescripcion(imageDescription: string): ResultadoVision {
    if (esDescripcionVacia(imageDescription)) {
        throw new Error(
            "Servicio_Vision: image_description vacia; el contrato prohibe respuestas vacias o plantillas por defecto (Req. 15.3)",
        );
    }
    return {
        scene: derivarEscena(imageDescription),
        objects: derivarObjetos(imageDescription),
        emotion_context: derivarContextoEmocional(imageDescription),
    };
}

/**
 * Implementacion MOCK DETERMINISTA del `Servicio_Vision` (interfaz estable).
 *
 * Envoltorio delgado y sin estado sobre {@link analizarDescripcion}: toda la
 * logica vive en funciones puras para mantener el calculo aislado, testeable y
 * reemplazable por un modelo real de vision o microservicio Python sin tocar el
 * `Pipeline_Analisis` (Req. 15.2, 15.4). No realiza ML real ni llamadas de red.
 */
export class ServicioVisionMock implements ServicioVision {
    // `async` para que la validacion de entrada (descripcion vacia) se exponga
    // como un RECHAZO de la promesa y no como un throw sincrono: la interfaz
    // estable devuelve `Promise<ResultadoVision>` y el cliente HTTP del
    // `Servicio_IA` tambien rechaza de forma asincrona ante entradas invalidas
    // (Req. 15.4). Asi ambos cumplen identicas semanticas tras la interfaz.
    async analizar(imageDescription: string): Promise<ResultadoVision> {
        return analizarDescripcion(imageDescription);
    }
}

/** Instancia reutilizable lista para inyectarse en el `Pipeline_Analisis`. */
export const servicioVision = new ServicioVisionMock();
