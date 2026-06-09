/**
 * `MemoriaSemanticaService` - indexador y recuperador de la `Memoria_Semantica`
 * (tareas 9.1 + 9.2).
 *
 * Implementa la interfaz {@link MemoriaSemantica}:
 *
 *  - INDEXAR (tarea 9.1): genera `Embeddings` de los textos analizados via
 *    `Servicio_IA` ({@link CapaML.embeddings}, resuelto por DI con degradacion
 *    segura al fallback TS) y los ACUMULA en `pgvector` (`gds_embedding`) **sin
 *    borrar** los previos, con referencias trazables a
 *    semana/comunidad/institucion/analisis y al resultado de origen (Req. 36.1,
 *    36.2, 36.5). La acumulacion sin borrado es estructural: este servicio solo
 *    dispone de la operacion `insertar` del {@link AlmacenEmbeddings} (puerto
 *    append-only); no existe ninguna ruta para eliminar vectores previos.
 *
 *  - RECUPERAR (`Embeddings_Search`, tarea 9.2): recupera contexto por similitud
 *    vectorial delegando la busqueda al `Servicio_IA`
 *    ({@link BuscadorSemantico}, `POST /embeddings/search`) y resolviendo la
 *    trazabilidad/ambito COLECTIVO de los resultados contra la fuente de verdad
 *    `gds_embedding` ({@link AlmacenEmbeddings.recuperarRefs}). Devuelve los
 *    fragmentos ordenados por similitud DESCENDENTE, filtrados por
 *    `analisis`/`comunidad`, sin diagnostico individual (Req. 36.3, 36.6, 39.4).
 *    Estos fragmentos alimentan el `contextoSemantico` del `ContextoGeneracion`
 *    que arma el `Motor_Memoria_Contextual`. Si el `Embeddings_Search` falla, NO
 *    se propaga el error: se DEGRADA a la `Memoria_Jerarquica` (devolviendo un
 *    contexto semantico vacio) y se REGISTRA el incidente, sin bloquear el ciclo
 *    (Req. 28.5, 35.3).
 *
 * _Requirements: 36.1, 36.2, 36.3, 36.5, 28.5_
 */
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";

import { CAPA_ML } from "../../ai/interfaces/tokens";
import type {
    ConsultaBusquedaSemantica,
    ResultadoBusquedaSemantica,
} from "../../ai/servicio-ia.client";
import type { RegistroIncidente } from "../../ai/health/proxy-degradacion";
import type { CapaML } from "../ml/capaML";
import {
    ALMACEN_EMBEDDINGS,
    type AlmacenEmbeddings,
    type RegistroEmbedding,
} from "./embeddingRepositorio";
import type {
    ConsultaSimilitud,
    FiltroSimilitud,
    MemoriaSemantica,
    ResultadoSimilitud,
    VectorMemoria,
} from "./memoriaSemantica";

/**
 * Generador de embeddings minimo que necesita el indexador: solo el metodo
 * `embeddings` de la `Capa_ML`. Permite inyectar un doble determinista del
 * `Servicio_IA` en pruebas sin implementar toda la `Capa_ML`.
 */
export type GeneradorEmbeddings = Pick<CapaML, "embeddings">;

/**
 * Capacidad de busqueda semantica del `Servicio_IA` (`POST /embeddings/search`)
 * que necesita el recuperador. La cumple el `CapaMlClient` (cliente HTTP) y se
 * puede sustituir por un doble determinista en pruebas. Es una capacidad EXTRA
 * del cliente (no forma parte de la interfaz `CapaML`, que opera sobre vectores
 * ya calculados), de ahi su token DI propio.
 */
export interface BuscadorSemantico {
    buscarSimilares(
        consulta: ConsultaBusquedaSemantica,
    ): Promise<ResultadoBusquedaSemantica[]>;
}

/** Token DI del {@link BuscadorSemantico} (Servicio_IA, `POST /embeddings/search`). */
export const BUSCADOR_SEMANTICO = Symbol("GDS:BUSCADOR_SEMANTICO");

/** Token DI (opcional) del receptor de incidentes de degradacion del recuperador. */
export const REGISTRO_INCIDENTE_MEMORIA = Symbol("GDS:REGISTRO_INCIDENTE_MEMORIA");

@Injectable()
export class MemoriaSemanticaService implements MemoriaSemantica {
    private readonly logger: RegistroIncidente;

    constructor(
        @Inject(CAPA_ML) private readonly capaMl: GeneradorEmbeddings,
        @Inject(ALMACEN_EMBEDDINGS) private readonly almacen: AlmacenEmbeddings,
        @Optional()
        @Inject(BUSCADOR_SEMANTICO)
        private readonly buscador?: BuscadorSemantico,
        @Optional()
        @Inject(REGISTRO_INCIDENTE_MEMORIA)
        logger?: RegistroIncidente,
    ) {
        this.logger = logger ?? new Logger("MemoriaSemantica:Embeddings_Search");
    }

    async indexar(vectores: VectorMemoria[], textos: string[]): Promise<void> {
        if (vectores.length !== textos.length) {
            throw new Error(
                `MemoriaSemantica.indexar: desajuste de longitud (vectores=${vectores.length}, textos=${textos.length}).`,
            );
        }
        // Nada que indexar: no-op (no se altera el corpus acumulado).
        if (vectores.length === 0) {
            return;
        }

        // 1) Generar embeddings via Servicio_IA (Capa_ML, Req. 36.1).
        const embeddings = await this.capaMl.embeddings(textos);
        if (embeddings.length !== textos.length) {
            throw new Error(
                `MemoriaSemantica.indexar: el Servicio_IA devolvio ${embeddings.length} vectores para ${textos.length} textos.`,
            );
        }

        // 2) Emparejar cada vector con sus refs trazables (1:1 posicional).
        const registros: RegistroEmbedding[] = vectores.map((meta, i) => ({
            refId: meta.refId,
            analisisId: meta.analisisId,
            comunidadId: meta.comunidadId,
            institucionId: meta.institucionId,
            resultadoId: meta.resultadoId,
            numeroSemana: meta.numeroSemana,
            refContenido: meta.refContenido,
            modelo: meta.modelo,
            vector: embeddings[i],
        }));

        // 3) Acumular en pgvector SIN borrar previos (append-only, Req. 36.2).
        await this.almacen.insertar(registros);
    }

    /**
     * `Embeddings_Search` (tarea 9.2): recupera contexto por similitud vectorial
     * sobre `pgvector`, ordenado por similitud DESCENDENTE, filtrado por
     * `analisis`/`comunidad`, sin diagnostico individual (Req. 36.3, 36.6, 39.4).
     *
     * Flujo:
     *  1. Delega la busqueda por similitud al `Servicio_IA`
     *     ({@link BuscadorSemantico}, `POST /embeddings/search`), que devuelve los
     *     `refId` candidatos puntuados por similitud.
     *  2. Resuelve la trazabilidad y el AMBITO COLECTIVO de esos candidatos contra
     *     `gds_embedding` ({@link AlmacenEmbeddings.recuperarRefs}): solo
     *     sobreviven los vectores del `Analisis`/`Comunidad_Digital` indicados,
     *     descartando cualquier resultado fuera del ambito colectivo.
     *  3. Combina la similitud (del `Servicio_IA`) con la trazabilidad autoritativa
     *     (de la BD), ordena por similitud descendente y trunca a `k`.
     *
     * Estos fragmentos alimentan el `contextoSemantico` del `ContextoGeneracion`
     * que arma el `Motor_Memoria_Contextual`. Si la busqueda falla (servicio
     * indisponible, error HTTP o buscador no cableado), NO se propaga el error:
     * se DEGRADA a la `Memoria_Jerarquica` devolviendo un contexto semantico
     * vacio y se REGISTRA el incidente, sin bloquear el ciclo (Req. 28.5, 35.3).
     */
    async buscarSimilares(
        consulta: ConsultaSimilitud,
        k: number,
        filtro: FiltroSimilitud,
    ): Promise<ResultadoSimilitud[]> {
        // `k` no positivo o no finito: nada que recuperar (no-op defensivo).
        if (!Number.isFinite(k) || k <= 0) {
            return [];
        }

        try {
            if (!this.buscador) {
                throw new Error(
                    "Buscador_Semantico (Servicio_IA) no cableado para Embeddings_Search.",
                );
            }

            // 1) Embeddings_Search via Servicio_IA (POST /embeddings/search).
            const candidatos = await this.buscador.buscarSimilares({
                texto: consulta.texto,
                vectorConsulta: consulta.vector,
                k,
                filtro: {
                    analisisId: filtro.analisisId,
                    comunidadId: filtro.comunidadId,
                },
            });
            if (candidatos.length === 0) {
                return [];
            }

            // 2) Resolver trazabilidad + ambito COLECTIVO contra gds_embedding
            //    (fuente de verdad): solo sobreviven refs del analisis/comunidad.
            const refs = await this.almacen.recuperarRefs(
                candidatos.map((c) => c.refId),
                { analisisId: filtro.analisisId, comunidadId: filtro.comunidadId },
            );
            const porId = new Map(refs.map((r) => [r.refId, r]));

            // 3) Combinar similitud + trazabilidad, descartar fuera de ambito,
            //    ordenar por similitud DESCENDENTE y truncar a k (Req. 36.6).
            const vistos = new Set<string>();
            return candidatos
                .filter((c) => {
                    if (!porId.has(c.refId) || vistos.has(c.refId)) {
                        return false;
                    }
                    vistos.add(c.refId);
                    return true;
                })
                .map((c) => {
                    const ref = porId.get(c.refId)!;
                    return {
                        refId: c.refId,
                        similitud: c.similitud,
                        refContenido: ref.refContenido,
                        numeroSemana: ref.numeroSemana,
                    };
                })
                .sort((a, b) => b.similitud - a.similitud)
                .slice(0, k);
        } catch (error: unknown) {
            // Degradacion a la Memoria_Jerarquica: el Motor_Memoria_Contextual
            // armara el ContextoGeneracion solo desde la memoria jerarquica con un
            // contextoSemantico vacio. Se registra el incidente (Req. 28.5, 35.3).
            this.logger.warn(
                `Embeddings_Search no disponible; se degrada a la Memoria_Jerarquica ` +
                `(contextoSemantico vacio): ${descripcionError(error)}`,
                "Memoria_Semantica",
            );
            return [];
        }
    }
}

/** Resumen legible de un error arbitrario para el registro de incidentes. */
function descripcionError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
