import { parseRedisUrl } from './redis-connection';

describe('parseRedisUrl', () => {
    it('parsea host y puerto de una URL basica', () => {
        const opts = parseRedisUrl('redis://localhost:6379');
        expect(opts.host).toBe('localhost');
        expect(opts.port).toBe(6379);
        expect(opts.db).toBe(0);
        // BullMQ exige maxRetriesPerRequest=null para los workers.
        expect(opts.maxRetriesPerRequest).toBeNull();
    });

    it('aplica el puerto por defecto 6379 cuando no se especifica', () => {
        const opts = parseRedisUrl('redis://mi-redis');
        expect(opts.host).toBe('mi-redis');
        expect(opts.port).toBe(6379);
    });

    it('extrae credenciales y base de datos', () => {
        const opts = parseRedisUrl('redis://usuario:secreto@host:6380/3');
        expect(opts.host).toBe('host');
        expect(opts.port).toBe(6380);
        expect(opts.username).toBe('usuario');
        expect(opts.password).toBe('secreto');
        expect(opts.db).toBe(3);
    });

    it('decodifica credenciales url-encoded', () => {
        const opts = parseRedisUrl('redis://user:p%40ss%3Aword@host:6379');
        expect(opts.password).toBe('p@ss:word');
    });

    it('habilita TLS para el esquema rediss://', () => {
        const opts = parseRedisUrl('rediss://host:6379');
        expect(opts.tls).toEqual({});
    });

    it('lanza error si la URL esta vacia', () => {
        expect(() => parseRedisUrl('')).toThrow(/REDIS_URL/);
        expect(() => parseRedisUrl('   ')).toThrow(/REDIS_URL/);
    });

    it('lanza error ante una URL invalida', () => {
        expect(() => parseRedisUrl('no-es-una-url')).toThrow(/no es una URL valida/);
    });

    it('lanza error ante un protocolo no soportado', () => {
        expect(() => parseRedisUrl('http://host:6379')).toThrow(/protocolo no soportado/);
    });
});
