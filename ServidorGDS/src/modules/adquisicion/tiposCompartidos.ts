/**
 * Tipos compartidos ligeros de la `Capa_Adquisicion`.
 *
 * Definiciones minimas de `Patron` y `PerfilUsuario` referenciadas por
 * `ContextoGeneracion` (tarea 5.1). Son placeholders intencionalmente
 * ligeros que tareas posteriores ampliaran:
 *  - `PerfilUsuario` -> `Usuario_Sintetico` persistente (tarea 15.1, Req. 10.x).
 *  - `Patron` -> `Detector_Patrones` y `gds_patron` (tarea 15.3, Req. 33.x).
 *
 * Diseno: design.md > ERD (`gds_usuario_sintetico`, `gds_patron`).
 */
import type { ZonaGeografica } from "./proveedorGeneracion";

/**
 * Perfil conductual de un `Usuario_Sintetico` persistente que se reutiliza
 * entre semanas (Req. 10.1, 10.3). Placeholder ligero; la representacion
 * completa con historial se define en la tarea 15.1.
 */
export interface PerfilUsuario {
    id: string;
    /** Seudonimo hash una vez anonimizado (Req. 23.x); opcional en generacion. */
    seudonimo?: string;
    perfilConductual: string;
    frecuencia: number;
    estiloEscritura: string;
    intereses: string[];
    nivelParticipacion: string;
}

/**
 * Patron/tendencia recurrente detectado, anclado a su `Zona_Geografica`
 * (Req. 33.3, 33.4). Placeholder ligero; lo completa el `Detector_Patrones`
 * en la tarea 15.3.
 */
export interface Patron {
    id: string;
    tipo: string;
    descripcion: string;
    zona: ZonaGeografica;
}
