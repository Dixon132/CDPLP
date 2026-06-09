/**
 * Renderizadores descargables del `Generador_Reportes` (tarea 23.2).
 *
 * Funciones PURAS que transforman el `ReporteContenido` ya persistido en
 * `gds_reporte` (producido por la tarea 23.1) a dos formatos descargables,
 * CONSERVANDO explicaciones y evidencias ANONIMIZADAS (Req. 19.5, 30.5):
 *
 *  - `renderReportePdf`   -> `Buffer` PDF con **PDFKit** (diseno D13). Render
 *    programatico determinista, sin navegador (apto para Windows/CI).
 *  - `renderReporteExcel` -> `Buffer` XLSX con **ExcelJS** (diseno D13), una
 *    hoja por seccion del reporte (indicadores, cambios, explicaciones,
 *    evidencias, conclusiones, recomendaciones, etc.).
 *
 * Los reportes son COLECTIVOS y EXPLICATIVOS: cada conclusion y cada cambio
 * referencian su `Evidencia` POR IDENTIFICADOR trazable; el contenido de las
 * evidencias ya viene anonimizado desde la generacion, por lo que aqui solo se
 * vuelca tal cual (nunca se reconstruyen identificadores crudos).
 *
 * _Requirements: 19.5, 30.5_
 */
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

import { Horizonte, ReporteContenido } from './reports.types';

/** Etiqueta legible del horizonte para los encabezados del documento. */
function horizonteLegible(h: Horizonte): string {
    switch (h) {
        case Horizonte.SEMANAL:
            return 'Semanal';
        case Horizonte.MENSUAL:
            return 'Mensual';
        case Horizonte.TRIMESTRAL:
            return 'Trimestral';
        case Horizonte.SEMESTRAL:
            return 'Semestral';
        case Horizonte.FINAL:
            return 'Final';
        default:
            return String(h);
    }
}

/** Formatea una lista de ids de evidencia como referencia trazable legible. */
function refEvidencias(ids: string[]): string {
    return ids.length > 0 ? `Evidencia(s): ${ids.join(', ')}` : 'Sin evidencia referenciada';
}

/** Formatea la variacion porcentual (null => indefinida). */
function pct(valor: number | null): string {
    return valor === null ? 'n/d' : `${valor}%`;
}

/**
 * Renderiza el reporte a un `Buffer` PDF con PDFKit, conservando explicaciones y
 * evidencias anonimizadas (Req. 19.5). El render es programatico y no requiere
 * navegador ni fuentes externas (usa las fuentes AFM incorporadas).
 */
export function renderReportePdf(contenido: ReporteContenido): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                info: {
                    Title: `Reporte ${horizonteLegible(contenido.horizonte)} - analisis ${contenido.analisisId}`,
                    Author: 'Plataforma_GDS',
                    Subject: 'Reporte colectivo de tendencias de riesgo emocional',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Encabezado ---
            doc.fontSize(18).text(`Reporte ${horizonteLegible(contenido.horizonte)}`, { align: 'left' });
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#444444');
            doc.text(`Analisis: ${contenido.analisisId}`);
            doc.text(`Institucion: ${contenido.institucionId ?? 'Todas las instituciones del analisis'}`);
            doc.text(`Periodo: ${contenido.periodo}  |  Semanas ${contenido.rango.desde} a ${contenido.rango.hasta}`);
            doc.text(`Semanas con resultados: ${contenido.semanasCubiertas.join(', ') || 'ninguna'}`);
            doc.text(`Generado: ${contenido.generadoEn}`);
            doc.fillColor('#000000').moveDown(0.8);

            // --- Resumen narrativo (Handlebars) ---
            doc.fontSize(13).text('Resumen', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10).text(contenido.resumen);
            doc.moveDown(0.8);

            // --- Indicadores colectivos ---
            doc.fontSize(13).text('Indicadores colectivos', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.indicadores.length === 0) {
                doc.text('Sin indicadores en el periodo.');
            } else {
                for (const ind of contenido.indicadores) {
                    doc.text(
                        `- ${ind.dimension}: inicial ${ind.valorInicial}, final ${ind.valorFinal}, ` +
                        `promedio ${ind.promedio} (rango ${ind.minimo}-${ind.maximo}). ${refEvidencias(ind.evidenciaIds)}.`,
                    );
                }
            }
            doc.moveDown(0.8);

            // --- Cambios cuantificados ---
            doc.fontSize(13).text('Cambios', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.cambios.length === 0) {
                doc.text('Sin cambios registrados.');
            } else {
                for (const c of contenido.cambios) {
                    doc.text(
                        `- ${c.dimension}: ${c.direccion} ${c.variacionAbsoluta} (${pct(c.variacionPct)}) ` +
                        `entre semana ${c.desdeSemana} y ${c.hastaSemana}. ${refEvidencias(c.evidenciaIds)}.`,
                    );
                }
            }
            doc.moveDown(0.8);

            // --- Explicaciones (que / por que / cuando / como) ---
            doc.fontSize(13).text('Explicaciones', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.explicaciones.length === 0) {
                doc.text('Sin explicaciones en el periodo.');
            } else {
                for (const ex of contenido.explicaciones) {
                    doc.text(`- [${ex.dimension} / semana ${ex.numeroSemana}] Que: ${ex.que}`);
                    doc.text(`  Por que: ${ex.porQue}`);
                    if (ex.cuandoEmpezo) doc.text(`  Cuando empezo: ${ex.cuandoEmpezo}`);
                    if (ex.comoEvoluciono) doc.text(`  Como evoluciono: ${ex.comoEvoluciono}`);
                    doc.text(`  ${refEvidencias(ex.evidenciaIds)}.`);
                }
            }
            doc.moveDown(0.8);

            // --- Tendencias / patrones ---
            doc.fontSize(13).text('Tendencias', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.tendencias.length === 0) {
                doc.text('Sin tendencias detectadas.');
            } else {
                for (const t of contenido.tendencias) {
                    doc.text(`- [${t.tipo}] ${t.descripcion} (comunidad ${t.comunidadId}).`);
                }
            }
            doc.moveDown(0.8);

            // --- Factores detonantes ---
            doc.fontSize(13).text('Factores detonantes', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.detonantes.length === 0) {
                doc.text('Sin factores detonantes correlacionados.');
            } else {
                for (const d of contenido.detonantes) {
                    doc.text(
                        `- ${d.evento}: semanas ${d.semanas.join(', ')}. ${refEvidencias(d.evidenciaIds)}.`,
                    );
                }
            }
            doc.moveDown(0.8);

            // --- Evidencias anonimizadas (trazables por id) ---
            doc.fontSize(13).text('Evidencias (anonimizadas)', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.evidencias.length === 0) {
                doc.text('Sin evidencias en el periodo.');
            } else {
                for (const ev of contenido.evidencias) {
                    doc.text(
                        `- [${ev.id}] (${ev.tipo}, semana ${ev.numeroSemana}, ${ev.contributividad}) ` +
                        `ref ${ev.refContenido}`,
                    );
                    doc.text(`  Contenido: ${ev.contenido}`);
                }
            }
            doc.moveDown(0.8);

            // --- Conclusiones (cada una con su evidencia) ---
            doc.fontSize(13).text('Conclusiones', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.conclusiones.length === 0) {
                doc.text('Sin conclusiones.');
            } else {
                for (const c of contenido.conclusiones) {
                    doc.text(`- ${c.texto} ${refEvidencias(c.evidenciaIds)}.`);
                }
            }
            doc.moveDown(0.8);

            // --- Recomendaciones ---
            doc.fontSize(13).text('Recomendaciones', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(10);
            if (contenido.recomendaciones.length === 0) {
                doc.text('Sin recomendaciones.');
            } else {
                for (const r of contenido.recomendaciones) {
                    doc.text(`- ${r.texto} ${refEvidencias(r.evidenciaIds)}.`);
                }
            }

            doc.end();
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

/** Aplica estilo de cabecera a la fila de encabezados de una hoja. */
function estilizarCabecera(row: ExcelJS.Row): void {
    row.font = { bold: true };
    row.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E7FF' },
        };
    });
}

/**
 * Renderiza el reporte a un `Buffer` XLSX con ExcelJS, una hoja por seccion,
 * conservando explicaciones y evidencias anonimizadas (Req. 19.5). Cada fila de
 * conclusion/cambio/indicador incluye la columna de ids de evidencia trazable.
 */
export async function renderReporteExcel(contenido: ReporteContenido): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Plataforma_GDS';
    wb.created = new Date(contenido.generadoEn);

    // --- Hoja: Resumen ---
    const resumen = wb.addWorksheet('Resumen');
    resumen.columns = [
        { header: 'Campo', key: 'campo', width: 28 },
        { header: 'Valor', key: 'valor', width: 90 },
    ];
    estilizarCabecera(resumen.getRow(1));
    resumen.addRows([
        { campo: 'Horizonte', valor: horizonteLegible(contenido.horizonte) },
        { campo: 'Analisis', valor: contenido.analisisId },
        { campo: 'Institucion', valor: contenido.institucionId ?? 'Todas las instituciones del analisis' },
        { campo: 'Periodo', valor: contenido.periodo },
        { campo: 'Rango de semanas', valor: `${contenido.rango.desde} - ${contenido.rango.hasta}` },
        { campo: 'Semanas cubiertas', valor: contenido.semanasCubiertas.join(', ') },
        { campo: 'Generado', valor: contenido.generadoEn },
        { campo: 'Resumen', valor: contenido.resumen },
    ]);

    // --- Hoja: Indicadores ---
    const indicadores = wb.addWorksheet('Indicadores');
    indicadores.columns = [
        { header: 'Dimension', key: 'dimension', width: 28 },
        { header: 'Valor inicial', key: 'valorInicial', width: 14 },
        { header: 'Valor final', key: 'valorFinal', width: 14 },
        { header: 'Minimo', key: 'minimo', width: 12 },
        { header: 'Maximo', key: 'maximo', width: 12 },
        { header: 'Promedio', key: 'promedio', width: 12 },
        { header: 'Score ML promedio', key: 'scoreCalibradoMlPromedio', width: 18 },
        { header: 'Semanas', key: 'semanas', width: 20 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(indicadores.getRow(1));
    for (const ind of contenido.indicadores) {
        indicadores.addRow({
            ...ind,
            semanas: ind.semanas.join(', '),
            evidenciaIds: ind.evidenciaIds.join(', '),
        });
    }

    // --- Hoja: Cambios ---
    const cambios = wb.addWorksheet('Cambios');
    cambios.columns = [
        { header: 'Dimension', key: 'dimension', width: 28 },
        { header: 'Desde semana', key: 'desdeSemana', width: 14 },
        { header: 'Hasta semana', key: 'hastaSemana', width: 14 },
        { header: 'Variacion absoluta', key: 'variacionAbsoluta', width: 18 },
        { header: 'Variacion %', key: 'variacionPct', width: 14 },
        { header: 'Direccion', key: 'direccion', width: 12 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(cambios.getRow(1));
    for (const c of contenido.cambios) {
        cambios.addRow({
            ...c,
            variacionPct: c.variacionPct === null ? 'n/d' : c.variacionPct,
            evidenciaIds: c.evidenciaIds.join(', '),
        });
    }

    // --- Hoja: Explicaciones ---
    const explicaciones = wb.addWorksheet('Explicaciones');
    explicaciones.columns = [
        { header: 'Dimension', key: 'dimension', width: 24 },
        { header: 'Semana', key: 'numeroSemana', width: 10 },
        { header: 'Que', key: 'que', width: 40 },
        { header: 'Por que', key: 'porQue', width: 40 },
        { header: 'Cuando empezo', key: 'cuandoEmpezo', width: 24 },
        { header: 'Como evoluciono', key: 'comoEvoluciono', width: 24 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(explicaciones.getRow(1));
    for (const ex of contenido.explicaciones) {
        explicaciones.addRow({
            dimension: ex.dimension,
            numeroSemana: ex.numeroSemana,
            que: ex.que,
            porQue: ex.porQue,
            cuandoEmpezo: ex.cuandoEmpezo ?? '',
            comoEvoluciono: ex.comoEvoluciono ?? '',
            evidenciaIds: ex.evidenciaIds.join(', '),
        });
    }

    // --- Hoja: Tendencias ---
    const tendencias = wb.addWorksheet('Tendencias');
    tendencias.columns = [
        { header: 'Tipo', key: 'tipo', width: 24 },
        { header: 'Descripcion', key: 'descripcion', width: 60 },
        { header: 'Comunidad', key: 'comunidadId', width: 24 },
    ];
    estilizarCabecera(tendencias.getRow(1));
    for (const t of contenido.tendencias) {
        tendencias.addRow(t);
    }

    // --- Hoja: Detonantes ---
    const detonantes = wb.addWorksheet('Detonantes');
    detonantes.columns = [
        { header: 'Evento', key: 'evento', width: 32 },
        { header: 'Semanas', key: 'semanas', width: 24 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(detonantes.getRow(1));
    for (const d of contenido.detonantes) {
        detonantes.addRow({
            evento: d.evento,
            semanas: d.semanas.join(', '),
            evidenciaIds: d.evidenciaIds.join(', '),
        });
    }

    // --- Hoja: Evidencias (anonimizadas) ---
    const evidencias = wb.addWorksheet('Evidencias');
    evidencias.columns = [
        { header: 'Id', key: 'id', width: 28 },
        { header: 'Tipo', key: 'tipo', width: 18 },
        { header: 'Semana', key: 'numeroSemana', width: 10 },
        { header: 'Contributividad', key: 'contributividad', width: 18 },
        { header: 'Ref contenido', key: 'refContenido', width: 24 },
        { header: 'Contenido (anonimizado)', key: 'contenido', width: 60 },
        { header: 'Conteo', key: 'conteo', width: 12 },
        { header: 'Variacion %', key: 'variacionPct', width: 14 },
    ];
    estilizarCabecera(evidencias.getRow(1));
    for (const ev of contenido.evidencias) {
        evidencias.addRow({
            id: ev.id,
            tipo: ev.tipo,
            numeroSemana: ev.numeroSemana,
            contributividad: ev.contributividad,
            refContenido: ev.refContenido,
            contenido: ev.contenido,
            conteo: ev.metricas.conteo ?? '',
            variacionPct: ev.metricas.variacionPct ?? '',
        });
    }

    // --- Hoja: Publicaciones relevantes ---
    const publicaciones = wb.addWorksheet('Publicaciones');
    publicaciones.columns = [{ header: 'Referencia anonimizada', key: 'ref', width: 50 }];
    estilizarCabecera(publicaciones.getRow(1));
    for (const ref of contenido.publicacionesRelevantes) {
        publicaciones.addRow({ ref });
    }

    // --- Hoja: Conclusiones ---
    const conclusiones = wb.addWorksheet('Conclusiones');
    conclusiones.columns = [
        { header: 'Conclusion', key: 'texto', width: 80 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(conclusiones.getRow(1));
    for (const c of contenido.conclusiones) {
        conclusiones.addRow({ texto: c.texto, evidenciaIds: c.evidenciaIds.join(', ') });
    }

    // --- Hoja: Recomendaciones ---
    const recomendaciones = wb.addWorksheet('Recomendaciones');
    recomendaciones.columns = [
        { header: 'Recomendacion', key: 'texto', width: 80 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(recomendaciones.getRow(1));
    for (const r of contenido.recomendaciones) {
        recomendaciones.addRow({ texto: r.texto, evidenciaIds: r.evidenciaIds.join(', ') });
    }

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
}
