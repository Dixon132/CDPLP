// Pruebas estructurales (SMOKE) del Frontend_GDS — Tarea 27.4.
//
// Evidencia técnica ejecutable (Req. 26.1, 26.2) de los invariantes de
// arquitectura y aislamiento del componente frontend (Req. 41.3, 41.4, 1.4):
//
//   1. La feature `gds` NO referencia el módulo IREC anterior en NINGÚN import
//      (Req. 1.4). Se analizan los especificadores de import/export, no el texto
//      libre, para no confundir los comentarios "NO depende de IREC" con un uso
//      real.
//   2. La feature `gds` es autónoma: ningún import escapa hacia los proyectos
//      hermanos del monorepo (Servidor/ServidorGDS/ServicioIA).
//   3. El frontend tiene su propio Dockerfile (+ nginx.conf) y está declarado
//      como servicio `frontend` en el docker-compose de la raíz.
//
// Son aserciones estáticas sobre ficheros del repositorio: deterministas, no
// interactivas y sin servidores vivos.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// src/test/ -> src/ -> ClienteCDPLPL/ -> raíz del repositorio (monorepo).
const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FRONTEND_ROOT = resolve(TEST_DIR, '..', '..');
const REPO_ROOT = resolve(FRONTEND_ROOT, '..');
const GDS_DIR = join(FRONTEND_ROOT, 'src', 'features', 'gds');

/** Recolecta recursivamente los ficheros de código bajo `dir`. */
function archivosCodigo(dir) {
    const resultados = [];
    for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
            resultados.push(...archivosCodigo(ruta));
        } else if (/\.(js|jsx|ts|tsx)$/.test(ruta)) {
            resultados.push(ruta);
        }
    }
    return resultados;
}

/** Extrae los especificadores de módulo de import/export/require. */
function especificadoresDeImport(contenido) {
    const specs = [];
    const patrones = [
        /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
        /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
        /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const patron of patrones) {
        let match;
        while ((match = patron.exec(contenido)) !== null) {
            specs.push(match[1]);
        }
    }
    return specs;
}

describe('SMOKE estructural: aislamiento de la feature gds del Frontend_GDS', () => {
    const ficheros = archivosCodigo(GDS_DIR);

    it('encuentra código fuente de la feature gds (sanidad del escaneo)', () => {
        expect(ficheros.length).toBeGreaterThan(0);
    });

    it('ningún import de la feature gds referencia el módulo IREC anterior (Req. 1.4)', () => {
        // IREC como segmento de ruta/módulo en el especificador del import.
        const refIrec = /(^|[/\\@])irec([/\\]|$)/i;
        const infracciones = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const spec of especificadoresDeImport(contenido)) {
                if (refIrec.test(spec)) {
                    infracciones.push(`${relative(FRONTEND_ROOT, fichero)} -> "${spec}"`);
                }
            }
        }
        expect(infracciones).toEqual([]);
    });

    it('ningún import de la feature gds escapa hacia proyectos hermanos del monorepo', () => {
        const proyectosHermanos = /(^|[/\\])(Servidor|ServidorGDS|ServicioIA)([/\\])/;
        const infracciones = [];
        for (const fichero of ficheros) {
            const contenido = readFileSync(fichero, 'utf8');
            for (const spec of especificadoresDeImport(contenido)) {
                if (proyectosHermanos.test(spec)) {
                    infracciones.push(`${relative(FRONTEND_ROOT, fichero)} -> "${spec}"`);
                }
            }
        }
        expect(infracciones).toEqual([]);
    });
});

describe('SMOKE estructural: contenerización del Frontend_GDS (Req. 41.3, 41.4)', () => {
    it('el frontend tiene su propio Dockerfile y nginx.conf', () => {
        expect(existsSync(join(FRONTEND_ROOT, 'Dockerfile'))).toBe(true);
        expect(existsSync(join(FRONTEND_ROOT, 'nginx.conf'))).toBe(true);
    });

    it('está declarado como servicio `frontend` en el docker-compose de la raíz', () => {
        const composePath = join(REPO_ROOT, 'docker-compose.yml');
        expect(existsSync(composePath)).toBe(true);
        const compose = readFileSync(composePath, 'utf8');
        expect(compose).toMatch(/\n {2}frontend:/);
        expect(compose).toMatch(/context:\s*\.\/ClienteCDPLPL/);
    });
});
