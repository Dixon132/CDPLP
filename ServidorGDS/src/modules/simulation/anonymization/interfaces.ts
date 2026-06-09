/**
 * Interfaz estable del `Servicio_Anonimizacion` (privacidad por diseno).
 *
 * Reemplaza identificadores de `Usuario_Sintetico` por seudonimos hash
 * irreversibles y consistentes, antes de cualquier etapa de analisis o
 * almacenamiento (Req. 13.5, 23.1, 23.2, 23.4).
 *
 * Migrado al modulo `simulation` (tarea 3.2). La interfaz es reemplazable por
 * otra implementacion sin acoplar al `Pipeline_Analisis`.
 *
 * Diseno: design.md > "Servicios del pipeline (interfaces estables)".
 */
import type { ContratoNormalizado } from "../contracts/contratoNormalizado";

export interface ServicioAnonimizacion {
    /** Seudonimo SHA-256(salt + id); irreversible y consistente (Req. 23.2, 23.4). */
    seudonimo(idSintetico: string, salt: string): string;
    /** Anonimiza todo el contrato antes del analisis (Req. 13.5, 23.1). */
    anonimizar(contrato: ContratoNormalizado, salt: string): ContratoNormalizado;
}
