import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Tarea 2.4 - Pruebas de integridad referencial y cascada del esquema ampliado.
 *
 * Verifica, con evidencia tecnica ejecutable (Req. 26.1, 26.2), las tres
 * garantias nucleares de la tarea sobre el esquema definido en la migracion
 * `20250101000001_esquema_gds_ampliado`:
 *
 *   1. AUSENCIA DE HUERFANOS (Req. 9.4, 25.2, 36.5, 39.3): ni los registros
 *      SEMANALES (ciclo, resultado, comunidad, usuario, historial) ni los
 *      registros VECTORIALES (gds_embedding) ni el HISTORICO (tendencias y
 *      eventos) pueden existir sin sus claves foraneas obligatorias (NOT NULL)
 *      hacia su Analisis y su Institucion/Comunidad/Semana de origen.
 *
 *   2. CASCADA SOLO DEL SUBGRAFO DEL ANALISIS (Req. 25.4, 25.7, 28.9): al
 *      eliminar un `gds_analisis`, el borrado en cascada alcanza EXACTAMENTE su
 *      subgrafo dependiente -ni mas, ni menos-, incluyendo embeddings, los cinco
 *      niveles de memoria jerarquica y la memoria historica, y SIN alcanzar
 *      tablas ajenas (institucion, escenarios, usuarios de plataforma).
 *
 *   3. INSTITUCION REFERENCIADA NO BORRABLE (Req. 25.7): toda FK que apunte a
 *      `gds_institucion` es ON DELETE RESTRICT (nunca CASCADE): una institucion
 *      referenciada por un analisis no puede eliminarse.
 *
 * ESTRATEGIA DE VERIFICACION. No hay una base de datos PostgreSQL+pgvector
 * dedicada y aislada aprovisionada en este entorno (la migracion fue diferida
 * en la tarea 2.1; el unico Postgres alcanzable es el del colegio, intocable
 * por aislamiento total - Req. 25.3). Por ello estas pruebas son ASERCIONES
 * ESTATICAS DE CONTRATO sobre el DDL real emitido por Prisma (`migration.sql`):
 * parsean las restricciones `FOREIGN KEY ... ON DELETE ...` y reconstruyen el
 * grafo de cascada para validar las propiedades de integridad. El DDL es la
 * evidencia mas cercana al comportamiento real de la BD sin aprovisionarla.
 *
 * COMPLEMENTO FUTURO. Cuando exista una BD dedicada aislada, una prueba de
 * integracion deberia COMPLEMENTAR (no reemplazar) estas aserciones ejecutando
 * inserciones/borrados reales: (a) rechazo de insercion de un registro semanal
 * o vectorial huerfano; (b) borrado de un Analisis que elimina solo su subgrafo
 * (incl. embeddings/memorias/historico) y deja intactos otros analisis; (c)
 * fallo al intentar borrar una Institucion referenciada.
 */

const SERVICE_ROOT = resolve(__dirname, "..", "..");
const MIGRATION_PATH = join(
    SERVICE_ROOT,
    "prisma",
    "migrations",
    "20250101000001_esquema_gds_ampliado",
    "migration.sql",
);
const migracion = readFileSync(MIGRATION_PATH, "utf8");

type AccionBorrado = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION" | "SET DEFAULT";

interface ClaveForanea {
    tabla: string; // tabla hija que sostiene la FK
    columna: string; // columna FK (NOT NULL => no admite huerfanos)
    referencia: string; // tabla padre referenciada
    onDelete: AccionBorrado;
}

/** Parsea TODAS las restricciones FOREIGN KEY del DDL de la migracion. */
function parsearClavesForaneas(sql: string): ClaveForanea[] {
    const re =
        /ALTER TABLE "(\w+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("\w+"\) ON DELETE (CASCADE|RESTRICT|SET NULL|NO ACTION|SET DEFAULT)/g;
    const fks: ClaveForanea[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
        fks.push({
            tabla: m[1],
            columna: m[2],
            referencia: m[3],
            onDelete: m[4] as AccionBorrado,
        });
    }
    return fks;
}

/** Extrae el bloque `CREATE TABLE "<tabla>" ( ... );` del DDL. */
function bloqueCreateTable(sql: string, tabla: string): string {
    const m = sql.match(new RegExp(`CREATE TABLE "${tabla}" \\([\\s\\S]*?\\n\\);`));
    return m?.[0] ?? "";
}

/** Verdadero si la columna existe y es NOT NULL (no admite huerfanos). */
function columnaEsNotNull(tabla: string, columna: string): boolean {
    const bloque = bloqueCreateTable(migracion, tabla);
    const linea = bloque
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith(`"${columna}"`));
    return !!linea && /\bNOT NULL\b/.test(linea);
}

const fks = parsearClavesForaneas(migracion);

const TABLA_RAIZ = "gds_analisis";
const TABLA_INSTITUCION = "gds_institucion";

// Tablas que NO forman parte del subgrafo dependiente del analisis: la raiz, los
// catalogos independientes y los usuarios/roles propios de la plataforma.
const TABLAS_FUERA_DEL_SUBGRAFO: ReadonlySet<string> = new Set([
    "gds_analisis", // raiz
    "gds_institucion", // catalogo independiente (RESTRICT)
    "gds_scenarios", // biblioteca independiente (SetNull)
    "gds_usuario_plataforma", // identidades de plataforma
    "gds_rol_plataforma", // roles de plataforma
]);

// El subgrafo que DEBE borrarse en cascada al eliminar un analisis (directa o
// transitivamente). Incluye explicitamente embeddings, los 5 niveles de memoria
// jerarquica y la memoria historica (Req. 25.4, 28.9, 36.5, 39.3).
const SUBGRAFO_ESPERADO: ReadonlyArray<string> = [
    "gds_comunidad_digital",
    "gds_ciclo_semanal",
    "gds_generacion",
    "gds_usuario_sintetico",
    "gds_historial_usuario",
    "gds_score_asociacion",
    "gds_resultado_analisis",
    "gds_dimension_riesgo",
    "gds_explicacion",
    "gds_evidences",
    "gds_evidence_ref",
    "gds_patron",
    "gds_calibracion",
    "gds_reporte",
    "gds_log_generacion",
    "gds_memoria_semanal",
    "gds_memoria_mensual",
    "gds_memoria_trimestral",
    "gds_memoria_semestral",
    "gds_memoria_global",
    "gds_embedding",
    "gds_tendencia_historica",
    "gds_evento_historico",
];

/**
 * Reconstruye el conjunto de tablas que se borran en cascada al eliminar una
 * fila de `desde`, siguiendo SOLO las aristas FK con ON DELETE CASCADE
 * (padre -> hija). Es la simulacion estatica del borrado en cascada real.
 */
function tablasAlcanzablesPorCascada(desde: string): Set<string> {
    const alcanzadas = new Set<string>();
    const pila = [desde];
    while (pila.length > 0) {
        const padre = pila.pop()!;
        for (const fk of fks) {
            if (fk.referencia === padre && fk.onDelete === "CASCADE" && !alcanzadas.has(fk.tabla)) {
                alcanzadas.add(fk.tabla);
                pila.push(fk.tabla);
            }
        }
    }
    return alcanzadas;
}

describe("2.4 sanidad del parser de DDL", () => {
    it("la migracion declara restricciones FOREIGN KEY parseables", () => {
        expect(fks.length).toBeGreaterThan(0);
        for (const fk of fks) {
            expect(fk.tabla).toMatch(/^gds_/);
            expect(fk.referencia).toMatch(/^gds_/);
        }
    });
});

describe("2.4 cascada SOLO del subgrafo del analisis (Req. 25.4, 25.7, 28.9)", () => {
    const alcanzadas = tablasAlcanzablesPorCascada(TABLA_RAIZ);

    it("borrar un Analisis alcanza EXACTAMENTE su subgrafo dependiente", () => {
        expect([...alcanzadas].sort()).toEqual([...SUBGRAFO_ESPERADO].sort());
    });

    it("la cascada incluye explicitamente los embeddings vectoriales (Req. 36.5)", () => {
        expect(alcanzadas.has("gds_embedding")).toBe(true);
    });

    it.each([
        "gds_memoria_semanal",
        "gds_memoria_mensual",
        "gds_memoria_trimestral",
        "gds_memoria_semestral",
        "gds_memoria_global",
    ])("la cascada incluye el nivel de memoria jerarquica %s (Req. 28.9)", (tabla) => {
        expect(alcanzadas.has(tabla)).toBe(true);
    });

    it.each(["gds_tendencia_historica", "gds_evento_historico"])(
        "la cascada incluye la memoria historica %s (Req. 39.3)",
        (tabla) => {
            expect(alcanzadas.has(tabla)).toBe(true);
        },
    );

    it("la cascada NO alcanza tablas ajenas al subgrafo (institucion, escenarios, plataforma)", () => {
        for (const tabla of TABLAS_FUERA_DEL_SUBGRAFO) {
            expect(alcanzadas.has(tabla)).toBe(false);
        }
    });

    it("todo dato dependiente solo se borra via cascada del Analisis (sin huecos en la cadena, Req. 25.7)", () => {
        // Toda tabla del subgrafo esperado debe ser alcanzable por una cadena de
        // aristas CASCADE desde la raiz: no hay borrado dependiente fuera de la cascada.
        for (const tabla of SUBGRAFO_ESPERADO) {
            expect(alcanzadas.has(tabla)).toBe(true);
        }
    });
});

describe("2.4 la Institucion referenciada NO se borra (Req. 25.7)", () => {
    const fksHaciaInstitucion = fks.filter((fk) => fk.referencia === TABLA_INSTITUCION);

    it("existen FKs de trazabilidad hacia la institucion", () => {
        expect(fksHaciaInstitucion.length).toBeGreaterThan(0);
        // Cobertura esperada: comunidad, ciclo, evidences, reporte y embedding.
        const tablas = fksHaciaInstitucion.map((fk) => fk.tabla).sort();
        expect(tablas).toEqual(
            [
                "gds_ciclo_semanal",
                "gds_comunidad_digital",
                "gds_embedding",
                "gds_evidences",
                "gds_reporte",
            ].sort(),
        );
    });

    it("TODA FK hacia la institucion es ON DELETE RESTRICT y ninguna es CASCADE", () => {
        for (const fk of fksHaciaInstitucion) {
            expect(fk.onDelete).toBe("RESTRICT");
        }
        expect(fksHaciaInstitucion.some((fk) => fk.onDelete === "CASCADE")).toBe(false);
    });

    it("la institucion NO es alcanzable por la cascada de ningun analisis", () => {
        expect(tablasAlcanzablesPorCascada(TABLA_RAIZ).has(TABLA_INSTITUCION)).toBe(false);
    });
});

describe("2.4 ningun registro SEMANAL queda huerfano (Req. 9.4, 25.2)", () => {
    // Un registro semanal se ancla con FKs NOT NULL a su Analisis y/o Institucion
    // (directa o transitivamente). Sin ellas no puede existir => sin huerfanos.
    const anclasSemanalesNotNull: ReadonlyArray<{ tabla: string; columna: string }> = [
        { tabla: "gds_ciclo_semanal", columna: "analisis_id" },
        { tabla: "gds_ciclo_semanal", columna: "institucion_id" },
        { tabla: "gds_comunidad_digital", columna: "analisis_id" },
        { tabla: "gds_comunidad_digital", columna: "institucion_id" },
        { tabla: "gds_resultado_analisis", columna: "ciclo_id" },
        { tabla: "gds_usuario_sintetico", columna: "comunidad_id" },
        { tabla: "gds_historial_usuario", columna: "usuario_id" },
        { tabla: "gds_score_asociacion", columna: "usuario_id" },
        { tabla: "gds_score_asociacion", columna: "comunidad_id" },
    ];

    it.each(anclasSemanalesNotNull)(
        "$tabla.$columna es NOT NULL (FK obligatoria, sin huerfanos)",
        ({ tabla, columna }) => {
            expect(columnaEsNotNull(tabla, columna)).toBe(true);
        },
    );

    it.each(anclasSemanalesNotNull)(
        "$tabla.$columna esta respaldada por una FK real en el DDL",
        ({ tabla, columna }) => {
            expect(fks.some((fk) => fk.tabla === tabla && fk.columna === columna)).toBe(true);
        },
    );
});

describe("2.4 ningun registro VECTORIAL queda huerfano (Req. 36.5)", () => {
    // gds_embedding (Memoria_Semantica) referencia NOT NULL a analisis, comunidad,
    // institucion, resultado y queda anclado a su numero_semana de origen.
    const columnasNotNull = [
        "analisis_id",
        "comunidad_id",
        "institucion_id",
        "resultado_id",
        "numero_semana",
    ];

    it.each(columnasNotNull)("gds_embedding.%s es NOT NULL", (columna) => {
        expect(columnaEsNotNull("gds_embedding", columna)).toBe(true);
    });

    it("gds_embedding ancla sus FKs a analisis, comunidad, institucion y resultado", () => {
        const referencias = fks
            .filter((fk) => fk.tabla === "gds_embedding")
            .map((fk) => fk.referencia)
            .sort();
        expect(referencias).toEqual(
            [
                "gds_analisis",
                "gds_comunidad_digital",
                "gds_institucion",
                "gds_resultado_analisis",
            ].sort(),
        );
    });
});

describe("2.4 la memoria HISTORICA queda anclada y sin huerfanos (Req. 39.3)", () => {
    const tablasHistoricas = ["gds_tendencia_historica", "gds_evento_historico"];

    it.each(tablasHistoricas)("%s referencia NOT NULL a analisis, comunidad y numero_semana", (tabla) => {
        expect(columnaEsNotNull(tabla, "analisis_id")).toBe(true);
        expect(columnaEsNotNull(tabla, "comunidad_id")).toBe(true);
        expect(columnaEsNotNull(tabla, "numero_semana")).toBe(true);
    });
});

describe("2.4 integridad referencial de la memoria jerarquica (Req. 28.9)", () => {
    const nivelesConComunidad = [
        "gds_memoria_semanal",
        "gds_memoria_mensual",
        "gds_memoria_trimestral",
        "gds_memoria_semestral",
    ];

    it.each(nivelesConComunidad)(
        "%s referencia NOT NULL a exactamente un analisis y a su comunidad, ambos en cascada",
        (tabla) => {
            expect(columnaEsNotNull(tabla, "analisis_id")).toBe(true);
            expect(columnaEsNotNull(tabla, "comunidad_id")).toBe(true);
            const propios = fks.filter((fk) => fk.tabla === tabla);
            const aAnalisis = propios.filter((fk) => fk.referencia === "gds_analisis");
            const aComunidad = propios.filter((fk) => fk.referencia === "gds_comunidad_digital");
            expect(aAnalisis).toHaveLength(1);
            expect(aComunidad).toHaveLength(1);
            expect(aAnalisis[0].onDelete).toBe("CASCADE");
            expect(aComunidad[0].onDelete).toBe("CASCADE");
        },
    );

    it("gds_memoria_global referencia NOT NULL a exactamente un analisis (cascade) y a ninguna comunidad", () => {
        expect(columnaEsNotNull("gds_memoria_global", "analisis_id")).toBe(true);
        const propios = fks.filter((fk) => fk.tabla === "gds_memoria_global");
        expect(propios).toHaveLength(1);
        expect(propios[0].referencia).toBe("gds_analisis");
        expect(propios[0].onDelete).toBe("CASCADE");
    });
});
