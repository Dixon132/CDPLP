/**
 * Pruebas unitarias del cliente HTTP del `Servicio_IA` (tarea 8.1).
 *
 * Verifican que cada cliente:
 *  - construye el REQUEST con la forma exacta del contrato HTTP del
 *    `Servicio_IA` (`ServicioIA/app/models/*`) y la URL `SERVICIO_IA_URL`;
 *  - MAPEA la RESPONSE HTTP a las INTERFACES ESTABLES del pipeline
 *    (`ResultadoNLP`, `ResultadoVision`, `ResultadoFiltroRelevancia`, `CapaML`),
 *    de modo que `Servicio_IA` y fallback determinista TS sean intercambiables
 *    (Req. 14.5, 15.4, 31.6, 34.6).
 *
 * Se mockea `HttpService`/Axios: NO hay red real (Jest, deterministico).
 *
 * _Requirements: 14.5, 15.4, 31.6, 34.6_
 */
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import type { AxiosResponse } from "axios";

import type { ContratoNormalizado } from "../modules/contracts/contratoNormalizado";
import { Contributividad } from "../modules/analisis/interfaces";
import {
    CapaMlClient,
    FiltroRelevanciaClient,
    ServicioNlpClient,
    ServicioVisionClient,
    SERVICIO_IA_URL_DEFAULT,
} from "./servicio-ia.client";

const BASE_URL = "http://servicio-ia:8000";

/** Construye un `AxiosResponse` minimo con el cuerpo dado. */
function axiosOk<T>(data: T): AxiosResponse<T> {
    return {
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} as never },
    } as AxiosResponse<T>;
}

/** `HttpService` falso cuyo `post` devuelve el cuerpo configurado y registra la llamada. */
function fakeHttp(responseBody: unknown): {
    http: HttpService;
    post: jest.Mock;
} {
    const post = jest.fn((_url: string, _body: unknown) =>
        of(axiosOk(responseBody)),
    );
    const http = { post } as unknown as HttpService;
    return { http, post };
}

/** `ConfigService` falso que resuelve `SERVICIO_IA_URL` al valor dado. */
function fakeConfig(url: string | undefined): ConfigService {
    return {
        get: (_key: string, def?: string) => url ?? def,
    } as unknown as ConfigService;
}

function contratoEjemplo(): ContratoNormalizado {
    return {
        post: { autorId: "u1", texto: "Hoy fue un dia agotador en el colegio" },
        comments: [
            { autorId: "u2", texto: "Te entiendo, paso lo mismo", enRespuestaA: null },
            { autorId: "u3", texto: "#animo", enRespuestaA: "u1" },
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

describe("ServicioIaClient - cliente HTTP del Servicio_IA (tarea 8.1)", () => {
    describe("ServicioNlpClient -> POST /nlp", () => {
        const nlpBody = {
            semantico: {
                resumen: "resumen colectivo",
                terminosClave: ["colegio", "agotador"],
                conversacional: {
                    numIntervenciones: 3,
                    longitudPromedio: 6,
                    diversidadLexica: 0.5,
                },
            },
            emocion: {
                etiqueta: "tension",
                puntuacion: 0.7,
                distribucion: { tension: 0.6, neutral: 0.4 },
            },
            temas: [{ etiqueta: "estres", peso: 0.8, miembros: [0, 1] }],
            entidades: [{ texto: "colegio", tipo: "LOC" }],
            causas: ["carga academica"],
            eventos: ["jornada larga"],
            tendenciasTexto: "intensidad creciente",
        };

        it("envia { contenido[] } a /nlp y mapea la respuesta a ResultadoNLP", async () => {
            const { http, post } = fakeHttp(nlpBody);
            const client = new ServicioNlpClient(http, fakeConfig(BASE_URL));

            const r = await client.analizar(contratoEjemplo());

            // Request: URL + cuerpo { contenido[] } (post primero, luego comentarios).
            expect(post).toHaveBeenCalledTimes(1);
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/nlp`);
            expect(body).toEqual({
                contenido: [
                    "Hoy fue un dia agotador en el colegio",
                    "Te entiendo, paso lo mismo",
                    "#animo",
                ],
            });

            // Response mapeada a la interfaz estable.
            expect(r.derivadoDeComprensionContextual).toBe(true);
            expect(r.semantico.totalItems).toBe(3);
            expect(r.semantico.totalTokens).toBe(18); // round(6 * 3)
            expect(r.semantico.diversidadLexica).toBe(0.5);
            expect(r.semantico.terminosClave.map((t) => t.termino)).toEqual([
                "colegio",
                "agotador",
            ]);
            expect(r.emocional.senal.intensidad).toBe(0.7);
            expect(r.emocional.distribucion).toEqual({ tension: 0.6, neutral: 0.4 });
            expect(r.tematico.grupos).toHaveLength(1);
            expect(r.tematico.grupos[0].itemRefs).toEqual(["post", "comment:0"]);
            expect(r.elementosCausales).toEqual([
                { tipo: "causa", descripcion: "carga academica", soporteRefs: [], confianza: 0 },
                { tipo: "evento", descripcion: "jornada larga", soporteRefs: [], confianza: 0 },
            ]);
            expect(r.conversacional.interacciones).toHaveLength(3);
            expect(r.tendencias).toHaveLength(1);
            expect(r.tendencias[0].descripcion).toBe("intensidad creciente");
        });

        it("devuelve tendencias vacias cuando tendenciasTexto esta vacio", async () => {
            const { http } = fakeHttp({ ...nlpBody, tendenciasTexto: "   " });
            const client = new ServicioNlpClient(http, fakeConfig(BASE_URL));
            const r = await client.analizar(contratoEjemplo());
            expect(r.tendencias).toEqual([]);
        });
    });

    describe("ServicioVisionClient -> POST /vision", () => {
        it("envia { image_description } y mapea a ResultadoVision", async () => {
            const visionBody = {
                scene: "estudiantes en el patio",
                objects: ["estudiantes", "patio"],
                emotion_context: "contexto emocional sereno",
            };
            const { http, post } = fakeHttp(visionBody);
            const client = new ServicioVisionClient(http, fakeConfig(BASE_URL));

            const r = await client.analizar("Un grupo de estudiantes en el patio");

            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/vision`);
            expect(body).toEqual({
                image_description: "Un grupo de estudiantes en el patio",
            });
            expect(r).toEqual(visionBody);
        });
    });

    describe("FiltroRelevanciaClient -> POST /relevancia", () => {
        it("envia { items[] } y mapea contributividad al enum estable", async () => {
            const relevanciaBody = {
                contributivos: [
                    { refId: "post", contributividad: "CONTRIBUTIVO", motivo: "senal" },
                    { refId: "comment:0", contributividad: "CONTRIBUTIVO", motivo: "senal" },
                ],
                noContributivos: [
                    { refId: "comment:1", contributividad: "NO_CONTRIBUTIVO", motivo: "ruido" },
                ],
            };
            const { http, post } = fakeHttp(relevanciaBody);
            const client = new FiltroRelevanciaClient(http, fakeConfig(BASE_URL));

            const r = await client.clasificar(contratoEjemplo());

            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/relevancia`);
            expect(body).toEqual({
                items: [
                    { refId: "post", texto: "Hoy fue un dia agotador en el colegio" },
                    { refId: "comment:0", texto: "Te entiendo, paso lo mismo" },
                    { refId: "comment:1", texto: "#animo" },
                ],
            });
            // Particion sin solape y enum mapeado.
            expect(r.contributivos).toHaveLength(2);
            expect(r.noContributivos).toHaveLength(1);
            expect(r.contributivos[0].contributividad).toBe(Contributividad.CONTRIBUTIVO);
            expect(r.noContributivos[0].contributividad).toBe(
                Contributividad.NO_CONTRIBUTIVO,
            );
        });
    });

    describe("CapaMlClient -> endpoints de la Capa_ML", () => {
        it("embeddings: envia { textos[] } a /embeddings y devuelve los vectores", async () => {
            const { http, post } = fakeHttp({
                vectores: [[0.1, 0.2], [0.3, 0.4]],
                modelo: "BAAI/bge-m3",
                dim: 2,
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const vectores = await client.embeddings(["a", "b"]);
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/embeddings`);
            expect(body).toEqual({ textos: ["a", "b"] });
            expect(vectores).toEqual([[0.1, 0.2], [0.3, 0.4]]);
        });

        it("clustering: serializa los miembros numericos a string[]", async () => {
            const { http, post } = fakeHttp({
                clusters: [{ clusterId: 0, miembros: [0, 2], etiqueta: "tema A" }],
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.clustering([[1], [2], [3]]);
            expect(post.mock.calls[0][0]).toBe(`${BASE_URL}/clustering`);
            expect(r).toEqual([{ clusterId: 0, miembros: ["0", "2"], etiqueta: "tema A" }]);
        });

        it("anomalias: serializa la zona y mapea refId numerico a string", async () => {
            const { http, post } = fakeHttp({
                anomalias: [{ refId: 2, score: 1.5, descripcion: "pico" }],
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.anomalias([[1], [2]], {
                latitud: -16.5,
                longitud: -68.1,
                radioMetros: 500,
            });
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/anomalias`);
            expect(body).toEqual({
                serie: [[1], [2]],
                zona: "lat=-16.5;lon=-68.1;r=500",
            });
            expect(r).toEqual([{ refId: "2", score: 1.5, descripcion: "pico" }]);
        });

        it("tendencias: envia la serie por dimension y mapea la direccion al dominio estable", async () => {
            const { http, post } = fakeHttp({
                tendencias: [
                    { dimension: "estres", direccion: "ascendente", magnitud: 0.4 },
                    { dimension: "animo", direccion: "descendente", magnitud: 0.2 },
                    { dimension: "ruido", direccion: "estable", magnitud: 0 },
                ],
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.tendencias({
                analisisId: "a1",
                institucionId: "i1",
                hastaSemana: 3,
                series: { estres: [1, 2, 3] },
            });
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/tendencias`);
            expect(body).toEqual({ evolucion: { estres: [1, 2, 3] }, zona: undefined });
            expect(r.map((t) => t.direccion)).toEqual(["sube", "baja", "estable"]);
        });

        it("scoreRiesgoCalibrado: modela cada senal como dimension y devuelve el score colectivo", async () => {
            const { http, post } = fakeHttp({ score: 0.42, evidenciaIds: ["e1", "e2"] });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.scoreRiesgoCalibrado({
                comunidadId: "c1",
                numeroSemana: 2,
                senales: [0.3, 0.6],
                evidenciaIds: ["e1", "e2"],
            });
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/score-calibrado`);
            expect(body).toEqual({
                entradaIndice: {
                    comunidadId: "c1",
                    semana: 2,
                    dimensiones: [
                        { nombre: "senal_0", valor: 0.3, minimo: 0, maximo: 1, peso: 1, evidenciaIds: [] },
                        { nombre: "senal_1", valor: 0.6, minimo: 0, maximo: 1, peso: 1, evidenciaIds: [] },
                    ],
                    evidenciaIds: ["e1", "e2"],
                },
            });
            expect(r).toEqual({ score: 0.42, evidenciaIds: ["e1", "e2"] });
        });

        it("calibrar: mapea ReferenciaCorpus y devuelve version + metricas", async () => {
            const { http, post } = fakeHttp({
                version: "cal-1",
                metricas: { cobertura: 0.9, error: 0.1 },
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.calibrar({
                analisisId: "a1",
                numeroSemanas: 5,
                artefactoRef: "ref-xyz",
            });
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/calibrar`);
            expect(body).toEqual({
                referenciaCorpus: {
                    analisisId: "a1",
                    muestras: [],
                    numSemanas: 5,
                    descripcion: "ref-xyz",
                },
            });
            expect(r).toEqual({ version: "cal-1", metricas: { cobertura: 0.9, error: 0.1 } });
        });

        it("buscarSimilares: consulta /embeddings/search con filtro colectivo y respeta el orden", async () => {
            const { http, post } = fakeHttp({
                resultados: [
                    { refId: "v1", similitud: 0.9, refContenido: "c1", semana: 2 },
                    { refId: "v2", similitud: 0.7, refContenido: "c2", semana: null },
                ],
            });
            const client = new CapaMlClient(http, fakeConfig(BASE_URL));
            const r = await client.buscarSimilares({
                texto: "consulta",
                k: 2,
                filtro: { analisisId: "a1" },
            });
            const [url, body] = post.mock.calls[0];
            expect(url).toBe(`${BASE_URL}/embeddings/search`);
            expect(body).toEqual({
                vectorConsulta: undefined,
                texto: "consulta",
                k: 2,
                modelo: undefined,
                filtro: { analisisId: "a1", comunidadId: null },
            });
            expect(r).toEqual([
                { refId: "v1", similitud: 0.9, refContenido: "c1", semana: 2 },
                { refId: "v2", similitud: 0.7, refContenido: "c2", semana: null },
            ]);
        });
    });

    describe("resolucion de SERVICIO_IA_URL", () => {
        it("usa el valor por defecto y normaliza la barra final", async () => {
            const { http, post } = fakeHttp({
                scene: "s",
                objects: [],
                emotion_context: "e",
            });
            // URL con barra final -> se normaliza (sin doble barra).
            const client = new ServicioVisionClient(http, fakeConfig("http://x:8000/"));
            await client.analizar("algo");
            expect(post.mock.calls[0][0]).toBe("http://x:8000/vision");
        });

        it("expone un valor por defecto razonable cuando no hay env var", () => {
            expect(SERVICIO_IA_URL_DEFAULT).toBe("http://localhost:8000");
        });
    });
});
