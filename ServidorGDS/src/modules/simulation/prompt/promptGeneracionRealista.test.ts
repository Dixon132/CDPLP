/**
 * Pruebas deterministas del diseno del prompt de generacion realista (tarea 11.5).
 *
 * Verifican que el prompt construido desde un `ContextoGeneracion` codifica las
 * exigencias del Requirement 6 (y D6):
 *  - atribucion a usuarios persistentes sin inventar identificadores (Req. 6.1);
 *  - variedad emocional y de registro completa (Req. 6.2);
 *  - espanol andino de Bolivia/regional (Req. 6.3, D6);
 *  - regla anti-simplismo (Req. 6.4);
 *  - coherencia con el `Escenario` inmutable y anclaje a la zona (Req. 6.5, 8.6, 33.2);
 *  - formato de salida del `Contrato_Normalizado` sin `metadata`.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6_
 */
import type { ContextoGeneracion } from "../adquisicion/dataProvider";
import {
    construirPromptGeneracion,
    DIMENSIONES_VARIEDAD,
} from "./promptGeneracionRealista";

function contextoEjemplo(): ContextoGeneracion {
    return {
        escenario: "conflicto universitario por el alza de pasajes",
        contextoMemoria: "la semana previa crecio la tension en la federacion",
        contextoSemantico: ["frag-protesta", "frag-asamblea"],
        patronesAcumulados: [
            {
                id: "p1",
                tipo: "polarizacion",
                descripcion: "dos bandos enfrentados por el bloqueo",
                zona: { latitud: -16.5, longitud: -68.15, radioMetros: 800 },
            },
        ],
        usuariosSinteticos: [
            {
                id: "u1",
                perfilConductual: "activo y reactivo",
                frecuencia: 6,
                estiloEscritura: "informal con sarcasmo",
                intereses: ["politica estudiantil", "futbol"],
                nivelParticipacion: "alto",
            },
            {
                id: "u2",
                perfilConductual: "reservado",
                frecuencia: 2,
                estiloEscritura: "breve",
                intereses: ["musica"],
                nivelParticipacion: "bajo",
            },
        ],
        zonaGeografica: { latitud: -16.5, longitud: -68.15, radioMetros: 800 },
        semana: 5,
        comunidad: { institucionId: "inst-1", analisisId: "an-1" },
    };
}

describe("construirPromptGeneracion (tarea 11.5, diseno del prompt realista)", () => {
    it("es determinista: misma entrada produce el mismo prompt", () => {
        const ctx = contextoEjemplo();
        expect(construirPromptGeneracion(ctx)).toBe(construirPromptGeneracion(ctx));
    });

    it("exige espanol andino de Bolivia/regional (Req. 6.3, D6)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toMatch(/espanol andino de Bolivia/i);
        expect(prompt).toMatch(/jerga|modismos/i);
    });

    it("incluye TODAS las dimensiones de variedad emocional (Req. 6.2)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        for (const dimension of DIMENSIONES_VARIEDAD) {
            expect(prompt).toContain(dimension);
        }
    });

    it("codifica la regla anti-simplismo (Req. 6.4)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toMatch(/simplista|monotematico/i);
        expect(prompt).toMatch(/conflicto|desacuerdo/i);
        expect(prompt).toMatch(/ruido/i);
    });

    it("atribuye a usuarios persistentes y prohibe inventar identificadores (Req. 6.1, 10.3)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toContain("u1");
        expect(prompt).toContain("u2");
        expect(prompt).toMatch(/PROHIBIDO inventar nuevos identificadores/i);
        expect(prompt).toMatch(/Identificadores validos: u1, u2/);
        // Pide conversaciones encadenadas via enRespuestaA (Req. 6.1).
        expect(prompt).toMatch(/enRespuestaA/);
    });

    it("preserva el Escenario inmutable y lo exige como contexto coherente (Req. 6.5, 8.6)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toContain("conflicto universitario por el alza de pasajes");
        expect(prompt).toMatch(/inmutable/i);
        expect(prompt).toMatch(/coherente con este escenario/i);
    });

    it("ancla el contenido a la Zona_Geografica (Req. 33.2)", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toContain("lat=-16.5");
        expect(prompt).toContain("lon=-68.15");
        expect(prompt).toContain("radio=800m");
    });

    it("incluye memoria, contexto semantico y patrones acumulados", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toContain("la semana previa crecio la tension en la federacion");
        expect(prompt).toContain("frag-protesta");
        expect(prompt).toContain("polarizacion");
    });

    it("pide la salida JSON del Contrato_Normalizado sin metadata", () => {
        const prompt = construirPromptGeneracion(contextoEjemplo());
        expect(prompt).toMatch(/"post"/);
        expect(prompt).toMatch(/"comments"/);
        expect(prompt).toMatch(/"image_description"/);
        expect(prompt).toMatch(/"hashtags"/);
        // La metadata la agrega el proveedor; no debe pedirse al LLM.
        expect(prompt).not.toMatch(/"metadata"/);
    });

    it("maneja contexto vacio (semana 1 sin historial ni usuarios) sin romperse", () => {
        const ctx: ContextoGeneracion = {
            escenario: "periodo electoral",
            contextoMemoria: "",
            contextoSemantico: [],
            patronesAcumulados: [],
            usuariosSinteticos: [],
            zonaGeografica: { latitud: 0, longitud: 0, radioMetros: 0 },
            semana: 1,
            comunidad: { institucionId: "i", analisisId: "a" },
        };
        const prompt = construirPromptGeneracion(ctx);
        expect(prompt).toMatch(/primera semana/i);
        expect(prompt).toContain("periodo electoral");
        expect(prompt).toMatch(/no inventes identificadores/i);
    });
});
