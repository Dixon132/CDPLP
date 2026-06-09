/**
 * Pruebas estructurales (SMOKE) de la Plataforma_GDS — Tarea 27.4.
 *
 * Evidencia tecnica ejecutable (Req. 26.1, 26.2) de los invariantes de
 * arquitectura y aislamiento de los TRES componentes (Req. 41.3, 41.4):
 *
 *   1. Contenerizacion: cada componente (`ClienteCDPLPL`, `ServidorGDS`,
 *      `ServicioIA`) tiene su propio `Dockerfile`, y existe un `docker-compose`
 *      en la raiz que levanta los tres servicios + PostgreSQL/pgvector + Redis.
 *   2. Aislamiento del `Servicio_IA`: no se expone publicamente en el compose
 *      (sin `ports:`, solo `expose:` en la red interna) (Req. 35).
 *   3. BD dedicada + pgvector: la imagen de datos es `pgvector/...` y existe la
 *      migracion que habilita `CREATE EXTENSION vector` (Req. 25.1, 36.1).
 *   4. Aislamiento de la BD del colegio: la configuracion del `ServidorGDS`
 *      apunta a su BD dedicada (`gds_*`), nunca a la del colegio (Req. 25.3).
 *   5. Ausencia de dependencias IREC: el `package.json` del `ServidorGDS` no
 *      declara ninguna dependencia del modulo IREC anterior (Req. 1.4).
 *   6. Separacion de roles GDS: existe el enum de roles propios de la
 *      plataforma, separado de los roles del colegio (Req. 24).
 *   7. Health publico: el `ServidorGDS` declara `GET health` bajo el prefijo
 *      global `/api/gds` (Req. 1.3). El arranque real + respuesta 200 se prueba
 *      de extremo a extremo con Supertest en `test/app.e2e-spec.ts` (Tarea 1.4).
 *
 * Estas son aserciones ESTATICAS sobre ficheros del repositorio: deterministas,
 * no interactivas y sin servidores vivos.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// src/__tests__ -> src -> ServidorGDS -> raiz del repositorio (monorepo).
const SERVICE_ROOT = resolve(__dirname, '..', '..');
const REPO_ROOT = resolve(SERVICE_ROOT, '..');

/** Lee un fichero de texto del repo; falla con un mensaje claro si no existe. */
function leer(ruta: string): string {
    expect(existsSync(ruta)).toBe(true);
    return readFileSync(ruta, 'utf8');
}

describe('SMOKE estructural: contenerizacion de los tres componentes (Req. 41.3)', () => {
    it('cada componente tiene su propio Dockerfile', () => {
        const dockerfiles = [
            join(REPO_ROOT, 'ClienteCDPLPL', 'Dockerfile'),
            join(REPO_ROOT, 'ServidorGDS', 'Dockerfile'),
            join(REPO_ROOT, 'ServicioIA', 'Dockerfile'),
        ];
        const faltantes = dockerfiles.filter((d) => !existsSync(d));
        expect(faltantes).toEqual([]);
    });

    it('existe un docker-compose en la raiz del repositorio', () => {
        const compose =
            [join(REPO_ROOT, 'docker-compose.yml'), join(REPO_ROOT, 'docker-compose.yaml')].find(
                existsSync,
            ) ?? '';
        expect(compose).not.toBe('');
    });
});

describe('SMOKE estructural: docker-compose levanta 3 servicios + datos (Req. 41.4)', () => {
    const compose = leer(join(REPO_ROOT, 'docker-compose.yml'));

    it('define los tres servicios de la plataforma', () => {
        for (const servicio of ['frontend', 'servidor-gds', 'servicio-ia']) {
            expect(compose).toMatch(new RegExp(`\\n  ${servicio}:`));
        }
    });

    it('define los servicios de datos PostgreSQL/pgvector y Redis', () => {
        expect(compose).toMatch(/\n  postgres:/);
        expect(compose).toMatch(/\n  redis:/);
        // La imagen de datos debe ser pgvector (BD dedicada con extension vector).
        expect(compose).toMatch(/image:\s*pgvector\/pgvector/);
        expect(compose).toMatch(/image:\s*redis:/);
    });

    it('apunta los builds de los tres componentes a sus carpetas/Dockerfiles', () => {
        expect(compose).toMatch(/context:\s*\.\/ClienteCDPLPL/);
        expect(compose).toMatch(/context:\s*\.\/ServidorGDS/);
        expect(compose).toMatch(/context:\s*\.\/ServicioIA/);
    });
});

describe('SMOKE estructural: el Servicio_IA no se expone publicamente (Req. 35)', () => {
    const compose = leer(join(REPO_ROOT, 'docker-compose.yml'));

    /** Extrae el bloque YAML de un servicio hasta el siguiente servicio (2 espacios). */
    function bloqueServicio(nombre: string): string {
        const inicio = compose.indexOf(`\n  ${nombre}:`);
        expect(inicio).toBeGreaterThanOrEqual(0);
        const resto = compose.slice(inicio + 1);
        const siguiente = resto.search(/\n {2}[a-z0-9_-]+:/);
        return siguiente === -1 ? resto : resto.slice(0, siguiente);
    }

    it('el bloque de servicio-ia usa `expose` y no publica `ports`', () => {
        const bloque = bloqueServicio('servicio-ia');
        // Accesible solo en la red interna: sin mapeo de puertos al host.
        expect(bloque).not.toMatch(/\n\s+ports:/);
        expect(bloque).toMatch(/\n\s+expose:/);
    });
});

describe('SMOKE estructural: BD dedicada + pgvector habilitado (Req. 25.1, 36.1)', () => {
    it('existe la migracion que habilita la extension pgvector', () => {
        const migracion = join(
            SERVICE_ROOT,
            'prisma',
            'migrations',
            '20250101000000_enable_pgvector',
            'migration.sql',
        );
        const sql = leer(migracion);
        expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS\s+"?vector"?/i);
    });
});

describe('SMOKE estructural: aislamiento de la BD del colegio (Req. 25.3)', () => {
    const envExample = leer(join(SERVICE_ROOT, '.env.example'));

    it('la configuracion de ejemplo apunta a la BD dedicada (gds_db), no a la del colegio', () => {
        // Debe referirse a su propia base (gds_*) y nunca a marcadores del colegio.
        expect(envExample).toMatch(/gds_db/);
        expect(envExample).not.toMatch(/diego:diego135/i);
        expect(envExample).not.toMatch(/5432\/cOL\b/);
    });
});

describe('SMOKE estructural: ausencia de dependencias IREC (Req. 1.4)', () => {
    const pkg = JSON.parse(leer(join(SERVICE_ROOT, 'package.json'))) as Record<string, unknown>;

    it('el package.json del ServidorGDS no declara dependencias del modulo IREC', () => {
        const deps = {
            ...((pkg.dependencies as Record<string, string>) ?? {}),
            ...((pkg.devDependencies as Record<string, string>) ?? {}),
        };
        const refIrec = /(^|[/\\@-])irec([/\\-]|$)/i;
        const sospechosas = Object.keys(deps).filter((nombre) => refIrec.test(nombre));
        expect(sospechosas).toEqual([]);
    });
});

describe('SMOKE estructural: separacion de roles GDS (Req. 24)', () => {
    const fuenteAuth = leer(
        join(SERVICE_ROOT, 'src', 'modules', 'auth', 'servicioAutenticacion.ts'),
    );

    it('declara un enum de roles propios de la plataforma GDS', () => {
        expect(fuenteAuth).toMatch(/enum\s+RolGDS/);
        // Roles propios de la plataforma, distintos de los roles del colegio.
        expect(fuenteAuth).toMatch(/ADMIN_PLATAFORMA/);
        expect(fuenteAuth).toMatch(/ANALISTA/);
        expect(fuenteAuth).toMatch(/OBSERVADOR/);
    });
});

describe('SMOKE estructural: health publico bajo /api/gds (Req. 1.3)', () => {
    it('el AppController declara la ruta GET health', () => {
        const ctrl = leer(join(SERVICE_ROOT, 'src', 'app.controller.ts'));
        expect(ctrl).toMatch(/@Get\(\s*['"]health['"]\s*\)/);
    });

    it('main.ts fija el prefijo global api/gds para toda la API', () => {
        const main = leer(join(SERVICE_ROOT, 'src', 'main.ts'));
        expect(main).toMatch(/setGlobalPrefix\(/);
        expect(main).toMatch(/['"]api\/gds['"]/);
    });
});
