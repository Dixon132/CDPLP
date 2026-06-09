/**
 * Pruebas unitarias de la consolidacion jerarquica acumulativa del
 * `Motor_Memoria_Contextual` (NestJS, modulo `timeline`). Pruebas en Jest.
 *
 * Verifican: generacion de la `Memoria_Semanal` (Req. 28.1); consolidacion
 * acumulativa ascendente (Req. 28.2-28.4); acumulacion monotonica al
 * reconsolidar; preservacion del `Escenario` original (Req. 28.7); conservacion
 * del historial completo via el puerto (Req. 28.8); y la construccion de
 * contexto bajo umbral de tokens (Req. 5.1, 5.2, 28.5, 28.6).
 */
import type { MemoriaRepositorio } from './memoria-repositorio';
import type { MemoriaHistoricaRepositorio } from './memoria-historica-repositorio';
import {
    MemoriaNivel,
    NivelMemoria,
    type EventoHistoricoRegistro,
    type FiltroHistoria,
    type FragmentoSemantico,
    type RecuperadorSemantico,
    type TendenciaHistoricaRegistro,
} from './motor-memoria-contextual.types';
import {
    consolidarMemorias,
    FuenteResumenSemanal,
    MotorMemoriaContextualService,
    ResumenSemanaCruda,
    estimarTokens,
    seleccionarContextoMemoria,
    seleccionarFragmentosSemanticos,
    textoFragmentoSemantico,
    textoMemoria,
} from './motor-memoria-contextual.service';

const ESCENARIO = 'Guerra del Gas';
const ANALISIS = 'a1';
const COMUNIDAD = 'c1';
const INSTITUCION = 'i1';

/** Doble en memoria del puerto de persistencia con semantica de upsert. */
class RepositorioEnMemoria implements MemoriaRepositorio {
    readonly almacen: MemoriaNivel[] = [];

    /**
     * Modela el "generar o actualizar" idempotente del repositorio real
     * (Req. 28.1): reemplaza en su sitio cuando coincide la clave natural
     * (nivel + analisis + comunidad/global + periodo) en vez de duplicar.
     */
    guardar(memoria: MemoriaNivel): Promise<MemoriaNivel> {
        const esGlobal = memoria.nivel === NivelMemoria.GLOBAL;
        const idx = this.almacen.findIndex(
            (m) =>
                m.nivel === memoria.nivel &&
                m.analisisId === memoria.analisisId &&
                (esGlobal || m.comunidadId === memoria.comunidadId) &&
                (esGlobal || m.periodo === memoria.periodo),
        );
        if (idx >= 0) {
            this.almacen[idx] = structuredClone(memoria);
        } else {
            this.almacen.push(structuredClone(memoria));
        }
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

describe('consolidarSemanal (Req. 28.1)', () => {
    it('genera y persiste la Memoria_Semanal preservando el escenario', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(new Map([[1, semanaCruda(1)]]));
        const motor = new MotorMemoriaContextualService(repo, fuente);

        const m = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);

        expect(m.nivel).toBe(NivelMemoria.SEMANAL);
        expect(m.periodo).toBe(1);
        expect(m.escenario).toBe(ESCENARIO);
        expect(m.eventosRelevantes).toEqual(['evento-1']);
        expect(m.tokensAprox).toBeGreaterThan(0);
        expect(repo.almacen).toHaveLength(1);
        expect(repo.almacen[0].nivel).toBe(NivelMemoria.SEMANAL);
    });
});

describe('consolidarMemorias (pura)', () => {
    it('acumula la union de eventos/cambios/anomalias/tendencias', () => {
        const inferiores = [memoria(NivelMemoria.SEMANAL, 1), memoria(NivelMemoria.SEMANAL, 2)];
        const mensual = consolidarMemorias(NivelMemoria.MENSUAL, 1, inferiores);

        expect(mensual.nivel).toBe(NivelMemoria.MENSUAL);
        expect(mensual.escenario).toBe(ESCENARIO);
        expect(mensual.eventosRelevantes).toEqual([
            'evento-SEMANAL-1',
            'evento-SEMANAL-2',
        ]);
        expect(mensual.tendencias).toEqual(['tendencia-SEMANAL-1', 'tendencia-SEMANAL-2']);
    });

    it('preserva el escenario original al consolidar', () => {
        const inferiores = [memoria(NivelMemoria.TRIMESTRAL, 1)];
        const semestral = consolidarMemorias(NivelMemoria.SEMESTRAL, 1, inferiores);
        expect(semestral.escenario).toBe(ESCENARIO);
    });

    it('deduplica eventos repetidos entre periodos inferiores', () => {
        const inferiores = [
            memoria(NivelMemoria.SEMANAL, 1, { eventosRelevantes: ['x', 'y'] }),
            memoria(NivelMemoria.SEMANAL, 2, { eventosRelevantes: ['y', 'z'] }),
        ];
        const mensual = consolidarMemorias(NivelMemoria.MENSUAL, 1, inferiores);
        expect(mensual.eventosRelevantes).toEqual(['x', 'y', 'z']);
    });

    it('GLOBAL no queda acotada a comunidad/institucion', () => {
        const inferiores = [memoria(NivelMemoria.SEMESTRAL, 1)];
        const global = consolidarMemorias(NivelMemoria.GLOBAL, 0, inferiores);
        expect(global.comunidadId).toBe('');
        expect(global.institucionId).toBe('');
    });

    it('lanza error si no hay memorias inferiores', () => {
        expect(() => consolidarMemorias(NivelMemoria.MENSUAL, 1, [])).toThrow();
    });
});

describe('acumulacion monotonica al reconsolidar (Req. 28.2)', () => {
    it('reconsolidar el mensual tras anadir una semana es superconjunto', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
                [3, semanaCruda(3)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        const mensualV1 = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 3);
        const mensualV2 = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );

        for (const e of mensualV1.eventosRelevantes) {
            expect(mensualV2.eventosRelevantes).toContain(e);
        }
        expect(mensualV2.eventosRelevantes.length).toBeGreaterThan(
            mensualV1.eventosRelevantes.length,
        );
        expect(mensualV2.eventosRelevantes).toEqual(['evento-1', 'evento-2', 'evento-3']);
        expect(mensualV1.escenario).toBe(ESCENARIO);
        expect(mensualV2.escenario).toBe(ESCENARIO);
    });
});

describe('consolidacion idempotente "generar o actualizar" (Req. 28.1)', () => {
    it('reconsolidar la misma semana actualiza en su sitio sin duplicar filas', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(new Map([[1, semanaCruda(1)]]));
        const motor = new MotorMemoriaContextualService(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);

        const semanales = repo.almacen.filter((m) => m.nivel === NivelMemoria.SEMANAL);
        expect(semanales).toHaveLength(1);
    });

    it('reconsolidar un nivel superior tras anadir periodos no duplica la fila', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);

        const mensuales = repo.almacen.filter((m) => m.nivel === NivelMemoria.MENSUAL);
        expect(mensuales).toHaveLength(1);
        // La unica fila mensual refleja la version acumulada mas reciente.
        expect(mensuales[0].eventosRelevantes).toEqual(['evento-1', 'evento-2']);
    });
});

describe('conservacion del historial completo via persistencia (Req. 28.8)', () => {
    it('la Memoria_Semanal persistida conserva las cuatro listas de historial', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(new Map([[1, semanaCruda(1)]]));
        const motor = new MotorMemoriaContextualService(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        const [persistida] = await repo.listar(ANALISIS, COMUNIDAD, NivelMemoria.SEMANAL);

        expect(persistida.eventosRelevantes).toEqual(['evento-1']);
        expect(persistida.cambiosImportantes).toEqual(['cambio-1']);
        expect(persistida.anomalias).toEqual(['anomalia-1']);
        expect(persistida.tendencias).toEqual(['tendencia-1']);
    });

    it('consolidarNivel acumula leyendo el historial completo de la memoria persistida', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente);

        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        const mensual = await motor.consolidarNivel(
            ANALISIS,
            COMUNIDAD,
            NivelMemoria.MENSUAL,
            1,
        );

        // El nivel superior se consolida desde la memoria persistida del nivel
        // inferior (no desde la fuente cruda), conservando las cuatro listas.
        expect(mensual.eventosRelevantes).toEqual(['evento-1', 'evento-2']);
        expect(mensual.cambiosImportantes).toEqual(['cambio-1', 'cambio-2']);
        expect(mensual.anomalias).toEqual(['anomalia-1', 'anomalia-2']);
        expect(mensual.tendencias).toEqual(['tendencia-1', 'tendencia-2']);
    });
});

describe('cascada completa semanal->mensual->trimestral->semestral->global', () => {
    it('preserva el escenario en todos los niveles y conserva el historial', async () => {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente);

        const sem1 = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        const sem2 = await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        const mensual = await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
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
        const global = await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);

        for (const m of [sem1, sem2, mensual, trimestral, semestral, global]) {
            expect(m.escenario).toBe(ESCENARIO);
        }

        expect(global.eventosRelevantes).toEqual(['evento-1', 'evento-2']);

        const niveles = repo.almacen.map((m) => m.nivel);
        expect(niveles.filter((n) => n === NivelMemoria.SEMANAL)).toHaveLength(2);
        expect(niveles).toContain(NivelMemoria.MENSUAL);
        expect(niveles).toContain(NivelMemoria.TRIMESTRAL);
        expect(niveles).toContain(NivelMemoria.SEMESTRAL);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
    });
});

describe('seleccionarContextoMemoria (logica pura)', () => {
    const mGlobal = memoria(NivelMemoria.GLOBAL, 0, {
        comunidadId: '',
        institucionId: '',
        resumen: 'resumen global del analisis',
    });
    const mSemanal = memoria(NivelMemoria.SEMANAL, 4, {
        resumen: 'resumen semana 4 con bastante detalle crudo',
    });

    it('recorta SEMANAL primero y conserva GLOBAL + escenario bajo umbral', () => {
        const tokensCabecera = estimarTokens(`Escenario: ${ESCENARIO}`);
        const tokensGlobal = estimarTokens(textoMemoria(mGlobal));
        const limite = tokensCabecera + tokensGlobal;

        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], limite);

        const niveles = sel.memoriasSeleccionadas.map((m) => m.nivel);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
        expect(niveles).not.toContain(NivelMemoria.SEMANAL);
        expect(sel.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        expect(sel.contextoMemoria).toContain('resumen global del analisis');
        expect(sel.contextoMemoria).not.toContain('resumen semana 4');
        expect(sel.tokensTotales).toBeLessThanOrEqual(limite);
    });

    it('incluye todos los niveles cuando el umbral es holgado', () => {
        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], 100_000);
        const niveles = sel.memoriasSeleccionadas.map((m) => m.nivel);
        expect(niveles).toContain(NivelMemoria.GLOBAL);
        expect(niveles).toContain(NivelMemoria.SEMANAL);
        expect(niveles.indexOf(NivelMemoria.GLOBAL)).toBeLessThan(
            niveles.indexOf(NivelMemoria.SEMANAL),
        );
    });

    it('preserva el escenario aunque ninguna memoria quepa (umbral minusculo)', () => {
        const sel = seleccionarContextoMemoria(ESCENARIO, [mSemanal, mGlobal], 1);
        expect(sel.memoriasSeleccionadas).toHaveLength(0);
        expect(sel.escenario).toBe(ESCENARIO);
        expect(sel.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
    });

    it('recorta de menor a mayor agregacion conservando los niveles superiores', () => {
        const mMensual = memoria(NivelMemoria.MENSUAL, 1, { resumen: 'mes 1' });
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
        expect(niveles).not.toContain(NivelMemoria.SEMANAL);
    });
});

describe('construirContexto (Req. 5.1, 5.2, 28.5, 28.6)', () => {
    async function sembrarMemorias(): Promise<MotorMemoriaContextualService> {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.TRIMESTRAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.SEMESTRAL, 1);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.GLOBAL, 0);
        return motor;
    }

    it('ensambla el contexto desde la memoria jerarquica preservando el escenario', async () => {
        const motor = await sembrarMemorias();

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);

        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.semana).toBe(3);
        expect(ctx.comunidad).toEqual({ institucionId: INSTITUCION, analisisId: ANALISIS });
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        expect(ctx.contextoMemoria).toContain(`[${NivelMemoria.GLOBAL} 0]`);
    });

    it('bajo umbral ajustado conserva el escenario y descarta el detalle SEMANAL', async () => {
        const motor = await sembrarMemorias();

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 30);

        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        expect(ctx.contextoMemoria).not.toContain(`[${NivelMemoria.SEMANAL} 1]`);
        expect(ctx.contextoMemoria).not.toContain(`[${NivelMemoria.SEMANAL} 2]`);
    });
});

// ---------------------------------------------------------------------------
// Tarea 22.2: complemento por Embeddings_Search + memoria historica.
// ---------------------------------------------------------------------------

/** Doble determinista del Embeddings_Search (RecuperadorSemantico). */
class RecuperadorSemanticoDoble implements RecuperadorSemantico {
    readonly consultas: Array<{
        consulta: { texto?: string; vector?: number[] };
        k: number;
        filtro: { analisisId: string; comunidadId?: string };
    }> = [];

    constructor(
        private readonly respuesta:
            | FragmentoSemantico[]
            | (() => Promise<FragmentoSemantico[]>),
    ) { }

    buscarSimilares(
        consulta: { texto?: string; vector?: number[] },
        k: number,
        filtro: { analisisId: string; comunidadId?: string },
    ): Promise<FragmentoSemantico[]> {
        this.consultas.push({ consulta, k, filtro });
        if (typeof this.respuesta === 'function') {
            return this.respuesta();
        }
        return Promise.resolve(this.respuesta.map((r) => ({ ...r })));
    }
}

/** Doble en memoria del puerto de memoria historica (Req. 39). */
class MemoriaHistoricaEnMemoria implements MemoriaHistoricaRepositorio {
    readonly tendencias: TendenciaHistoricaRegistro[] = [];
    readonly eventos: EventoHistoricoRegistro[] = [];

    registrarTendencias(tendencias: TendenciaHistoricaRegistro[]): Promise<void> {
        this.tendencias.push(...tendencias.map((t) => ({ ...t })));
        return Promise.resolve();
    }

    registrarEventos(eventos: EventoHistoricoRegistro[]): Promise<void> {
        this.eventos.push(...eventos.map((e) => ({ ...e })));
        return Promise.resolve();
    }

    listarTendencias(filtro: FiltroHistoria): Promise<TendenciaHistoricaRegistro[]> {
        return Promise.resolve(
            this.tendencias.filter(
                (t) =>
                    t.analisisId === filtro.analisisId &&
                    (filtro.comunidadId === undefined || t.comunidadId === filtro.comunidadId) &&
                    (filtro.numeroSemana === undefined || t.numeroSemana === filtro.numeroSemana),
            ),
        );
    }

    listarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]> {
        return Promise.resolve(
            this.eventos.filter(
                (e) =>
                    e.analisisId === filtro.analisisId &&
                    (filtro.comunidadId === undefined || e.comunidadId === filtro.comunidadId) &&
                    (filtro.numeroSemana === undefined || e.numeroSemana === filtro.numeroSemana),
            ),
        );
    }
}

function fragmento(
    refId: string,
    similitud: number,
    refContenido: string,
    numeroSemana = 1,
): FragmentoSemantico {
    return { refId, similitud, refContenido, numeroSemana };
}

describe('seleccionarFragmentosSemanticos (logica pura)', () => {
    it('incluye los fragmentos que caben en el presupuesto y corta en el primero que no', () => {
        const f1 = fragmento('a', 0.9, 'alfa', 1); // ~ pocos tokens
        const f2 = fragmento('b', 0.8, 'beta', 2);
        const tokensF1 = estimarTokens(textoFragmentoSemantico(f1));
        const sel = seleccionarFragmentosSemanticos([f1, f2], tokensF1);
        expect(sel).toEqual([textoFragmentoSemantico(f1)]);
    });

    it('devuelve vacio si el presupuesto es nulo o negativo', () => {
        expect(seleccionarFragmentosSemanticos([fragmento('a', 0.9, 'x')], 0)).toEqual([]);
        expect(seleccionarFragmentosSemanticos([fragmento('a', 0.9, 'x')], -5)).toEqual([]);
    });

    it('incluye todos los fragmentos cuando el presupuesto es holgado', () => {
        const fs = [fragmento('a', 0.9, 'uno'), fragmento('b', 0.7, 'dos')];
        const sel = seleccionarFragmentosSemanticos(fs, 100_000);
        expect(sel).toHaveLength(2);
    });
});

describe('construirContexto + Embeddings_Search (Req. 28.5, 36.3)', () => {
    async function sembrarMotor(
        recuperador?: RecuperadorSemantico,
    ): Promise<MotorMemoriaContextualService> {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(
            new Map([
                [1, semanaCruda(1)],
                [2, semanaCruda(2)],
            ]),
        );
        const motor = new MotorMemoriaContextualService(repo, fuente, recuperador);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 1);
        await motor.consolidarSemanal(ANALISIS, COMUNIDAD, 2);
        await motor.consolidarNivel(ANALISIS, COMUNIDAD, NivelMemoria.MENSUAL, 1);
        return motor;
    }

    it('complementa el contexto con fragmentos del Embeddings_Search bajo el ambito colectivo', async () => {
        const recuperador = new RecuperadorSemanticoDoble([
            fragmento('f-alta', 0.9, 'fragmento muy similar', 2),
            fragmento('f-media', 0.5, 'fragmento medio', 1),
        ]);
        const motor = await sembrarMotor(recuperador);

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);

        // Contexto semantico poblado y ordenado por similitud descendente.
        expect(ctx.contextoSemantico).toEqual([
            textoFragmentoSemantico({ refContenido: 'fragmento muy similar', numeroSemana: 2 }),
            textoFragmentoSemantico({ refContenido: 'fragmento medio', numeroSemana: 1 }),
        ]);
        // La memoria jerarquica sigue presente (no se sustituye).
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        // Se delego al Embeddings_Search con el filtro COLECTIVO analisis/comunidad.
        expect(recuperador.consultas).toHaveLength(1);
        expect(recuperador.consultas[0].filtro).toEqual({
            analisisId: ANALISIS,
            comunidadId: COMUNIDAD,
        });
    });

    it('ordena por similitud descendente aunque el servicio devuelva desordenado', async () => {
        const recuperador = new RecuperadorSemanticoDoble([
            fragmento('f-media', 0.5, 'medio', 1),
            fragmento('f-alta', 0.95, 'alto', 2),
            fragmento('f-baja', 0.1, 'bajo', 3),
        ]);
        const motor = await sembrarMotor(recuperador);

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);

        expect(ctx.contextoSemantico).toEqual([
            textoFragmentoSemantico({ refContenido: 'alto', numeroSemana: 2 }),
            textoFragmentoSemantico({ refContenido: 'medio', numeroSemana: 1 }),
            textoFragmentoSemantico({ refContenido: 'bajo', numeroSemana: 3 }),
        ]);
    });

    it('DEGRADA a la Memoria_Jerarquica (contextoSemantico vacio) si el Embeddings_Search falla (Req. 28.5)', async () => {
        const recuperador = new RecuperadorSemanticoDoble(async () => {
            throw new Error('Servicio_IA caido');
        });
        const motor = await sembrarMotor(recuperador);

        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);

        // No se propaga el error: el contexto se arma solo desde la memoria jerarquica.
        expect(ctx.contextoSemantico).toEqual([]);
        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
    });

    it('sin recuperador cableado el contexto semantico queda vacio (solo Memoria_Jerarquica)', async () => {
        const motor = await sembrarMotor(undefined);
        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, 100_000);
        expect(ctx.contextoSemantico).toEqual([]);
    });

    it('respeta el umbral de tokens: si la memoria jerarquica lo agota, no agrega contexto semantico', async () => {
        const recuperador = new RecuperadorSemanticoDoble([
            fragmento('f1', 0.9, 'fragmento semantico que no deberia caber', 2),
        ]);
        const motor = await sembrarMotor(recuperador);

        // Umbral igual a la cabecera del escenario: cabe el escenario inmutable,
        // pero no quedan tokens para memorias ni fragmentos semanticos.
        const limite = estimarTokens(`Escenario: ${ESCENARIO}`);
        const ctx = await motor.construirContexto(ANALISIS, COMUNIDAD, 3, limite);

        expect(ctx.escenario).toBe(ESCENARIO);
        expect(ctx.contextoMemoria).toContain(`Escenario: ${ESCENARIO}`);
        expect(ctx.contextoSemantico).toEqual([]);
    });
});

describe('memoria historica (Req. 39.1, 39.2, 39.3, 39.4)', () => {
    function motorConHistorica(): {
        motor: MotorMemoriaContextualService;
        historica: MemoriaHistoricaEnMemoria;
    } {
        const repo = new RepositorioEnMemoria();
        const fuente = new FuenteFalsa(new Map());
        const historica = new MemoriaHistoricaEnMemoria();
        const motor = new MotorMemoriaContextualService(repo, fuente, undefined, historica);
        return { motor, historica };
    }

    function tendencia(
        numeroSemana: number,
        dimension: string,
    ): TendenciaHistoricaRegistro {
        return {
            analisisId: ANALISIS,
            comunidadId: COMUNIDAD,
            numeroSemana,
            dimension,
            direccion: 'ascendente',
            magnitud: 0.42,
            zonaLatitud: -17.39,
            zonaLongitud: -66.16,
            zonaRadioMetros: 500,
        };
    }

    function evento(numeroSemana: number, tipo: string): EventoHistoricoRegistro {
        return {
            analisisId: ANALISIS,
            comunidadId: COMUNIDAD,
            numeroSemana,
            tipo,
            descripcion: `evento ${tipo} en semana ${numeroSemana}`,
        };
    }

    it('registra tendencias y eventos detectados con sus refs trazables (Req. 39.3)', async () => {
        const { motor, historica } = motorConHistorica();

        await motor.registrarHistoria({
            tendencias: [tendencia(1, 'ansiedad')],
            eventos: [evento(1, 'conflicto')],
        });

        expect(historica.tendencias).toHaveLength(1);
        expect(historica.tendencias[0]).toMatchObject({
            analisisId: ANALISIS,
            comunidadId: COMUNIDAD,
            numeroSemana: 1,
            dimension: 'ansiedad',
            zonaRadioMetros: 500,
        });
        expect(historica.eventos).toHaveLength(1);
        expect(historica.eventos[0]).toMatchObject({ tipo: 'conflicto', numeroSemana: 1 });
    });

    it('acumula el historial a lo largo de las semanas y lo recupera relacionalmente (Req. 39.2, 39.4)', async () => {
        const { motor } = motorConHistorica();

        await motor.registrarHistoria({
            tendencias: [tendencia(1, 'ansiedad')],
            eventos: [evento(1, 'conflicto')],
        });
        await motor.registrarHistoria({
            tendencias: [tendencia(2, 'ansiedad'), tendencia(2, 'agresividad')],
            eventos: [evento(2, 'rumor')],
        });

        const todas = await motor.consultarTendencias({ analisisId: ANALISIS });
        expect(todas).toHaveLength(3);

        const soloSemana2 = await motor.consultarTendencias({
            analisisId: ANALISIS,
            numeroSemana: 2,
        });
        expect(soloSemana2).toHaveLength(2);
        expect(soloSemana2.map((t) => t.dimension)).toEqual(
            expect.arrayContaining(['ansiedad', 'agresividad']),
        );

        const eventos = await motor.consultarEventos({ analisisId: ANALISIS });
        expect(eventos).toHaveLength(2);
    });

    it('lanza un error claro si la memoria historica no esta cableada', async () => {
        const repo = new RepositorioEnMemoria();
        const motor = new MotorMemoriaContextualService(repo, new FuenteFalsa(new Map()));
        await expect(
            motor.registrarHistoria({ tendencias: [], eventos: [] }),
        ).rejects.toThrow(/no cableado/);
    });
});
