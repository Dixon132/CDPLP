import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Pruebas de integridad referencial y cascada del esquema Prisma (Task 2.2).
 *
 * Valida con evidencia tecnica ejecutable (Req. 26.1, 26.2) las garantias de
 * integridad del esquema definido en `prisma/schema.prisma`:
 *
 *  - Req. 9.4  : ningun registro semanal puede quedar huerfano de su Analisis
 *                ni de su Institucion (FKs NOT NULL hacia ambos).
 *  - Req. 25.2 : FKs que vinculan Semana_Simulada (ciclo), resultados,
 *                Usuario_Sintetico y Comunidad_Digital con su Institucion y/o
 *                su Analisis.
 *  - Req. 25.4 : al eliminar un Analisis, borrado en CASCADA consistente sobre
 *                todo su subgrafo dependiente.
 *  - Req. 25.7 : los datos dependientes solo se eliminan como parte del borrado
 *                en cascada del Analisis (no hay borrado directo no controlado);
 *                la Institucion referenciada NO se borra (onDelete: Restrict).
 *  - Req. 28.9 : cada nivel de la memoria jerarquica (semanal..global) referencia
 *                por integridad a exactamente un Analisis y a su Comunidad/
 *                Institucion correspondiente, con cascada desde el Analisis.
 *
 * IMPORTANTE: no hay una base de datos PostgreSQL aprovisionada en este entorno
 * (la migracion fue diferida en la tarea 2.1). Por ello estas pruebas son
 * ASERCIONES ESTATICAS DE CONTRATO sobre el texto del esquema: parsean
 * `schema.prisma` y verifican que las relaciones FK y las politicas onDelete
 * existen y son las esperadas. Una prueba de integracion contra una BD real
 * aprovisionada puede, mas adelante, REEMPLAZAR o COMPLEMENTAR estas aserciones
 * estaticas ejecutando inserciones/borrados reales (registro huerfano rechazado,
 * cascada que borra solo el subgrafo del analisis, institucion no borrable).
 */

const SERVICE_ROOT = resolve(__dirname, "..", "..");
const SCHEMA_PATH = join(SERVICE_ROOT, "prisma", "schema.prisma");
const schema = readFileSync(SCHEMA_PATH, "utf8");

/** Extrae el bloque de texto de un `model <Nombre> { ... }`. */
function bloqueModelo(nombre: string): string {
    const match = schema.match(new RegExp(`model\\s+${nombre}\\s*\\{[\\s\\S]*?\\n\\}`));
    return match?.[0] ?? "";
}

/**
 * Devuelve la(s) linea(s) de relacion `@relation(...)` que apuntan a un modelo
 * destino dentro de un bloque de modelo dado. Une lineas para tolerar formato.
 */
function lineasRelacionHacia(bloque: string, destino: string): string[] {
    return bloque
        .split("\n")
        .map((l) => l.trim())
        // Una linea de relacion FK tiene la forma: `campo Destino @relation(...)`
        .filter((l) => /@relation\(/.test(l) && new RegExp(`\\b${destino}\\b`).test(l));
}

/** Verdadero si el bloque declara una FK (campo escalar `<x>Id`) NOT NULL hacia el destino. */
function tieneFkNoNula(bloque: string, campoId: string): boolean {
    const linea = bloque
        .split("\n")
        .map((l) => l.trim())
        .find((l) => new RegExp(`^${campoId}\\s+String\\b`).test(l));
    // String sin `?` => columna NOT NULL => no admite huerfanos.
    return !!linea && !/^\S+\s+String\?/.test(linea);
}

describe("integridad de esquema: el subgrafo de Analisis borra en CASCADA (Req. 25.4, 25.7)", () => {
    // Todas las relaciones que cuelgan (directa o transitivamente) de Analisis
    // y deben declarar onDelete: Cascade en el lado que sostiene la FK.
    const relacionesCascada: ReadonlyArray<{ modelo: string; destino: string }> = [
        { modelo: "Comunidad", destino: "Analisis" },
        { modelo: "CicloSemanal", destino: "Analisis" },
        { modelo: "Generacion", destino: "CicloSemanal" },
        { modelo: "ResultadoAnalisis", destino: "CicloSemanal" },
        { modelo: "DimensionRiesgo", destino: "ResultadoAnalisis" },
        { modelo: "Evidence", destino: "ResultadoAnalisis" },
        { modelo: "Evidence", destino: "Analisis" },
        { modelo: "Evidence", destino: "Comunidad" },
        { modelo: "EvidenceRef", destino: "Evidence" },
        { modelo: "Explicacion", destino: "DimensionRiesgo" },
        { modelo: "ScoreAsociacion", destino: "UsuarioSintetico" },
        { modelo: "ScoreAsociacion", destino: "Comunidad" },
        { modelo: "UsuarioSintetico", destino: "Comunidad" },
        { modelo: "HistorialUsuario", destino: "UsuarioSintetico" },
        { modelo: "Patron", destino: "Analisis" },
        { modelo: "Patron", destino: "Comunidad" },
        { modelo: "Calibracion", destino: "Analisis" },
        { modelo: "Reporte", destino: "Analisis" },
        { modelo: "LogGeneracion", destino: "CicloSemanal" },
        // Los cinco niveles de la memoria jerarquica (Req. 28.9).
        { modelo: "MemoriaSemanal", destino: "Analisis" },
        { modelo: "MemoriaSemanal", destino: "Comunidad" },
        { modelo: "MemoriaMensual", destino: "Analisis" },
        { modelo: "MemoriaMensual", destino: "Comunidad" },
        { modelo: "MemoriaTrimestral", destino: "Analisis" },
        { modelo: "MemoriaTrimestral", destino: "Comunidad" },
        { modelo: "MemoriaSemestral", destino: "Analisis" },
        { modelo: "MemoriaSemestral", destino: "Comunidad" },
        { modelo: "MemoriaGlobal", destino: "Analisis" },
    ];

    it.each(relacionesCascada)(
        "$modelo -> $destino declara onDelete: Cascade",
        ({ modelo, destino }) => {
            const bloque = bloqueModelo(modelo);
            expect(bloque).not.toBe("");

            const relaciones = lineasRelacionHacia(bloque, destino);
            expect(relaciones.length).toBeGreaterThan(0);

            const conCascada = relaciones.some((l) => /onDelete:\s*Cascade/.test(l));
            expect(conCascada).toBe(true);
        },
    );
});

describe("integridad de esquema: la Institucion referenciada NO se borra (Req. 25.7)", () => {
    // FKs de trazabilidad hacia Institucion: deben ser RESTRICT para que la
    // institucion referenciada por un analisis no pueda eliminarse.
    const relacionesRestrict: ReadonlyArray<{ modelo: string }> = [
        { modelo: "Comunidad" },
        { modelo: "CicloSemanal" },
        { modelo: "Evidence" },
        { modelo: "Reporte" },
    ];

    it.each(relacionesRestrict)(
        "$modelo -> Institucion declara onDelete: Restrict",
        ({ modelo }) => {
            const bloque = bloqueModelo(modelo);
            const relaciones = lineasRelacionHacia(bloque, "Institucion");
            expect(relaciones.length).toBeGreaterThan(0);

            const conRestrict = relaciones.some((l) => /onDelete:\s*Restrict/.test(l));
            expect(conRestrict).toBe(true);
        },
    );

    it("ninguna FK hacia Institucion usa Cascade (la institucion nunca se borra en cascada)", () => {
        for (const { modelo } of relacionesRestrict) {
            const bloque = bloqueModelo(modelo);
            for (const linea of lineasRelacionHacia(bloque, "Institucion")) {
                expect(/onDelete:\s*Cascade/.test(linea)).toBe(false);
            }
        }
    });
});

describe("integridad de esquema: ningun registro semanal queda huerfano (Req. 9.4, 25.2)", () => {
    // Un "registro semanal" se ancla a su Analisis y a su Institucion mediante
    // FKs NOT NULL: sin ellas no puede existir (no admite huerfanos).
    it("CicloSemanal tiene FKs NOT NULL hacia Analisis e Institucion", () => {
        const bloque = bloqueModelo("CicloSemanal");
        expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
        expect(tieneFkNoNula(bloque, "institucionId")).toBe(true);
        // Y ambas relaciones deben existir.
        expect(lineasRelacionHacia(bloque, "Analisis").length).toBeGreaterThan(0);
        expect(lineasRelacionHacia(bloque, "Institucion").length).toBeGreaterThan(0);
    });

    it("Comunidad (Comunidad_Digital) tiene FKs NOT NULL hacia Analisis e Institucion", () => {
        const bloque = bloqueModelo("Comunidad");
        expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
        expect(tieneFkNoNula(bloque, "institucionId")).toBe(true);
    });

    it("ResultadoAnalisis (resultado semanal) cuelga NOT NULL de su CicloSemanal", () => {
        const bloque = bloqueModelo("ResultadoAnalisis");
        expect(tieneFkNoNula(bloque, "cicloId")).toBe(true);
        expect(lineasRelacionHacia(bloque, "CicloSemanal").length).toBeGreaterThan(0);
    });

    it("UsuarioSintetico cuelga NOT NULL de su Comunidad (anclado a analisis/institucion)", () => {
        const bloque = bloqueModelo("UsuarioSintetico");
        expect(tieneFkNoNula(bloque, "comunidadId")).toBe(true);
    });

    it("HistorialUsuario (registro semanal del usuario) cuelga NOT NULL de su UsuarioSintetico", () => {
        const bloque = bloqueModelo("HistorialUsuario");
        expect(tieneFkNoNula(bloque, "usuarioId")).toBe(true);
    });
});

describe("integridad de esquema: unicidad que evita duplicados por institucion/semana (Req. 9.2, 25.2)", () => {
    it("Comunidad es unica por (analisis_id, institucion_id)", () => {
        const bloque = bloqueModelo("Comunidad");
        expect(bloque).toMatch(/@@unique\(\[\s*analisisId\s*,\s*institucionId\s*\]\)/);
    });

    it("CicloSemanal es unico por (analisis_id, institucion_id, numero_semana)", () => {
        const bloque = bloqueModelo("CicloSemanal");
        expect(bloque).toMatch(
            /@@unique\(\[\s*analisisId\s*,\s*institucionId\s*,\s*numeroSemana\s*\]\)/,
        );
    });
});

describe("integridad de esquema: integridad referencial de la memoria jerarquica (Req. 28.9)", () => {
    // Cada nivel referencia a exactamente un Analisis; los niveles
    // semanal..semestral referencian ademas su Comunidad. Todas NOT NULL.
    const nivelesConComunidad = [
        "MemoriaSemanal",
        "MemoriaMensual",
        "MemoriaTrimestral",
        "MemoriaSemestral",
    ];

    it.each(nivelesConComunidad)(
        "%s referencia NOT NULL a su Analisis y a su Comunidad",
        (nivel) => {
            const bloque = bloqueModelo(nivel);
            expect(bloque).not.toBe("");
            expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
            expect(tieneFkNoNula(bloque, "comunidadId")).toBe(true);
            expect(lineasRelacionHacia(bloque, "Analisis").length).toBeGreaterThan(0);
            expect(lineasRelacionHacia(bloque, "Comunidad").length).toBeGreaterThan(0);
        },
    );

    it("MemoriaGlobal referencia NOT NULL a exactamente un Analisis (nivel agregado global)", () => {
        const bloque = bloqueModelo("MemoriaGlobal");
        expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
        expect(lineasRelacionHacia(bloque, "Analisis").length).toBeGreaterThan(0);
        // El nivel global no se asocia a una unica comunidad.
        expect(/comunidadId\s+String/.test(bloque)).toBe(false);
    });
});

describe("integridad de esquema: Memoria_Semantica vectorial y memoria historica (Req. 36.1, 36.5, 39.1, 39.3)", () => {
    it("Embedding (gds_embedding) cuelga NOT NULL de su Analisis, Comunidad y Resultado", () => {
        const bloque = bloqueModelo("Embedding");
        expect(bloque).not.toBe("");
        expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
        expect(tieneFkNoNula(bloque, "comunidadId")).toBe(true);
        expect(tieneFkNoNula(bloque, "resultadoId")).toBe(true);
        expect(tieneFkNoNula(bloque, "institucionId")).toBe(true);
    });

    it("Embedding borra en CASCADA desde Analisis, Comunidad y Resultado (Req. 25.4, 36.2)", () => {
        const bloque = bloqueModelo("Embedding");
        for (const destino of ["Analisis", "Comunidad", "ResultadoAnalisis"]) {
            const relaciones = lineasRelacionHacia(bloque, destino);
            expect(relaciones.length).toBeGreaterThan(0);
            expect(relaciones.some((l) => /onDelete:\s*Cascade/.test(l))).toBe(true);
        }
    });

    it("Embedding -> Institucion es RESTRICT y nunca Cascade (la institucion no se borra, Req. 25.7)", () => {
        const bloque = bloqueModelo("Embedding");
        const relaciones = lineasRelacionHacia(bloque, "Institucion");
        expect(relaciones.length).toBeGreaterThan(0);
        expect(relaciones.some((l) => /onDelete:\s*Restrict/.test(l))).toBe(true);
        expect(relaciones.some((l) => /onDelete:\s*Cascade/.test(l))).toBe(false);
    });

    it("Embedding expone columna vectorial pgvector (Unsupported vector) con modelo y dim", () => {
        const bloque = bloqueModelo("Embedding");
        expect(/vector\s+Unsupported\("vector(\(\d+\))?"\)/.test(bloque)).toBe(true);
        expect(/modelo\s+String/.test(bloque)).toBe(true);
        expect(/dim\s+Int/.test(bloque)).toBe(true);
    });

    const memoriaHistorica = ["TendenciaHistorica", "EventoHistorico"];

    it.each(memoriaHistorica)(
        "%s (memoria historica) cuelga NOT NULL de Analisis y Comunidad y borra en CASCADA",
        (modelo) => {
            const bloque = bloqueModelo(modelo);
            expect(bloque).not.toBe("");
            expect(tieneFkNoNula(bloque, "analisisId")).toBe(true);
            expect(tieneFkNoNula(bloque, "comunidadId")).toBe(true);
            for (const destino of ["Analisis", "Comunidad"]) {
                const relaciones = lineasRelacionHacia(bloque, destino);
                expect(relaciones.length).toBeGreaterThan(0);
                expect(relaciones.some((l) => /onDelete:\s*Cascade/.test(l))).toBe(true);
            }
        },
    );
});

describe("integridad de esquema: el indice vectorial de Embeddings_Search existe en la migracion (Req. 36.3)", () => {
    it("la migracion del esquema ampliado crea un indice ivfflat/hnsw sobre gds_embedding.vector", () => {
        const migracion = readFileSync(
            join(SERVICE_ROOT, "prisma", "migrations", "20250101000001_esquema_gds_ampliado", "migration.sql"),
            "utf8",
        );
        // La tabla vectorial y su columna pgvector deben crearse.
        expect(/CREATE TABLE "gds_embedding"/.test(migracion)).toBe(true);
        expect(/"vector"\s+vector(\(\d+\))?/.test(migracion)).toBe(true);
        // El indice aproximado para la busqueda por similitud (ivfflat o hnsw).
        expect(/USING\s+(hnsw|ivfflat)\s*\(\s*"vector"/i.test(migracion)).toBe(true);
    });

    it("la extension pgvector se habilita antes de usar el tipo vector", () => {
        const migracion = readFileSync(
            join(SERVICE_ROOT, "prisma", "migrations", "20250101000001_esquema_gds_ampliado", "migration.sql"),
            "utf8",
        );
        const posExtension = migracion.indexOf('CREATE EXTENSION');
        const posTablaVector = migracion.indexOf('CREATE TABLE "gds_embedding"');
        expect(posExtension).toBeGreaterThanOrEqual(0);
        expect(posTablaVector).toBeGreaterThan(posExtension);
    });
});
