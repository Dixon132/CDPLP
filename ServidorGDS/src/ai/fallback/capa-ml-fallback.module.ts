/**
 * Submodulo de FALLBACK determinista para la `Capa_ML` (Req. 31.1, 31.6, 35.3).
 *
 * Registra la implementacion determinista TS previa ({@link CapaMlFallback},
 * sobre `CapaMLBase`) como provider inyectable bajo el token estable
 * {@link CAPA_ML}. Asi, el `Pipeline_Analisis` (y el proxy de degradacion de la
 * tarea 8.2) puede resolver la `Capa_ML` por su contrato estable, intercambiando
 * fallback y cliente HTTP del `Servicio_IA` sin cambios de codigo (Req. 31.6).
 *
 * Alcance deliberadamente acotado a la `Capa_ML`: el fallback de
 * NLP/vision/filtro se registra por separado (tarea 3.3,
 * `NlpVisionFiltroFallbackModule`) para no acoplar ambos en un unico modulo
 * compartido.
 *
 * _Requirements: 31.1, 31.6, 35.3_
 */
import { Module } from "@nestjs/common";

import { CAPA_ML } from "../interfaces/tokens";
import { CapaMlFallback } from "./capa-ml.fallback";

@Module({
    providers: [
        // Clase fallback (resoluble tambien por su tipo concreto en pruebas).
        CapaMlFallback,
        // Enlace del token estable a su implementacion fallback.
        { provide: CAPA_ML, useExisting: CapaMlFallback },
    ],
    exports: [CAPA_ML, CapaMlFallback],
})
export class CapaMlFallbackModule { }
