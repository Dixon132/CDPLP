/**
 * Pruebas unitarias del `Filtro_Relevancia` (Req. 34.1, 34.2, 34.3, 34.4, 34.6).
 *
 * Verifican: la INTERFAZ ESTABLE `clasificar(): Promise<ResultadoFiltroRelevancia>`,
 * que la salida es una PARTICION sin solape que cubre todos los items
 * (post + comentarios), que el contenido no-contributivo se CONSERVA y se MARCA
 * (no se elimina) y que la clasificacion base distingue senal de ruido (vacio,
 * solo simbolos, solo marcadores) de forma determinista. La cobertura
 * exhaustiva por propiedades se hace en la sub-tarea 10.2 (Property 39).
 * _Requirements: 34.1, 34.2, 34.3, 34.4, 34.6_
 */
import { describe, expect, it } from "vitest";

import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import { Contributividad } from "../evidencias/interfaces";
import {
    clasificarContrato,
    clasificarItem,
    contarPalabrasInformativas,
    FiltroRelevanciaBase,
    filtroRelevancia,
    quitarMarcadores,
    tieneMarcadores,
} from "./filtroRelevancia";

/** Construye un contrato minimo valido con el post y comentarios indicados. */
function contrato(
    postTexto: string,
    comentarios: string[] = [],
): ContratoNormalizado {
    return {
        post: { autorId: "a0-anon", texto: postTexto },
        comments: comentarios.map((texto, i) => ({
            autorId: `a${i + 1}-anon`,
            texto,
            enRespuestaA: null,
        })),
        image_description: "una plaza con estudiantes",
        hashtags: ["#paro"],
        metadata: {
            version: "1.0.0",
            fuente: "opaca",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
    };
}

describe("Filtro_Relevancia - clasificacion base de un item (Req. 34.1)", () => {
    it("clasifica como CONTRIBUTIVO un texto con palabras informativas", () => {
        const r = clasificarItem({ refId: "post", texto: "el paro afecto las clases hoy" });
        expect(r.contributividad).toBe(Contributividad.CONTRIBUTIVO);
        expect(r.refId).toBe("post");
        expect(r.motivo.length).toBeGreaterThan(0);
    });

    it("clasifica como NO_CONTRIBUTIVO el contenido vacio o en blanco", () => {
        for (const texto of ["", "   ", "\n\t  "]) {
            const r = clasificarItem({ refId: "post", texto });
            expect(r.contributividad).toBe(Contributividad.NO_CONTRIBUTIVO);
            expect(r.motivo).toContain("vacio");
        }
    });

    it("clasifica como NO_CONTRIBUTIVO el contenido puramente simbolico", () => {
        const r = clasificarItem({ refId: "comment:0", texto: "!!! ??? ... 123 :)" });
        expect(r.contributividad).toBe(Contributividad.NO_CONTRIBUTIVO);
    });

    it("clasifica como NO_CONTRIBUTIVO el contenido compuesto solo por marcadores", () => {
        const r = clasificarItem({ refId: "comment:0", texto: "#paro @alguien #lapaz" });
        expect(r.contributividad).toBe(Contributividad.NO_CONTRIBUTIVO);
        expect(r.motivo).toContain("marcadores");
    });

    it("ignora hashtags/menciones pero conserva la senal del texto restante", () => {
        const r = clasificarItem({ refId: "post", texto: "#paro hubo bloqueos @alcaldia" });
        expect(r.contributividad).toBe(Contributividad.CONTRIBUTIVO);
    });

    it("es deterministico: misma entrada -> misma salida", () => {
        const item = { refId: "post", texto: "tension en la universidad" };
        expect(clasificarItem(item)).toStrictEqual(clasificarItem(item));
    });
});

describe("Filtro_Relevancia - helpers puros", () => {
    it("quitarMarcadores elimina hashtags y menciones", () => {
        const limpio = quitarMarcadores("hola #paro @juan mundo");
        expect(limpio).not.toContain("#");
        expect(limpio).not.toContain("@");
        // Las palabras informativas se conservan; los marcadores se sustituyen por espacio.
        expect(limpio.replace(/\s+/gu, " ").trim()).toBe("hola mundo");
    });

    it("tieneMarcadores detecta hashtags y menciones", () => {
        expect(tieneMarcadores("#paro")).toBe(true);
        expect(tieneMarcadores("@juan")).toBe(true);
        expect(tieneMarcadores("sin marcadores")).toBe(false);
    });

    it("contarPalabrasInformativas soporta acentos/no-ASCII y excluye marcadores", () => {
        expect(contarPalabrasInformativas("educación pública")).toBe(2);
        expect(contarPalabrasInformativas("#paro @juan")).toBe(0);
        expect(contarPalabrasInformativas("a !! ??")).toBe(0); // 'a' < longitud minima
    });
});

describe("Filtro_Relevancia - particion del contrato (Req. 34.1, 34.2, 34.3)", () => {
    it("particiona en contributivos/no-contributivos sin solape y cubriendo todo", () => {
        const c = contrato("el paro paralizo la ciudad entera", [
            "totalmente de acuerdo con la marcha",
            "!!!",
            "#paro #lapaz",
            "",
        ]);
        const r = clasificarContrato(c);

        const totalItems = 1 + c.comments.length; // post + comentarios
        expect(r.contributivos.length + r.noContributivos.length).toBe(totalItems);

        const refsContrib = r.contributivos.map((i) => i.refId);
        const refsNo = r.noContributivos.map((i) => i.refId);
        const todos = [...refsContrib, ...refsNo];

        // Sin solape: ningun refId aparece en ambos lados.
        expect(refsContrib.some((ref) => refsNo.includes(ref))).toBe(false);
        // Cobertura exacta: cada item exactamente una vez, sin duplicados.
        expect(new Set(todos).size).toBe(totalItems);
        // Referencias estables y posicionales esperadas.
        expect(new Set(todos)).toStrictEqual(
            new Set(["post", "comment:0", "comment:1", "comment:2", "comment:3"]),
        );
    });

    it("conserva (no elimina) y marca el contenido no-contributivo (Req. 34.3)", () => {
        const c = contrato("noticia con bloqueos en la avenida", ["!!!", "#solohashtag"]);
        const r = clasificarContrato(c);

        // El ruido NO se descarta: queda presente y marcado como NO_CONTRIBUTIVO.
        expect(r.noContributivos.length).toBe(2);
        expect(
            r.noContributivos.every(
                (i) => i.contributividad === Contributividad.NO_CONTRIBUTIVO && i.motivo.length > 0,
            ),
        ).toBe(true);
        expect(r.noContributivos.map((i) => i.refId).sort()).toStrictEqual([
            "comment:0",
            "comment:1",
        ]);
    });

    it("solo el contenido contributivo queda disponible para alimentar el NLP (Req. 34.2)", () => {
        const c = contrato("el conflicto escalo esta semana", ["estoy preocupado por las clases"]);
        const r = clasificarContrato(c);
        expect(r.contributivos.map((i) => i.refId)).toStrictEqual(["post", "comment:0"]);
        expect(
            r.contributivos.every((i) => i.contributividad === Contributividad.CONTRIBUTIVO),
        ).toBe(true);
    });
});

describe("Filtro_Relevancia - interfaz estable (Req. 34.6)", () => {
    it("expone clasificar(): Promise<ResultadoFiltroRelevancia>", async () => {
        const filtro = new FiltroRelevanciaBase();
        const r = await filtro.clasificar(contrato("texto con senal suficiente", ["!!!"]));
        expect(Array.isArray(r.contributivos)).toBe(true);
        expect(Array.isArray(r.noContributivos)).toBe(true);
        expect(r.contributivos).toHaveLength(1);
        expect(r.noContributivos).toHaveLength(1);
    });

    it("la instancia exportada produce el mismo resultado que la funcion pura", async () => {
        const c = contrato("contenido informativo de prueba", ["#ruido", "comentario valido"]);
        await expect(filtroRelevancia.clasificar(c)).resolves.toStrictEqual(clasificarContrato(c));
    });
});
