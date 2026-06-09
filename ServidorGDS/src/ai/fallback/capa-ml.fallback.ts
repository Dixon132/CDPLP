/**
 * Provider FALLBACK determinista de la `Capa_ML` (Req. 31, 35.3).
 *
 * Reposiciona la implementacion base/heuristica TS previa ({@link CapaMLBase})
 * como un provider NestJS inyectable bajo el token estable {@link CAPA_ML}. NO
 * es la `Capa_ML` primaria (esa la provee el `Servicio_IA` en Python, consumido
 * por HTTP en la tarea 8.1 sobre `POST /embeddings`, `/clustering`,
 * `/anomalias`, `/tendencias`, `/score-calibrado`): sirve como DEGRADACION
 * SEGURA cuando el `Servicio_IA` no esta disponible y como doble determinista
 * para pruebas (Req. 31.5, 31.6, 35).
 *
 * Cumple la misma interfaz estable `CapaML` que implementara el cliente HTTP,
 * de modo que ambos son intercambiables sin tocar el `Pipeline_Analisis`
 * (Req. 31.6).
 *
 * _Requirements: 31.1, 31.6, 35.3_
 */
import { Injectable } from "@nestjs/common";

import { CapaMLBase } from "../../modules/ml/capaMLBase";
import type { CapaML } from "../../modules/ml/capaML";

/**
 * Fallback determinista de la `Capa_ML`, inyectable en el contenedor DI.
 *
 * Hereda toda la logica pura de {@link CapaMLBase} (embeddings, clustering,
 * anomalias, tendencias y score calibrado acotado a `[0,1]`); el decorador
 * `@Injectable()` solo habilita su registro como provider bajo el token
 * {@link CAPA_ML}.
 */
@Injectable()
export class CapaMlFallback extends CapaMLBase implements CapaML { }
