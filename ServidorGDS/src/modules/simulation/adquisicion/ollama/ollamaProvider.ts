/**
 * `OllamaProvider` - proveedor de generacion **local** (Ollama) detras de la
 * interfaz comun `IDataProvider` (tarea 11.3).
 *
 * Es la **alternativa LOCAL configurable** del `GeminiProvider` (por defecto en
 * la nube), expuesta tras la MISMA interfaz `IDataProvider`: registrarla NO
 * toca el `Pipeline_Analisis` ni la `Capa_Analisis` (D1, D4, Req. 4.2, 4.4).
 *
 * Responsabilidades (analogas al `GeminiProvider`):
 *  - Construir el prompt de generacion a partir del {@link ContextoGeneracion}
 *    longitudinal (escenario + memoria + contexto semantico + usuarios + zona).
 *  - Invocar Ollama EXCLUSIVAMENTE a traves del {@link OllamaClient} inyectable
 *    (la llamada HTTP al endpoint local queda detras de esa interfaz; las
 *    pruebas sustituyen el cliente sin tocar la red).
 *  - Transformar el texto generado por el LLM en un `Contrato_Normalizado`
 *    valido: parsear el JSON, completar `metadata` (version, fuente, semana,
 *    idioma, generadoEn) y **validar/normalizar** con el `Validador_Contrato`
 *    (`ValidadorContratoService`, tarea 3.1), de modo que la salida sea siempre
 *    un `Contrato_Normalizado` valido (Req. 4.6).
 *
 * Su `nombre` es `"ollama"`, de modo que la `FabricaDataProvider` lo selecciona
 * cuando se configura ese proveedor (Req. 4.4). Cambiar de proveedor es
 * configuracion, no codigo.
 *
 * El manejo avanzado de fallos/reintentos del proveedor es la tarea 11.4; aqui
 * se realiza el mapeo basico y se rechaza con un error descriptivo si la salida
 * del LLM no puede normalizarse a un contrato valido.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)".
 * _Requirements: 4.2, 4.4_
 */
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ContratoNormalizado } from "../../contracts/contratoNormalizado";
import { CONTRATO_VERSION } from "../../contracts/contratoNormalizado";
import { ValidadorContratoService } from "../../contracts/validadorContrato";
import type {
    ContextoGeneracion,
    IDataProvider,
    NombreProveedor,
} from "../dataProvider";
import { OLLAMA_CLIENT, type OllamaClient } from "./ollamaClient";
import { construirPromptGeneracion } from "../../prompt/promptGeneracionRealista";

/** Nombre del `OllamaProvider`: alternativa local configurable (Req. 4.2). */
export const PROVEEDOR_OLLAMA: NombreProveedor = "ollama";

/** Variable de entorno con el limite de tokens de contexto de Ollama. */
export const OLLAMA_LIMITE_TOKENS_ENV = "OLLAMA_LIMITE_TOKENS" as const;

/**
 * Limite de tokens de contexto por defecto del `OllamaProvider`. Los modelos
 * locales suelen ofrecer ventanas de contexto mas acotadas que los de la nube;
 * se fija un valor conservador y configurable (Req. 5.2, 28.6) que el
 * `Motor_Memoria_Contextual` usa para compactar.
 */
export const OLLAMA_LIMITE_TOKENS_DEFAULT = 8000;

/** Idioma del contenido simulado: espanol andino de Bolivia/region (D6). */
const IDIOMA_POR_DEFECTO = "es-BO" as const;

/** Forma cruda esperada del JSON devuelto por Ollama (sin `metadata`). */
interface ContratoCrudoOllama {
    post?: { autorId?: unknown; texto?: unknown };
    comments?: Array<{ autorId?: unknown; texto?: unknown; enRespuestaA?: unknown }>;
    image_description?: unknown;
    hashtags?: unknown;
}

@Injectable()
export class OllamaProvider implements IDataProvider {
    /** Nombre del proveedor: alternativa local (Req. 4.2). */
    readonly nombre: NombreProveedor = PROVEEDOR_OLLAMA;

    /** Limite de tokens de contexto del proveedor activo (Req. 5.2, 28.6). */
    readonly limiteTokens: number;

    constructor(
        @Inject(OLLAMA_CLIENT) private readonly cliente: OllamaClient,
        private readonly validador: ValidadorContratoService,
        config?: ConfigService,
    ) {
        const limite = config?.get<number>(
            OLLAMA_LIMITE_TOKENS_ENV,
            OLLAMA_LIMITE_TOKENS_DEFAULT,
        );
        this.limiteTokens =
            typeof limite === "number" && Number.isFinite(limite) && limite > 0
                ? limite
                : OLLAMA_LIMITE_TOKENS_DEFAULT;
    }

    /**
     * Genera una `Semana_Simulada` invocando Ollama y devuelve siempre un
     * `Contrato_Normalizado` ya validado/normalizado (Req. 4.6).
     */
    async generar(ctx: ContextoGeneracion): Promise<ContratoNormalizado> {
        const prompt = construirPrompt(ctx);
        const textoCrudo = await this.cliente.generar({ prompt, temperatura: 0.9 });
        const crudo = parsearJson(textoCrudo);
        const candidato = this.ensamblarCandidato(crudo, ctx);

        const resultado = this.validador.validar(candidato);
        if (!resultado.ok || !resultado.contrato) {
            const detalle = (resultado.errores ?? [])
                .map((e) => `${e.campo}: ${e.mensaje}`)
                .join("; ");
            throw new Error(
                `OllamaProvider: la salida del modelo no es un Contrato_Normalizado valido (${detalle}).`,
            );
        }
        return resultado.contrato;
    }

    /**
     * Completa el contrato crudo del LLM con la `metadata` requerida y normaliza
     * tipos basicos antes de validar. La `fuente` es una etiqueta opaca que NO
     * revela a la `Capa_Analisis` el origen simulado/real (Req. 2.2).
     */
    private ensamblarCandidato(
        crudo: ContratoCrudoOllama,
        ctx: ContextoGeneracion,
    ): unknown {
        const post = crudo.post ?? {};
        const comments = Array.isArray(crudo.comments) ? crudo.comments : [];
        const hashtags = Array.isArray(crudo.hashtags) ? crudo.hashtags : [];

        return {
            post: {
                autorId: typeof post.autorId === "string" ? post.autorId : "",
                texto: typeof post.texto === "string" ? post.texto : "",
            },
            comments: comments.map((c) => ({
                autorId: typeof c?.autorId === "string" ? c.autorId : "",
                texto: typeof c?.texto === "string" ? c.texto : "",
                enRespuestaA:
                    typeof c?.enRespuestaA === "string" ? c.enRespuestaA : null,
            })),
            image_description:
                typeof crudo.image_description === "string"
                    ? crudo.image_description
                    : "",
            hashtags: hashtags.filter((h): h is string => typeof h === "string"),
            metadata: {
                version: CONTRATO_VERSION,
                fuente: this.nombre,
                generadoEn: new Date().toISOString(),
                semana: ctx.semana,
                idioma: IDIOMA_POR_DEFECTO,
            },
        };
    }
}

/**
 * Parsea el texto del LLM como JSON, tolerando vallas de codigo Markdown
 * (```json ... ```). Lanza un error descriptivo si no es JSON valido.
 */
export function parsearJson(texto: string): ContratoCrudoOllama {
    const limpio = texto
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    try {
        return JSON.parse(limpio) as ContratoCrudoOllama;
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : "JSON invalido";
        throw new Error(
            `OllamaProvider: la respuesta de Ollama no es JSON parseable (${mensaje}).`,
        );
    }
}

/**
 * Construye el prompt de generacion a partir del contexto longitudinal,
 * delegando en el diseno canonico del `Modulo_Simulacion`
 * (`construirPromptGeneracion`, tarea 11.5): espanol andino, variedad emocional,
 * atribucion a usuarios persistentes y coherencia con el `Escenario`. Pide al
 * modelo un JSON con los campos del `Contrato_Normalizado` (sin `metadata`, que
 * agrega el proveedor). Se conserva como funcion exportada por compatibilidad.
 */
export function construirPrompt(ctx: ContextoGeneracion): string {
    return construirPromptGeneracion(ctx);
}
