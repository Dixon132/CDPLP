/**
 * Implementacion del `Servicio_Anonimizacion` (privacidad por diseno).
 *
 * Reemplaza los identificadores de `Usuario_Sintetico` presentes en el
 * `Contrato_Normalizado` por seudonimos hash SHA-256 (con salt) antes de que el
 * contenido llegue a cualquier etapa de analisis o almacenamiento de la
 * `Capa_Analisis` (Req. 13.5, 23.1).
 *
 * Propiedades garantizadas:
 * - **Irreversibilidad** (Req. 23.2): el seudonimo es un hash SHA-256 en hex de
 *   64 caracteres; el `crypto` nativo no expone inversa y el id original no se
 *   conserva en la salida.
 * - **Consistencia** (Req. 23.4): el mismo par `(idSintetico, salt)` produce
 *   siempre el mismo seudonimo; un `salt` distinto produce un seudonimo distinto.
 *
 * Migrado al modulo `simulation` desde el dominio TS previo (tarea 3.2). Se
 * expone la clase logica `ServicioAnonimizacionSha256`, la instancia reutilizable
 * `servicioAnonimizacion` (para consumidores sin DI y para las PBT de las tareas
 * 3.8/3.9/3.10) y el provider NestJS `ServicioAnonimizacionService` (frontera
 * estable inyectable).
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)".
 * _Requirements: 23.1, 23.2, 23.4, 13.5_
 */
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

import type { ContratoNormalizado } from "../contracts/contratoNormalizado";
import type { ServicioAnonimizacion } from "./interfaces";

/**
 * Implementacion basada en `crypto` nativo (SHA-256 + salt).
 *
 * Es sin estado: la consistencia depende exclusivamente de `(idSintetico, salt)`,
 * por lo que una misma instancia (o instancias distintas) producen seudonimos
 * identicos para las mismas entradas.
 */
export class ServicioAnonimizacionSha256 implements ServicioAnonimizacion {
    /**
     * Calcula el seudonimo SHA-256 de un identificador sintetico usando `salt`.
     *
     * El salt se antepone al id (`salt + id`) antes de hashear, de modo que un
     * mismo id con salts distintos produzca seudonimos distintos (Req. 23.4) y
     * el resultado sea irreversible (Req. 23.2).
     */
    seudonimo(idSintetico: string, salt: string): string {
        return createHash("sha256").update(`${salt}${idSintetico}`, "utf8").digest("hex");
    }

    /**
     * Devuelve una copia del contrato con todos los identificadores de
     * `Usuario_Sintetico` reemplazados por sus seudonimos (Req. 13.5, 23.1).
     *
     * Se reemplazan:
     * - `post.autorId`
     * - `comments[].autorId`
     * - `comments[].enRespuestaA` cuando referencia a un id de autor conocido
     *   del contrato (las referencias a otros valores se conservan tal cual).
     *
     * No muta el contrato original: construye y devuelve una nueva instancia.
     */
    anonimizar(contrato: ContratoNormalizado, salt: string): ContratoNormalizado {
        // Mapa (id original -> seudonimo) calculado una sola vez por id, de modo
        // que un mismo autor reciba el mismo seudonimo en todo el contrato.
        const mapaSeudonimos = new Map<string, string>();
        const seudonimoDe = (id: string): string => {
            let s = mapaSeudonimos.get(id);
            if (s === undefined) {
                s = this.seudonimo(id, salt);
                mapaSeudonimos.set(id, s);
            }
            return s;
        };

        // Registrar todos los ids de autor del contrato para resolver
        // referencias `enRespuestaA` que apunten a un autor.
        seudonimoDe(contrato.post.autorId);
        for (const comentario of contrato.comments) {
            seudonimoDe(comentario.autorId);
        }

        const comments = contrato.comments.map((comentario) => ({
            ...comentario,
            autorId: seudonimoDe(comentario.autorId),
            enRespuestaA:
                comentario.enRespuestaA !== null && mapaSeudonimos.has(comentario.enRespuestaA)
                    ? seudonimoDe(comentario.enRespuestaA)
                    : comentario.enRespuestaA,
        }));

        return {
            ...contrato,
            post: {
                ...contrato.post,
                autorId: seudonimoDe(contrato.post.autorId),
            },
            comments,
        };
    }
}

/**
 * Provider NestJS del `Servicio_Anonimizacion` (frontera estable inyectable de
 * la `Capa_Analisis`). Hereda la logica SHA-256 + salt; se registra y exporta
 * desde `SimulationModule`.
 */
@Injectable()
export class ServicioAnonimizacionService extends ServicioAnonimizacionSha256 { }

/** Instancia reutilizable lista para inyectarse en el pipeline. */
export const servicioAnonimizacion: ServicioAnonimizacion = new ServicioAnonimizacionSha256();
