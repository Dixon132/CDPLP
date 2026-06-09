import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { COLA_PROCESAR_SEMANA } from '../src/queue/queue.constants';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Smoke test de bootstrap y aislamiento del servicio autonomo `ServidorGDS`
 * (Task 1.4).
 *
 * Aporta evidencia tecnica ejecutable (Req. 26.1, 26.2) de dos garantias:
 *
 *  1. BOOTSTRAP (Req. 1.3): la aplicacion NestJS arranca de forma autonoma y
 *     responde al health-check publico `GET /api/gds/health` con 200, sin
 *     depender del modulo IREC anterior. El arranque NO requiere una BD ni una
 *     Redis vivas: se sustituyen el `PrismaService` (conexion a la BD dedicada)
 *     y la cola BullMQ (conexion a la Redis dedicada) por dobles de prueba, de
 *     modo que el health-check de liveness sea independiente de la
 *     infraestructura externa.
 *
 *  2. AISLAMIENTO (Req. 1.4, 25.3): asercion ESTATICA sobre el codigo fuente de
 *     `src/`. El servicio es autonomo, por lo que su codigo NO debe:
 *       - importar simbolos del `Servidor` del colegio ni de otros proyectos
 *         hermanos del repositorio (`Servidor/`, `ServicioIA/`, `ClienteCDPLPL/`);
 *       - referenciar el modulo IREC anterior (Req. 1.4);
 *       - acceder a la base de datos del colegio: no debe incrustar su cadena de
 *         conexion, credenciales ni nombre de BD, ni importar su cliente Prisma
 *         generado (aislamiento total a nivel de BD - Req. 25.3).
 */

const SERVICE_ROOT = resolve(__dirname, '..');
const SRC_ROOT = join(SERVICE_ROOT, 'src');

/** Doble de prueba del PrismaService: no abre conexion con la BD dedicada. */
const prismaStub: Partial<PrismaService> = {
    onModuleInit: jest.fn(async () => undefined),
    onModuleDestroy: jest.fn(async () => undefined),
    $connect: jest.fn(async () => undefined) as unknown as PrismaService['$connect'],
    $disconnect: jest.fn(async () => undefined) as unknown as PrismaService['$disconnect'],
};

/** Doble de prueba de la cola BullMQ: evita abrir conexion con la Redis dedicada. */
const queueStub = {
    add: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
};

describe('Smoke de bootstrap: GET /api/gds/health (Req. 1.3, 26.1)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            // Sustituye la conexion a la BD dedicada: el health-check no la requiere.
            .overrideProvider(PrismaService)
            .useValue(prismaStub)
            // Sustituye la cola: evita la conexion a la Redis dedicada en el arranque.
            .overrideProvider(getQueueToken(COLA_PROCESAR_SEMANA))
            .useValue(queueStub)
            .compile();

        app = moduleRef.createNestApplication();
        // Mismo prefijo global que produccion (`main.ts`): la API vive bajo /api/gds.
        app.setGlobalPrefix('api/gds');
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it('arranca la app autonoma y responde 200 con el estado de liveness', async () => {
        const res = await request(app.getHttpServer()).get('/api/gds/health');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            service: 'ServidorGDS',
            status: 'ok',
        });
        expect(typeof res.body.timestamp).toBe('string');
    });

    it('no expone el health-check fuera del prefijo /api/gds (aislamiento de rutas)', async () => {
        const res = await request(app.getHttpServer()).get('/health');
        expect(res.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// Asercion estatica de aislamiento sobre el codigo fuente de src/.
// ---------------------------------------------------------------------------

/** Recolecta recursivamente las rutas de los ficheros `.ts` bajo `dir`. */
function archivosTs(dir: string): string[] {
    const resultados: string[] = [];
    for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
            if (entrada === 'node_modules' || entrada === 'dist') continue;
            resultados.push(...archivosTs(ruta));
        } else if (ruta.endsWith('.ts')) {
            resultados.push(ruta);
        }
    }
    return resultados;
}

/** Extrae los especificadores de modulo de import/export/require de un fichero. */
function especificadoresDeImport(contenido: string): string[] {
    const specs: string[] = [];
    const patrones = [
        /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
        /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
        /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const patron of patrones) {
        let match: RegExpExecArray | null;
        while ((match = patron.exec(contenido)) !== null) {
            specs.push(match[1]);
        }
    }
    return specs;
}

describe('Aislamiento estatico del servicio autonomo ServidorGDS (Req. 1.4, 25.3)', () => {
    const ficheros = archivosTs(SRC_ROOT);

    it('encuentra codigo fuente que analizar (sanidad del escaneo)', () => {
        expect(ficheros.length).toBeGreaterThan(0);
    });

    it('ningun import escapa de ServidorGDS hacia proyectos hermanos del repo', () => {
        const infracciones: string[] = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const spec of especificadoresDeImport(contenido)) {
                // Solo los imports relativos pueden escapar de la carpeta del servicio.
                if (!spec.startsWith('.')) continue;
                const destino = resolve(join(fichero, '..'), spec);
                const rel = relative(SERVICE_ROOT, destino);
                if (rel.startsWith('..') || rel.startsWith(`..${sep}`)) {
                    infracciones.push(
                        `${relative(SERVICE_ROOT, fichero)} importa "${spec}" fuera de ServidorGDS`,
                    );
                }
            }
        }
        expect(infracciones).toEqual([]);
    });

    it('ningun import referencia el Servidor del colegio, ServicioIA o ClienteCDPLPL', () => {
        const proyectosHermanos = /(^|[\/\\])(Servidor|ServicioIA|ClienteCDPLPL)([\/\\])/;
        const infracciones: string[] = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const spec of especificadoresDeImport(contenido)) {
                if (proyectosHermanos.test(spec)) {
                    infracciones.push(`${relative(SERVICE_ROOT, fichero)} -> "${spec}"`);
                }
            }
        }
        expect(infracciones).toEqual([]);
    });

    it('ningun import referencia el modulo IREC anterior (Req. 1.4)', () => {
        // IREC como segmento de ruta/modulo (evita falsos positivos como "direccion").
        const refIrec = /(^|[\/\\@])irec([\/\\]|$)/i;
        const infracciones: string[] = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const spec of especificadoresDeImport(contenido)) {
                if (refIrec.test(spec)) {
                    infracciones.push(`${relative(SERVICE_ROOT, fichero)} -> "${spec}"`);
                }
            }
        }
        expect(infracciones).toEqual([]);
    });

    it('no incrusta la conexion, credenciales ni el cliente Prisma de la BD del colegio (Req. 25.3)', () => {
        // Marcadores especificos de la BD del colegio (Servidor/.env y su cliente generado).
        const marcadoresColegio: ReadonlyArray<{ patron: RegExp; descripcion: string }> = [
            { patron: /diego:diego135/i, descripcion: 'credenciales de la BD del colegio' },
            { patron: /5432\/cOL\b/, descripcion: 'nombre de la BD del colegio (cOL)' },
            { patron: /generated[\/\\]prisma/i, descripcion: 'cliente Prisma generado del colegio' },
        ];
        const infracciones: string[] = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const { patron, descripcion } of marcadoresColegio) {
                if (patron.test(contenido)) {
                    infracciones.push(`${relative(SERVICE_ROOT, fichero)} contiene ${descripcion}`);
                }
            }
        }
        expect(infracciones).toEqual([]);
    });
});
