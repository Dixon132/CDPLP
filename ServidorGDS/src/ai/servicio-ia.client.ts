/**
 * Cliente HTTP del `Servicio_IA` (cerebro analitico en Python) - tarea 8.1.
 *
 * Implementa las CUATRO interfaces estables del `ServidorGDS`
 * ({@link ServicioNLP}, {@link ServicioVision}, {@link CapaML} y
 * {@link FiltroRelevancia}) consumiendo el `Servicio_IA` EXCLUSIVAMENTE sobre
 * HTTP (NestJS `HttpModule`/Axios) en `SERVICIO_IA_URL`. Es el cliente descrito
 * en design.md > "Contrato HTTP del `Servicio_IA`" (D7): el `ServidorGDS`
 * orquesta y no se acopla a la implementacion interna en Python.
 *
 * **Por que cuatro clases y no una.** Las interfaces `ServicioNLP` y
 * `ServicioVision` declaran AMBAS un metodo `analizar(...)` con firmas
 * incompatibles (contrato vs `image_description`), por lo que una unica clase no
 * puede implementarlas a la vez en TypeScript. Se exponen cuatro clientes que
 * comparten la base HTTP ({@link ServicioIaHttpBase}); cada uno se registra bajo
 * su token estable en la resolucion por DI (tarea 8.3), manteniendo el contrato
 * de design.md.
 *
 * Como las FORMAS HTTP del `Servicio_IA` (`app/models/*` en `ServicioIA/`) no
 * son identicas a las INTERFACES ESTABLES del pipeline, estos clientes MAPEAN
 * request/response en ambos sentidos, de modo que el `Servicio_IA` y el fallback
 * determinista TS sean INTERCAMBIABLES sin tocar el `Pipeline_Analisis`
 * (Req. 14.5, 15.4, 31.6, 34.6).
 *
 * Alcance de la tarea 8.1 (deliberado): SOLO los clientes HTTP + su cableado
 * minimo (`HttpModule`). La SONDA de disponibilidad + `ProxyDegradacion`
 * (tarea 8.2) y la resolucion final por DI segun disponibilidad (tarea 8.3) se
 * implementan aparte; este archivo NO los incluye.
 *
 * Diseno: design.md > "Contrato HTTP del `Servicio_IA`".
 * _Requirements: 14.5, 15.4, 31.6, 34.6_
 */
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

import type { ContratoNormalizado } from "../modules/contracts/contratoNormalizado";
import {
    Contributividad,
    type FiltroRelevancia,
    type ItemClasificado,
    type ResultadoFiltroRelevancia,
} from "../modules/analisis/interfaces";
import type {
    AnalisisConversacional,
    AnalisisSemantico,
    ClasificacionTematica,
    DeteccionEmocional,
    ElementoCausal,
    InteraccionConversacional,
    InterpretacionTendencia,
    ResultadoNLP,
    ServicioNLP,
    TerminoClave,
} from "../modules/analisis/servicioNLP";
import type {
    ResultadoVision,
    ServicioVision,
} from "../modules/analisis/servicioVision";
import type {
    Anomalia,
    CapaML,
    EntradaIndice,
    EvolucionTemporal,
    ReferenciaCorpus,
    ResultadoCalibracion,
    ResultadoClustering,
    ScoreCalibrado,
    Tendencia,
    ZonaGeografica,
} from "../modules/ml/capaML";

// ---------------------------------------------------------------------------
// DTOs del contrato HTTP del `Servicio_IA` (forma EXACTA de `ServicioIA/app/models/*`)
// ---------------------------------------------------------------------------

/** `POST /nlp` request: `{ contenido[] }` (anonimizado, contributivo). */
interface NlpRequestDTO {
    contenido: string[];
}

/** `POST /nlp` response (subconjunto consumido). */
interface NlpResponseDTO {
    semantico: {
        resumen: string;
        terminosClave: string[];
        conversacional: {
            numIntervenciones: number;
            longitudPromedio: number;
            diversidadLexica: number;
        };
    };
    emocion: {
        etiqueta: string;
        puntuacion: number;
        distribucion: Record<string, number>;
    };
    temas: Array<{ etiqueta: string; peso: number; miembros: number[] }>;
    entidades: Array<{ texto: string; tipo: string }>;
    causas: string[];
    eventos: string[];
    tendenciasTexto: string;
}

/** `POST /vision` request/response. */
interface VisionRequestDTO {
    image_description: string;
}
interface VisionResponseDTO {
    scene: string;
    objects: string[];
    emotion_context: string;
}

/** `POST /relevancia` request/response. */
interface RelevanciaItemDTO {
    refId: string;
    texto: string;
}
interface RelevanciaRequestDTO {
    items: RelevanciaItemDTO[];
}
interface ItemClasificadoDTO {
    refId: string;
    contributividad: "CONTRIBUTIVO" | "NO_CONTRIBUTIVO";
    motivo: string;
}
interface RelevanciaResponseDTO {
    contributivos: ItemClasificadoDTO[];
    noContributivos: ItemClasificadoDTO[];
}

/** `POST /embeddings` request/response. */
interface EmbeddingsRequestDTO {
    textos: string[];
    modelo?: string;
}
interface EmbeddingsResponseDTO {
    vectores: number[][];
    modelo: string;
    dim: number;
}

/** `POST /embeddings/search` request/response. */
interface EmbeddingsSearchRequestDTO {
    vectorConsulta?: number[];
    texto?: string;
    k?: number;
    modelo?: string;
    filtro?: { analisisId?: string | null; comunidadId?: string | null };
}
interface ResultadoSimilitudDTO {
    refId: string;
    similitud: number;
    refContenido: string;
    semana?: number | null;
}
interface EmbeddingsSearchResponseDTO {
    resultados: ResultadoSimilitudDTO[];
}

/** `POST /clustering` request/response. */
interface ClusteringRequestDTO {
    vectores: number[][];
    k?: number;
}
interface ClusteringResponseDTO {
    clusters: Array<{ clusterId: number; miembros: number[]; etiqueta: string }>;
}

/** `POST /anomalias` request/response. */
interface AnomaliasRequestDTO {
    serie: number[][];
    zona?: string | null;
}
interface AnomaliasResponseDTO {
    anomalias: Array<{ refId: number; score: number; descripcion: string }>;
}

/** `POST /tendencias` request/response. */
interface TendenciasRequestDTO {
    evolucion: Record<string, number[]>;
    zona?: string | null;
}
interface TendenciasResponseDTO {
    tendencias: Array<{ dimension: string; direccion: string; magnitud: number }>;
}

/** `POST /score-calibrado` request/response. */
interface DimensionEntradaDTO {
    nombre: string;
    valor: number;
    minimo: number;
    maximo: number;
    peso: number;
    evidenciaIds: string[];
}
interface EntradaIndiceDTO {
    comunidadId?: string | null;
    semana?: number | null;
    dimensiones: DimensionEntradaDTO[];
    evidenciaIds: string[];
}
interface ScoreCalibradoRequestDTO {
    entradaIndice: EntradaIndiceDTO;
}
interface ScoreCalibradoResponseDTO {
    score: number;
    evidenciaIds: string[];
}

/** `POST /calibrar` request/response. */
interface ReferenciaCorpusDTO {
    analisisId?: string | null;
    muestras: unknown[];
    numSemanas?: number | null;
    descripcion?: string | null;
}
interface CalibrarRequestDTO {
    referenciaCorpus: ReferenciaCorpusDTO;
}
interface CalibrarResponseDTO {
    version: string;
    metricas: Record<string, number>;
}

/**
 * Resultado de `Embeddings_Search` mapeado a la frontera estable del
 * `ServidorGDS` (ordenado por similitud descendente, sin diagnostico
 * individual, Req. 36.3, 36.6, 39.4).
 */
export interface ResultadoBusquedaSemantica {
    refId: string;
    similitud: number;
    refContenido: string;
    semana: number | null;
}

/** Parametros de `Embeddings_Search` (texto o vector + top-k + filtro colectivo). */
export interface ConsultaBusquedaSemantica {
    texto?: string;
    vectorConsulta?: number[];
    k?: number;
    modelo?: string;
    filtro?: { analisisId?: string; comunidadId?: string };
}

/** Variable de entorno con la URL base del `Servicio_IA` (declarada por tarea 1.1). */
export const SERVICIO_IA_URL_ENV = "SERVICIO_IA_URL" as const;

/** URL base por defecto si no se define `SERVICIO_IA_URL` (red interna). */
export const SERVICIO_IA_URL_DEFAULT = "http://localhost:8000" as const;

// ---------------------------------------------------------------------------
// Base HTTP compartida por los cuatro clientes
// ---------------------------------------------------------------------------

/**
 * Base comun de los clientes HTTP del `Servicio_IA`: resuelve la URL base desde
 * `SERVICIO_IA_URL` y ofrece el `POST` JSON tipado. NO incluye degradacion (eso
 * es la tarea 8.2): cualquier fallo HTTP se propaga para que el
 * `ProxyDegradacion` decida el fallback determinista TS.
 */
@Injectable()
export class ServicioIaHttpBase {
    /** URL base normalizada (sin barra final) del `Servicio_IA`. */
    protected readonly baseUrl: string;

    constructor(
        protected readonly http: HttpService,
        config: ConfigService,
    ) {
        const url = config.get<string>(
            SERVICIO_IA_URL_ENV,
            SERVICIO_IA_URL_DEFAULT,
        );
        this.baseUrl = url.replace(/\/+$/, "");
    }

    /** Construye la URL absoluta de un endpoint del `Servicio_IA`. */
    protected endpoint(ruta: string): string {
        return `${this.baseUrl}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
    }

    /** Realiza un `POST` JSON tipado y devuelve el cuerpo de la respuesta. */
    protected async post<TReq, TRes>(ruta: string, body: TReq): Promise<TRes> {
        const respuesta = await firstValueFrom(
            this.http.post<TRes>(this.endpoint(ruta), body),
        );
        return respuesta.data;
    }

    /** Acota un valor finito al intervalo cerrado `[lo, hi]`. */
    protected clamp(valor: number, lo: number, hi: number): number {
        if (!Number.isFinite(valor)) {
            return lo;
        }
        return Math.min(hi, Math.max(lo, valor));
    }
}

// ---------------------------------------------------------------------------
// Servicio_NLP -> POST /nlp (Req. 14.1-14.5)
// ---------------------------------------------------------------------------

/** Cliente HTTP del `Servicio_NLP` sobre `POST /nlp`. */
@Injectable()
export class ServicioNlpClient extends ServicioIaHttpBase implements ServicioNLP {
    async analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP> {
        const contenido = aplanarTextos(contrato);
        const dto = await this.post<NlpRequestDTO, NlpResponseDTO>("/nlp", {
            contenido,
        });
        return this.mapearNlp(dto, contenido.length);
    }

    /** Traduce la respuesta de `POST /nlp` al {@link ResultadoNLP} estable. */
    private mapearNlp(dto: NlpResponseDTO, totalItems: number): ResultadoNLP {
        const conv = dto.semantico.conversacional;

        const terminosClave: TerminoClave[] = dto.semantico.terminosClave.map(
            (termino, i) => ({
                termino,
                // El `Servicio_IA` solo expone el termino; el peso preserva el
                // orden de saliencia (mas relevante primero) de forma estable.
                frecuencia: 0,
                dispersion: 0,
                pesoContextual: dto.semantico.terminosClave.length - i,
            }),
        );

        const semantico: AnalisisSemantico = {
            totalItems,
            // El contrato HTTP no expone el conteo de tokens; se reconstruye de
            // forma trazable desde la longitud promedio por intervencion.
            totalTokens: Math.round(conv.longitudPromedio * conv.numIntervenciones),
            diversidadLexica: this.clamp(conv.diversidadLexica, 0, 1),
            terminosClave,
        };

        const emocional: DeteccionEmocional = {
            senal: {
                valencia: 0,
                activacion: 0,
                intensidad: this.clamp(dto.emocion.puntuacion, 0, 1),
                dispersion: 0,
            },
            distribucion: { ...dto.emocion.distribucion },
        };

        const tematico: ClasificacionTematica = {
            grupos: dto.temas.map((t, i) => ({
                id: `tema:${i}`,
                terminos: [t.etiqueta],
                itemRefs: t.miembros.map((m) => indiceARef(m)),
                peso: this.clamp(t.peso, 0, 1),
            })),
        };

        const elementosCausales: ElementoCausal[] = [
            ...dto.causas.map<ElementoCausal>((descripcion) => ({
                tipo: "causa",
                descripcion,
                soporteRefs: [],
                confianza: 0,
            })),
            ...dto.eventos.map<ElementoCausal>((descripcion) => ({
                tipo: "evento",
                descripcion,
                soporteRefs: [],
                confianza: 0,
            })),
        ];

        // El contrato HTTP entrega metricas conversacionales agregadas, no el
        // arbol de interacciones; se reconstruye una vista plana coherente.
        const interacciones: InteraccionConversacional[] = Array.from(
            { length: totalItems },
            (_, i) => ({
                refId: indiceARef(i),
                enRespuestaA: null,
                profundidad: 0,
            }),
        );
        const conversacional: AnalisisConversacional = {
            interacciones,
            hilos: totalItems,
            profundidadMaxima: 0,
        };

        const tendencias: InterpretacionTendencia[] =
            dto.tendenciasTexto.trim().length > 0
                ? [
                    {
                        descripcion: dto.tendenciasTexto,
                        direccion: "estable",
                        magnitud: 0,
                    },
                ]
                : [];

        return {
            semantico,
            emocional,
            tematico,
            elementosCausales,
            conversacional,
            tendencias,
            derivadoDeComprensionContextual: true,
        };
    }
}

// ---------------------------------------------------------------------------
// Servicio_Vision -> POST /vision (Req. 15.1, 15.4, 37.2)
// ---------------------------------------------------------------------------

/** Cliente HTTP del `Servicio_Vision` (Vision_Engine) sobre `POST /vision`. */
@Injectable()
export class ServicioVisionClient
    extends ServicioIaHttpBase
    implements ServicioVision {
    async analizar(imageDescription: string): Promise<ResultadoVision> {
        const dto = await this.post<VisionRequestDTO, VisionResponseDTO>("/vision", {
            image_description: imageDescription,
        });
        return {
            scene: dto.scene,
            objects: [...dto.objects],
            emotion_context: dto.emotion_context,
        };
    }
}

// ---------------------------------------------------------------------------
// Filtro_Relevancia -> POST /relevancia (Req. 34.1, 34.6)
// ---------------------------------------------------------------------------

/** Cliente HTTP del `Filtro_Relevancia` sobre `POST /relevancia`. */
@Injectable()
export class FiltroRelevanciaClient
    extends ServicioIaHttpBase
    implements FiltroRelevancia {
    async clasificar(
        contrato: ContratoNormalizado,
    ): Promise<ResultadoFiltroRelevancia> {
        const items: RelevanciaItemDTO[] = [
            { refId: "post", texto: contrato.post.texto },
            ...contrato.comments.map((c, i) => ({
                refId: `comment:${i}`,
                texto: c.texto,
            })),
        ];
        const dto = await this.post<RelevanciaRequestDTO, RelevanciaResponseDTO>(
            "/relevancia",
            { items },
        );
        return {
            contributivos: dto.contributivos.map((it) => mapearItem(it)),
            noContributivos: dto.noContributivos.map((it) => mapearItem(it)),
        };
    }
}

// ---------------------------------------------------------------------------
// Capa_ML -> POST /embeddings, /clustering, /anomalias, /tendencias,
//            /score-calibrado, /calibrar (Req. 31.2, 31.3, 31.6, 31.7)
// ---------------------------------------------------------------------------

/** Cliente HTTP de la `Capa_ML` del `Servicio_IA`. */
@Injectable()
export class CapaMlClient extends ServicioIaHttpBase implements CapaML {
    async embeddings(textos: string[]): Promise<number[][]> {
        const dto = await this.post<EmbeddingsRequestDTO, EmbeddingsResponseDTO>(
            "/embeddings",
            { textos },
        );
        return dto.vectores;
    }

    /**
     * Busqueda por similitud sobre la `Memoria_Semantica` (`POST /embeddings/search`).
     * No forma parte de la interfaz `CapaML` (que opera sobre vectores ya
     * calculados); se expone como capacidad adicional del cliente para el bucle
     * de aprendizaje (tarea 9.x), devolviendo resultados ordenados por similitud
     * descendente (Req. 36.3, 36.6, 39.4).
     */
    async buscarSimilares(
        consulta: ConsultaBusquedaSemantica,
    ): Promise<ResultadoBusquedaSemantica[]> {
        const body: EmbeddingsSearchRequestDTO = {
            vectorConsulta: consulta.vectorConsulta,
            texto: consulta.texto,
            k: consulta.k,
            modelo: consulta.modelo,
            filtro: consulta.filtro
                ? {
                    analisisId: consulta.filtro.analisisId ?? null,
                    comunidadId: consulta.filtro.comunidadId ?? null,
                }
                : undefined,
        };
        const dto = await this.post<
            EmbeddingsSearchRequestDTO,
            EmbeddingsSearchResponseDTO
        >("/embeddings/search", body);
        return dto.resultados.map((r) => ({
            refId: r.refId,
            similitud: r.similitud,
            refContenido: r.refContenido,
            semana: r.semana ?? null,
        }));
    }

    async clustering(vectores: number[][]): Promise<ResultadoClustering[]> {
        const dto = await this.post<ClusteringRequestDTO, ClusteringResponseDTO>(
            "/clustering",
            { vectores },
        );
        return dto.clusters.map((c) => ({
            clusterId: c.clusterId,
            // La interfaz estable usa miembros como `string[]`; el `Servicio_IA`
            // devuelve indices numericos -> se serializan de forma estable.
            miembros: c.miembros.map((m) => String(m)),
            etiqueta: c.etiqueta,
        }));
    }

    async anomalias(serie: number[][], zona?: ZonaGeografica): Promise<Anomalia[]> {
        const dto = await this.post<AnomaliasRequestDTO, AnomaliasResponseDTO>(
            "/anomalias",
            { serie, zona: serializarZona(zona) },
        );
        return dto.anomalias.map((a) => ({
            refId: String(a.refId),
            score: a.score,
            descripcion: a.descripcion,
        }));
    }

    async tendencias(
        evolucion: EvolucionTemporal,
        zona?: ZonaGeografica,
    ): Promise<Tendencia[]> {
        const dto = await this.post<TendenciasRequestDTO, TendenciasResponseDTO>(
            "/tendencias",
            {
                evolucion: evolucion.series ?? {},
                zona: serializarZona(zona),
            },
        );
        return dto.tendencias.map((t) => ({
            dimension: t.dimension,
            direccion: mapearDireccion(t.direccion),
            magnitud: t.magnitud,
        }));
    }

    async scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado> {
        const entradaIndice: EntradaIndiceDTO = {
            comunidadId: entrada.comunidadId,
            semana: entrada.numeroSemana,
            // Cada senal agregada se modela como una dimension independiente en
            // su rango [0,1] con peso unitario; la evidencia colectiva se adjunta
            // a nivel de entrada (Req. 31.7).
            dimensiones: entrada.senales.map((valor, i) => ({
                nombre: `senal_${i}`,
                valor,
                minimo: 0,
                maximo: 1,
                peso: 1,
                evidenciaIds: [],
            })),
            evidenciaIds: [...entrada.evidenciaIds],
        };
        const dto = await this.post<
            ScoreCalibradoRequestDTO,
            ScoreCalibradoResponseDTO
        >("/score-calibrado", { entradaIndice });
        return { score: dto.score, evidenciaIds: dto.evidenciaIds };
    }

    async calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion> {
        const referenciaCorpus: ReferenciaCorpusDTO = {
            analisisId: corpus.analisisId,
            muestras: [],
            numSemanas: corpus.numeroSemanas,
            descripcion: corpus.artefactoRef ?? null,
        };
        const dto = await this.post<CalibrarRequestDTO, CalibrarResponseDTO>(
            "/calibrar",
            { referenciaCorpus },
        );
        return { version: dto.version, metricas: dto.metricas };
    }
}

// ---------------------------------------------------------------------------
// Utilidades de mapeo puras (compartidas)
// ---------------------------------------------------------------------------

/** Lista ordenada de textos del contrato (post primero, luego comentarios). */
export function aplanarTextos(contrato: ContratoNormalizado): string[] {
    return [contrato.post.texto, ...contrato.comments.map((c) => c.texto)];
}

/** Mapea el indice de `contenido` al `refId` posicional estable del pipeline. */
export function indiceARef(indice: number): string {
    return indice <= 0 ? "post" : `comment:${indice - 1}`;
}

/** Traduce un item HTTP clasificado al {@link ItemClasificado} estable. */
function mapearItem(dto: ItemClasificadoDTO): ItemClasificado {
    return {
        refId: dto.refId,
        contributividad:
            dto.contributividad === "CONTRIBUTIVO"
                ? Contributividad.CONTRIBUTIVO
                : Contributividad.NO_CONTRIBUTIVO,
        motivo: dto.motivo,
    };
}

/**
 * Serializa la {@link ZonaGeografica} estable al campo `zona: string` que espera
 * el `Servicio_IA` para contextualizar anomalias/tendencias (Req. 33).
 */
function serializarZona(zona?: ZonaGeografica): string | undefined {
    if (!zona) {
        return undefined;
    }
    return `lat=${zona.latitud};lon=${zona.longitud};r=${zona.radioMetros}`;
}

/** Traduce la direccion textual del `Servicio_IA` al dominio estable. */
function mapearDireccion(direccion: string): Tendencia["direccion"] {
    const d = direccion.toLowerCase();
    if (d === "ascendente" || d === "sube") {
        return "sube";
    }
    if (d === "descendente" || d === "baja") {
        return "baja";
    }
    return "estable";
}
