/**
 * Provider FALLBACK determinista del `Filtro_Relevancia` (Req. 34, 35.3).
 *
 * Reposiciona la implementacion base/heuristica TS previa
 * ({@link FiltroRelevanciaBase}) como un provider NestJS inyectable bajo el
 * token estable {@link FILTRO_RELEVANCIA}. NO es el clasificador primario (ese
 * es el `/relevancia` del `Servicio_IA`, consumido por HTTP en la tarea 8.1):
 * sirve como DEGRADACION SEGURA y como doble determinista para pruebas
 * (Req. 35).
 *
 * Cumple la misma interfaz estable `Filtro_Relevancia` (clasifica
 * contributivo/no-contributivo) que implementara el cliente HTTP, de modo que
 * ambos son intercambiables sin tocar el `Pipeline_Analisis` (Req. 34.6).
 *
 * _Requirements: 34.1, 34.2, 34.3, 34.6, 35.3_
 */
import { Injectable } from "@nestjs/common";

import { FiltroRelevanciaBase } from "../../modules/analisis/filtroRelevancia";
import type { FiltroRelevancia } from "../../modules/analisis/interfaces";

/**
 * Fallback determinista del `Filtro_Relevancia`, inyectable en el contenedor DI.
 *
 * Hereda toda la logica pura de {@link FiltroRelevanciaBase}; el decorador
 * `@Injectable()` solo habilita su registro como provider bajo el token
 * {@link FILTRO_RELEVANCIA}.
 */
@Injectable()
export class FiltroRelevanciaFallback
    extends FiltroRelevanciaBase
    implements FiltroRelevancia { }
