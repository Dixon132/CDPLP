/**
 * Persistor transaccional del resultado de la `Semana_Simulada` (tarea 28.1 -
 * cableado end-to-end).
 *
 * Implementa el puerto {@link PersistorSemana} sobre la BD dedicada usando el
 * cliente Prisma LIGADO A LA TRANSACCION activa (`Prisma.TransactionClient`) que
 * `procesarSemana` abre. Escribe, de forma ATOMICA con el indexado de embeddings
 * que coordina `procesarSemana` (Req. 25.5, 36.1):
 *
 *  1. el cierre del `gds_ciclo_semanal` `(A,I,N)` (estado COMPLETADO +
 *     `etapas_completadas`), creandolo si no existia;
 *  2. el `gds_resultado_analisis` (datos NLP/vision/temporal de la semana) ->
 *     devuelve su `resultadoId` para trazar los embeddings (Req. 36.5);
 *  3. las `gds_dimension_riesgo` del `Indice_Riesgo` con su explicacion en
 *     lenguaje natural (Req. 17.x, 20.x);
 *  4. los `gds_patron` detectados ANCLADOS a la `Zona_Geografica` de la comunidad
 *     (Req. 33.4);
 *  5. la `gds_memoria_semanal` que alimenta la `Memoria_Jerarquica` del
 *     `Motor_Memoria_Contextual` para la siguiente semana (Req. 28.1).
 *
 * Si cualquier escritura falla, la transaccion de `procesarSemana` se revierte
 * por completo (sin filas huerfanas ni duplicados).
 *
 * _Requirements: 13.2, 13.3, 25.5, 17.x, 33.4, 36.5, 28.1_
 */
import { Prisma } from '@prisma/client';

import { serializarEtapasCompletadas } from '../pipeline/pipeline';
import { EstadoTrabajo } from '../scheduler/cola/estados-trabajo';
import type {
    PersistorSemana,
    UnidadTrabajoSemana,
} from '../scheduler/procesarSemana';
import { estimarTokens } from '../timeline/memoria/motor-memoria-contextual.service';
import type { ArtefactosCiclo } from './motor-aprendizaje';

/** Convierte un valor arbitrario serializable a un `InputJsonValue` de Prisma. */
function aJson(valor: unknown): Prisma.InputJsonValue {
    return (valor ?? {}) as Prisma.InputJsonValue;
}

/** Métrica de contenido de una semana para la cronología por institución. */
interface MetricaSemanaContenido {
    numeroSemana: number;
    totalItems: number;
    contributivos: number;
    noContributivos: number;
    aportePost: number;
    aporteComentarios: number;
    aporteImagen: number;
    hashtags: { tag: string; conteo: number }[];
}

/** Cuenta frecuencias de hashtags (normalizados) y devuelve los más concurrentes. */
function contarHashtags(hashtags: string[] | undefined): { tag: string; conteo: number }[] {
    if (!Array.isArray(hashtags) || hashtags.length === 0) return [];
    const conteos = new Map<string, number>();
    for (const raw of hashtags) {
        const tag = String(raw ?? '').trim().replace(/^#+/, '').toLowerCase();
        if (!tag) continue;
        conteos.set(tag, (conteos.get(tag) ?? 0) + 1);
    }
    return [...conteos.entries()]
        .map(([tag, conteo]) => ({ tag, conteo }))
        .sort((a, b) => b.conteo - a.conteo || a.tag.localeCompare(b.tag))
        .slice(0, 8);
}

/**
 * Deriva las métricas de contenido de la semana (cuántas publicaciones se
 * tomaron en cuenta, aportes de post/comentarios/imagen, hashtags) a partir de
 * los datos que el pipeline produjo EN MEMORIA (filtro de relevancia, visión y
 * contrato). Estos datos hoy se descartan; aquí se persisten para la cronología.
 */
function derivarMetricasContenido(
    numeroSemana: number,
    filtro: { contributivos: { refId: string }[]; noContributivos: { refId: string }[] } | undefined,
    huboImagen: boolean,
    hashtags: string[] | undefined,
): MetricaSemanaContenido {
    const contributivos = filtro?.contributivos ?? [];
    const noContributivos = filtro?.noContributivos ?? [];
    const aportePost = contributivos.some((i) => i.refId === 'post') ? 1 : 0;
    const aporteComentarios = contributivos.filter((i) => i.refId.startsWith('comment:')).length;
    return {
        numeroSemana,
        totalItems: contributivos.length + noContributivos.length,
        contributivos: contributivos.length,
        noContributivos: noContributivos.length,
        aportePost,
        aporteComentarios,
        aporteImagen: huboImagen ? 1 : 0,
        hashtags: contarHashtags(hashtags),
    };
}

/**
 * Crea el {@link PersistorSemana} transaccional sobre `Prisma.TransactionClient`.
 *
 * El persistor NO abre la transaccion (lo hace `procesarSemana` via
 * `ejecutarTransaccion`); recibe el `tx` y escribe el subgrafo de la semana,
 * devolviendo el `resultadoId` para que los embeddings se acumulen en la MISMA
 * transaccion (Req. 36.5).
 */
export function crearPersistorSemana(): PersistorSemana<Prisma.TransactionClient> {
    return async (tx, unidad: UnidadTrabajoSemana) => {
        const { contexto, resultado, analisis } = unidad;
        const artefactos = unidad.aprendizaje as ArtefactosCiclo;

        // 1) Cerrar el ciclo semanal (A,I,N): estado COMPLETADO + etapas (Req. 13.4).
        const etapas = serializarEtapasCompletadas(resultado).join(',');
        const ciclo = await tx.cicloSemanal.upsert({
            where: {
                analisisId_institucionId_numeroSemana: {
                    analisisId: contexto.analisisId,
                    institucionId: contexto.institucionId,
                    numeroSemana: contexto.numeroSemana,
                },
            },
            create: {
                analisisId: contexto.analisisId,
                institucionId: contexto.institucionId,
                numeroSemana: contexto.numeroSemana,
                estado: EstadoTrabajo.COMPLETADO,
                etapasCompletadas: etapas,
            },
            update: {
                estado: EstadoTrabajo.COMPLETADO,
                etapasCompletadas: etapas,
            },
            select: { id: true },
        });

        // 2) Resultado de la semana (datos NLP/vision/temporal) (Req. 13.2).
        //    `datosTemporal` lleva las MÉTRICAS DE CONTENIDO de la semana para la
        //    cronología por institución (publicaciones tomadas en cuenta, aportes
        //    de post/comentarios/imagen, hashtags más concurrentes).
        const metricasContenido = derivarMetricasContenido(
            contexto.numeroSemana,
            analisis.filtro,
            artefactos.vision !== undefined,
            resultado.contrato?.hashtags,
        );
        const resultadoFila = await tx.resultadoAnalisis.create({
            data: {
                cicloId: ciclo.id,
                datosNlp: artefactos.nlp ? aJson(artefactos.nlp) : Prisma.JsonNull,
                datosVision: artefactos.vision
                    ? aJson(artefactos.vision)
                    : Prisma.JsonNull,
                datosTemporal: aJson({ metricasContenido }),
            },
            select: { id: true },
        });

        // 3) Dimensiones del Indice_Riesgo + explicacion NL (Req. 17.x, 20.x).
        for (const dim of artefactos.indice ?? []) {
            await tx.dimensionRiesgo.create({
                data: {
                    resultadoId: resultadoFila.id,
                    nombre: dim.nombre,
                    valor: dim.valor,
                    minimo: dim.minimo,
                    maximo: dim.maximo,
                    scoreCalibradoMl: dim.scoreCalibradoMl,
                    explicaciones: {
                        create: [
                            {
                                que: `La dimension ${dim.nombre} se situa en ${dim.valor.toFixed(2)} (rango ${dim.minimo}-${dim.maximo}).`,
                                porQue: `Score calibrado por la Capa_ML: ${dim.scoreCalibradoMl.toFixed(3)}.`,
                            },
                        ],
                    },
                },
            });
        }

        // 3.b) Evidencias trazables (Req. 22.5, 30.1): por cada dimension RELEVANTE
        //      (valor >= 40) se persiste una evidencia COLECTIVA descriptiva en
        //      espanol. Si ninguna llega al umbral, se incluye la dimension mas
        //      alta de la semana para que el reporte SIEMPRE tenga evidencia.
        const indiceSemana = artefactos.indice ?? [];
        let dimensionesRelevantes = indiceSemana.filter((d) => d.valor >= 40);
        if (dimensionesRelevantes.length === 0 && indiceSemana.length > 0) {
            const top = indiceSemana.reduce((a, b) => (b.valor > a.valor ? b : a));
            dimensionesRelevantes = [top];
        }
        const nivelTexto = (v: number) =>
            v >= 66 ? 'alto' : v >= 33 ? 'moderado' : 'bajo';
        for (const dim of dimensionesRelevantes) {
            await tx.evidence.create({
                data: {
                    resultadoId: resultadoFila.id,
                    analisisId: contexto.analisisId,
                    comunidadId: contexto.comunidadId,
                    institucionId: contexto.institucionId,
                    numeroSemana: contexto.numeroSemana,
                    refContenido: `dim:${dim.nombre}:semana:${contexto.numeroSemana}`,
                    contributividad: 'CONTRIBUTIVO',
                    tipo: 'indicador',
                    contenido: `En la semana ${contexto.numeroSemana}, el indicador colectivo "${dim.nombre}" alcanzo un nivel ${nivelTexto(dim.valor)} (${dim.valor.toFixed(1)}/100), derivado del analisis emocional agregado de la comunidad.`,
                    publicacionesAsociadas: [],
                    comentariosAsociados: [],
                    eventosAsociados: (artefactos.patrones ?? []).map((p) => p.descripcion).slice(0, 3),
                    semanasInvolucradas: [contexto.numeroSemana],
                    indicadoresUtilizados: [dim.nombre],
                    explicacionIa: `El indicador colectivo "${dim.nombre}" refleja la senal emocional agregada de la comunidad en la semana ${contexto.numeroSemana}.`,
                    metricasUtilizadas: { valor: dim.valor, scoreCalibradoMl: dim.scoreCalibradoMl },
                    variacionPct: null,
                    conteo: null,
                },
            });
        }

        // 4) Patrones detectados anclados a la Zona_Geografica de la comunidad
        //    (Req. 33.4). Cero patrones es valido (Req. 16.2).
        const patrones = artefactos.patrones ?? [];
        if (patrones.length > 0) {
            const comunidad = await tx.comunidad.findUniqueOrThrow({
                where: { id: contexto.comunidadId },
                select: {
                    zonaLatitud: true,
                    zonaLongitud: true,
                    zonaRadioMetros: true,
                },
            });
            await tx.patron.createMany({
                data: patrones.map((p) => ({
                    analisisId: contexto.analisisId,
                    comunidadId: contexto.comunidadId,
                    zonaLatitud: comunidad.zonaLatitud,
                    zonaLongitud: comunidad.zonaLongitud,
                    zonaRadioMetros: comunidad.zonaRadioMetros,
                    tipo: p.tipo,
                    descripcion: p.descripcion,
                })),
            });
        }

        // 5) Memoria_Semanal -> Memoria_Jerarquica del Motor_Memoria_Contextual
        //    para la siguiente semana (Req. 28.1). El Escenario inmutable se
        //    preserva en todo nivel (Req. 28.7).
        const analisisFila = await tx.analisis.findUniqueOrThrow({
            where: { id: contexto.analisisId },
            select: { escenario: true },
        });
        const resumen = artefactos.resumenMemoria;
        const tokensAprox = estimarTokens(
            [
                resumen.resumen,
                ...resumen.eventosRelevantes,
                ...resumen.cambiosImportantes,
                ...resumen.anomalias,
                ...resumen.tendencias,
            ].join(' '),
        );
        await tx.memoriaSemanal.upsert({
            where: {
                analisisId_comunidadId_numeroSemana: {
                    analisisId: contexto.analisisId,
                    comunidadId: contexto.comunidadId,
                    numeroSemana: contexto.numeroSemana,
                },
            },
            create: {
                analisisId: contexto.analisisId,
                comunidadId: contexto.comunidadId,
                numeroSemana: contexto.numeroSemana,
                escenario: analisisFila.escenario,
                resumen: resumen.resumen,
                eventosRelevantes: aJson(resumen.eventosRelevantes),
                cambiosImportantes: aJson(resumen.cambiosImportantes),
                anomalias: aJson(resumen.anomalias),
                tendencias: aJson(resumen.tendencias),
                tokensAprox,
            },
            update: {
                escenario: analisisFila.escenario,
                resumen: resumen.resumen,
                eventosRelevantes: aJson(resumen.eventosRelevantes),
                cambiosImportantes: aJson(resumen.cambiosImportantes),
                anomalias: aJson(resumen.anomalias),
                tendencias: aJson(resumen.tendencias),
                tokensAprox,
            },
        });

        // Ignorado intencionalmente: el contrato anonimizado vive en `resultado`
        // y sus embeddings los indexa `procesarSemana` en esta misma transaccion.
        void analisis;

        return { resultadoId: resultadoFila.id };
    };
}
