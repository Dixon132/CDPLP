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
 * Rasgos de la variedad linguistica exigida: English for accurate NLP emotion
 * detection, with context of a Bolivian educational community.
 */
export const REGISTRO_ANDINO =
    "English (informal, colloquial, student slang typical of a Bolivian university community)" as const;

/** Etiqueta de idioma del contenido simulado. */
export const IDIOMA_ANDINO = "en" as const;

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
        "# Role",
        "You are an expert social simulation engine generating a realistic week of",
        "activity for a student digital community. You produce ONE main post, its",
        "comments and threaded conversations between the community's persistent users,",
        "modeling collective emotional dynamics with psychological depth.",
        "",
        "# Language and register (mandatory)",
        `Write ALL content in ${REGISTRO_ANDINO}.`,
        "Use informal, natural language with slang; avoid formal or textbook English.",
        "",
        "# Realism and psychological depth (mandatory)",
        "- Model how real students react emotionally to the active scenario this week.",
        "- Show evolution: if there is previous history, the mood must CONTINUE from it",
        "  (escalate, de-escalate, or shift) coherently, not reset each week.",
        "- Mix individual personalities: some users are anxious, others sarcastic,",
        "  others supportive, others confrontational. Stay true to each profile below.",
        "- Reflect the geographic/local context of the community in references and tone.",
        "",
        "# Required variety and emotional balance (mandatory)",
        "The content MUST be emotionally BALANCED and REALISTIC, not uniformly negative.",
        "Most everyday student conversation is neutral or positive (jokes, plans, support,",
        "daily life). Negative content (stress, conflict, anxiety) should appear ONLY in",
        "proportion to how tense the active scenario actually is:",
        "- If the scenario is calm/positive: generate MOSTLY positive and neutral content,",
        "  with only minor or occasional negative notes.",
        "- If the scenario is tense/critical: increase the share of negative/conflictive content.",
        "Vary the emotional climate WEEK BY WEEK so the simulation has ups and downs (peaks",
        "and valleys), not a flat constant mood. Some weeks calmer, some weeks more intense.",
        "Across the set, combine: " + DIMENSIONES_VARIEDAD.join(', ') + '.',
        "Generate at least 8-12 messages so no single message dominates the collective signal.",
        "Use EXPRESSIVE punctuation (!!!, ???, ..., CAPS), elongations (nooo, soo, yesss),",
        "and natural texting style. Real social media, not formal writing.",
        "",
        "# Attribution to persistent users (mandatory)",
        "Attribute each post and comment ONLY to these persistent users",
        "(reuse them; inventing new identifiers is FORBIDDEN):",
        describirUsuarios(ctx.usuariosSinteticos),
        `Valid identifiers: ${listaIds}.`,
        "Stay faithful to each user's profile, style and interests. Build real",
        "conversations: use `enRespuestaA` to chain replies between them.",
        "",
        "# Active scenario (immutable during the entire analysis)",
        ctx.escenario || "(no scenario defined)",
        "All content must be coherent with this scenario and reflect its impact",
        `on this specific community (institution id: ${ctx.comunidad.institucionId}).`,
        "",
        `# Simulated week: ${ctx.semana}`,
        `# Geographic zone (anchor content to this local area): lat=${ctx.zonaGeografica.latitud}, ` +
        `lon=${ctx.zonaGeografica.longitud}, radius=${ctx.zonaGeografica.radioMetros}m`,
        "",
        "# Memory of previous history (hierarchical summary, not raw weeks)",
        ctx.contextoMemoria || "(no previous history: this is the first week)",
        "",
        "# Semantic context retrieved by similarity",
        describirSemantico(ctx.contextoSemantico),
        "",
        "# Accumulated patterns/trends detected",
        describirPatrones(ctx.patronesAcumulados),
        "",
        "# Output format (mandatory)",
        "Respond ONLY with a valid JSON object with this exact shape, no additional text",
        "or code fences:",
        "{",
        '  "post": { "autorId": "<valid user id>", "texto": "<content in English>" },',
        '  "comments": [',
        '    { "autorId": "<valid id>", "texto": "<content in English>", "enRespuestaA": "<id, autorId of post, or null>" }',
        "  ],",
        '  "image_description": "<textual description of an image related to the post>",',
        '  "hashtags": ["#example"]',
        "}",
    ].join("\n");
}
