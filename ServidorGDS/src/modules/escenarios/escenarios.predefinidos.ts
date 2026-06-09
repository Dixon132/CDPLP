/**
 * Escenarios PREDEFINIDOS de la `Biblioteca_Escenarios` y función de siembra.
 *
 * Las definiciones son DATOS PUROS: no requieren una base de datos viva para
 * declararse. La función `sembrarEscenariosPredefinidos` los persiste a través
 * del puerto `BibliotecaEscenariosRepositorio` de forma IDEMPOTENTE (no duplica
 * un predefinido que ya exista, identificado por su `nombre`).
 *
 * Idioma del contenido: español de la región andina (Bolivia/regional), D6.
 *
 * _Requirements: 29.1, 29.7, 8.2_
 */
import type {
    BibliotecaEscenariosRepositorio,
    DefinicionEscenario,
    EscenarioReutilizable,
} from "./escenarios.types";

/**
 * Catálogo de escenarios predefinidos soportados (Req. 29.7, 8.2).
 * Definición pura, independiente de cualquier persistencia.
 */
export const ESCENARIOS_PREDEFINIDOS: ReadonlyArray<DefinicionEscenario> = [
    {
        nombre: "Guerra del Gas",
        descripcion:
            "Conflicto sociopolítico por la exportación y el uso de los recursos del gas, con movilizaciones, bloqueos y alta tensión social.",
        contexto:
            "La comunidad educativa vive en medio de un conflicto nacional por el gas: marchas, bloqueos de vías, paros y enfrentamientos. El transporte se interrumpe, las clases se suspenden de forma intermitente y crece la incertidumbre. El estudiantado discute entre la indignación, el miedo y la solidaridad barrial.",
        intensidad: "alta",
        duracionEsperada: 8,
        eventosDetonantes: [
            "anuncio de exportación del gas",
            "bloqueo de carreteras",
            "represión de una marcha",
            "paro cívico indefinido",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "juntas vecinales",
            "sindicatos",
            "fuerzas del orden",
            "autoridades regionales",
        ],
        categoria: "sociopolítico",
        tags: ["gas", "conflicto", "movilización", "bloqueos", "bolivia"],
        configuracionComportamiento: {
            polarizacion: "alta",
            tonoPredominante: "indignación",
            volatilidad: "alta",
        },
        parametros: { ambitoGeografico: "regional", impactoTransporte: "severo" },
        esPredefinido: true,
    },
    {
        nombre: "Conflicto Universitario",
        descripcion:
            "Crisis interna en la universidad por elecciones de autoridades, presupuesto o demandas estudiantiles, con asambleas y tomas de predios.",
        contexto:
            "En la universidad estalla un conflicto por la gestión de autoridades y el presupuesto. Hay asambleas multitudinarias, toma de predios, paro de docentes y división entre frentes estudiantiles. Se mezclan reclamos legítimos con disputas políticas internas y rumores en redes.",
        intensidad: "media",
        duracionEsperada: 6,
        eventosDetonantes: [
            "convocatoria a elecciones de rector",
            "recorte de presupuesto",
            "toma del edificio central",
            "paro de docentes",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "centros de estudiantes",
            "docentes",
            "autoridades universitarias",
            "frentes políticos internos",
        ],
        categoria: "académico",
        tags: ["universidad", "elecciones", "asamblea", "paro", "presupuesto"],
        configuracionComportamiento: {
            polarizacion: "media",
            tonoPredominante: "reivindicativo",
            volatilidad: "media",
        },
        parametros: { ambitoGeografico: "campus", impactoAcademico: "alto" },
        esPredefinido: true,
    },
    {
        nombre: "Crisis Política",
        descripcion:
            "Inestabilidad política nacional con tensión institucional, protestas y fuerte polarización en el discurso público.",
        contexto:
            "El país atraviesa una crisis política: tensión entre poderes, denuncias cruzadas, protestas y contramarchas. La comunidad educativa se polariza, circulan noticias falsas y la conversación digital oscila entre la esperanza, la rabia y el agotamiento por la incertidumbre.",
        intensidad: "alta",
        duracionEsperada: 10,
        eventosDetonantes: [
            "denuncia de fraude",
            "renuncia de autoridades",
            "protestas y contramarchas",
            "declaración de estado de emergencia",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "partidos políticos",
            "organizaciones civiles",
            "medios de comunicación",
            "instituciones del Estado",
        ],
        categoria: "sociopolítico",
        tags: ["política", "crisis", "polarización", "protestas", "desinformación"],
        configuracionComportamiento: {
            polarizacion: "muy alta",
            tonoPredominante: "confrontación",
            volatilidad: "alta",
        },
        parametros: { ambitoGeografico: "nacional", riesgoDesinformacion: "alto" },
        esPredefinido: true,
    },
    {
        nombre: "Pandemia",
        descripcion:
            "Emergencia sanitaria con cuarentenas, clases virtuales, incertidumbre económica y deterioro del bienestar emocional colectivo.",
        contexto:
            "Una emergencia sanitaria obliga a cuarentenas y clases virtuales. La comunidad enfrenta aislamiento, pérdida de rutinas, miedo al contagio y problemas económicos en las familias. Crecen el cansancio, la ansiedad y la sensación de incertidumbre, junto a gestos de apoyo mutuo en línea.",
        intensidad: "alta",
        duracionEsperada: 12,
        eventosDetonantes: [
            "declaración de cuarentena",
            "cierre de instituciones educativas",
            "colapso de servicios de salud",
            "retorno gradual a clases",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "familias",
            "docentes",
            "personal de salud",
            "autoridades sanitarias",
        ],
        categoria: "sanitario",
        tags: ["pandemia", "cuarentena", "salud", "virtualidad", "aislamiento"],
        configuracionComportamiento: {
            polarizacion: "baja",
            tonoPredominante: "ansiedad",
            volatilidad: "media",
        },
        parametros: { ambitoGeografico: "nacional", modalidadClases: "virtual" },
        esPredefinido: true,
    },
    {
        nombre: "Problemas de Transporte",
        descripcion:
            "Conflictos del transporte público (paros, alza de pasajes, bloqueos) que dificultan la asistencia y aumentan el estrés cotidiano.",
        contexto:
            "El transporte público entra en conflicto: paros de choferes, alza de pasajes y bloqueos. Llegar a clases se vuelve un calvario diario, hay tardanzas y ausencias. La conversación mezcla quejas, sarcasmo sobre el caos cotidiano y organización vecinal para compartir movilidad.",
        intensidad: "media",
        duracionEsperada: 4,
        eventosDetonantes: [
            "paro del transporte público",
            "incremento del precio del pasaje",
            "bloqueo de avenidas principales",
            "conflicto entre sindicatos de transporte",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "choferes y sindicatos del transporte",
            "padres y madres de familia",
            "autoridades municipales",
        ],
        categoria: "urbano",
        tags: ["transporte", "paro", "pasajes", "movilidad", "asistencia"],
        configuracionComportamiento: {
            polarizacion: "baja",
            tonoPredominante: "fastidio",
            volatilidad: "baja",
        },
        parametros: { ambitoGeografico: "urbano", impactoTransporte: "alto" },
        esPredefinido: true,
    },
    {
        nombre: "Elecciones",
        descripcion:
            "Periodo electoral con campañas, debates, propaganda intensa y polarización del discurso entre el estudiantado.",
        contexto:
            "Se vive un periodo electoral: campañas, debates, propaganda en cada esquina y en redes. El estudiantado discute candidaturas, comparte memes y se polariza entre el entusiasmo cívico, el escepticismo y la fatiga por la sobreexposición a la propaganda.",
        intensidad: "media",
        duracionEsperada: 6,
        eventosDetonantes: [
            "inicio de campaña electoral",
            "debate de candidatos",
            "jornada electoral",
            "anuncio de resultados",
        ],
        actoresInvolucrados: [
            "estudiantes",
            "candidatos y partidos",
            "organismos electorales",
            "medios y redes sociales",
        ],
        categoria: "sociopolítico",
        tags: ["elecciones", "campaña", "voto", "propaganda", "polarización"],
        configuracionComportamiento: {
            polarizacion: "media",
            tonoPredominante: "debate",
            volatilidad: "media",
        },
        parametros: { ambitoGeografico: "nacional", riesgoDesinformacion: "medio" },
        esPredefinido: true,
    },
];

/**
 * Siembra los escenarios predefinidos en la `Biblioteca_Escenarios` de forma
 * IDEMPOTENTE: solo crea los que aún no existen (por `nombre` entre los
 * predefinidos ya persistidos). Devuelve el conjunto de predefinidos presentes
 * en la biblioteca tras la siembra.
 *
 * No define los datos contra la BD: las definiciones son puras
 * (`ESCENARIOS_PREDEFINIDOS`); esta función solo orquesta su persistencia.
 *
 * _Requirements: 29.1, 29.7_
 */
export async function sembrarEscenariosPredefinidos(
    repo: BibliotecaEscenariosRepositorio,
): Promise<EscenarioReutilizable[]> {
    const existentes = await repo.listar();
    const nombresPredefinidosExistentes = new Set(
        existentes.filter((e) => e.esPredefinido).map((e) => e.nombre),
    );

    const sembrados: EscenarioReutilizable[] = [];
    for (const def of ESCENARIOS_PREDEFINIDOS) {
        if (nombresPredefinidosExistentes.has(def.nombre)) {
            continue;
        }
        const creado = await repo.crear({ ...def, version: 1 });
        sembrados.push(creado);
    }

    // Devuelve todos los predefinidos presentes (los preexistentes + sembrados).
    const trasSiembra = await repo.listar();
    return trasSiembra.filter((e) => e.esPredefinido);
}
