/**
 * Renderizadores descargables del `Generador_Reportes` (tarea 23.2).
 *
 * Funciones PURAS que transforman el `ReporteContenido` ya persistido en
 * `gds_reporte` (producido por la tarea 23.1) a dos formatos descargables,
 * CONSERVANDO explicaciones y evidencias ANONIMIZADAS (Req. 19.5, 30.5):
 *
 *  - `renderReportePdf`   -> `Buffer` PDF con **PDFKit**. Diseno legible y
 *    PROGRESIVO por horizonte: indicadores con barras de color por nivel de
 *    riesgo, secciones POR INSTITUCION, y (desde trimestral) explicaciones,
 *    detonantes y evidencias. Render programatico, sin navegador.
 *  - `renderReporteExcel` -> `Buffer` XLSX con **ExcelJS**, una hoja por
 *    seccion + una hoja "Por institucion" cuando el reporte cubre todo el
 *    analisis.
 *
 * Los reportes son COLECTIVOS y EXPLICATIVOS: cada conclusion y cada cambio
 * referencian su `Evidencia` POR IDENTIFICADOR trazable; el contenido de las
 * evidencias ya viene anonimizado desde la generacion.
 *
 * _Requirements: 19.4, 19.5, 30.5_
 */
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { existsSync } from 'fs';
import { join } from 'path';

import {
    CambioReporte,
    HitoReporte,
    Horizonte,
    IndicadorReporte,
    MetricaSemanaContenido,
    ReporteContenido,
    SeccionInstitucion,
} from './reports.types';

/** Resuelve la ruta del logo institucional (tolerante a entorno dev/prod). */
function rutaLogo(): string | null {
    const candidatos = [
        join(process.cwd(), 'assets', 'logo.png'),
        join(__dirname, '..', '..', '..', 'assets', 'logo.png'),
        join(__dirname, 'assets', 'logo.png'),
    ];
    return candidatos.find((p) => existsSync(p)) ?? null;
}
const LOGO_PATH = rutaLogo();

// ---------------------------------------------------------------------------
// Paleta y utilidades de presentacion
// ---------------------------------------------------------------------------

const COLOR = {
    primario: '#1e3a8a',
    primarioClaro: '#3b82f6',
    texto: '#1f2937',
    textoSuave: '#6b7280',
    linea: '#e5e7eb',
    fondoCaja: '#f1f5f9',
    fondoBanda: '#1e3a8a',
    blanco: '#ffffff',
} as const;

/** Nivel de riesgo segun el valor 0-100 (mayor = peor). Umbrales unificados con el frontend. */
function nivelDe(valor: number): { etiqueta: string; color: string } {
    if (valor < 33) return { etiqueta: 'Bajo', color: '#16a34a' };
    if (valor < 66) return { etiqueta: 'Moderado', color: '#d97706' };
    return { etiqueta: 'Alto', color: '#dc2626' };
}

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

/** Indica si el horizonte amerita un reporte "completo" (con detalle profundo). */
function esCompleto(h: Horizonte): boolean {
    return h === Horizonte.TRIMESTRAL || h === Horizonte.SEMESTRAL || h === Horizonte.FINAL;
}

/** Formatea la variacion porcentual (null => indefinida). */
function pct(valor: number | null): string {
    return valor === null ? 'n/d' : `${valor > 0 ? '+' : ''}${valor}%`;
}

/** Simbolo direccional legible (ASCII, compatible con fuentes AFM). */
function flechaDireccion(dir: string): string {
    if (dir === 'sube') return '(+) sube';
    if (dir === 'baja') return '(-) baja';
    return '(=) estable';
}

/** Riesgo promedio (media de los promedios de cada dimension). */
function promedioInd(inds: IndicadorReporte[]): number {
    if (inds.length === 0) return 0;
    return Math.round((inds.reduce((s, i) => s + i.promedio, 0) / inds.length) * 10) / 10;
}

/** Dimension con mayor promedio (la mas critica) o null. */
function topInd(inds: IndicadorReporte[]): IndicadorReporte | null {
    if (inds.length === 0) return null;
    return inds.reduce((a, b) => (b.promedio > a.promedio ? b : a));
}

type Doc = InstanceType<typeof PDFDocument>;

/** Ancho util de contenido (entre margenes). */
function anchoUtil(doc: Doc): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/** Asegura `alto` px disponibles; si no, agrega pagina. */
function asegurarEspacio(doc: Doc, alto: number): void {
    const limite = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alto > limite) {
        doc.addPage();
    }
}

/** Banda de titulo de seccion con fondo de color. */
function banda(doc: Doc, texto: string, color: string = COLOR.fondoBanda): void {
    asegurarEspacio(doc, 34);
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    const y = doc.y;
    doc.roundedRect(x, y, w, 22, 4).fill(color);
    doc.fillColor(COLOR.blanco).fontSize(12).font('Helvetica-Bold').text(texto, x + 10, y + 5, {
        width: w - 20,
    });
    doc.font('Helvetica').fillColor(COLOR.texto);
    doc.y = y + 22 + 8;
    doc.x = x;
}

/** Subtitulo en color primario. */
function subtitulo(doc: Doc, texto: string): void {
    asegurarEspacio(doc, 22);
    doc.fillColor(COLOR.primario).fontSize(11).font('Helvetica-Bold').text(texto);
    doc.font('Helvetica').fillColor(COLOR.texto);
    doc.moveDown(0.2);
}

/** Parrafo de texto normal. */
function parrafo(doc: Doc, texto: string, opciones?: { suave?: boolean }): void {
    asegurarEspacio(doc, 26);
    doc.fontSize(9.5)
        .fillColor(opciones?.suave ? COLOR.textoSuave : COLOR.texto)
        .font('Helvetica')
        .text(texto, { align: 'left', lineGap: 1.5 });
    doc.fillColor(COLOR.texto);
}

/** Caja de texto resaltada (resumen ejecutivo). */
function caja(doc: Doc, texto: string): void {
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    const padding = 10;
    const alturaTexto = doc.heightOfString(texto, { width: w - padding * 2 });
    asegurarEspacio(doc, alturaTexto + padding * 2 + 6);
    const y = doc.y;
    doc.roundedRect(x, y, w, alturaTexto + padding * 2, 5).fillAndStroke(COLOR.fondoCaja, COLOR.linea);
    doc.fillColor(COLOR.texto).fontSize(9.5).font('Helvetica').text(texto, x + padding, y + padding, {
        width: w - padding * 2,
        lineGap: 1.5,
    });
    doc.y = y + alturaTexto + padding * 2 + 8;
    doc.x = x;
}

/** Dibuja una barra horizontal de un indicador con su nivel de color. */
function barraIndicador(doc: Doc, etiqueta: string, valor: number): void {
    asegurarEspacio(doc, 20);
    const x = doc.page.margins.left;
    const total = anchoUtil(doc);
    const y = doc.y;
    const labelW = 130;
    const valorW = 78;
    const barX = x + labelW;
    const barW = total - labelW - valorW;
    const barH = 11;
    const nivel = nivelDe(valor);

    doc.fontSize(8.5).font('Helvetica').fillColor(COLOR.texto).text(etiqueta, x, y + 1, {
        width: labelW - 6,
        ellipsis: true,
    });
    doc.roundedRect(barX, y, barW, barH, 2.5).fill(COLOR.linea);
    const frac = Math.max(0, Math.min(1, valor / 100));
    if (frac > 0) {
        doc.roundedRect(barX, y, Math.max(3, barW * frac), barH, 2.5).fill(nivel.color);
    }
    doc.fillColor(COLOR.texto).fontSize(8.5).font('Helvetica-Bold').text(
        `${valor.toFixed(1)} · ${nivel.etiqueta}`,
        barX + barW + 6,
        y + 1,
        { width: valorW - 4 },
    );
    doc.font('Helvetica');
    doc.y = y + barH + 5;
    doc.x = x;
}

/** Lista de indicadores como barras (ordenadas por valor descendente). */
function bloqueIndicadores(doc: Doc, indicadores: IndicadorReporte[]): void {
    if (indicadores.length === 0) {
        parrafo(doc, 'Sin indicadores en el periodo.', { suave: true });
        return;
    }
    const ordenados = [...indicadores].sort((a, b) => b.valorFinal - a.valorFinal);
    for (const ind of ordenados) {
        barraIndicador(doc, ind.dimension, ind.valorFinal);
    }
    doc.moveDown(0.4);
}

/** Tabla compacta de cambios destacados. */
function bloqueCambios(doc: Doc, cambios: CambioReporte[]): void {
    if (cambios.length === 0) {
        parrafo(doc, 'Sin cambios significativos registrados.', { suave: true });
        return;
    }
    // Solo cambios no estables, ordenados por magnitud.
    const relevantes = [...cambios]
        .filter((c) => c.direccion !== 'estable')
        .sort((a, b) => Math.abs(b.variacionAbsoluta) - Math.abs(a.variacionAbsoluta));
    const lista = relevantes.length > 0 ? relevantes : cambios;
    for (const c of lista.slice(0, 10)) {
        asegurarEspacio(doc, 14);
        const x = doc.page.margins.left;
        const y = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR.texto).text(`${c.dimension}: `, x, y, {
            continued: true,
        });
        doc.font('Helvetica').fillColor(COLOR.textoSuave).text(
            `${flechaDireccion(c.direccion)} ${pct(c.variacionPct)} (${c.variacionAbsoluta > 0 ? '+' : ''}${c.variacionAbsoluta} pts) entre semana ${c.desdeSemana} y ${c.hastaSemana}`,
        );
    }
    doc.fillColor(COLOR.texto).moveDown(0.4);
}

/** Lista de hitos (movimientos notables entre semanas consecutivas). */
function bloqueHitos(doc: Doc, hitos: HitoReporte[]): void {
    if (!hitos || hitos.length === 0) {
        parrafo(doc, 'Sin movimientos bruscos entre semanas en el periodo.', { suave: true });
        return;
    }
    for (const h of hitos.slice(0, 12)) {
        asegurarEspacio(doc, 14);
        const x = doc.page.margins.left;
        const y = doc.y;
        const color = h.direccion === 'sube' ? '#dc2626' : '#16a34a';
        doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(
            `Sem ${h.desdeSemana}->${h.hastaSemana}  `,
            x,
            y,
            { continued: true },
        );
        doc.fillColor(COLOR.texto).text(`${h.dimension}: `, { continued: true });
        doc.font('Helvetica').fillColor(COLOR.textoSuave).text(
            `${flechaDireccion(h.direccion)} ${h.variacionAbsoluta > 0 ? '+' : ''}${h.variacionAbsoluta} pts (${h.valorDesde} -> ${h.valorHasta})`,
        );
    }
    doc.fillColor(COLOR.texto).moveDown(0.4);
}

/** Cronologia de contenido por semana: publicaciones tomadas en cuenta y aportes. */
function bloqueCronologia(doc: Doc, cronologia: MetricaSemanaContenido[]): void {
    if (!cronologia || cronologia.length === 0) {
        parrafo(doc, 'Sin datos de contenido por semana en este periodo.', { suave: true });
        return;
    }
    // Cabecera de tabla
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    const cols = [
        { t: 'Sem', w: 0.08 },
        { t: 'Tomadas', w: 0.16 },
        { t: 'Total', w: 0.13 },
        { t: 'Post', w: 0.1 },
        { t: 'Coment.', w: 0.13 },
        { t: 'Imagen', w: 0.12 },
        { t: 'Hashtags', w: 0.28 },
    ];
    asegurarEspacio(doc, 18);
    let yh = doc.y;
    doc.roundedRect(x, yh, w, 16, 2).fill('#1e3a8a');
    let cx = x + 4;
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    for (const c of cols) {
        doc.text(c.t, cx, yh + 4, { width: w * c.w - 4 });
        cx += w * c.w;
    }
    doc.y = yh + 18;
    doc.font('Helvetica').fillColor(COLOR.texto);
    for (const m of cronologia) {
        asegurarEspacio(doc, 14);
        const y = doc.y;
        const hashtags = (m.hashtags ?? []).slice(0, 4).map((h) => `#${h.tag}`).join(' ') || '—';
        const celdas = [
            String(m.numeroSemana),
            String(m.contributivos),
            String(m.totalItems),
            m.aportePost > 0 ? 'si' : 'no',
            String(m.aporteComentarios),
            m.aporteImagen > 0 ? 'si' : 'no',
            hashtags,
        ];
        cx = x + 4;
        doc.fontSize(8).fillColor(COLOR.texto);
        celdas.forEach((val, i) => {
            doc.text(val, cx, y + 2, { width: w * cols[i].w - 4, ellipsis: true });
            cx += w * cols[i].w;
        });
        doc.y = y + 13;
        doc.moveTo(x, doc.y - 2).lineTo(x + w, doc.y - 2).strokeColor(COLOR.linea).lineWidth(0.5).stroke();
    }
    parrafo(
        doc,
        '"Tomadas" = publicaciones contributivas analizadas; "Total" = generadas (incluye descartadas por el filtro de relevancia).',
        { suave: true },
    );
    doc.moveDown(0.2);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Fila de tarjetas KPI (1-3 metricas) con valor destacado. */
function kpis(doc: Doc, items: { label: string; valor: string; color?: string }[]): void {
    if (items.length === 0) return;
    const h = 46;
    asegurarEspacio(doc, h + 10);
    const x = doc.page.margins.left;
    const total = anchoUtil(doc);
    const gap = 8;
    const n = items.length;
    const w = (total - gap * (n - 1)) / n;
    const y = doc.y;
    items.forEach((it, i) => {
        const bx = x + i * (w + gap);
        doc.roundedRect(bx, y, w, h, 5).fillAndStroke(COLOR.fondoCaja, COLOR.linea);
        doc.fillColor(COLOR.textoSuave).fontSize(8).font('Helvetica').text(it.label, bx + 9, y + 8, {
            width: w - 18,
        });
        doc.fillColor(it.color ?? COLOR.texto).fontSize(15).font('Helvetica-Bold').text(it.valor, bx + 9, y + 22, {
            width: w - 18,
            ellipsis: true,
        });
    });
    doc.font('Helvetica').fillColor(COLOR.texto);
    doc.y = y + h + 10;
    doc.x = x;
}

/** Tarjeta de afirmacion numerada con acento de color (conclusion/recomendacion). */
function tarjetaAfirmacion(doc: Doc, texto: string, indice: number, color: string): void {
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    const padL = 26;
    const th = doc.fontSize(9).heightOfString(texto, { width: w - padL - 10 });
    const h = Math.max(th + 12, 24);
    asegurarEspacio(doc, h + 5);
    const y = doc.y;
    doc.roundedRect(x, y, w, h, 4).fillAndStroke(COLOR.blanco, COLOR.linea);
    doc.rect(x, y, 3, h).fill(color);
    doc.circle(x + 15, y + 12, 7).fill(color);
    doc.fillColor(COLOR.blanco).fontSize(8).font('Helvetica-Bold').text(String(indice), x + 8, y + 8.5, {
        width: 14,
        align: 'center',
    });
    doc.fillColor(COLOR.texto).fontSize(9).font('Helvetica').text(texto, x + padL, y + 6, {
        width: w - padL - 10,
        lineGap: 1,
    });
    doc.y = y + h + 5;
    doc.x = x;
}

/** Bloque visual de afirmaciones numeradas. */
function bloqueAfirmacionesVisual(
    doc: Doc,
    items: { texto: string }[],
    color: string,
    vacio: string,
): void {
    if (items.length === 0) {
        parrafo(doc, vacio, { suave: true });
        return;
    }
    items.forEach((it, i) => tarjetaAfirmacion(doc, it.texto, i + 1, color));
    doc.moveDown(0.2);
}

/** Resumen ejecutivo construido (KPIs + narrativa legible) para un conjunto de indicadores. */
function resumenEjecutivo(
    doc: Doc,
    indicadores: IndicadorReporte[],
    semanas: number,
    nInstituciones: number,
): void {
    const prom = promedioInd(indicadores);
    const top = topInd(indicadores);
    const nivel = nivelDe(prom);
    kpis(doc, [
        { label: 'Riesgo promedio', valor: `${prom}/100`, color: nivel.color },
        { label: 'Nivel de riesgo', valor: nivel.etiqueta, color: nivel.color },
        ...(top
            ? [{ label: 'Dimension mas critica', valor: `${top.dimension} (${top.promedio.toFixed(0)})` }]
            : []),
    ]);
    const narrativa =
        `Durante este periodo se procesaron ${semanas} semana(s)` +
        (nInstituciones > 0 ? ` en ${nInstituciones} institucion(es)` : '') +
        `. El riesgo colectivo promedio fue de ${prom}/100 (nivel ${nivel.etiqueta.toLowerCase()})` +
        (top ? `, siendo "${top.dimension}" la dimension mas critica con ${top.promedio.toFixed(1)}/100` : '') +
        '.';
    caja(doc, narrativa);
}

/**
 * Renderiza el reporte a un `Buffer` PDF con PDFKit. Diseno legible y progresivo
 * por horizonte, con secciones por institucion (Req. 19.4, 19.5). `logos` mapea
 * `institucionId -> Buffer` (PNG/JPEG) para mostrar el logo de cada institucion.
 */
export function renderReportePdf(
    contenido: ReporteContenido,
    logos?: Map<string, Buffer>,
): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                bufferPages: true,
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

            const completo = esCompleto(contenido.horizonte);

            // ---------------- Portada / encabezado ----------------
            const x0 = doc.page.margins.left;
            const w0 = anchoUtil(doc);
            const hBanner = 70;
            const yBanner = doc.y;
            doc.roundedRect(x0, yBanner, w0, hBanner, 6).fill(COLOR.primario);

            // Logo institucional (si esta disponible) en la esquina derecha.
            if (LOGO_PATH) {
                try {
                    const logoSize = 46;
                    doc.image(LOGO_PATH, x0 + w0 - logoSize - 14, yBanner + 12, {
                        fit: [logoSize, logoSize],
                        align: 'center',
                        valign: 'center',
                    });
                } catch {
                    // Logo opcional: si falla la lectura, el PDF se genera sin el.
                }
            }

            doc.fillColor(COLOR.blanco).fontSize(20).font('Helvetica-Bold').text(
                `Reporte ${horizonteLegible(contenido.horizonte)}`,
                x0 + 16,
                yBanner + 14,
                { width: w0 - 80 },
            );
            doc.fontSize(10).font('Helvetica').fillColor('#dbeafe').text(
                'Plataforma_GDS · Tendencias colectivas de riesgo emocional',
                x0 + 16,
                doc.y + 2,
                { width: w0 - 80 },
            );
            doc.y = yBanner + hBanner + 12;
            doc.x = x0;
            doc.fillColor(COLOR.texto);

            // Metadatos en dos columnas
            const meta: [string, string][] = [
                ['Analisis', contenido.analisisId],
                ['Alcance', contenido.institucionId ?? 'Todas las instituciones'],
                ['Periodo', `Semanas ${contenido.rango.desde} a ${contenido.rango.hasta}`],
                ['Semanas con datos', contenido.semanasCubiertas.join(', ') || 'ninguna'],
                ['Generado', new Date(contenido.generadoEn).toLocaleString('es-PE')],
            ];
            doc.fontSize(9);
            for (const [k, v] of meta) {
                const y = doc.y;
                doc.font('Helvetica-Bold').fillColor(COLOR.textoSuave).text(`${k}:`, x0, y, { width: 120 });
                doc.font('Helvetica').fillColor(COLOR.texto).text(v, x0 + 124, y, { width: w0 - 124 });
                doc.moveDown(0.15);
            }
            doc.moveDown(0.8);

            // ---------------- Resumen ejecutivo ----------------
            const seccionesEjec = contenido.secciones ?? [];
            banda(doc, 'Resumen ejecutivo');
            resumenEjecutivo(
                doc,
                contenido.indicadores,
                contenido.semanasCubiertas.length,
                seccionesEjec.length,
            );

            // ---------------- Como leer este reporte ----------------
            subtitulo(doc, 'Como interpretar los indicadores');
            parrafo(
                doc,
                'Cada indicador se mide en una escala de 0 a 100, donde un valor mas alto significa mayor ' +
                'presencia del riesgo. Las barras usan colores por nivel: verde Bajo (0-33), ambar Moderado ' +
                '(33-66) y rojo Alto (66-100). Los valores son COLECTIVOS de la comunidad, nunca diagnosticos ' +
                'individuales.',
                { suave: true },
            );
            doc.moveDown(0.4);

            // ---------------- Indicadores colectivos ----------------
            banda(doc, 'Indicadores colectivos (valor actual)');
            bloqueIndicadores(doc, contenido.indicadores);

            // ---------------- Cambios destacados ----------------
            banda(doc, 'Cambios destacados');
            parrafo(
                doc,
                'Variacion de cada dimension entre la primera y la ultima semana con datos del periodo.',
                { suave: true },
            );
            doc.moveDown(0.2);
            bloqueCambios(doc, contenido.cambios);

            // ---------------- Hitos entre semanas (solo completo) ----------------
            if (completo) {
                banda(doc, 'Movimientos relevantes entre semanas');
                parrafo(
                    doc,
                    'Alzas o bajas considerables detectadas en tramos intermedios del periodo (no solo ' +
                    'entre la primera y la ultima semana), utiles para ubicar cuando ocurrio cada salto.',
                    { suave: true },
                );
                doc.moveDown(0.2);
                bloqueHitos(doc, contenido.hitos);
            }

            // ---------------- Conclusiones y recomendaciones ----------------
            banda(doc, 'Conclusiones');
            bloqueAfirmacionesVisual(doc, contenido.conclusiones, '#0891b2', 'Sin conclusiones para el periodo.');

            banda(doc, 'Recomendaciones');
            bloqueAfirmacionesVisual(doc, contenido.recomendaciones, '#059669', 'Sin recomendaciones para el periodo.');

            // ---------------- Detalle por institucion ----------------
            const secciones = seccionesEjec;
            if (secciones.length > 0) {
                doc.addPage();
                banda(doc, 'Detalle por institucion', COLOR.primarioClaro);
                parrafo(
                    doc,
                    `El analisis incluye ${secciones.length} institucion(es). A continuacion el desglose ` +
                    'de cada una para comparar su evolucion dentro del mismo periodo.',
                    { suave: true },
                );
                doc.moveDown(0.5);

                for (const sec of secciones) {
                    renderSeccionInstitucion(doc, sec, completo, logos?.get(sec.institucionId));
                }
            }

            // ---------------- Secciones profundas (solo completo) ----------------
            if (completo) {
                // Sintesis breve por dimension (en lugar de explicaciones largas)
                if (contenido.indicadores.length > 0) {
                    banda(doc, 'Sintesis por dimension');
                    parrafo(
                        doc,
                        'Lectura rapida del estado y la tendencia de cada dimension al cierre del periodo.',
                        { suave: true },
                    );
                    doc.moveDown(0.2);
                    const ordenados = [...contenido.indicadores].sort((a, b) => b.valorFinal - a.valorFinal);
                    for (const ind of ordenados) {
                        const camb = contenido.cambios.find((c) => c.dimension === ind.dimension);
                        const nivel = nivelDe(ind.valorFinal);
                        const tend =
                            camb && camb.direccion !== 'estable'
                                ? `${flechaDireccion(camb.direccion)} ${pct(camb.variacionPct)}`
                                : 'estable';
                        asegurarEspacio(doc, 14);
                        const x = doc.page.margins.left;
                        doc.fontSize(9).font('Helvetica-Bold').fillColor(nivel.color).text(
                            `${ind.dimension}: `,
                            x,
                            doc.y,
                            { continued: true },
                        );
                        doc.font('Helvetica').fillColor(COLOR.texto).text(
                            `nivel ${nivel.etiqueta.toLowerCase()} (${ind.valorFinal.toFixed(1)}/100), tendencia ${tend}.`,
                        );
                    }
                    doc.moveDown(0.5);
                }

                // Factores detonantes
                banda(doc, 'Factores detonantes');
                if (contenido.detonantes.length === 0) {
                    parrafo(
                        doc,
                        'No se detectaron eventos detonantes correlacionados en este periodo (se generan cuando ' +
                        'el motor identifica patrones asociados a eventos del escenario).',
                        { suave: true },
                    );
                } else {
                    for (const d of contenido.detonantes) {
                        parrafo(doc, `• ${d.evento} (semanas ${d.semanas.join(', ')})`);
                    }
                }
                doc.moveDown(0.4);

                // Evidencias
                banda(doc, 'Evidencias representativas (anonimizadas)');
                if (contenido.evidencias.length === 0) {
                    parrafo(
                        doc,
                        'No hay evidencias en este periodo. Se generan automaticamente para las dimensiones ' +
                        'que alcanzan un nivel relevante (>= 40/100) en alguna semana.',
                        { suave: true },
                    );
                } else {
                    for (const ev of contenido.evidencias.slice(0, 30)) {
                        asegurarEspacio(doc, 26);
                        const x = doc.page.margins.left;
                        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR.textoSuave).text(
                            `[${ev.tipo} · semana ${ev.numeroSemana} · ${ev.contributividad}]`,
                            x,
                            doc.y,
                        );
                        doc.fontSize(9).font('Helvetica').fillColor(COLOR.texto).text(ev.contenido, {
                            width: anchoUtil(doc),
                            lineGap: 1,
                        });
                        doc.moveDown(0.3);
                    }
                    if (contenido.evidencias.length > 30) {
                        parrafo(doc, `(+${contenido.evidencias.length - 30} evidencias adicionales en el Excel)`, {
                            suave: true,
                        });
                    }
                }
            }

            // ---------------- Pie de pagina con numeracion ----------------
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                const yPie = doc.page.height - doc.page.margins.bottom + 10;
                doc.fontSize(7.5).font('Helvetica').fillColor(COLOR.textoSuave).text(
                    `Plataforma_GDS · Reporte ${horizonteLegible(contenido.horizonte)} · pagina ${i - range.start + 1} de ${range.count}`,
                    doc.page.margins.left,
                    yPie,
                    { width: anchoUtil(doc), align: 'center' },
                );
            }

            doc.end();
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

/** Renderiza una seccion de institucion dentro del PDF. */
function renderSeccionInstitucion(
    doc: Doc,
    sec: SeccionInstitucion,
    completo: boolean,
    logo?: Buffer,
): void {
    asegurarEspacio(doc, 80);
    const x = doc.page.margins.left;
    const w = anchoUtil(doc);
    // Encabezado de institucion: nombre a la IZQUIERDA, logo grande a la DERECHA.
    const hBanner = 34;
    const y = doc.y;
    doc.roundedRect(x, y, w, hBanner, 4).fill('#e0e7ff');
    const logoSize = 26;
    if (logo) {
        try {
            doc.image(logo, x + w - logoSize - 8, y + (hBanner - logoSize) / 2, {
                fit: [logoSize, logoSize],
                valign: 'center',
            });
        } catch {
            // Logo opcional: si falla, se omite y se muestra solo el nombre.
        }
    }
    doc.fillColor(COLOR.primario).fontSize(13).font('Helvetica-Bold').text(
        sec.institucionNombre,
        x + 12,
        y + 9,
        { width: w - logoSize - 28 },
    );
    doc.font('Helvetica').fillColor(COLOR.texto);
    doc.y = y + hBanner + 8;
    doc.x = x;

    // Resumen construido (KPIs + narrativa) en lugar del volcado crudo.
    resumenEjecutivo(doc, sec.indicadores, sec.semanasCubiertas.length, 0);

    subtitulo(doc, 'Indicadores');
    bloqueIndicadores(doc, sec.indicadores);

    subtitulo(doc, 'Cambios');
    bloqueCambios(doc, sec.cambios);

    if (sec.hitos && sec.hitos.length > 0) {
        subtitulo(doc, 'Movimientos entre semanas');
        bloqueHitos(doc, sec.hitos);
    }

    if (sec.cronologia && sec.cronologia.length > 0) {
        subtitulo(doc, 'Cronologia de contenido por semana');
        bloqueCronologia(doc, sec.cronologia);
    }

    if (completo) {
        if (sec.conclusiones.length > 0) {
            subtitulo(doc, 'Conclusiones');
            bloqueAfirmacionesVisual(doc, sec.conclusiones, '#0891b2', 'Sin conclusiones.');
        }
        if (sec.recomendaciones.length > 0) {
            subtitulo(doc, 'Recomendaciones');
            bloqueAfirmacionesVisual(doc, sec.recomendaciones, '#059669', 'Sin recomendaciones.');
        }
    }
    doc.moveDown(0.6);
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

/** Aplica estilo de cabecera a la fila de encabezados de una hoja. */
function estilizarCabecera(row: ExcelJS.Row): void {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E3A8A' },
        };
        cell.alignment = { vertical: 'middle' };
    });
}

/** Color ARGB de relleno suave segun el nivel de riesgo del valor. */
function fondoNivelArgb(valor: number): string {
    if (valor < 33) return 'FFDCFCE7'; // verde claro
    if (valor < 66) return 'FFFEF3C7'; // ambar claro
    return 'FFFEE2E2'; // rojo claro
}

/** Pinta una celda con el color de nivel correspondiente al valor. */
function pintarNivel(cell: ExcelJS.Cell, valor: number): void {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondoNivelArgb(valor) } };
    cell.font = { bold: true };
}

/**
 * Renderiza el reporte a un `Buffer` XLSX con ExcelJS, una hoja por seccion,
 * conservando explicaciones y evidencias anonimizadas (Req. 19.5). Cuando el
 * reporte cubre todo el analisis incluye una hoja "Por institucion".
 */
export async function renderReporteExcel(contenido: ReporteContenido): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Plataforma_GDS';
    wb.created = new Date(contenido.generadoEn);

    // --- Hoja: Resumen (portada con KPIs) ---
    const resumen = wb.addWorksheet('Resumen');
    resumen.columns = [
        { key: 'a', width: 26 },
        { key: 'b', width: 22 },
        { key: 'c', width: 22 },
        { key: 'd', width: 30 },
    ];
    const prom = promedioInd(contenido.indicadores);
    const top = topInd(contenido.indicadores);
    const nivel = nivelDe(prom);
    const nInst = contenido.secciones?.length ?? 0;

    // Titulo (fila 1-2 fusionadas)
    resumen.mergeCells('A1:D1');
    const titulo = resumen.getCell('A1');
    titulo.value = `Reporte ${horizonteLegible(contenido.horizonte)} · Plataforma_GDS`;
    titulo.font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
    titulo.alignment = { vertical: 'middle' };
    resumen.getRow(1).height = 24;

    resumen.mergeCells('A2:D2');
    const sub = resumen.getCell('A2');
    sub.value = `Analisis ${contenido.analisisId} · semanas ${contenido.rango.desde}-${contenido.rango.hasta} · generado ${new Date(contenido.generadoEn).toLocaleString('es-PE')}`;
    sub.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };

    // KPIs (fila 4 labels, fila 5 valores)
    const kpiLabels = ['Riesgo promedio', 'Nivel de riesgo', 'Dimension mas critica', 'Semanas con datos'];
    const kpiValores = [
        `${prom}/100`,
        nivel.etiqueta,
        top ? `${top.dimension} (${top.promedio.toFixed(1)})` : 'n/d',
        String(contenido.semanasCubiertas.length),
    ];
    kpiLabels.forEach((lab, i) => {
        const cellLab = resumen.getRow(4).getCell(i + 1);
        cellLab.value = lab;
        cellLab.font = { bold: true, size: 9, color: { argb: 'FF6B7280' } };
        const cellVal = resumen.getRow(5).getCell(i + 1);
        cellVal.value = kpiValores[i];
        cellVal.font = { bold: true, size: 13 };
    });
    pintarNivel(resumen.getRow(5).getCell(1), prom);
    pintarNivel(resumen.getRow(5).getCell(2), prom);
    resumen.getRow(5).height = 20;

    // Metadatos (tabla desde fila 7)
    resumen.getCell('A7').value = 'Campo';
    resumen.getCell('B7').value = 'Valor';
    resumen.mergeCells('B7:D7');
    estilizarCabecera(resumen.getRow(7));
    const meta: [string, string][] = [
        ['Horizonte', horizonteLegible(contenido.horizonte)],
        ['Alcance', contenido.institucionId ?? 'Todas las instituciones'],
        ['Instituciones', nInst > 0 ? String(nInst) : 'n/d'],
        ['Periodo', String(contenido.periodo)],
        ['Semanas cubiertas', contenido.semanasCubiertas.join(', ') || 'ninguna'],
    ];
    let filaMeta = 8;
    for (const [k, v] of meta) {
        resumen.getCell(`A${filaMeta}`).value = k;
        resumen.getCell(`A${filaMeta}`).font = { bold: true };
        resumen.mergeCells(`B${filaMeta}:D${filaMeta}`);
        resumen.getCell(`B${filaMeta}`).value = v;
        filaMeta += 1;
    }
    // Resumen narrativo
    filaMeta += 1;
    resumen.getCell(`A${filaMeta}`).value = 'Resumen';
    resumen.getCell(`A${filaMeta}`).font = { bold: true };
    resumen.mergeCells(`B${filaMeta}:D${filaMeta}`);
    const celResumen = resumen.getCell(`B${filaMeta}`);
    celResumen.value = contenido.resumen;
    celResumen.alignment = { wrapText: true, vertical: 'top' };
    resumen.getRow(filaMeta).height = 60;

    // --- Hoja: Indicadores ---
    const indicadores = wb.addWorksheet('Indicadores');
    indicadores.columns = [
        { header: 'Dimension', key: 'dimension', width: 28 },
        { header: 'Valor inicial', key: 'valorInicial', width: 14 },
        { header: 'Valor final', key: 'valorFinal', width: 14 },
        { header: 'Nivel', key: 'nivel', width: 12 },
        { header: 'Minimo', key: 'minimo', width: 12 },
        { header: 'Maximo', key: 'maximo', width: 12 },
        { header: 'Promedio', key: 'promedio', width: 12 },
        { header: 'Score ML promedio', key: 'scoreCalibradoMlPromedio', width: 18 },
        { header: 'Semanas', key: 'semanas', width: 20 },
        { header: 'Evidencias', key: 'evidenciaIds', width: 40 },
    ];
    estilizarCabecera(indicadores.getRow(1));
    for (const ind of contenido.indicadores) {
        const fila = indicadores.addRow({
            ...ind,
            nivel: nivelDe(ind.valorFinal).etiqueta,
            semanas: ind.semanas.join(', '),
            evidenciaIds: ind.evidenciaIds.join(', '),
        });
        pintarNivel(fila.getCell('nivel'), ind.valorFinal);
        pintarNivel(fila.getCell('valorFinal'), ind.valorFinal);
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

    // --- Hoja: Por institucion ---
    if (contenido.secciones && contenido.secciones.length > 0) {
        const porInst = wb.addWorksheet('Por institucion');
        porInst.columns = [
            { header: 'Institucion', key: 'institucion', width: 30 },
            { header: 'Dimension', key: 'dimension', width: 24 },
            { header: 'Valor inicial', key: 'valorInicial', width: 14 },
            { header: 'Valor final', key: 'valorFinal', width: 14 },
            { header: 'Nivel', key: 'nivel', width: 12 },
            { header: 'Promedio', key: 'promedio', width: 12 },
        ];
        estilizarCabecera(porInst.getRow(1));
        for (const sec of contenido.secciones) {
            for (const ind of sec.indicadores) {
                const fila = porInst.addRow({
                    institucion: sec.institucionNombre,
                    dimension: ind.dimension,
                    valorInicial: ind.valorInicial,
                    valorFinal: ind.valorFinal,
                    nivel: nivelDe(ind.valorFinal).etiqueta,
                    promedio: ind.promedio,
                });
                pintarNivel(fila.getCell('nivel'), ind.valorFinal);
                pintarNivel(fila.getCell('valorFinal'), ind.valorFinal);
            }
        }
    }

    // --- Hoja: Cronologia (contenido por semana y por institucion) ---
    if (contenido.secciones && contenido.secciones.some((s) => (s.cronologia ?? []).length > 0)) {
        const crono = wb.addWorksheet('Cronologia');
        crono.columns = [
            { header: 'Institucion', key: 'institucion', width: 28 },
            { header: 'Semana', key: 'semana', width: 10 },
            { header: 'Publicaciones tomadas', key: 'tomadas', width: 20 },
            { header: 'Total generadas', key: 'total', width: 16 },
            { header: 'Aporte post', key: 'post', width: 12 },
            { header: 'Aporte comentarios', key: 'coment', width: 18 },
            { header: 'Aporte imagen', key: 'imagen', width: 14 },
            { header: 'Hashtags', key: 'hashtags', width: 40 },
        ];
        estilizarCabecera(crono.getRow(1));
        for (const sec of contenido.secciones) {
            for (const m of sec.cronologia ?? []) {
                crono.addRow({
                    institucion: sec.institucionNombre,
                    semana: m.numeroSemana,
                    tomadas: m.contributivos,
                    total: m.totalItems,
                    post: m.aportePost > 0 ? 'Si' : 'No',
                    coment: m.aporteComentarios,
                    imagen: m.aporteImagen > 0 ? 'Si' : 'No',
                    hashtags: (m.hashtags ?? []).map((h) => `#${h.tag} (${h.conteo})`).join(', '),
                });
            }
        }
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
