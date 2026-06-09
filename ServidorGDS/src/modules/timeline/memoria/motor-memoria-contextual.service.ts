/**
 * Implementacion de la consolidacion jerarquica acumulativa del
 * `Motor_Memoria_Contextual`, migrada a NestJS en el modulo `timeline`
 * (tarea 3.5).
 *
 * Genera la `Memoria_Semanal` al cerrar la semana y consolida de forma
 * acumulativa ascendente los niveles superiores
 * (mensual -> trimestral -> semestral -> global) a partir de los niveles
 * inferiores YA cerrados. El `Escenario` original del `Analisis` se preserva
 * identico en todos los niveles (Req. 28.7) y el historial completo permanece
 * en BD a traves del puerto de persistencia (Req. 28.8).
 *
 * La logica de consolidacion (`consolidarMemorias`) y de seleccion de contexto
 * (`seleccionarContextoMemoria`) es **pura** y testeable de forma determinista.
 *
 * _Requirements: 5.1, 5.2, 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8_
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
    FUENTE_RESUMEN_SEMANAL,
    MEMORIA_HISTORICA_REPOSITORIO,
    MEMORIA_REPOSITORIO,
    RECUPERADOR_SEMANTICO,
    type ContextoGeneracion,
    type EventoHistoricoRegistro,
    type FiltroHistoria,
    type HistoriaSemana,
    MemoriaNivel,
    type MotorMemoriaContextual,
    NivelMemoria,
    ORDEN_NIVELES,
    type RecuperadorSemantico,
    type TendenciaHistoricaRegistro,
} from './motor-memoria-contextual.types';
import type { MemoriaRepositorio } from './memoria-repositorio';
import type { MemoriaHistoricaRepositorio } from './memoria-historica-repositorio';

/**
 * Resumen "crudo" de lo ocurrido en una `Semana_Simulada` para una
 * `Comunidad_Digital`. Lo provee la capa de analisis/ciclo a traves de un
 * puerto inyectable, manteniendo la consolidacion desacoplada y testeable.
 */
export interface ResumenSemanaCruda {
    /** `Escenario` original del `Analisis`, preservado en todo nivel (Req. 28.7). */
    escenario: string;
    /** `Institucion` referenciada por la `Comunidad_Digital` (Req. 28.9). */
    institucionId: string;
    /** Resumen estructurado de lo ocurrido esa semana. */
    resumen: string;
    /** Eventos relevantes detectados en la semana. */
    eventosRelevantes: string[];
    /** Cambios importantes detectados en la semana. */
    cambiosImportantes: string[];
    /** Anomalias detectadas en la semana. */
    anomalias: string[];
    /** Tendencias detectadas en la semana. */
    tendencias: string[];
}

/**
 * Puerto que entrega el resumen crudo de una semana. Permite consolidar la
 * `Memoria_Semanal` sin acoplar el motor a la `Capa_Analisis`/`Controlador_Ciclo`
 * y habilita dobles deterministas en pruebas.
 */
export interface FuenteResumenSemanal {
    obtenerResumenSemana(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
    ): Promise<ResumenSemanaCruda>;
}

/** Mapa de cada nivel a su nivel inferior inmediato (null si es el mas bajo). */
const NIVEL_INFERIOR: Readonly<Record<NivelMemoria, NivelMemoria | null>> = {
    [NivelMemoria.SEMANAL]: null,
    [NivelMemoria.MENSUAL]: NivelMemoria.SEMANAL,
    [NivelMemoria.TRIMESTRAL]: NivelMemoria.MENSUAL,
    [NivelMemoria.SEMESTRAL]: NivelMemoria.TRIMESTRAL,
    [NivelMemoria.GLOBAL]: NivelMemoria.SEMESTRAL,
};

/** Estima tokens de forma determinista (~4 caracteres por token). */
export function estimarTokens(texto: string): number {
    return Math.ceil(texto.length / 4);
}

/**
 * Numero de fragmentos semanticos (`Embeddings_Search`) a solicitar para
 * complementar la `Memoria_Jerarquica`. Los que no quepan en el presupuesto de
 * tokens restante se descartan (Req. 28.6).
 */
export const CONTEXTO_SEMANTICO_K = 5;

/**
 * Serializa una `MemoriaNivel` al texto que se inyecta en el contexto del LLM.
 * Es determinista (mismo orden de campos) para que la estimacion de tokens y la
 * seleccion sean reproducibles.
 */
export function textoMemoria(m: MemoriaNivel): string {
    const partes: string[] = [`[${m.nivel} ${m.periodo}] ${m.resumen}`];
    if (m.eventosRelevantes.length > 0) {
        partes.push(`Eventos: ${m.eventosRelevantes.join(', ')}`);
    }
    if (m.cambiosImportantes.length > 0) {
        partes.push(`Cambios: ${m.cambiosImportantes.join(', ')}`);
    }
    if (m.anomalias.length > 0) {
        partes.push(`Anomalias: ${m.anomalias.join(', ')}`);
    }
    if (m.tendencias.length > 0) {
        partes.push(`Tendencias: ${m.tendencias.join(', ')}`);
    }
    return partes.join('\n');
}

/** Resultado de la seleccion de memorias bajo umbral de tokens. */
export interface SeleccionContexto {
    /** `Escenario` original, SIEMPRE preservado (Req. 5.3, 28.7). */
    escenario: string;
    /** Memorias incluidas, ordenadas de mayor a menor agregacion. */
    memoriasSeleccionadas: MemoriaNivel[];
    /** Texto del contexto listo para el proveedor (cabecera de escenario + memorias). */
    contextoMemoria: string;
    /** Tokens aproximados del contexto resultante (cabecera + memorias). */
    tokensTotales: number;
}

/**
 * Selecciona (de forma **pura**) las memorias que entran en el contexto bajo
 * `limiteTokens`, priorizando los niveles de mayor agregacion.
 *
 * Garantias (Req. 28.6, 5.2, 5.3):
 *  - El `Escenario` se incluye SIEMPRE como cabecera, aunque el umbral sea
 *    minusculo: el escenario es el contexto inmutable de mayor prioridad.
 *  - Las memorias se recorren de MAYOR a MENOR agregacion (GLOBAL -> SEMANAL).
 *    Al encontrar la primera memoria que no cabe, se detiene la inclusion, de
 *    modo que el recorte ocurre siempre de menor a mayor agregacion.
 */
export function seleccionarContextoMemoria(
    escenario: string,
    memorias: readonly MemoriaNivel[],
    limiteTokens: number,
): SeleccionContexto {
    const cabecera = `Escenario: ${escenario}`;
    const tokensCabecera = estimarTokens(cabecera);

    // Orden de prioridad: mayor agregacion primero (GLOBAL ... SEMANAL).
    const prioridad = [...ORDEN_NIVELES].reverse();
    const porPrioridad = [...memorias].sort((a, b) => {
        const pa = prioridad.indexOf(a.nivel);
        const pb = prioridad.indexOf(b.nivel);
        if (pa !== pb) return pa - pb;
        // Dentro de un nivel, periodo creciente para un orden estable.
        return a.periodo - b.periodo;
    });

    const memoriasSeleccionadas: MemoriaNivel[] = [];
    let tokensTotales = tokensCabecera;
    for (const m of porPrioridad) {
        const tokensMemoria = estimarTokens(textoMemoria(m));
        if (tokensTotales + tokensMemoria <= limiteTokens) {
            memoriasSeleccionadas.push(m);
            tokensTotales += tokensMemoria;
        } else {
            // Recorte de menor a mayor agregacion (Req. 28.6).
            break;
        }
    }

    const contextoMemoria = [cabecera, ...memoriasSeleccionadas.map(textoMemoria)].join('\n\n');
    return { escenario, memoriasSeleccionadas, contextoMemoria, tokensTotales };
}

/**
 * Serializa un fragmento semantico recuperado por `Embeddings_Search` al texto
 * que se inyecta como contexto complementario. Determinista (orden de campos
 * fijo) para que la estimacion de tokens sea reproducible.
 */
export function textoFragmentoSemantico(f: {
    refContenido: string;
    numeroSemana: number;
}): string {
    return `[Semantico s${f.numeroSemana}] ${f.refContenido}`;
}

/**
 * Selecciona (de forma **pura**) los fragmentos semanticos que COMPLEMENTAN la
 * `Memoria_Jerarquica` sin exceder el presupuesto de tokens restante.
 *
 * Los fragmentos llegan ya ordenados por similitud DESCENDENTE (Req. 36.6); se
 * incluyen mientras quepan en `tokensDisponibles`, deteniendose en el primero
 * que no cabe. De este modo el contexto total (escenario + memoria jerarquica +
 * contexto semantico) respeta el umbral del proveedor activo (Req. 28.6) y la
 * memoria jerarquica conserva prioridad sobre el complemento semantico.
 */
export function seleccionarFragmentosSemanticos(
    fragmentos: readonly { refContenido: string; numeroSemana: number; similitud: number }[],
    tokensDisponibles: number,
): string[] {
    const seleccionados: string[] = [];
    let restante = tokensDisponibles;
    for (const f of fragmentos) {
        const texto = textoFragmentoSemantico(f);
        const tokens = estimarTokens(texto);
        if (tokens <= restante) {
            seleccionados.push(texto);
            restante -= tokens;
        } else {
            break;
        }
    }
    return seleccionados;
}

/**
 * Deriva el `Escenario` original a partir de la memoria persistida. El escenario
 * es identico en todos los niveles (Req. 28.7); si no hay memoria, devuelve "".
 */
function escenarioDeMemorias(memorias: readonly MemoriaNivel[]): string {
    return memorias.find((m) => m.escenario.length > 0)?.escenario ?? '';
}

/**
 * Deriva el `institucionId` de la `Comunidad_Digital` desde la memoria acotada a
 * comunidad (los niveles `GLOBAL` no lo fijan). Devuelve "" si no se conoce.
 */
function institucionDeMemorias(memorias: readonly MemoriaNivel[]): string {
    return memorias.find((m) => m.institucionId.length > 0)?.institucionId ?? '';
}

/** Union preservando el orden de aparicion y eliminando duplicados. */
function unionOrdenada(listas: readonly (readonly string[])[]): string[] {
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const lista of listas) {
        for (const item of lista) {
            if (!vistos.has(item)) {
                vistos.add(item);
                resultado.push(item);
            }
        }
    }
    return resultado;
}

/**
 * Consolida (de forma **pura**) un nivel superior a partir de **todas** las
 * memorias del nivel inferior ya cerradas. El alcance crece de forma monotonica:
 * el resultado contiene la union de los eventos/cambios/anomalias/tendencias de
 * todos los periodos inferiores. El `Escenario` se preserva sin cambios
 * (Req. 28.7).
 *
 * @throws Error si no hay memorias inferiores que consolidar.
 */
export function consolidarMemorias(
    nivel: NivelMemoria,
    periodo: number,
    inferiores: readonly MemoriaNivel[],
): MemoriaNivel {
    if (inferiores.length === 0) {
        throw new Error(
            `No hay memorias del nivel inferior para consolidar el nivel ${nivel}.`,
        );
    }

    // Orden determinista por periodo para un resumen estable.
    const ordenadas = [...inferiores].sort((a, b) => a.periodo - b.periodo);

    const escenario = ordenadas[0].escenario;

    // `GLOBAL` no esta acotada a una comunidad/institucion concreta.
    const esGlobal = nivel === NivelMemoria.GLOBAL;
    const institucionId = esGlobal ? '' : ordenadas[0].institucionId;
    const comunidadId = esGlobal ? '' : ordenadas[0].comunidadId;

    const eventosRelevantes = unionOrdenada(ordenadas.map((m) => m.eventosRelevantes));
    const cambiosImportantes = unionOrdenada(ordenadas.map((m) => m.cambiosImportantes));
    const anomalias = unionOrdenada(ordenadas.map((m) => m.anomalias));
    const tendencias = unionOrdenada(ordenadas.map((m) => m.tendencias));

    const resumen =
        `[${nivel} ${periodo}] ` +
        ordenadas.map((m) => `(${m.nivel} ${m.periodo}) ${m.resumen}`).join(' | ');

    const resumenTokens = estimarTokens(
        [resumen, ...eventosRelevantes, ...cambiosImportantes, ...anomalias, ...tendencias].join(
            ' ',
        ),
    );

    return {
        nivel,
        analisisId: ordenadas[0].analisisId,
        institucionId,
        comunidadId,
        periodo,
        escenario,
        resumen,
        eventosRelevantes,
        cambiosImportantes,
        anomalias,
        tendencias,
        tokensAprox: resumenTokens,
    };
}

/**
 * Implementacion del `Motor_Memoria_Contextual` (provider NestJS) para la
 * consolidacion jerarquica acumulativa y la construccion de contexto bajo
 * umbral de tokens.
 */
@Injectable()
export class MotorMemoriaContextualService implements MotorMemoriaContextual {
    private readonly logger = new Logger('MotorMemoriaContextual:Embeddings_Search');

    constructor(
        @Inject(MEMORIA_REPOSITORIO) private readonly repositorio: MemoriaRepositorio,
        @Inject(FUENTE_RESUMEN_SEMANAL) private readonly fuente: FuenteResumenSemanal,
        @Optional()
        @Inject(RECUPERADOR_SEMANTICO)
        private readonly recuperadorSemantico?: RecuperadorSemantico,
        @Optional()
        @Inject(MEMORIA_HISTORICA_REPOSITORIO)
        private readonly historica?: MemoriaHistoricaRepositorio,
    ) { }

    /** Genera/persiste la `Memoria_Semanal` al cerrar la semana N (Req. 28.1). */
    async consolidarSemanal(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
    ): Promise<MemoriaNivel> {
        const cruda = await this.fuente.obtenerResumenSemana(analisisId, comunidadId, semanaN);

        const tokensAprox = estimarTokens(
            [
                cruda.resumen,
                ...cruda.eventosRelevantes,
                ...cruda.cambiosImportantes,
                ...cruda.anomalias,
                ...cruda.tendencias,
            ].join(' '),
        );

        const memoria: MemoriaNivel = {
            nivel: NivelMemoria.SEMANAL,
            analisisId,
            institucionId: cruda.institucionId,
            comunidadId,
            periodo: semanaN,
            escenario: cruda.escenario,
            resumen: cruda.resumen,
            eventosRelevantes: [...cruda.eventosRelevantes],
            cambiosImportantes: [...cruda.cambiosImportantes],
            anomalias: [...cruda.anomalias],
            tendencias: [...cruda.tendencias],
            tokensAprox,
        };

        await this.repositorio.guardar(memoria);
        return memoria;
    }

    /**
     * Consolida el nivel superior indicado a partir de **todas** las memorias del
     * nivel inferior ya cerradas (acumulativo ascendente, Req. 28.2-28.4),
     * preservando el `Escenario` (Req. 28.7) y persistiendo el resultado para
     * conservar el historial completo (Req. 28.8).
     */
    async consolidarNivel(
        analisisId: string,
        comunidadId: string,
        nivel: NivelMemoria,
        periodo: number,
    ): Promise<MemoriaNivel> {
        const nivelInferior = NIVEL_INFERIOR[nivel];
        if (nivelInferior === null) {
            throw new Error(
                `consolidarNivel no aplica al nivel mas bajo (${nivel}); usa consolidarSemanal.`,
            );
        }

        const inferiores = await this.repositorio.listar(
            analisisId,
            comunidadId,
            nivelInferior,
        );

        const consolidada = consolidarMemorias(nivel, periodo, inferiores);
        await this.repositorio.guardar(consolidada);
        return consolidada;
    }

    /**
     * Construye el `ContextoGeneracion` de la semana N desde la
     * `Memoria_Jerarquica` (no desde semanas crudas, Req. 28.5), priorizando los
     * niveles de mayor agregacion bajo `limiteTokens` y preservando SIEMPRE el
     * `Escenario` original (Req. 5.1, 5.2, 5.3, 28.6). Complementa el contexto
     * con fragmentos recuperados por `Embeddings_Search` sobre la
     * `Memoria_Semantica` (Req. 28.5, 36.3), respetando el presupuesto de tokens
     * restante. Si el `Embeddings_Search` no esta disponible o falla, DEGRADA de
     * forma segura a la `Memoria_Jerarquica` (contexto semantico vacio) sin
     * bloquear el ciclo (Req. 28.5, 35.3).
     */
    async construirContexto(
        analisisId: string,
        comunidadId: string,
        semanaN: number,
        limiteTokens: number,
    ): Promise<ContextoGeneracion> {
        const memorias = await this.repositorio.listar(analisisId, comunidadId);
        const escenario = escenarioDeMemorias(memorias);
        const seleccion = seleccionarContextoMemoria(escenario, memorias, limiteTokens);
        const institucionId = institucionDeMemorias(memorias);

        // Complemento semantico (Embeddings_Search) bajo el presupuesto restante,
        // dando prioridad a la Memoria_Jerarquica (Req. 28.5, 28.6, 36.3).
        const tokensDisponibles = limiteTokens - seleccion.tokensTotales;
        const contextoSemantico = await this.recuperarContextoSemantico(
            analisisId,
            comunidadId,
            escenario,
            seleccion.contextoMemoria,
            tokensDisponibles,
        );

        return {
            escenario,
            contextoMemoria: seleccion.contextoMemoria,
            contextoSemantico,
            // Campos poblados por el Modulo_Simulacion al anclar el contexto.
            patronesAcumulados: [],
            usuariosSinteticos: [],
            zonaGeografica: { latitud: 0, longitud: 0, radioMetros: 0 },
            semana: semanaN,
            comunidad: { institucionId, analisisId },
        };
    }

    /**
     * Recupera el contexto semantico por `Embeddings_Search` que COMPLEMENTA la
     * `Memoria_Jerarquica` (Req. 28.5, 36.3). DEGRADA de forma segura devolviendo
     * `[]` (y registrando el incidente) si el recuperador no esta cableado, el
     * presupuesto de tokens es nulo, o la busqueda falla, de modo que el motor
     * nunca bloquea el ciclo (Req. 28.5, 35.3).
     */
    private async recuperarContextoSemantico(
        analisisId: string,
        comunidadId: string,
        escenario: string,
        contextoMemoria: string,
        tokensDisponibles: number,
    ): Promise<string[]> {
        // Sin recuperador cableado o sin presupuesto: solo Memoria_Jerarquica.
        if (!this.recuperadorSemantico || tokensDisponibles <= 0) {
            return [];
        }

        try {
            // Consulta por similitud anclada al escenario + memoria jerarquica
            // seleccionada; filtro COLECTIVO por analisis/comunidad (Req. 36.6, 39.4).
            const consulta = { texto: `${escenario}\n${contextoMemoria}`.trim() };
            const fragmentos = await this.recuperadorSemantico.buscarSimilares(
                consulta,
                CONTEXTO_SEMANTICO_K,
                { analisisId, comunidadId },
            );
            // Orden por similitud descendente (defensivo) y recorte por presupuesto.
            const ordenados = [...fragmentos].sort((a, b) => b.similitud - a.similitud);
            return seleccionarFragmentosSemanticos(ordenados, tokensDisponibles);
        } catch (error: unknown) {
            // Degradacion a la Memoria_Jerarquica (Req. 28.5, 35.3).
            this.logger.warn(
                `Embeddings_Search no disponible; se degrada a la Memoria_Jerarquica ` +
                `(contextoSemantico vacio): ${error instanceof Error ? error.message : String(error)
                }`,
            );
            return [];
        }
    }

    /**
     * Devuelve la memoria consultable/trazable conservando el historial completo
     * (Req. 28.8). Delega en el puerto de persistencia.
     */
    consultar(
        analisisId: string,
        comunidadId: string,
        nivel?: NivelMemoria,
    ): Promise<MemoriaNivel[]> {
        return this.repositorio.listar(analisisId, comunidadId, nivel);
    }

    /**
     * Registra en la memoria historica las tendencias y eventos detectados al
     * completarse el analisis de una `Semana_Simulada`, con sus referencias
     * trazables a semana/comunidad/institucion de origen (Req. 39.1, 39.3). El
     * historial queda recuperable de forma relacional (este motor) y vectorial
     * (`Memoria_Semantica`).
     *
     * @throws Error si el puerto de memoria historica no esta cableado.
     */
    async registrarHistoria(historia: HistoriaSemana): Promise<void> {
        this.requerirHistorica();
        await this.historica!.registrarTendencias(historia.tendencias);
        await this.historica!.registrarEventos(historia.eventos);
    }

    /** Recupera relacionalmente las tendencias historicas (Req. 39.2, 39.4). */
    consultarTendencias(filtro: FiltroHistoria): Promise<TendenciaHistoricaRegistro[]> {
        this.requerirHistorica();
        return this.historica!.listarTendencias(filtro);
    }

    /** Recupera relacionalmente los eventos historicos (Req. 39.2, 39.4). */
    consultarEventos(filtro: FiltroHistoria): Promise<EventoHistoricoRegistro[]> {
        this.requerirHistorica();
        return this.historica!.listarEventos(filtro);
    }

    /** Garantiza que el puerto de memoria historica este cableado. */
    private requerirHistorica(): void {
        if (!this.historica) {
            throw new Error(
                'MemoriaHistoricaRepositorio no cableado: no se puede registrar/consultar la memoria historica.',
            );
        }
    }
}
