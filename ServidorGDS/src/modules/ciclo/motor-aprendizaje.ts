/**
 * `MotorAprendizajeReal` - adaptador de APRENDIZAJE del motor de ciclos
 * (tarea 28.1 - cableado end-to-end).
 *
 * Implementa el puerto {@link MotorAprendizaje} componiendo los building blocks
 * reales del dominio para "aprender" al cerrar la semana, como COMPUTACION PURA
 * (sin persistir; `procesarSemana` persiste los artefactos de forma atomica):
 *
 *  - `Indice_Riesgo` multidimensional ({@link ServicioIndiceRiesgo.calcularConMl})
 *    integrando el `score_calibrado_ml` que aporta la `Capa_ML` (interfaz estable
 *    resuelta IA->fallback por el proxy de degradacion) (Req. 17.x, 31.2).
 *  - Patrones/tendencias derivados del `Servicio_NLP`, listos para anclarse a su
 *    `Zona_Geografica` en la persistencia (Req. 16, 33.4).
 *  - Resumen de la `Memoria_Semanal` (alimenta la `Memoria_Jerarquica` del
 *    `Motor_Memoria_Contextual` para el contexto de la siguiente semana,
 *    Req. 28.1).
 *
 * Las senales colectivas del indice se DERIVAN de features holisticas del
 * `ResultadoNLP` (intensidad/valencia/activacion, distribucion emocional,
 * estructura conversacional), nunca de datos individuales (Req. 17.4, 17.6).
 *
 * _Requirements: 13.2, 16.x, 17.x, 31.2, 28.1_
 */
import { Inject, Injectable } from '@nestjs/common';

import { CAPA_ML } from '../../ai/interfaces/tokens';
import type { CapaML } from '../ml/capaML';
import {
    DIMENSIONES_POR_DEFECTO,
    ServicioIndiceRiesgo,
    type DimensionRiesgo,
    type EntradaIndice,
} from '../analisis/indiceRiesgo';
import type { ResultadoNLP } from '../analisis/servicioNLP';
import type { ResultadoVision } from '../analisis/servicioVision';
import type { PatronDetectado } from '../communities/zonaGeografica';
import type {
    ArtefactosAprendizaje,
    EntradaAprendizaje,
    MotorAprendizaje,
} from '../scheduler/procesarSemana';

/** Resumen crudo de la semana que alimenta la `Memoria_Semanal` (Req. 28.1). */
export interface ResumenMemoriaSemana {
    resumen: string;
    eventosRelevantes: string[];
    cambiosImportantes: string[];
    anomalias: string[];
    tendencias: string[];
}

/**
 * Artefactos de aprendizaje concretos producidos al cerrar la semana. Es el
 * contenido del contenedor abierto {@link ArtefactosAprendizaje} que el
 * persistor sabe escribir (dimensiones del indice, patrones anclables, salidas
 * NLP/vision y el resumen de memoria).
 */
export interface ArtefactosCiclo extends ArtefactosAprendizaje {
    /** Dimensiones del `Indice_Riesgo` (con `score_calibrado_ml`) (Req. 17.x). */
    indice: DimensionRiesgo[];
    /** Patrones/tendencias detectados, listos para anclarse a su zona (Req. 33.4). */
    patrones: PatronDetectado[];
    /** Resultado del `Servicio_NLP` de la semana (para `gds_resultado_analisis`). */
    nlp?: ResultadoNLP;
    /** Resultado del `Servicio_Vision` de la semana. */
    vision?: ResultadoVision;
    /** Resumen para la `Memoria_Semanal` (Memoria_Jerarquica). */
    resumenMemoria: ResumenMemoriaSemana;
}

@Injectable()
export class MotorAprendizajeReal implements MotorAprendizaje {
    private readonly indice = new ServicioIndiceRiesgo();

    constructor(@Inject(CAPA_ML) private readonly capaMl: CapaML) { }

    async aprender(entrada: EntradaAprendizaje): Promise<ArtefactosCiclo> {
        const { contexto, analisis } = entrada;
        const nlp = analisis.nlp;
        const vision = analisis.vision;

        // 1) Senales colectivas agregadas del indice, derivadas del NLP (Req. 17.2).
        const entradaIndice: EntradaIndice = {
            comunidadId: contexto.comunidadId,
            numeroSemana: contexto.numeroSemana,
            senales: derivarSenalesIndice(nlp),
        };

        // 2) Dimensiones del indice integrando el score calibrado de la Capa_ML
        //    (resuelta IA->fallback por el proxy de degradacion) (Req. 31.2).
        const indice = await this.indice.calcularConMl(
            entradaIndice,
            DIMENSIONES_POR_DEFECTO,
            this.capaMl,
        );

        // 3) Patrones/tendencias detectados (se anclan a su zona en la persistencia).
        const patrones = derivarPatrones(nlp);

        // 4) Resumen de la Memoria_Semanal (Memoria_Jerarquica del ciclo siguiente).
        const resumenMemoria = derivarResumenMemoria(nlp);

        const artefactos: ArtefactosCiclo = {
            indice,
            patrones,
            resumenMemoria,
        };
        if (nlp !== undefined) {
            artefactos.nlp = nlp;
        }
        if (vision !== undefined) {
            artefactos.vision = vision;
        }
        return artefactos;
    }
}

/** Escala una proporcion `[0,1]` al rango por defecto de las dimensiones `[0,100]`. */
function aEscala100(proporcion: number): number {
    if (!Number.isFinite(proporcion)) {
        return 0;
    }
    return Math.min(100, Math.max(0, proporcion * 100));
}

/**
 * Deriva las senales colectivas por dimension del `Indice_Riesgo` a partir de
 * features HOLISTICAS del `ResultadoNLP` (Req. 16.1, 17.2). Sin NLP disponible,
 * todas las senales son 0 (la semana no aporta senal de riesgo). Es una funcion
 * determinista que SOLO lee agregados colectivos (Req. 17.4, 17.6).
 */
export function derivarSenalesIndice(
    nlp: ResultadoNLP | undefined,
): Record<string, number> {
    if (!nlp) {
        return Object.fromEntries(
            DIMENSIONES_POR_DEFECTO.map((d) => [d.clave, 0]),
        );
    }

    const { senal, distribucion } = nlp.emocional;
    const tension = distribucion.tension ?? 0;
    const entusiasmo = distribucion.entusiasmo ?? 0;
    const incertidumbre = distribucion.incertidumbre ?? 0;
    const valenciaNegativa = Math.max(0, -senal.valencia);

    // Factor de NEGATIVIDAD global [0,1]: cuanto mas positivo/calmado es el
    // contenido, mas bajo es este factor y MENOR el riesgo en TODAS las
    // dimensiones. Evita el sesgo de que el riesgo quede alto cuando el
    // contenido es neutral o positivo (no hay "piso" artificial de riesgo).
    const factorNegativo = Math.min(
        1,
        valenciaNegativa * 0.6 + tension * 0.3 + incertidumbre * 0.1,
    );
    // El entusiasmo/positividad AMORTIGUA el riesgo: contenido alegre reduce
    // todas las dimensiones de riesgo colectivo.
    const amortiguador = 1 - Math.min(0.8, entusiasmo);

    return {
        // Estres: intensidad emocional, pero solo cuando hay carga negativa.
        estresAcademico: aEscala100(senal.intensidad * factorNegativo),
        // Ansiedad: incertidumbre (miedo/sorpresa) ponderada.
        ansiedadColectiva: aEscala100(incertidumbre * (0.5 + factorNegativo * 0.5)),
        // Conflicto: tension (enfado/asco) directa.
        conflictoSocial: aEscala100(tension),
        // Bullying: valencia muy negativa y dirigida.
        bullying: aEscala100(valenciaNegativa * tension),
        // Aislamiento: dispersion del discurso ponderada por negatividad.
        aislamiento: aEscala100(senal.dispersion * factorNegativo),
        // Agotamiento: cansancio emocional = negatividad sostenida sin entusiasmo.
        agotamiento: aEscala100(factorNegativo * amortiguador),
        // Violencia verbal: tension activada (enfado con alta activacion).
        violenciaVerbal: aEscala100(tension * senal.activacion),
        // Desmotivacion: falta de entusiasmo SOLO cuando hay negatividad.
        desmotivacion: aEscala100((1 - entusiasmo) * factorNegativo),
    };
}

/**
 * Deriva los patrones/tendencias de la semana del `ResultadoNLP`: interpreta las
 * tendencias y los elementos causales (eventos/causas/detonantes) como patrones
 * detectados, listos para anclarse a su `Zona_Geografica` (Req. 16, 33.4).
 * Aceptar CERO patrones es valido (Req. 16.2).
 */
export function derivarPatrones(nlp: ResultadoNLP | undefined): PatronDetectado[] {
    if (!nlp) {
        return [];
    }
    // Elimina de las descripciones la enumeracion de terminos crudos (que pueden
    // venir en otro idioma del contenido generado) y traduce las etiquetas de
    // emocion del modelo (ingles) a espanol, dejando solo narrativa en espanol.
    const traducirEmociones = (t: string): string =>
        t
            .replace(/\banger\b/gi, 'enojo')
            .replace(/\bneutral\b/gi, 'neutralidad')
            .replace(/\bjoy\b/gi, 'alegria')
            .replace(/\bsadness\b/gi, 'tristeza')
            .replace(/\bfear\b/gi, 'miedo')
            .replace(/\bsurprise\b/gi, 'sorpresa')
            .replace(/\bdisgust\b/gi, 'desagrado');
    const limpiar = (texto: string): string =>
        traducirEmociones(
            texto
                .replace(/\.?\s*Los temas con mayor presencia son:[^.]*\.?/gi, '.')
                .replace(/\s{2,}/g, ' ')
                .replace(/\.\.+/g, '.')
                .trim(),
        );

    const patrones: PatronDetectado[] = [];
    for (const tendencia of nlp.tendencias) {
        const desc = limpiar(tendencia.descripcion);
        // Solo se anexa "(direccion, magnitud)" cuando hay una tendencia REAL
        // (magnitud significativa). La interpretacion narrativa del NLP llega con
        // magnitud 0 / "estable" y anexarla solo confunde ("magnitud 0.00").
        const tendenciaReal = tendencia.magnitud > 1e-6 && tendencia.direccion !== 'estable';
        patrones.push({
            tipo: 'tendencia',
            descripcion: tendenciaReal
                ? `${desc} (${tendencia.direccion}, magnitud ${tendencia.magnitud.toFixed(2)})`
                : desc,
        });
    }
    for (const elemento of nlp.elementosCausales) {
        patrones.push({ tipo: elemento.tipo, descripcion: limpiar(elemento.descripcion) });
    }
    return patrones;
}

/**
 * Deriva el resumen de la `Memoria_Semanal` a partir del `ResultadoNLP`
 * (Req. 28.1): el resumen lo componen los terminos clave salientes; los eventos
 * y tendencias se extraen de los elementos causales y las tendencias del NLP.
 */
export function derivarResumenMemoria(
    nlp: ResultadoNLP | undefined,
): ResumenMemoriaSemana {
    if (!nlp) {
        return {
            resumen: 'Sin contenido contributivo analizable en la semana.',
            eventosRelevantes: [],
            cambiosImportantes: [],
            anomalias: [],
            tendencias: [],
        };
    }

    const terminos = nlp.semantico.terminosClave.map((t) => t.termino);
    const resumen =
        terminos.length > 0
            ? `Temas dominantes: ${terminos.slice(0, 8).join(', ')}.`
            : 'Semana sin temas dominantes salientes.';

    const eventosRelevantes = nlp.elementosCausales
        .filter((e) => e.tipo === 'evento')
        .map((e) => e.descripcion);
    const cambiosImportantes = nlp.elementosCausales
        .filter((e) => e.tipo === 'detonante' || e.tipo === 'causa')
        .map((e) => e.descripcion);
    const tendencias = nlp.tendencias.map(
        (t) => `${t.descripcion} (${t.direccion})`,
    );

    return {
        resumen,
        eventosRelevantes,
        cambiosImportantes,
        anomalias: [],
        tendencias,
    };
}
