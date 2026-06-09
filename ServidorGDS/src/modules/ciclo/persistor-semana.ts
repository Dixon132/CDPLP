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
        const resultadoFila = await tx.resultadoAnalisis.create({
            data: {
                cicloId: ciclo.id,
                datosNlp: artefactos.nlp ? aJson(artefactos.nlp) : Prisma.JsonNull,
                datosVision: artefactos.vision
                    ? aJson(artefactos.vision)
                    : Prisma.JsonNull,
                datosTemporal: Prisma.JsonNull,
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
