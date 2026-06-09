/**
 * Submodulo de FALLBACK determinista para `Servicio_NLP`, `Servicio_Vision` y
 * `Filtro_Relevancia` (Req. 35.3).
 *
 * Registra las implementaciones deterministas TS previas como providers
 * inyectables bajo los tokens estables {@link SERVICIO_NLP},
 * {@link SERVICIO_VISION} y {@link FILTRO_RELEVANCIA}. Asi, el
 * `Pipeline_Analisis` (y el proxy de degradacion de la tarea 8.2) puede
 * resolver estos subsistemas por su contrato estable, intercambiando fallback y
 * cliente HTTP del `Servicio_IA` sin cambios de codigo (Req. 14.5, 15.4, 34.6).
 *
 * Alcance deliberadamente acotado a NLP/vision/filtro: el fallback de la
 * `Capa_ML` se registra por separado (tarea 3.4) para evitar acoplar ambos en
 * un unico modulo compartido.
 *
 * _Requirements: 14.5, 15.4, 34.6, 35.3_
 */
import { Module } from "@nestjs/common";

import {
    SERVICIO_NLP,
    SERVICIO_VISION,
    FILTRO_RELEVANCIA,
} from "../interfaces/tokens";
import { FiltroRelevanciaFallback } from "./filtro-relevancia.fallback";
import { ServicioNlpFallback } from "./nlp.fallback";
import { ServicioVisionFallback } from "./vision.fallback";

@Module({
    providers: [
        // Clases fallback (resolubles tambien por su tipo concreto en pruebas).
        ServicioNlpFallback,
        ServicioVisionFallback,
        FiltroRelevanciaFallback,
        // Enlace de cada token estable a su implementacion fallback.
        { provide: SERVICIO_NLP, useExisting: ServicioNlpFallback },
        { provide: SERVICIO_VISION, useExisting: ServicioVisionFallback },
        { provide: FILTRO_RELEVANCIA, useExisting: FiltroRelevanciaFallback },
    ],
    exports: [
        SERVICIO_NLP,
        SERVICIO_VISION,
        FILTRO_RELEVANCIA,
        ServicioNlpFallback,
        ServicioVisionFallback,
        FiltroRelevanciaFallback,
    ],
})
export class NlpVisionFiltroFallbackModule { }
