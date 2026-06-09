/**
 * Pruebas de cableado DI del submodulo de FALLBACK de `Servicio_NLP`,
 * `Servicio_Vision` y `Filtro_Relevancia` (Req. 35.3).
 *
 * Verifican que:
 * - cada token estable (`SERVICIO_NLP`, `SERVICIO_VISION`, `FILTRO_RELEVANCIA`)
 *   resuelve a la implementacion fallback determinista registrada;
 * - las implementaciones cumplen las INTERFACES ESTABLES (firmas de metodo) que
 *   tambien cumplira el cliente HTTP del `Servicio_IA`, garantizando que ambos
 *   son intercambiables (Req. 14.5, 15.4, 34.6);
 * - el comportamiento determinista del trabajo previo se conserva.
 *
 * _Requirements: 14.5, 15.4, 34.6, 35.3_
 */
import { Test, type TestingModule } from "@nestjs/testing";

import type { ContratoNormalizado } from "../../modules/contracts/contratoNormalizado";
import { Contributividad } from "../../modules/analisis/interfaces";
import type { ServicioNLP } from "../../modules/analisis/servicioNLP";
import type { ServicioVision } from "../../modules/analisis/servicioVision";
import type { FiltroRelevancia } from "../../modules/analisis/interfaces";
import {
    SERVICIO_NLP,
    SERVICIO_VISION,
    FILTRO_RELEVANCIA,
} from "../interfaces/tokens";
import { NlpVisionFiltroFallbackModule } from "./nlp-vision-filtro-fallback.module";
import { ServicioNlpFallback } from "./nlp.fallback";
import { ServicioVisionFallback } from "./vision.fallback";
import { FiltroRelevanciaFallback } from "./filtro-relevancia.fallback";

/** Contrato minimo valido y anonimizable para los servicios deterministas. */
function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "Hoy fue un dia agotador en el colegio" },
        comments: [
            { autorId: "u2", texto: "Te entiendo, paso lo mismo", enRespuestaA: null },
            { autorId: "u3", texto: "#animo no estas solo", enRespuestaA: "u1" },
        ],
        image_description: "Un grupo de estudiantes conversa en el patio",
        hashtags: ["#animo"],
        metadata: {
            version: "1.0.0",
            fuente: "test",
            generadoEn: "2024-01-01T00:00:00.000Z",
            semana: 1,
            idioma: "es-BO",
        },
    };
}

describe("NlpVisionFiltroFallbackModule - cableado DI (Req. 35.3)", () => {
    let moduleRef: TestingModule;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [NlpVisionFiltroFallbackModule],
        }).compile();
    });

    it("resuelve SERVICIO_NLP a la implementacion fallback determinista", () => {
        const nlp = moduleRef.get<ServicioNlpFallback>(SERVICIO_NLP);
        expect(nlp).toBeInstanceOf(ServicioNlpFallback);
        expect(typeof nlp.analizar).toBe("function");
    });

    it("resuelve SERVICIO_VISION a la implementacion fallback determinista", () => {
        const vision = moduleRef.get<ServicioVisionFallback>(SERVICIO_VISION);
        expect(vision).toBeInstanceOf(ServicioVisionFallback);
        expect(typeof vision.analizar).toBe("function");
    });

    it("resuelve FILTRO_RELEVANCIA a la implementacion fallback determinista", () => {
        const filtro = moduleRef.get<FiltroRelevanciaFallback>(FILTRO_RELEVANCIA);
        expect(filtro).toBeInstanceOf(FiltroRelevanciaFallback);
        expect(typeof filtro.clasificar).toBe("function");
    });

    it("el fallback de NLP cumple la interfaz y es determinista (Req. 14.5)", async () => {
        const nlp: ServicioNLP = moduleRef.get<ServicioNLP>(SERVICIO_NLP);
        const contrato = contratoEjemplo();
        const r1 = await nlp.analizar(contrato);
        const r2 = await nlp.analizar(contrato);
        expect(r1).toEqual(r2); // determinismo
        expect(r1.derivadoDeComprensionContextual).toBe(true);
        expect(r1.semantico.totalItems).toBe(3);
    });

    it("el fallback de Vision deriva la salida estable de image_description (Req. 15.4)", async () => {
        const vision: ServicioVision = moduleRef.get<ServicioVision>(SERVICIO_VISION);
        const r = await vision.analizar("Un grupo de estudiantes conversa en el patio");
        expect(r.scene.length).toBeGreaterThan(0);
        expect(Array.isArray(r.objects)).toBe(true);
        expect(r.objects.length).toBeGreaterThan(0);
        expect(r.emotion_context.length).toBeGreaterThan(0);
    });

    it("el fallback de Filtro_Relevancia particiona contributivo/no-contributivo (Req. 34.6)", async () => {
        const filtro: FiltroRelevancia = moduleRef.get<FiltroRelevancia>(FILTRO_RELEVANCIA);
        const { contributivos, noContributivos } = await filtro.clasificar(contratoEjemplo());
        const totalItems = 1 + contratoEjemplo().comments.length;
        // Particion sin solape: cada item aparece exactamente una vez.
        expect(contributivos.length + noContributivos.length).toBe(totalItems);
        for (const item of [...contributivos, ...noContributivos]) {
            expect([
                Contributividad.CONTRIBUTIVO,
                Contributividad.NO_CONTRIBUTIVO,
            ]).toContain(item.contributividad);
        }
    });
});
