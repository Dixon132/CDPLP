/**
 * `Score_Asociacion` comunitario probabilistico (Req. 11) — modulo de dominio
 * `communities`.
 *
 * Calcula, para cada par (`Usuario_Sintetico`, `Comunidad_Digital`), una
 * probabilidad de vinculo digital en el intervalo cerrado [0, 1] a partir de
 * ocho factores conductuales: interacciones, frecuencia, temas, contexto,
 * participacion, recurrencia, ubicacion asociada e historial (Req. 11.2). El
 * resultado se recalcula al cerrar cada `Semana_Simulada` con la informacion
 * acumulada (Req. 11.5) y se expresa SIEMPRE como probabilidad, nunca como
 * certeza absoluta (Req. 11.3).
 *
 * Migracion (tarea 14.1): el nucleo de calculo, construido previamente en el
 * modulo `analisis`, se reposiciona aqui como su hogar canonico dentro del
 * subdominio `communities` (Comunidad_Digital / Usuario_Sintetico /
 * Score_Asociacion / Zona_Geografica). El modulo `analisis` mantiene
 * re-exportaciones de compatibilidad.
 *
 * Diseno:
 * - `calcularScoreAsociacion` es una funcion PURA y DETERMINISTA, sin estado ni
 *   efectos secundarios, garantizada dentro de [0, 1] (clamp).
 * - La persistencia a `gds_score_asociacion` vive en `ScoreAsociacionService`,
 *   un provider NestJS inyectable que usa el `PrismaService` dedicado y se
 *   expone tras el token estable {@link SCORE_ASOCIACION}.
 *
 * Diseno: design.md > Property 15 ("Score de asociacion en rango valido y
 * recalculado por semana").
 * _Requirements: 11.1, 11.2, 11.3, 11.5_
 */
import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { prisma } from '../../utils/prismaClient';

/**
 * Factores conductuales que alimentan el `Score_Asociacion` (Req. 11.2).
 *
 * Cada factor representa una senal normalizada en [0, 1]; valores fuera de
 * rango o no finitos se sanean al calcular (vease {@link clamp01}), de modo que
 * el calculo nunca depende de que la entrada este previamente acotada.
 */
export interface FactoresAsociacion {
    /** Intensidad de interacciones del usuario con la comunidad. */
    interacciones: number;
    /** Frecuencia de actividad del usuario. */
    frecuencia: number;
    /** Afinidad tematica entre el usuario y la comunidad. */
    temas: number;
    /** Coherencia con el contexto/`Escenario` activo del analisis. */
    contexto: number;
    /** Nivel de participacion del usuario en la comunidad. */
    participacion: number;
    /** Recurrencia (regularidad temporal) de la actividad. */
    recurrencia: number;
    /** Cercania/anclaje a la `Zona_Geografica` de la comunidad. */
    ubicacion: number;
    /** Peso del historial acumulado de vinculo en semanas previas. */
    historial: number;
}

/** Pesos relativos de cada factor en la combinacion lineal del score. */
export type PesosAsociacion = FactoresAsociacion;

/** Lista canonica de los ocho factores (orden estable para iterar). */
export const FACTORES_ASOCIACION: readonly (keyof FactoresAsociacion)[] = [
    'interacciones',
    'frecuencia',
    'temas',
    'contexto',
    'participacion',
    'recurrencia',
    'ubicacion',
    'historial',
] as const;

/**
 * Pesos por defecto: equiponderacion de los ocho factores (suman 1).
 *
 * Se exponen para permitir su ajuste/calibracion futura por la `Capa_ML` sin
 * acoplar el calculo a una configuracion concreta.
 */
export const PESOS_POR_DEFECTO: PesosAsociacion = {
    interacciones: 1 / 8,
    frecuencia: 1 / 8,
    temas: 1 / 8,
    contexto: 1 / 8,
    participacion: 1 / 8,
    recurrencia: 1 / 8,
    ubicacion: 1 / 8,
    historial: 1 / 8,
};

/**
 * Acota un numero al intervalo cerrado [0, 1].
 *
 * Los valores no finitos (`NaN`, `Infinity`, `-Infinity`) se tratan como 0, de
 * modo que el resultado siempre sea un numero valido dentro del rango. Esto
 * garantiza el invariante de rango del `Score_Asociacion` (Req. 11.1) incluso
 * ante entradas degeneradas.
 */
export function clamp01(valor: number): number {
    if (!Number.isFinite(valor)) {
        return 0;
    }
    if (valor < 0) {
        return 0;
    }
    if (valor > 1) {
        return 1;
    }
    return valor;
}

/**
 * Calcula el `Score_Asociacion` en [0, 1] de forma PURA y DETERMINISTA.
 *
 * Combinacion lineal normalizada de los ocho factores (Req. 11.2): cada factor
 * se acota a [0, 1] y se pondera por su peso; la suma se divide por el total de
 * pesos (normalizacion), por lo que el resultado de una media ponderada de
 * valores en [0, 1] permanece en [0, 1]. Aun asi, el resultado final se acota
 * con {@link clamp01} para blindar el invariante de rango (Req. 11.1) ante
 * pesos negativos o degenerados.
 *
 * No tiene estado ni efectos secundarios: la misma entrada produce siempre la
 * misma salida.
 *
 * @param factores Senales conductuales del par (usuario, comunidad).
 * @param pesos Pesos relativos opcionales; por defecto, equiponderacion.
 * @returns Probabilidad de asociacion en el intervalo cerrado [0, 1].
 */
export function calcularScoreAsociacion(
    factores: FactoresAsociacion,
    pesos: Partial<PesosAsociacion> = PESOS_POR_DEFECTO,
): number {
    let sumaPonderada = 0;
    let sumaPesos = 0;

    for (const clave of FACTORES_ASOCIACION) {
        const factor = clamp01(factores[clave]);
        const pesoBruto = pesos[clave] ?? PESOS_POR_DEFECTO[clave];
        // Un peso no finito o negativo no debe restar ni romper la normalizacion.
        const peso = Number.isFinite(pesoBruto) && pesoBruto > 0 ? pesoBruto : 0;
        sumaPonderada += factor * peso;
        sumaPesos += peso;
    }

    // Si no hay pesos validos, se recurre a la equiponderacion de factores ya
    // acotados, cuyo promedio tambien vive en [0, 1].
    if (sumaPesos <= 0) {
        const promedio =
            FACTORES_ASOCIACION.reduce((acc, clave) => acc + clamp01(factores[clave]), 0) /
            FACTORES_ASOCIACION.length;
        return clamp01(promedio);
    }

    return clamp01(sumaPonderada / sumaPesos);
}

/** Entrada para recalcular y persistir el score de una semana cerrada. */
export interface EntradaScoreSemana {
    usuarioId: string;
    comunidadId: string;
    numeroSemana: number;
    factores: FactoresAsociacion;
    /** Pesos opcionales (calibracion); por defecto, equiponderacion. */
    pesos?: Partial<PesosAsociacion>;
}

/** Resultado de un recalculo persistido. */
export interface ResultadoScoreSemana {
    id: string;
    score: number;
}

/**
 * Frontera estable del recalculador del `Score_Asociacion`. Los consumidores
 * (p. ej. el `Controlador_Ciclo`) dependen de esta interfaz y no de la
 * implementacion concreta.
 */
export interface RecalculadorScoreAsociacion {
    recalcularSemana(entrada: EntradaScoreSemana): Promise<ResultadoScoreSemana>;
}

/** Token DI estable para inyectar el recalculador del `Score_Asociacion`. */
export const SCORE_ASOCIACION = Symbol('SCORE_ASOCIACION');

// ---------------------------------------------------------------------------
// Persistencia compartida (idempotente por (usuario, comunidad, semana)).
// ---------------------------------------------------------------------------

/**
 * Recalcula y persiste el score de una semana de forma idempotente por
 * `(usuarioId, comunidadId, numeroSemana)`: si ya existe un registro para esa
 * tupla lo actualiza; en caso contrario, lo crea. El calculo se delega a la
 * funcion pura {@link calcularScoreAsociacion}.
 *
 * Se factoriza como helper para que tanto el provider NestJS como el servicio
 * de compatibilidad compartan EXACTAMENTE la misma logica de persistencia.
 */
async function recalcularYPersistir(
    client: Pick<PrismaClient, 'scoreAsociacion'>,
    entrada: EntradaScoreSemana,
): Promise<ResultadoScoreSemana> {
    const score = calcularScoreAsociacion(entrada.factores, entrada.pesos);

    const existente = await client.scoreAsociacion.findFirst({
        where: {
            usuarioId: entrada.usuarioId,
            comunidadId: entrada.comunidadId,
            numeroSemana: entrada.numeroSemana,
        },
        select: { id: true },
    });

    const registro = existente
        ? await client.scoreAsociacion.update({
            where: { id: existente.id },
            data: { score },
            select: { id: true, score: true },
        })
        : await client.scoreAsociacion.create({
            data: {
                usuarioId: entrada.usuarioId,
                comunidadId: entrada.comunidadId,
                numeroSemana: entrada.numeroSemana,
                score,
            },
            select: { id: true, score: true },
        });

    return { id: registro.id, score: registro.score };
}

/**
 * Provider NestJS que recalcula el `Score_Asociacion` por
 * `(usuario, comunidad, semana)` al cerrar cada semana y lo persiste en
 * `gds_score_asociacion` (Req. 11.5), usando el `PrismaService` dedicado.
 *
 * Implementa la frontera estable {@link RecalculadorScoreAsociacion}; se expone
 * tras el token {@link SCORE_ASOCIACION} en `CommunitiesModule`.
 */
@Injectable()
export class ScoreAsociacionService implements RecalculadorScoreAsociacion {
    constructor(private readonly prisma: PrismaService) { }

    async recalcularSemana(entrada: EntradaScoreSemana): Promise<ResultadoScoreSemana> {
        return recalcularYPersistir(this.prisma, entrada);
    }
}

/**
 * Servicio delgado de COMPATIBILIDAD (no-Nest) que reutiliza el `prismaClient`
 * compartido. Mantiene la API previa del modulo `analisis` para los
 * consumidores que aun no se han migrado a la inyeccion de dependencias.
 *
 * @deprecated Prefiera `ScoreAsociacionService` (token {@link SCORE_ASOCIACION})
 * en contextos NestJS.
 */
export class ServicioScoreAsociacion implements RecalculadorScoreAsociacion {
    constructor(private readonly client: PrismaClient = prisma) { }

    async recalcularSemana(entrada: EntradaScoreSemana): Promise<ResultadoScoreSemana> {
        return recalcularYPersistir(this.client, entrada);
    }
}

/** Instancia reutilizable de compatibilidad lista para usarse sin DI. */
export const servicioScoreAsociacion = new ServicioScoreAsociacion();
