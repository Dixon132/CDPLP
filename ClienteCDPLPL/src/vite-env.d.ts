/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** URL base del servidor del colegio (proxy /api en desarrollo). */
    readonly VITE_API_URL: string;
    /**
     * URL base del backend autónomo de la Plataforma_GDS (`ServidorGDS/`).
     * Apunta al puerto PROPIO del servicio GDS, expuesto bajo `/api/gds`.
     */
    readonly VITE_GDS_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
