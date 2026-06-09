/**
 * Cliente Prisma PROPIO y REUTILIZABLE del servicio autónomo ServidorGDS.
 *
 * Apunta a la base de datos PostgreSQL DEDICADA e INDEPENDIENTE del servicio
 * (su propio `DATABASE_URL`), NUNCA a la base de datos del colegio
 * (aislamiento total - Req. 25.1, 25.3).
 *
 * Se expone una ÚNICA instancia reutilizable (patrón singleton) para evitar
 * agotar el pool de conexiones, en especial bajo recarga en caliente durante
 * el desarrollo.
 */
import { PrismaClient } from "@prisma/client";

// En desarrollo, `ts-node`/recargas pueden re-evaluar este módulo varias veces;
// reutilizamos la instancia almacenada en el objeto global para no crear
// múltiples clientes (y múltiples pools de conexión).
const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

export const prisma: PrismaClient =
    globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

/**
 * Acceso al cliente Prisma reutilizable del servicio.
 */
export function getPrismaClient(): PrismaClient {
    return prisma;
}

export default prisma;
