import dotenv from "dotenv";

dotenv.config();

/**
 * Configuracion del servicio autonomo ServidorGDS.
 *
 * Carga sus variables desde su PROPIO `.env`:
 *  - PORT:         puerto propio del servicio (independiente del colegio).
 *  - DATABASE_URL: base de datos PostgreSQL DEDICADA (Req. 25.1, 25.3).
 *  - JWT_SECRET:   secreto JWT compartido con el colegio para validar tokens.
 *  - CORS_ORIGIN:  origen permitido del Frontend_GDS.
 */
export const env = {
    port: Number(process.env.PORT ?? 4100),
    databaseUrl: process.env.DATABASE_URL ?? "",
    jwtSecret: process.env.JWT_SECRET ?? "",
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
    nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

export type Env = typeof env;
