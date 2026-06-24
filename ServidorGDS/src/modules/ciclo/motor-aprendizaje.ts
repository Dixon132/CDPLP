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
    IntensidadCiclo,
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

        // 1) Senales colectivas agregadas del indice, derivadas del NLP (Req. 17.2)
        //    y calibradas a la BANDA de la intensidad declarada del escenario.
        const entradaIndice: EntradaIndice = {
            comunidadId: contexto.comunidadId,
            numeroSemana: contexto.numeroSemana,
            senales: derivarSenalesIndice(nlp, contexto.intensidad),
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

/**
 * Techo y piso AMBIENTE del `Indice_Riesgo` por intensidad declarada del
 * `Escenario`. La intensidad fija el RANGO disponible: el `techo` es el maximo
 * que alcanzan las dimensiones DOMINANTES del escenario, y el `pisoAmbiente` es
 * un fondo BAJO (no uniforme-alto) para las dimensiones poco relevantes. Asi las
 * emociones NO quedan todas al mismo nivel: las que el contenido activa suben
 * hacia el techo y las que no, se quedan cerca del fondo.
 */
const RANGO_INTENSIDAD: Record<
    IntensidadCiclo,
    { pisoAmbiente: number; techo: number }
> = {
    baja: { pisoAmbiente: 3, techo: 22 },
    media: { pisoAmbiente: 5, techo: 58 },
    alta: { pisoAmbiente: 8, techo: 88 },
    extrema: { pisoAmbiente: 14, techo: 99 },
};

/**
 * Ganancia que expande la senal de contenido `[0,1]` sin saturar: con 1.8 una
 * senal dominante (~0.4-0.5) llega a ~0.7-0.9 del rango y las debiles quedan
 * bajas, generando CONTRASTE entre dimensiones y oscilacion semana a semana.
 */
const GANANCIA_SENAL = 1.8;

/**
 * Deriva las senales colectivas por dimension del `Indice_Riesgo` a partir de
 * features HOLISTICAS del `ResultadoNLP` (Req. 16.1, 17.2), calibradas al RANGO
 * de la `intensidad` declarada. Sin NLP disponible, todas las senales son 0. Es
 * determinista y SOLO lee agregados colectivos (Req. 17.4, 17.6).
 *
 * Modelo: cada dimension tiene un DRIVER emocional DISTINTO (varias como
 * PRODUCTO de dos senales, de modo que solo se activan cuando ambas estan
 * presentes -> quedan bajas y mas variables si el escenario no las provoca). La
 * senal `r in [0,1]` se mapea al rango de la intensidad:
 * `valor = pisoAmbiente + clamp(r * GANANCIA, 0, 1) * (techo - pisoAmbiente)`.
 * Resultado: la intensidad fija cuanto puede subir el riesgo; el contenido
 * decide QUE dimensiones suben (contraste) y CUANTO cada semana (oscilacion).
 */
export function derivarSenalesIndice(
    nlp: ResultadoNLP | undefined,
    intensidad: IntensidadCiclo = 'media',
): Record<string, number> {
    if (!nlp) {
        return Object.fromEntries(
            DIMENSIONES_POR_DEFECTO.map((d) => [d.clave, 0]),
        );
    }

    const rango = RANGO_INTENSIDAD[intensidad] ?? RANGO_INTENSIDAD.media;

    const { senal, distribucion } = nlp.emocional;
    const tension = distribucion.tension ?? 0;
    const entusiasmo = distribucion.entusiasmo ?? 0;
    const incertidumbre = distribucion.incertidumbre ?? 0;
    const valenciaNegativa = Math.max(0, -senal.valencia);

    // Negatividad global [0,1]: clima negativo sostenido (no es un piso, modula
    // las dimensiones de desgaste).
    const factorNegativo = Math.min(
        1,
        valenciaNegativa * 0.6 + tension * 0.3 + incertidumbre * 0.1,
    );
    const amortiguador = 1 - Math.min(0.8, entusiasmo);

    // Mapea una senal de contenido `r in [0,1]` al rango de la intensidad.
    const enRango = (r: number): number => {
        const base = Number.isFinite(r) ? Math.max(0, r) : 0;
        const s = Math.min(1, base * GANANCIA_SENAL);
        return Math.min(
            100,
            Math.max(0, rango.pisoAmbiente + s * (rango.techo - rango.pisoAmbiente)),
        );
    };

    return {
        // Estres academico: intensidad emocional con carga negativa (driver mixto).
        estresAcademico: enRango(senal.intensidad * (0.3 + factorNegativo * 0.7)),
        // Ansiedad: incertidumbre (miedo) DIRECTA -> dominante en crisis con miedo.
        ansiedadColectiva: enRango(incertidumbre),
        // Conflicto: tension (enfado/asco) DIRECTA -> dominante en crisis de conflicto.
        conflictoSocial: enRango(tension),
        // Bullying: PRODUCTO valencia-negativa x tension -> raro, solo si ambos altos.
        bullying: enRango(valenciaNegativa * tension * 1.6),
        // Aislamiento: PRODUCTO dispersion x negatividad -> bajo salvo discurso disperso y negativo.
        aislamiento: enRango(senal.dispersion * valenciaNegativa * 1.6),
        // Agotamiento: negatividad sostenida sin entusiasmo (driver de desgaste).
        agotamiento: enRango(factorNegativo * amortiguador),
        // Violencia verbal: PRODUCTO tension x activacion -> enfado activado.
        violenciaVerbal: enRango(tension * senal.activacion * 1.5),
        // Desmotivacion: PRODUCTO falta-de-entusiasmo x negatividad.
        desmotivacion: enRango((1 - entusiasmo) * valenciaNegativa * 1.4),
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
