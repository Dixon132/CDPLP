/**
 * Logica PURA del `Generador_Reportes`: calculo del rango de semanas por
 * horizonte y construccion del contenido estructurado + narrativa (Handlebars)
 * a partir de los resultados semanales acumulados.
 *
 * Estas funciones NO acceden a la base de datos: reciben los datos crudos ya
 * leidos y devuelven el `ReporteContenido`. Eso las hace deterministas y
 * testeables de forma aislada (Req. 26.1), mientras el `ReportsService` se
 * encarga de la E/S (Prisma) y la persistencia en `gds_reporte`.
 *
 * _Requirements: 19.1, 19.2, 19.3, 19.4_
 */
import Handlebars from 'handlebars';

import {
    AfirmacionConEvidencia,
    CambioReporte,
    DetonanteReporte,
    DireccionCambio,
    EntradaContenido,
    EvidenciaReporte,
    ExplicacionReporte,
    Horizonte,
    IndicadorReporte,
    RangoSemanas,
    ReporteContenido,
    SEMANAS_POR_HORIZONTE,
    TendenciaReporte,
} from './reports.types';

/** Umbral (en valor absoluto de dimension) para considerar un cambio "estable". */
const EPSILON_ESTABLE = 1e-9;

/**
 * Calcula el rango de `Semana_Simulada` (inclusive) que cubre un reporte de un
 * horizonte y periodo dados, acotado por el total de semanas del `Analisis`.
 *
 * - `FINAL`: cubre TODO el analisis (1..semanasTotales).
 * - resto: tramos contiguos del tamano de `SEMANAS_POR_HORIZONTE` (el periodo es
 *   1-based: mensual periodo 1 => semanas 1..4, periodo 2 => 5..8, etc.).
 *
 * El extremo superior se recorta a `semanasTotales` (un periodo parcial al final
 * del analisis sigue siendo valido, Req. 19.3).
 */
export function rangoSemanas(
    horizonte: Horizonte,
    periodo: number,
    semanasTotales: number,
): RangoSemanas {
    if (horizonte === Horizonte.FINAL) {
        return { desde: 1, hasta: Math.max(1, semanasTotales) };
    }
    if (!Number.isInteger(periodo) || periodo < 1) {
        throw new Error(`Periodo invalido para el horizonte ${horizonte}: ${periodo}`);
    }
    const span = SEMANAS_POR_HORIZONTE[horizonte];
    const desde = (periodo - 1) * span + 1;
    if (desde > semanasTotales) {
        throw new Error(
            `El periodo ${periodo} del horizonte ${horizonte} (semana inicial ${desde}) ` +
            `excede las ${semanasTotales} semanas del analisis.`,
        );
    }
    const hasta = Math.min(periodo * span, semanasTotales);
    return { desde, hasta };
}

/** Redondea a 4 decimales para estabilizar la salida numerica. */
function redondear(n: number): number {
    return Math.round(n * 1e4) / 1e4;
}

/** Direccion de un cambio segun su variacion absoluta. */
function direccionDe(variacion: number): DireccionCambio {
    if (variacion > EPSILON_ESTABLE) return 'sube';
    if (variacion < -EPSILON_ESTABLE) return 'baja';
    return 'estable';
}

/** Une listas de strings preservando el primer orden de aparicion, sin duplicados. */
function unicosEnOrden(...listas: string[][]): string[] {
    const vistos = new Set<string>();
    const salida: string[] = [];
    for (const lista of listas) {
        for (const v of lista) {
            if (!vistos.has(v)) {
                vistos.add(v);
                salida.push(v);
            }
        }
    }
    return salida;
}

// ---------------------------------------------------------------------------
// Plantilla Handlebars de la narrativa colectiva del reporte (Req. 19.2).
// Se compila UNA sola vez a nivel de modulo.
// ---------------------------------------------------------------------------
const PLANTILLA_RESUMEN = Handlebars.compile(
    [
        'Reporte {{horizonteLegible}} del analisis {{analisisId}}',
        '{{#if institucionId}} (institucion {{institucionId}}){{/if}}',
        ', semanas {{rango.desde}} a {{rango.hasta}}.',
        ' Se cubrieron {{semanasCubiertas}} semana(s) con resultados.',
        '{{#if indicadores.length}} Indicadores colectivos: {{#each indicadores}}{{this.dimension}}',
        ' (de {{this.valorInicial}} a {{this.valorFinal}}){{#unless @last}}; {{/unless}}{{/each}}.{{/if}}',
        '{{#if cambios.length}} Cambios destacados: {{#each cambios}}{{this.dimension}} {{this.direccion}}',
        '{{#if this.variacionPct}} ({{this.variacionPct}}%){{/if}}{{#unless @last}}; {{/unless}}{{/each}}.{{/if}}',
        '{{#if detonantes.length}} Factores detonantes: {{#each detonantes}}{{this.evento}}',
        '{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}',
        ' Total de evidencias referenciadas: {{evidencias.length}}.',
    ].join(''),
    { noEscape: true },
);

/** Etiqueta legible del horizonte para la narrativa. */
function horizonteLegible(h: Horizonte): string {
    switch (h) {
        case Horizonte.SEMANAL:
            return 'semanal';
        case Horizonte.MENSUAL:
            return 'mensual';
        case Horizonte.TRIMESTRAL:
            return 'trimestral';
        case Horizonte.SEMESTRAL:
            return 'semestral';
        case Horizonte.FINAL:
            return 'final';
    }
}

/**
 * Construye el `ReporteContenido` colectivo y explicativo a partir de los
 * resultados semanales acumulados y los patrones del `Analisis` (Req. 19.2,
 * 19.3). Funcion PURA y determinista (modulo el reloj inyectable).
 */
export function construirContenido(entrada: EntradaContenido): ReporteContenido {
    const { analisisId, institucionId, horizonte, periodo, rango, resultados, patrones } = entrada;
    const ahora = entrada.ahora ?? new Date();

    // Solo resultados dentro del rango del periodo, ordenados por semana asc.
    const enRango = resultados
        .filter((r) => r.numeroSemana >= rango.desde && r.numeroSemana <= rango.hasta)
        .sort((a, b) => a.numeroSemana - b.numeroSemana);

    const semanasCubiertas = unicosEnOrden(enRango.map((r) => String(r.numeroSemana))).map(Number);

    // --- Evidencias del periodo (dedupe por id, contenido anonimizado) ---
    const evidenciasPorId = new Map<string, EvidenciaReporte>();
    // Mapa dimension -> ids de evidencia que la referencian (indicadoresUtilizados).
    const evidenciasPorDimension = new Map<string, string[]>();
    // Mapa evento detonante -> { semanas, evidenciaIds }.
    const detonantesMapa = new Map<string, { semanas: Set<number>; evidenciaIds: string[] }>();
    const publicaciones: string[][] = [];

    for (const r of enRango) {
        for (const ev of r.evidencias) {
            if (!evidenciasPorId.has(ev.id)) {
                const metricas: { conteo?: number; variacionPct?: number } = {};
                if (ev.conteo !== null && ev.conteo !== undefined) metricas.conteo = ev.conteo;
                if (ev.variacionPct !== null && ev.variacionPct !== undefined) {
                    metricas.variacionPct = ev.variacionPct;
                }
                evidenciasPorId.set(ev.id, {
                    id: ev.id,
                    tipo: ev.tipo,
                    contenido: ev.contenido,
                    numeroSemana: ev.numeroSemana,
                    contributividad: ev.contributividad,
                    refContenido: ev.refContenido,
                    metricas,
                });
            }
            for (const dim of ev.indicadoresUtilizados) {
                const lista = evidenciasPorDimension.get(dim) ?? [];
                if (!lista.includes(ev.id)) lista.push(ev.id);
                evidenciasPorDimension.set(dim, lista);
            }
            for (const evento of ev.eventosAsociados) {
                const det = detonantesMapa.get(evento) ?? { semanas: new Set<number>(), evidenciaIds: [] };
                det.semanas.add(ev.numeroSemana);
                if (!det.evidenciaIds.includes(ev.id)) det.evidenciaIds.push(ev.id);
                detonantesMapa.set(evento, det);
            }
            publicaciones.push(ev.publicacionesAsociadas);
        }
    }

    const evidenciaIdsDe = (dimension: string): string[] =>
        evidenciasPorDimension.get(dimension) ?? [];

    // --- Indicadores y cambios por dimension (agregado colectivo) ---
    interface Acum {
        nombre: string;
        muestras: { semana: number; valor: number; minimo: number; maximo: number; scoreMl: number | null }[];
    }
    const porDimension = new Map<string, Acum>();
    const explicaciones: ExplicacionReporte[] = [];

    for (const r of enRango) {
        for (const dim of r.dimensiones) {
            const acum = porDimension.get(dim.nombre) ?? { nombre: dim.nombre, muestras: [] };
            acum.muestras.push({
                semana: r.numeroSemana,
                valor: dim.valor,
                minimo: dim.minimo,
                maximo: dim.maximo,
                scoreMl: dim.scoreCalibradoMl,
            });
            porDimension.set(dim.nombre, acum);

            for (const ex of dim.explicaciones) {
                explicaciones.push({
                    dimension: dim.nombre,
                    numeroSemana: r.numeroSemana,
                    que: ex.que,
                    porQue: ex.porQue,
                    ...(ex.cuandoEmpezo ? { cuandoEmpezo: ex.cuandoEmpezo } : {}),
                    ...(ex.comoEvoluciono ? { comoEvoluciono: ex.comoEvoluciono } : {}),
                    evidenciaIds: evidenciaIdsDe(dim.nombre),
                });
            }
        }
    }

    const indicadores: IndicadorReporte[] = [];
    const cambios: CambioReporte[] = [];

    for (const acum of porDimension.values()) {
        const muestras = [...acum.muestras].sort((a, b) => a.semana - b.semana);
        const valores = muestras.map((m) => m.valor);
        const primera = muestras[0];
        const ultima = muestras[muestras.length - 1];
        const scores = muestras.map((m) => m.scoreMl).filter((s): s is number => s !== null);
        const evidenciaIds = evidenciaIdsDe(acum.nombre);

        indicadores.push({
            dimension: acum.nombre,
            valorInicial: redondear(primera.valor),
            valorFinal: redondear(ultima.valor),
            minimo: redondear(Math.min(...valores)),
            maximo: redondear(Math.max(...valores)),
            promedio: redondear(valores.reduce((s, v) => s + v, 0) / valores.length),
            scoreCalibradoMlPromedio:
                scores.length > 0 ? redondear(scores.reduce((s, v) => s + v, 0) / scores.length) : null,
            semanas: muestras.map((m) => m.semana),
            evidenciaIds,
        });

        const variacionAbsoluta = ultima.valor - primera.valor;
        const variacionPct =
            primera.valor !== 0 ? redondear((variacionAbsoluta / Math.abs(primera.valor)) * 100) : null;
        cambios.push({
            dimension: acum.nombre,
            desdeSemana: primera.semana,
            hastaSemana: ultima.semana,
            variacionAbsoluta: redondear(variacionAbsoluta),
            variacionPct,
            direccion: direccionDe(variacionAbsoluta),
            evidenciaIds,
        });
    }

    indicadores.sort((a, b) => a.dimension.localeCompare(b.dimension));
    cambios.sort((a, b) => a.dimension.localeCompare(b.dimension));

    // --- Tendencias (patrones anclados a comunidad/zona) ---
    const tendencias: TendenciaReporte[] = patrones.map((p) => ({
        tipo: p.tipo,
        descripcion: p.descripcion,
        comunidadId: p.comunidadId,
    }));

    // --- Detonantes ---
    const detonantes: DetonanteReporte[] = [...detonantesMapa.entries()]
        .map(([evento, d]) => ({
            evento,
            semanas: [...d.semanas].sort((a, b) => a - b),
            evidenciaIds: d.evidenciaIds,
        }))
        .sort((a, b) => a.evento.localeCompare(b.evento));

    // --- Publicaciones relevantes (anonimizadas, deduplicadas) ---
    const publicacionesRelevantes = unicosEnOrden(...publicaciones);

    // --- Conclusiones colectivas, cada una con su evidencia (Req. 20.1) ---
    const conclusiones: AfirmacionConEvidencia[] = [];
    for (const c of cambios) {
        if (c.direccion === 'estable') continue;
        const pct = c.variacionPct !== null ? ` (${c.variacionPct}%)` : '';
        conclusiones.push({
            texto:
                `La dimension colectiva "${c.dimension}" ${c.direccion === 'sube' ? 'aumento' : 'disminuyo'}` +
                ` entre la semana ${c.desdeSemana} y la ${c.hastaSemana}${pct}.`,
            evidenciaIds: c.evidenciaIds,
        });
    }
    for (const d of detonantes) {
        conclusiones.push({
            texto: `El evento "${d.evento}" se correlaciona con la actividad de las semanas ${d.semanas.join(', ')}.`,
            evidenciaIds: d.evidenciaIds,
        });
    }
    if (conclusiones.length === 0 && indicadores.length > 0) {
        conclusiones.push({
            texto: 'Los indicadores colectivos se mantuvieron estables durante el periodo.',
            evidenciaIds: unicosEnOrden(...indicadores.map((i) => i.evidenciaIds)),
        });
    }

    // --- Recomendaciones colectivas derivadas de los cambios (Req. 19.2) ---
    const recomendaciones: AfirmacionConEvidencia[] = [];
    for (const c of cambios) {
        if (c.direccion === 'sube') {
            recomendaciones.push({
                texto:
                    `Dar seguimiento colectivo a "${c.dimension}", cuyo indicador muestra una tendencia al alza; ` +
                    'priorizar acciones preventivas a nivel de comunidad.',
                evidenciaIds: c.evidenciaIds,
            });
        }
    }
    if (recomendaciones.length === 0) {
        recomendaciones.push({
            texto:
                'Mantener el monitoreo periodico de las dimensiones del indice de riesgo; ' +
                'no se observan alzas que requieran accion inmediata.',
            evidenciaIds: [],
        });
    }

    const evidencias = [...evidenciasPorId.values()].sort(
        (a, b) => a.numeroSemana - b.numeroSemana || a.id.localeCompare(b.id),
    );

    const contenidoBase: Omit<ReporteContenido, 'resumen'> = {
        horizonte,
        periodo,
        rango,
        analisisId,
        institucionId,
        indicadores,
        cambios,
        tendencias,
        detonantes,
        explicaciones,
        publicacionesRelevantes,
        evidencias,
        conclusiones,
        recomendaciones,
        generadoEn: ahora.toISOString(),
        semanasCubiertas,
    };

    const resumen = PLANTILLA_RESUMEN({
        ...contenidoBase,
        horizonteLegible: horizonteLegible(horizonte),
        semanasCubiertas: semanasCubiertas.length,
    }).trim();

    return { ...contenidoBase, resumen };
}
