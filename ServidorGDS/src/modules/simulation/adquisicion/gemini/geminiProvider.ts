/**
 * `GeminiProvider` - proveedor de generacion **por defecto en la nube**
 * (Google Gemini API) detras de la interfaz comun `IDataProvider` (tarea 11.2).
 *
 * Responsabilidades:
 *  - Construir el prompt de generacion a partir del {@link ContextoGeneracion}
 *    longitudinal (escenario + memoria + contexto semantico + usuarios + zona).
 *  - Invocar Google Gemini EXCLUSIVAMENTE a traves del {@link GeminiClient}
 *    inyectable (la llamada HTTP queda detras de esa interfaz; las pruebas
 *    sustituyen el cliente sin tocar la red).
 *  - Transformar el texto generado por el LLM en un `Contrato_Normalizado`
 *    valido: parsear el JSON, completar `metadata` (version, fuente, semana,
 *    idioma, generadoEn) y **validar/normalizar** con el `Validador_Contrato`
 *    (`ValidadorContratoService`, tarea 3.1), de modo que la salida sea siempre
 *    un `Contrato_Normalizado` valido (Req. 4.6).
 *
 * Es el proveedor por defecto: su `nombre` es `"gemini"`, que coincide con
 * `PROVEEDOR_POR_DEFECTO`, de modo que la `FabricaDataProvider` lo selecciona
 * cuando no se especifica proveedor (Req. 4.3). Cambiar de proveedor es
 * configuracion, no codigo (Req. 4.4).
 *
 * El manejo avanzado de fallos/reintentos del proveedor es la tarea 11.4; aqui
 * se realiza el mapeo basico y se rechaza con un error descriptivo si la salida
 * del LLM no puede normalizarse a un contrato valido.
 *
 * Diseno: design.md > "Proveedor de datos intercambiable (`IDataProvider`)".
 * _Requirements: 4.2, 4.3, 4.4_
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
import { PROVEEDOR_POR_DEFECTO } from "../dataProvider";
import { construirPromptGeneracion } from "../../prompt/promptGeneracionRealista";
import { GEMINI_CLIENT, type GeminiClient } from "./geminiClient";

/** Variable de entorno con el limite de tokens de contexto de Gemini. */
export const GEMINI_LIMITE_TOKENS_ENV = "GEMINI_LIMITE_TOKENS" as const;

/**
 * Limite de tokens de contexto por defecto del `GeminiProvider`. Gemini ofrece
 * ventanas de contexto amplias; se fija un valor conservador y configurable
 * (Req. 5.2, 28.6) que el `Motor_Memoria_Contextual` usa para compactar.
 */
export const GEMINI_LIMITE_TOKENS_DEFAULT = 30000;

/** Idioma del contenido simulado: espanol andino de Bolivia/region (D6). */
const IDIOMA_POR_DEFECTO = "es-BO" as const;

/** Forma cruda esperada del JSON devuelto por Gemini (sin `metadata`). */
interface ContratoCrudoGemini {
    post?: { autorId?: unknown; texto?: unknown };
    comments?: Array<{ autorId?: unknown; texto?: unknown; enRespuestaA?: unknown }>;
    image_description?: unknown;
    hashtags?: unknown;
}

@Injectable()
export class GeminiProvider implements IDataProvider {
    /** Nombre del proveedor; coincide con `PROVEEDOR_POR_DEFECTO` (Req. 4.3). */
    readonly nombre: NombreProveedor = PROVEEDOR_POR_DEFECTO;

    /** Limite de tokens de contexto del proveedor activo (Req. 5.2, 28.6). */
    readonly limiteTokens: number;

    constructor(
        @Inject(GEMINI_CLIENT) private readonly cliente: GeminiClient,
        private readonly validador: ValidadorContratoService,
        config?: ConfigService,
    ) {
        const limite = config?.get<number>(
            GEMINI_LIMITE_TOKENS_ENV,
            GEMINI_LIMITE_TOKENS_DEFAULT,
        );
        this.limiteTokens =
            typeof limite === "number" && Number.isFinite(limite) && limite > 0
                ? limite
                : GEMINI_LIMITE_TOKENS_DEFAULT;
    }

    /**
     * Genera una `Semana_Simulada` invocando Gemini y devuelve siempre un
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
                `GeminiProvider: la salida del modelo no es un Contrato_Normalizado valido (${detalle}).`,
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
        crudo: ContratoCrudoGemini,
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
export function parsearJson(texto: string): ContratoCrudoGemini {
    const limpio = texto
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    try {
        return JSON.parse(limpio) as ContratoCrudoGemini;
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : "JSON invalido";
        throw new Error(
            `GeminiProvider: la respuesta de Gemini no es JSON parseable (${mensaje}).`,
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
