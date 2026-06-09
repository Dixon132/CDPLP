/**
 * Pruebas unitarias de sanidad del `Servicio_Vision` (Req. 15).
 *
 * Verifican la INTERFAZ ESTABLE y la FORMA de la salida
 * (`{ scene, objects[], emotion_context }`), que la salida se DERIVA de la
 * `image_description` (Req. 15.1), el determinismo de la implementacion mock y
 * que NO se usan plantillas por defecto ni respuestas vacias para entradas no
 * vacias, rechazando descripciones vacias (Req. 15.3). El contrato estable se
 * valida de forma exhaustiva con PBT en la sub-tarea 11.3 (Property 21).
 * _Requirements: 15.1, 15.2, 15.3, 15.4_
 */
import { describe, expect, it } from "vitest";

import {
    analizarDescripcion,
    derivarContextoEmocional,
    derivarEscena,
    derivarObjetos,
    esDescripcionVacia,
    ServicioVisionMock,
    servicioVision,
    type ResultadoVision,
} from "./servicioVision";

describe("Servicio_Vision - forma e interfaz estable (Req. 15.1, 15.2)", () => {
    it("devuelve la estructura { scene, objects[], emotion_context } (Req. 15.1)", () => {
        const r: ResultadoVision = analizarDescripcion(
            "una plaza con estudiantes y banderas durante el paro",
        );
        expect(typeof r.scene).toBe("string");
        expect(Array.isArray(r.objects)).toBe(true);
        expect(r.objects.every((o) => typeof o === "string")).toBe(true);
        expect(typeof r.emotion_context).toBe("string");
    });

    it("expone la interfaz estable analizar(): Promise<ResultadoVision> (Req. 15.2)", async () => {
        const mock = new ServicioVisionMock();
        const r = await mock.analizar("una avenida bloqueada con manifestantes");
        expect(r.scene.length).toBeGreaterThan(0);
        expect(r.objects.length).toBeGreaterThan(0);
        expect(r.emotion_context.length).toBeGreaterThan(0);
    });

    it("la instancia exportada es reutilizable e inyectable", async () => {
        const r = await servicioVision.analizar("un mercado lleno de gente");
        expect(r).toHaveProperty("scene");
        expect(r).toHaveProperty("objects");
        expect(r).toHaveProperty("emotion_context");
    });
});

describe("Servicio_Vision - derivacion desde la descripcion (Req. 15.1, 15.3)", () => {
    it("deriva la escena del propio texto (no es plantilla fija)", () => {
        const escena = derivarEscena("una marcha multitudinaria en el centro. Hay humo");
        expect(escena).toBe("una marcha multitudinaria en el centro");
    });

    it("los objetos emergen de los terminos salientes de la descripcion", () => {
        const objetos = derivarObjetos("banderas banderas y carteles en la plaza");
        // "banderas" aparece dos veces -> primero por saliencia.
        expect(objetos[0]).toBe("banderas");
        expect(objetos).toContain("carteles");
        expect(objetos).toContain("plaza");
    });

    it("descripciones distintas producen salidas distintas (no plantilla)", () => {
        const a = analizarDescripcion("estudiantes con pancartas frente a la universidad");
        const b = analizarDescripcion("un atardecer tranquilo sobre el lago");
        expect(a.scene).not.toBe(b.scene);
        expect(a.objects).not.toEqual(b.objects);
    });

    it("es determinista: misma entrada -> misma salida", () => {
        const texto = "una protesta con muchas personas y banderas rojas";
        expect(analizarDescripcion(texto)).toEqual(analizarDescripcion(texto));
    });

    it("el contexto emocional refleja features del discurso visual", () => {
        const sereno = derivarContextoEmocional("una calle vacia al amanecer");
        const intenso = derivarContextoEmocional("CAOS TOTAL!!! fuego por todas partes!!!");
        expect(sereno).not.toBe(intenso);
        expect(sereno.length).toBeGreaterThan(0);
        expect(intenso.length).toBeGreaterThan(0);
    });
});

describe("Servicio_Vision - sin respuestas vacias ni plantillas por defecto (Req. 15.3)", () => {
    it("para entrada no vacia, ningun campo derivado queda vacio", () => {
        const r = analizarDescripcion("un aula con pupitres");
        expect(r.scene.trim().length).toBeGreaterThan(0);
        expect(r.objects.length).toBeGreaterThan(0);
        expect(r.emotion_context.trim().length).toBeGreaterThan(0);
    });

    it("detecta descripciones vacias o de solo espacios", () => {
        expect(esDescripcionVacia("")).toBe(true);
        expect(esDescripcionVacia("   \n\t ")).toBe(true);
        expect(esDescripcionVacia("algo")).toBe(false);
    });

    it("rechaza una descripcion vacia en vez de devolver una plantilla", () => {
        expect(() => analizarDescripcion("")).toThrow();
        expect(() => analizarDescripcion("    ")).toThrow();
    });
});
