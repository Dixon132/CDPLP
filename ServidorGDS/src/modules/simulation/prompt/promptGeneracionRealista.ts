/**
 * Diseno del prompt de generacion realista del `Modulo_Simulacion` (tarea 11.5).
 *
 * Funcion PURA y DETERMINISTA que traduce un {@link ContextoGeneracion}
 * longitudinal en el prompt unico que cualquier `IDataProvider` (Gemini en la
 * nube por defecto, Ollama local, u otros futuros) envia al LLM. Centralizar el
 * diseno del prompt aqui garantiza que TODOS los proveedores produzcan contenido
 * con las MISMAS exigencias de realismo, sin acoplar el `Modulo_Simulacion` al
 * LLM concreto (D1, Req. 4.1).
 *
 * El prompt codifica las exigencias del Requirement 6 (y D6):
 *
 *  - **Atribucion a `Usuario_Sintetico` persistentes (Req. 6.1, 10.3):** publica
 *    y comenta SOLO usando los identificadores de los usuarios persistentes del
 *    contexto; prohibido inventar nuevos identificadores. Produce publicaciones,
 *    comentarios y CONVERSACIONES (hilos via `enRespuestaA`).
 *  - **Variedad emocional y de registro (Req. 6.2):** lenguaje cotidiano,
 *    sarcasmo, ironia, contenido positivo/negativo/neutral, contradicciones,
 *    conflictos y ruido (mensajes irrelevantes/off-topic).
 *  - **Espanol andino de Bolivia/regional (Req. 6.3, D6):** modismos y jerga
 *    estudiantil local; nada de espanol neutro de manual.
 *  - **Anti-simplismo (Req. 6.4):** el contenido simplista o monotematico NO
 *    puede ser la unica salida; se acepta contenido simplista solo si va
 *    acompanado de dimensiones emocionales (sarcasmo, ironia, sentimiento).
 *  - **Coherencia con el `Escenario` activo (Req. 6.5, 8.6):** el escenario es
 *    inmutable durante todo el analisis y todo el contenido debe ser coherente
 *    con el, con la `Memoria_Jerarquica`, el contexto semantico y los patrones
 *    acumulados.
 *  - **Anclaje a la `Zona_Geografica` (Req. 33.2):** el contenido refleja la
 *    zona derivada de la `Institucion` + radio de analisis.
 *
 * La salida exigida al LLM es el JSON del `Contrato_Normalizado` SIN `metadata`
 * (el proveedor agrega y valida la `metadata`), de modo que el resultado final
 * sea siempre un `Contrato_Normalizado` valido (Req. 4.6).
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)" y
 * Requirement 6.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6_
 */
import type { ContextoGeneracion, Patron, PerfilUsuario } from "../adquisicion/dataProvider";

/**
 * Dimensiones de variedad emocional y de registro que el contenido generado
 * debe exhibir a lo largo de la `Semana_Simulada` (Req. 6.2). Se exponen como
 * constante para que el prompt y las pruebas compartan una unica fuente.
 */
export const DIMENSIONES_VARIEDAD: readonly string[] = [
    "lenguaje cotidiano",
    "sarcasmo",
    "ironia",
    "contenido positivo",
    "contenido negativo",
    "contenido neutral",
    "contradicciones",
    "conflictos",
    "ruido (mensajes irrelevantes u off-topic)",
] as const;

/**
 * Rasgos de la variedad linguistica exigida: espanol andino de Bolivia/regional
 * con modismos y jerga estudiantil local (Req. 6.3, D6).
 */
export const REGISTRO_ANDINO =
    "espanol andino de Bolivia (modismos y jerga estudiantil local, regional)" as const;

/** Etiqueta de idioma del contenido simulado (Req. 6.3, D6). */
export const IDIOMA_ANDINO = "es-BO" as const;

/** Opciones del diseno del prompt; reservadas para extension futura. */
export interface OpcionesPrompt {
    /** Temperatura sugerida; informativa para el proveedor (no la fija aqui). */
    temperaturaSugerida?: number;
}

/** Formatea la lista de usuarios persistentes con su perfil y estilo. */
function describirUsuarios(usuarios: readonly PerfilUsuario[]): string {
    if (usuarios.length === 0) {
        return "(ninguno: no inventes identificadores; no generes contenido sin usuarios)";
    }
    return usuarios
        .map((u) => {
            const intereses = u.intereses.length > 0 ? u.intereses.join(", ") : "varios";
            return (
                `- ${u.id}: perfil ${u.perfilConductual}; estilo ${u.estiloEscritura}; ` +
                `participacion ${u.nivelParticipacion}; intereses: ${intereses}`
            );
        })
        .join("\n");
}

/** Formatea los patrones/tendencias acumulados detectados hasta la semana. */
function describirPatrones(patrones: readonly Patron[]): string {
    if (patrones.length === 0) {
        return "(ninguno todavia)";
    }
    return patrones.map((p) => `- ${p.tipo}: ${p.descripcion}`).join("\n");
}

/** Formatea los fragmentos de contexto semantico recuperados por similitud. */
function describirSemantico(fragmentos: readonly string[]): string {
    if (fragmentos.length === 0) {
        return "(ninguno)";
    }
    return fragmentos.map((s) => `- ${s}`).join("\n");
}

/**
 * Construye el prompt de generacion realista a partir del contexto longitudinal.
 *
 * Es PURO: la misma entrada produce siempre el mismo prompt, de modo que la
 * orquestacion del `Modulo_Simulacion` sea reproducible en pruebas deterministas.
 */
export function construirPromptGeneracion(
    ctx: ContextoGeneracion,
    _opciones: OpcionesPrompt = {},
): string {
    const idsValidos = ctx.usuariosSinteticos.map((u) => u.id);
    const listaIds = idsValidos.length > 0 ? idsValidos.join(", ") : "(ninguno)";

    return [
        "# Rol",
        "Eres un generador de ecosistemas digitales sinteticos para una comunidad educativa.",
        "Simulas la actividad de una red social estudiantil durante una semana: una",
        "publicacion principal, sus comentarios y las conversaciones (hilos) entre los",
        "usuarios de la comunidad.",
        "",
        "# Lengua y registro (obligatorio)",
        `Escribe TODO el contenido en ${REGISTRO_ANDINO}.`,
        "Usa jerga y modismos locales de forma natural; evita el espanol neutro de manual.",
        "",
        "# Variedad exigida (obligatorio)",
        "El conjunto de publicacion + comentarios debe mostrar variedad emocional y de",
        "registro, combinando a lo largo de la semana:",
        ...DIMENSIONES_VARIEDAD.map((d) => `- ${d}`),
        "No produzcas contenido simplista ni monotematico como unica salida: si incluyes",
        "un mensaje simple, debe ir acompanado de alguna dimension emocional (sarcasmo,",
        "ironia o sentimiento). Incluye al menos un conflicto o desacuerdo y algo de ruido.",
        "",
        "# Atribucion a usuarios persistentes (obligatorio)",
        "Atribuye cada publicacion y comentario UNICAMENTE a estos usuarios persistentes",
        "(reutilizalos; esta PROHIBIDO inventar nuevos identificadores):",
        describirUsuarios(ctx.usuariosSinteticos),
        `Identificadores validos: ${listaIds}.`,
        "Mantente fiel al perfil, estilo e intereses de cada usuario. Construye",
        "conversaciones reales: usa `enRespuestaA` para encadenar respuestas entre ellos.",
        "",
        "# Escenario activo (inmutable durante todo el analisis)",
        ctx.escenario || "(sin escenario definido)",
        "Todo el contenido debe ser coherente con este escenario.",
        "",
        `# Semana simulada: ${ctx.semana}`,
        `# Zona geografica (ancla el contenido): lat=${ctx.zonaGeografica.latitud}, ` +
        `lon=${ctx.zonaGeografica.longitud}, radio=${ctx.zonaGeografica.radioMetros}m`,
        "",
        "# Memoria del historial previo (resumen jerarquico, no semanas crudas)",
        ctx.contextoMemoria || "(sin historial previo: es la primera semana)",
        "",
        "# Contexto semantico recuperado por similitud",
        describirSemantico(ctx.contextoSemantico),
        "",
        "# Patrones/tendencias acumulados detectados",
        describirPatrones(ctx.patronesAcumulados),
        "",
        "# Formato de salida (obligatorio)",
        "Responde UNICAMENTE con un objeto JSON valido con esta forma exacta, sin texto",
        "adicional ni vallas de codigo:",
        "{",
        '  "post": { "autorId": "<id de un usuario valido>", "texto": "<contenido>" },',
        '  "comments": [',
        '    { "autorId": "<id valido>", "texto": "<contenido>", "enRespuestaA": "<id, autorId del post, o null>" }',
        "  ],",
        '  "image_description": "<descripcion textual de una imagen asociada al post>",',
        '  "hashtags": ["#ejemplo"]',
        "}",
    ].join("\n");
}
