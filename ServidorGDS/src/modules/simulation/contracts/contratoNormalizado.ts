/**
 * Contrato_Normalizado (frontera entre capas) - esquema `zod` versionado.
 *
 * Estructura JSON estandar de intercambio entre la `Capa_Adquisicion`
 * (`Modulo_Simulacion` / `IDataProvider`) y la `Capa_Analisis`:
 * `{ post, comments[], image_description, hashtags[], metadata }`.
 * El esquema se versiona mediante `metadata.version` (Req. 3.5) y el valor actual
 * vive en `CONTRATO_VERSION` (Req. 3.1).
 *
 * Migrado al modulo `simulation` desde el dominio TS previo (tarea 3.1); esta es
 * la frontera estable que consume la `Capa_Analisis` (design.md > "Contrato
 * Normalizado (frontera entre capas)").
 * _Requirements: 2.1, 3.1, 3.5_
 */
import { z } from "zod";

/** Version actual del esquema del `Contrato_Normalizado` (Req. 3.5). */
export const CONTRATO_VERSION = "1.0.0" as const;

/**
 * Metadatos del contrato. Incluye el campo de version que permite versionar el
 * esquema (Req. 3.5) y una etiqueta opaca `fuente` que NO revela a la
 * `Capa_Analisis` si los datos son simulados o reales (Req. 2.2).
 */
export const MetadataSchema = z
    .object({
        version: z.string(), // version del esquema (Req. 3.5)
        fuente: z.string(), // etiqueta opaca; NO revela "simulado/real" a la logica de analisis
        generadoEn: z.string().datetime(), // ISO 8601
        semana: z.number().int().min(1).max(24),
        idioma: z.string().default("es-BO"),
    })
    .passthrough(); // tolera campos extra para evolucion de version

/** Comentario atribuido a un identificador sintetico (se anonimiza luego). */
export const ComentarioSchema = z.object({
    autorId: z.string().min(1), // identificador sintetico (se anonimiza luego)
    texto: z.string(),
    enRespuestaA: z.string().nullable().default(null),
});

/**
 * Esquema explicito del `Contrato_Normalizado` con los campos requeridos
 * `post`, `comments`, `image_description`, `hashtags` y `metadata` (Req. 3.1).
 */
export const ContratoNormalizadoSchema = z.object({
    post: z.object({
        autorId: z.string().min(1),
        texto: z.string(),
    }),
    comments: z.array(ComentarioSchema),
    image_description: z.string(), // descripcion textual; entrada del Vision_Engine
    hashtags: z.array(z.string()),
    metadata: MetadataSchema,
});

/** Tipo TypeScript del `Contrato_Normalizado` inferido del esquema. */
export type ContratoNormalizado = z.infer<typeof ContratoNormalizadoSchema>;
