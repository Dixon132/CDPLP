import type { RedisOptions } from 'bullmq';

/**
 * Convierte una cadena `REDIS_URL` (p. ej. `redis://usuario:pass@host:6379/0`)
 * en las opciones de conexion que entiende BullMQ/ioredis.
 *
 * BullMQ (sobre ioredis) no acepta de forma fiable una URL cruda dentro de sus
 * opciones de conexion, por lo que parseamos la URL a campos discretos (host,
 * puerto, credenciales, base de datos y TLS). Asi la Redis PROPIA del servicio
 * queda configurada de forma explicita y predecible (Req. 38.1).
 *
 * @param redisUrl URL de conexion a la Redis dedicada del servicio.
 * @returns Opciones de conexion para BullMQ.
 * @throws Error si la URL es invalida o usa un protocolo no soportado.
 */
export function parseRedisUrl(redisUrl: string): RedisOptions {
    if (!redisUrl || redisUrl.trim().length === 0) {
        throw new Error(
            'REDIS_URL no esta definida: la Cola_Trabajos requiere una Redis dedicada (Req. 38.1).',
        );
    }

    let parsed: URL;
    try {
        parsed = new URL(redisUrl);
    } catch {
        throw new Error(`REDIS_URL no es una URL valida: "${redisUrl}".`);
    }

    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
        throw new Error(
            `REDIS_URL usa un protocolo no soportado: "${parsed.protocol}". Use redis:// o rediss://.`,
        );
    }

    // La base de datos viaja como path: /0, /1, ... (vacio => 0).
    const dbSegment = parsed.pathname.replace(/^\//, '');
    const db = dbSegment.length > 0 ? Number.parseInt(dbSegment, 10) : 0;

    const options: RedisOptions = {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
        db: Number.isNaN(db) ? 0 : db,
        // Requisito de BullMQ: los workers necesitan maxRetriesPerRequest=null.
        maxRetriesPerRequest: null,
    };

    if (parsed.username) {
        options.username = decodeURIComponent(parsed.username);
    }
    if (parsed.password) {
        options.password = decodeURIComponent(parsed.password);
    }
    if (parsed.protocol === 'rediss:') {
        options.tls = {};
    }

    return options;
}
