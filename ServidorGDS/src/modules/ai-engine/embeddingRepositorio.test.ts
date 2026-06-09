/**
 * Pruebas unitarias del puerto de persistencia de la `Memoria_Semantica`
 * (`AlmacenEmbeddingsPrisma`) - tarea 9.1.
 *
 * Verifican que:
 *  - el vector se serializa al literal de pgvector `'[v0,v1,...]'`;
 *  - `insertar` emite una sentencia `INSERT ... ON CONFLICT DO NOTHING` por
 *    registro (acumulacion append-only) y NUNCA un `DELETE`/`TRUNCATE`/`UPDATE`
 *    (Req. 36.2): el corpus solo crece;
 *  - `contar`/`listarRefs` delegan en Prisma con el filtro COLECTIVO esperado.
 *
 * Se usa un DOBLE del subconjunto de `PrismaClient` (`$executeRaw` + `embedding`)
 * que captura las sentencias SQL. Jest, deterministico, sin BD real.
 *
 * _Requirements: 36.1, 36.2, 36.5_
 */
import {
    aLiteralVector,
    AlmacenEmbeddingsPrisma,
    type ClienteEmbeddings,
    type RegistroEmbedding,
} from "./embeddingRepositorio";

/** Doble de Prisma que captura las sentencias `$executeRaw` y las consultas. */
function clienteDoble() {
    const sql: string[] = [];
    const countArgs: unknown[] = [];
    const findArgs: unknown[] = [];

    const cliente: ClienteEmbeddings = {
        // ts-jest: `$executeRaw` recibe (TemplateStringsArray, ...values).
        $executeRaw: ((strings: TemplateStringsArray) => {
            sql.push(strings.join("?"));
            return Promise.resolve(1);
        }) as ClienteEmbeddings["$executeRaw"],
        embedding: {
            count: ((args: unknown) => {
                countArgs.push(args);
                return Promise.resolve(0);
            }),
            findMany: ((args: unknown) => {
                findArgs.push(args);
                return Promise.resolve([]);
            }),
        } as unknown as ClienteEmbeddings["embedding"],
    };

    return { cliente, sql, countArgs, findArgs };
}

function registro(refId: string, vector: number[]): RegistroEmbedding {
    return {
        refId,
        analisisId: "an-1",
        comunidadId: "com-1",
        institucionId: "inst-1",
        resultadoId: "res-1",
        numeroSemana: 1,
        refContenido: "post",
        modelo: "BAAI/bge-m3",
        vector,
    };
}

describe("aLiteralVector", () => {
    it("serializa al literal de pgvector entre corchetes y separado por comas", () => {
        expect(aLiteralVector([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
        expect(aLiteralVector([])).toBe("[]");
    });

    it("sustituye valores no finitos por 0 para un literal valido", () => {
        expect(aLiteralVector([1, NaN, Infinity, -Infinity, 2])).toBe("[1,0,0,0,2]");
    });
});

describe("AlmacenEmbeddingsPrisma.insertar", () => {
    it("emite un INSERT acumulativo por registro y nunca un borrado (Req. 36.2)", async () => {
        const { cliente, sql } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.insertar([registro("f1", [1, 2, 3]), registro("f2", [4, 5, 6])]);

        expect(sql).toHaveLength(2);
        for (const sentencia of sql) {
            const upper = sentencia.toUpperCase();
            expect(upper).toContain("INSERT INTO GDS_EMBEDDING");
            expect(upper).toContain("ON CONFLICT");
            // Append-only: jamas se borra ni sobrescribe el corpus acumulado.
            expect(upper).not.toContain("DELETE");
            expect(upper).not.toContain("TRUNCATE");
            expect(upper).not.toContain("UPDATE");
        }
    });

    it("no emite ninguna sentencia ante un lote vacio", async () => {
        const { cliente, sql } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.insertar([]);

        expect(sql).toHaveLength(0);
    });
});

describe("AlmacenEmbeddingsPrisma consultas de trazabilidad", () => {
    it("contar delega en Prisma con el filtro colectivo (analisis/comunidad/semana)", async () => {
        const { cliente, countArgs } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.contar({ analisisId: "an-1", comunidadId: "com-1", numeroSemana: 2 });

        expect(countArgs[0]).toEqual({
            where: { analisisId: "an-1", comunidadId: "com-1", numeroSemana: 2 },
        });
    });

    it("contar sin filtro usa un where vacio (todo el corpus)", async () => {
        const { cliente, countArgs } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.contar();

        expect(countArgs[0]).toEqual({ where: {} });
    });

    it("listarRefs proyecta las refs trazables sin el vector", async () => {
        const { cliente, findArgs } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.listarRefs({ institucionId: "inst-1" });

        expect(findArgs[0]).toMatchObject({ where: { institucionId: "inst-1" } });
        const select = (findArgs[0] as { select: Record<string, boolean> }).select;
        expect(select).toMatchObject({
            id: true,
            analisisId: true,
            comunidadId: true,
            institucionId: true,
            resultadoId: true,
            numeroSemana: true,
            refContenido: true,
            modelo: true,
        });
        // El vector NO se proyecta (columna pgvector no escalar).
        expect("vector" in select).toBe(false);
    });
});

describe("AlmacenEmbeddingsPrisma.recuperarRefs (lectura del Embeddings_Search)", () => {
    it("consulta por la interseccion de refIds candidatos y filtro colectivo", async () => {
        const { cliente, findArgs } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        await almacen.recuperarRefs(["f1", "f2"], {
            analisisId: "an-1",
            comunidadId: "com-1",
        });

        expect(findArgs[0]).toMatchObject({
            where: {
                analisisId: "an-1",
                comunidadId: "com-1",
                id: { in: ["f1", "f2"] },
            },
        });
        // No proyecta el vector (solo refs trazables).
        const select = (findArgs[0] as { select: Record<string, boolean> }).select;
        expect("vector" in select).toBe(false);
    });

    it("no consulta a la BD ante un conjunto vacio de refIds", async () => {
        const { cliente, findArgs } = clienteDoble();
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        const refs = await almacen.recuperarRefs([], { analisisId: "an-1" });

        expect(refs).toEqual([]);
        expect(findArgs).toHaveLength(0);
    });

    it("mapea las filas de gds_embedding a RefEmbedding (id -> refId)", async () => {
        const { cliente } = clienteDoble();
        // Sobrescribe findMany para devolver una fila concreta.
        (cliente.embedding as unknown as {
            findMany: (args: unknown) => Promise<unknown[]>;
        }).findMany = () =>
                Promise.resolve([
                    {
                        id: "f1",
                        analisisId: "an-1",
                        comunidadId: "com-1",
                        institucionId: "inst-1",
                        resultadoId: "res-1",
                        numeroSemana: 3,
                        refContenido: "post",
                        modelo: "BAAI/bge-m3",
                    },
                ]);
        const almacen = new AlmacenEmbeddingsPrisma(cliente);

        const refs = await almacen.recuperarRefs(["f1"], { analisisId: "an-1" });

        expect(refs).toEqual([
            {
                refId: "f1",
                analisisId: "an-1",
                comunidadId: "com-1",
                institucionId: "inst-1",
                resultadoId: "res-1",
                numeroSemana: 3,
                refContenido: "post",
                modelo: "BAAI/bge-m3",
            },
        ]);
    });
});
