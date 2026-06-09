/**
 * Pruebas de cableado DI por DISPONIBILIDAD del `AiModule` (tarea 8.3).
 *
 * Verifican que cada TOKEN ESTABLE (`SERVICIO_NLP`, `SERVICIO_VISION`,
 * `FILTRO_RELEVANCIA`, `CAPA_ML`):
 *  - resuelve a un ADAPTADOR proxy-backed que cumple la interfaz estable;
 *  - DELEGA en el PRIMARIO (cliente HTTP del `Servicio_IA`) cuando la sonda
 *    `GET /health` reporta disponibilidad;
 *  - DELEGA en el FALLBACK determinista TS cuando la sonda reporta
 *    indisponibilidad, sin bloquear el ciclo (Req. 31.6, 35.4);
 *
 * de modo que el `Pipeline_Analisis` depende SOLO de las interfaces y la
 * implementacion concreta (HTTP vs fallback) se resuelve en tiempo de llamada.
 *
 * La sonda se controla con un doble (mock), por lo que NO hay red real.
 *
 * _Requirements: 31.6, 35.4_
 */
import { HttpService } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";

import type { ContratoNormalizado } from "../modules/contracts/contratoNormalizado";
import type { FiltroRelevancia } from "../modules/analisis/interfaces";
import type { ServicioNLP } from "../modules/analisis/servicioNLP";
import type { ServicioVision } from "../modules/analisis/servicioVision";
import type { CapaML } from "../modules/ml/capaML";
import { AiModule } from "./ai.module";
import { CapaMlFallback } from "./fallback/capa-ml.fallback";
import { FiltroRelevanciaFallback } from "./fallback/filtro-relevancia.fallback";
import { ServicioNlpFallback } from "./fallback/nlp.fallback";
import { ServicioVisionFallback } from "./fallback/vision.fallback";
import { SondaServicioIaHttp } from "./health/sonda-servicio-ia";
import {
    CAPA_ML,
    FILTRO_RELEVANCIA,
    SERVICIO_NLP,
    SERVICIO_VISION,
} from "./interfaces/tokens";
import {
    CapaMlClient,
    FiltroRelevanciaClient,
    ServicioNlpClient,
    ServicioVisionClient,
} from "./servicio-ia.client";

/** Contrato minimo valido para ejercitar NLP y filtro de relevancia. */
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

/**
 * Construye el `AiModule` con la sonda y los clientes HTTP reemplazados por
 * dobles controlables. `disponible` decide la rama (primario vs fallback) y los
 * clientes se espian/sustituyen para distinguir a quien delega el adaptador.
 */
async function compilarConSonda(disponible: boolean): Promise<{
    moduleRef: TestingModule;
    nlp: ServicioNLP;
    vision: ServicioVision;
    filtro: FiltroRelevancia;
    capaMl: CapaML;
    primarios: {
        nlp: jest.SpyInstance;
        vision: jest.SpyInstance;
        filtro: jest.SpyInstance;
        embeddings: jest.SpyInstance;
    };
    fallbacks: {
        nlp: jest.SpyInstance;
        vision: jest.SpyInstance;
        filtro: jest.SpyInstance;
        embeddings: jest.SpyInstance;
    };
}> {
    const sondaDoble = { disponible: jest.fn(async () => disponible) };

    const moduleRef = await Test.createTestingModule({
        // El `AiModule` resuelve `SERVICIO_IA_URL` de sus clientes HTTP desde
        // ConfigService; en produccion lo provee el ConfigModule global del
        // AppModule. Aqui se importa explicitamente para cargar AiModule aislado.
        imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
    })
        // HttpService no se usa (la sonda esta mockeada y los clientes espiados),
        // pero debe poder resolverse para construir el contenedor.
        .overrideProvider(HttpService)
        .useValue({ get: jest.fn(), post: jest.fn() })
        .overrideProvider(SondaServicioIaHttp)
        .useValue(sondaDoble)
        .compile();

    const resultadoNlp = {
        semantico: { totalItems: 0, totalTokens: 0, diversidadLexica: 0, terminosClave: [] },
        emocional: { senal: { valencia: 0, activacion: 0, intensidad: 0, dispersion: 0 }, distribucion: {} },
        tematico: { grupos: [] },
        elementosCausales: [],
        conversacional: { interacciones: [], hilos: 0, profundidadMaxima: 0 },
        tendencias: [],
        derivadoDeComprensionContextual: true as const,
    };
    const resultadoVision = { scene: "PRIMARIO", objects: ["x"], emotion_context: "ctx" };
    const resultadoFiltro = { contributivos: [], noContributivos: [] };

    // Espias sobre los PRIMARIOS (clientes HTTP): devuelven marcas reconocibles
    // sin tocar la red.
    const clienteNlp = moduleRef.get(ServicioNlpClient);
    const clienteVision = moduleRef.get(ServicioVisionClient);
    const clienteFiltro = moduleRef.get(FiltroRelevanciaClient);
    const clienteCapaMl = moduleRef.get(CapaMlClient);

    const primarios = {
        nlp: jest.spyOn(clienteNlp, "analizar").mockResolvedValue(resultadoNlp),
        vision: jest.spyOn(clienteVision, "analizar").mockResolvedValue(resultadoVision),
        filtro: jest.spyOn(clienteFiltro, "clasificar").mockResolvedValue(resultadoFiltro),
        embeddings: jest.spyOn(clienteCapaMl, "embeddings").mockResolvedValue([[1, 2]]),
    };

    // Espias sobre los FALLBACK deterministas TS.
    const fbNlp = moduleRef.get(ServicioNlpFallback);
    const fbVision = moduleRef.get(ServicioVisionFallback);
    const fbFiltro = moduleRef.get(FiltroRelevanciaFallback);
    const fbCapaMl = moduleRef.get(CapaMlFallback);

    const fallbacks = {
        nlp: jest.spyOn(fbNlp, "analizar"),
        vision: jest.spyOn(fbVision, "analizar"),
        filtro: jest.spyOn(fbFiltro, "clasificar"),
        embeddings: jest.spyOn(fbCapaMl, "embeddings"),
    };

    return {
        moduleRef,
        nlp: moduleRef.get<ServicioNLP>(SERVICIO_NLP),
        vision: moduleRef.get<ServicioVision>(SERVICIO_VISION),
        filtro: moduleRef.get<FiltroRelevancia>(FILTRO_RELEVANCIA),
        capaMl: moduleRef.get<CapaML>(CAPA_ML),
        primarios,
        fallbacks,
    };
}

describe("AiModule - resolucion por DI segun disponibilidad (tarea 8.3)", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("cada token estable resuelve a un adaptador que cumple su interfaz", async () => {
        const { nlp, vision, filtro, capaMl } = await compilarConSonda(true);
        expect(typeof nlp.analizar).toBe("function");
        expect(typeof vision.analizar).toBe("function");
        expect(typeof filtro.clasificar).toBe("function");
        expect(typeof capaMl.embeddings).toBe("function");
        expect(typeof capaMl.clustering).toBe("function");
        expect(typeof capaMl.anomalias).toBe("function");
        expect(typeof capaMl.tendencias).toBe("function");
        expect(typeof capaMl.scoreRiesgoCalibrado).toBe("function");
        expect(typeof capaMl.calibrar).toBe("function");
    });

    describe("Servicio_IA disponible -> delega en el PRIMARIO (cliente HTTP)", () => {
        it("SERVICIO_NLP usa el cliente HTTP", async () => {
            const { nlp, primarios, fallbacks } = await compilarConSonda(true);
            await nlp.analizar(contratoEjemplo());
            expect(primarios.nlp).toHaveBeenCalledTimes(1);
            expect(fallbacks.nlp).not.toHaveBeenCalled();
        });

        it("SERVICIO_VISION usa el cliente HTTP", async () => {
            const { vision, primarios, fallbacks } = await compilarConSonda(true);
            const r = await vision.analizar("Un grupo de estudiantes en el patio");
            expect(r.scene).toBe("PRIMARIO");
            expect(primarios.vision).toHaveBeenCalledTimes(1);
            expect(fallbacks.vision).not.toHaveBeenCalled();
        });

        it("FILTRO_RELEVANCIA usa el cliente HTTP", async () => {
            const { filtro, primarios, fallbacks } = await compilarConSonda(true);
            await filtro.clasificar(contratoEjemplo());
            expect(primarios.filtro).toHaveBeenCalledTimes(1);
            expect(fallbacks.filtro).not.toHaveBeenCalled();
        });

        it("CAPA_ML usa el cliente HTTP", async () => {
            const { capaMl, primarios, fallbacks } = await compilarConSonda(true);
            const r = await capaMl.embeddings(["a", "b"]);
            expect(r).toEqual([[1, 2]]);
            expect(primarios.embeddings).toHaveBeenCalledTimes(1);
            expect(fallbacks.embeddings).not.toHaveBeenCalled();
        });
    });

    describe("Servicio_IA indisponible -> delega en el FALLBACK determinista TS", () => {
        it("SERVICIO_NLP usa el fallback sin bloquear el ciclo", async () => {
            const { nlp, primarios, fallbacks } = await compilarConSonda(false);
            const r = await nlp.analizar(contratoEjemplo());
            expect(r.derivadoDeComprensionContextual).toBe(true);
            expect(fallbacks.nlp).toHaveBeenCalledTimes(1);
            expect(primarios.nlp).not.toHaveBeenCalled();
        });

        it("SERVICIO_VISION usa el fallback", async () => {
            const { vision, primarios, fallbacks } = await compilarConSonda(false);
            const r = await vision.analizar("Un grupo de estudiantes en el patio");
            expect(r.scene.length).toBeGreaterThan(0);
            expect(fallbacks.vision).toHaveBeenCalledTimes(1);
            expect(primarios.vision).not.toHaveBeenCalled();
        });

        it("FILTRO_RELEVANCIA usa el fallback", async () => {
            const { filtro, primarios, fallbacks } = await compilarConSonda(false);
            const r = await filtro.clasificar(contratoEjemplo());
            expect(r.contributivos.length + r.noContributivos.length).toBe(3);
            expect(fallbacks.filtro).toHaveBeenCalledTimes(1);
            expect(primarios.filtro).not.toHaveBeenCalled();
        });

        it("CAPA_ML usa el fallback", async () => {
            const { capaMl, primarios, fallbacks } = await compilarConSonda(false);
            await capaMl.embeddings(["a", "b"]);
            expect(fallbacks.embeddings).toHaveBeenCalledTimes(1);
            expect(primarios.embeddings).not.toHaveBeenCalled();
        });
    });
});
