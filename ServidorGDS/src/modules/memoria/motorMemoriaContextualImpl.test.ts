/**
 * Pruebas unitarias de la consolidacion jerarquica acumulativa del
 * `Motor_Memoria_Contextual` (tarea 6.2).
 *
 * Verifican:
 *  - generacion de la `Memoria_Semanal` al cerrar la semana (Req. 28.1);
 *  - consolidacion acumulativa ascendente mensual->trimestral->semestral->global
 *    (Req. 28.2-28.4);
 *  - acumulacion monotonica: reconsolidar tras anadir un periodo inferior nunca
 *    pierde informacion previa (superconjunto);
 *  - preservacion del `Escenario` original en todos los niveles (Req. 28.7);
 *  - conservacion del historial completo via el puerto de persistencia (Req. 28.8).
 *
 * Se usa un doble en memoria de `MemoriaRepositorio` (sin BD) que conserva las
 * memorias completas, de modo que la consolidacion se valida de forma pura y
 * determinista.
 */
import { describe, expect, it } from "vitest";

import type { MemoriaRepositorio } from "./memoriaRepositorio";
import { MemoriaNivel, NivelMemoria } from "./motorMemoriaContextual";
import {
    consolidarMemorias,
    FuenteResumenSemanal,
    MotorMemoriaContextualImpl,
    ResumenSemanaCruda,
    estimarTokens,
    seleccionarContextoMemoria,
    textoMemoria,
} from "./motorMemoriaContextualImpl";

const ESCENARIO = "Guerra del Gas";
const ANALISIS = "a1";
const COMUNIDAD = "c1";
const INSTITUCION = "i1";

/** Doble en memoria del puerto de persistencia que conserva memorias completas. */
class RepositorioEnMemoria implements MemoriaRepositorio {
    readonly almacen: MemoriaNivel[] = [];

    guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        this.almacen.push(structuredClone(memoria));
        return Promise.resolve(memoria);
    }

    listar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        return Promise.resolve(
            this.almacen.filter(
                (m) =>
                    m.analisisId === analisisId &&
                    (nivel === undefined || m.nivel === nivel) &&
                    // GLOBAL no esta acotada a comunidad (se resuelve por analisis),
                    // igual que el repositorio Prisma real.
                    (m.nivel === NivelMemoria.GLOBAL || m.comunidadId === comunidadId),
            ),
        );
    }
}

/** Fuente de resumenes semanales deterministas controlada por el test. */
class FuenteFalsa implements FuenteResumenSemanal {
    constructor(private readonly porSemana: Map<number, ResumenSemanaCruda>) { }

    obtenerResumenSemana(
        _analisisId: string,
        _comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda> {
        const r = this.porSemana.get(semanaN);
        if (!r) throw new Error(`sin datos para semana ${semanaN}`);
        return Promise.resolve(r);
    }
}

function semanaCruda(n: number): ResumenSemanaCruda {
    return {
        escenario: ESCENARIO,
        institucionId: INSTITUCION,
        resumen: `resumen semana ${n}`,
        eventosRelevantes: [`evento-${n}`],
        cambiosImportantes: [`cambio-${n}`],
        anomalias: [`anomalia-${n}`],
        tendencias: [`tendencia-${n}`],
    };
}

function memoria(
    nivel: NivelMemoria,
    periodo: number,
    overrides: Partial<MemoriaNivel> = {},
): MemoriaNivel {
    return {
        nivel,
        analisisId: ANALISIS,
        institucionId: INSTITUCION,
        comunidadId: COMUNIDAD,
        periodo,
        escenario: ESCENARIO,
        resumen: `resumen ${nivel} ${periodo}`,
        eventosRelevantes: [`evento-${nivel}-${periodo}`],
        cambiosImportantes: [`cambio-${nivel}-${periodo}`],
        anomalias: [`anomalia-${nivel}-${periodo}`],
        tendencias: [`tendencia-${nivel}-${periodo}`],
        tokensAprox: 10,
        ...overrides,
    };
}

describe("consolidarSemanal (Req. 28.1)", () => {
    it("genera y persiste la Memoria_Semanal preservando el escenario", async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(new Map([[1, semanaCruda(1)]]));
        const motor = new MotorMemoriaContextualImpl(repo, fuente);

        const m = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);

        expect(m.nivel).toBe(NivelMemoria.SEMANAL);
        expect(m.periodo).toBe(1);
        expect(m.escenario).toBe(ESCENARIO);
        expect(m.eventosRelevantes).toEqual(["evento-1"]);
        expect(m.tokensAprox).toBeGreaterThan(0);
        // historial conservado en el puerto (Req. 28.8)
        expect(repo.almacen).toHaveLength(1);
        expect(repo.almacen[0].nivel).toBe(NivelMemoria.SEMANAL);
    });
});

describe("consolidarMemorias (pura)", () => {
    it("acumula la union de eventos/cambios/anomalias/tendencias", () => {
        const inferiores = [memoria(NivelMemoria.SEMANAL, 1), memoria(NivelMemoria.SEMANAL, 2)];
        const mensual = consolidarMemorias(NivelMemoria.MENSUAL, 1, inferiores);

        expect(mensual.nivel).toBe(NivelMemoria.MENSUAL);
        expect(mensual.escenario).toBe(ESCENARIO);
        expect(mensual.eventosRelevantes).toEqual([
            "evento-SEMANAL-1",
            "evento-SEMANAL-2",
        ]);
        expect(mensual.tendencias).toEqual(["tendencia-SEMANAL-1", "tendencia-SEMANAL-2"]);
    });

    it("preserva el escenario original al consolidar", () => {
        const inferiores = [memoria(NivelMemoria.TRIMESTRAL, 1)];
        const semestral = consolidarMemorias(NivelMemoria.SEMESTRAL, 1, inferiores);
        expect(semestral.escenario).toBe(ESCENARIO);
    });

    it("deduplica eventos repetidos entre periodos inferiores", () => {
        const inferiores = [
            memoria(NivelMemoria.SEMANAL, 1, { eventosRelevantes: ["x", "y"] }),
            memoria(NivelMemoria.SEMANAL, 2, { eventosRelevantes: ["y", "z"] }),
        ];
        const mensual = consolidarMemorias(NivelMemoria.MENSUAL, 1, inferiores);
        expect(mensual.eventosRelevantes).toEqual(["x", "y", "z"]);
    });

    it("GLOBAL no queda acotada a comunidad/institucion", () => {
        const inferiores = [memoria(NivelMemoria.SEMESTRAL, 1)];
        const global = consolidarMemorias(NivelMemoria.GLOBAL, 0, inferiores);
        expect(global.comunidadId).toBe("");
        expect(global.institucionId).toBe("");
    });

    it("lanza error si no hay memorias inferiores", () => {
        expect(() => consolidarMemorias(NivelMemoria.MENSUAL, 1, [])).toThrow();
    });
});

describe("acumulacion monotonica al reconsolidar (Req. 28.2, Property 27)", () => {
    it("reconsolidar el mensual tras anadir una semana es superconjunto", async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
                [3, semanaCruda(3)],
            ]),
        );
        const motor = new MotorMemoriaContextualImpl(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        const mensualV1 = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );

        // Cierra una semana mas y reconsolida.
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 3);
        const mensualV2 = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );

        // El alcance crece de forma monotonica (superconjunto), nunca pierde info.
        for (const e of mensualV1.eventosRelevantes) {
            expect(mensualV2.eventosRelevantes).toContain(e);
        }
        expect(mensualV2.eventosRelevantes.length).toBeGreaterThan(
            mensualV1.eventosRelevantes.length,
        );
        expect(mensualV2.eventosRelevantes).toEqual(["evento-1", "evento-2", "evento-3"]);
        // Escenario preservado en ambas versiones (Req. 28.7).
        expect(mensualV1.escenario).toBe(ESCENARIO);
        expect(mensualV2.escenario).toBe(ESCENARIO);
    });
});

describe("cascada completa semanal->mensual->trimestral->semestral->global", () => {
    it("preserva el escenario en todos los niveles y conserva el historial", async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualImpl(repo, fuente);

        const sem1 = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        const sem2 = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        const mensual = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );
        const trimestral = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.TRIMESTRAL,
            1,
        );
        const semestral = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.SEMESTRAL,
            1,
        );
        const global = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.GLOBAL,
            0,
        );

        // Escenario identico en los 5 niveles (Req. 28.7).
        for (const m of [sem1, sem2, mensual, trimestral, semestral, global]) {
            expect(m.escenario).toBe(ESCENARIO);
        }

        // La informacion de las semanas se propaga hasta el nivel global.
        expect(global.eventosRelevantes).toEqual(["evento-1", "evento-2"]);

        // El historial completo se conserva en el puerto (Req. 28.8): 2 semanal +
        // 1 por cada nivel superior consolidado.
        const niveles = repo.almacen.map((m) => m.nivel);
        expect(niveles.filter((n) => n === NivelMemoria.SEMANAL)).toHaveLength(2);
        expect(niveles).toContain(NivelMemoria.MENSUAL);
        expect(niveles).toContain(NivelMemoria.TRIMESTRAL);
        expect(niveles).toContain(NivelMemoria.SEMESTRAL);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
    });
});

describe("seleccionarContextoMemoria (tarea 6.3, logica pura)", () => {
    const mGlobal = memoria(NivelMemoria.GLOBAL, 0, {
        comunidadId: "",
        institucionId: "",
        resumen: "resumen global del analisis",
    });
    const mSemanal = memoria(NivelMemoria.SEMANAL, 4, {
        resumen: "resumen semana 4 con bastante detalle crudo",
    });

    it("recorta SEMANAL primero y conserva GLOBAL + escenario bajo umbral", () => {
        const tokensCabecera = estimarTokens(`Escenario: ${ESCENARIO}`);
        const tokensGlobal = estimarTokens(textoMemoria(mGlobal));
        // Umbral justo para escenario + GLOBAL, pero NO para anadir la SEMANAL.
        const limite = tokensCabecera + tokensGlobal;

        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], limite);

        const niveles = sel.memoriasSeleccionadas.map((m) => m.nivel);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
        expect(niveles).not.toContain(NivelMemoria.SEMANAL);
        // El escenario se conserva siempre como cabecera (Req. 5.3, 28.7).
        expect(sel.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        expect(sel.contextoMemoria).toContain("resumen global del analisis");
        expect(sel.contextoMemoria).not.toContain("resumen semana 4");
        expect(sel.tokensTotales).toBeLessThanOrEqual(limite);
    });

    it("incluye todos los niveles cuando el umbral es holgado", () => {
        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], 100_000);
        const niveles = sel.memoriasSeleccionadas.map((m) => m.nivel);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
        expect(niveles).toContain(NivelMemoria.SEMANAL);
        // Orden de mayor a menor agregacion: GLOBAL antes que SEMANAL.
        expect(niveles.indexOf(NivelMemoria.GLOBAL)).toBeLessThan(
            niveles.indexOf(NivelMemoria.SEMANAL),
        );
    });

    it("preserva el escenario aunque ninguna memoria quepa (umbral minusculo)", () => {
        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], 1);
        expect(sel.memoriasSeleccionadas).toHaveLength(0);
        // El escenario inmutable se conserva pese al recorte total (Req. 5.3, 28.6).
        expect(sel.escenario).toBe(ESCENARIO);
        expect(sel.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
    });

    it("recorta de menor a mayor agregacion conservando los niveles superiores", () => {
        const mMensual = memoria(NivelMemoria.MENSUAL, 1, { resumen: "mes 1" });
        const tokensCabecera = estimarTokens(`Escenario: ${ESCENARIO}`);
        const limite =
            tokensCabecera +
            estimarTokens(textoMemoria(mGlobal)) +
            estimarTokens(textoMemoria(mMensual));

        const sel = seleccionarContextoMemoria(
            ESCENARIO,
            [mSemanal, mMensual, mGlobal],
            limite,
        );

        const niveles = sel.memoriasSeleccionadas.map((m) => m.nivel);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
        expect(niveles).toContain(NivelMemoria.MENSUAL);
        // SEMANAL (menor agregacion) es lo primero en descartarse.
        expect(niveles).not.toContain(NivelMemoria.SEMANAL);
    });
});

describe("construirContexto (tarea 6.3, Req. 5.1, 5.2, 28.5, 28.6)", () => {
    async function sembrarMemorias(): Promise<MotorMemoriaContextualImpl> {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualImpl(repo, fuente);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.TRIMESTRAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.SEMESTRAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);
        return motor;
    }

    it("ensambla el contexto desde la memoria jerarquica preservando el escenario", async () => {
        const motor = await sembrarMemorias();

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);

        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.semana).toBe(3);
        expect(ctx.comunidad).toEqual({ institucionId: INSTITUCION, analisisId: ANALISIS });
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        // El contexto sale de la Memoria_Jerarquica, no de semanas crudas (Req. 28.5).
        expect(ctx.contextoMemoria).toContain(`[${NivelMemoria.GLOBAL} 0]`);
    });

    it("bajo umbral ajustado conserva el escenario y descarta el detalle SEMANAL", async () => {
        const motor = await sembrarMemorias();

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 30);

        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        // El nivel de menor agregacion (SEMANAL) es el primero en recortarse.
        expect(ctx.contextoMemoria).not.toContain(`[${NivelMemoria.SEMANAL} 1]`);
        expect(ctx.contextoMemoria).not.toContain(`[${NivelMemoria.SEMANAL} 2]`);
    });
});
