import { COLOR_BORDE, COLOR_PRIMARIO, COLOR_SECUNDARIO, COLOR_TEXTO, COLOR_TEXTO_SUAVE, FONT_IMPORT, NOMBRE_INSTITUCION } from "./theme";
import { getLogoDataUri } from "./logo";

export interface KpiCard {
  label: string;
  value: string | number;
  accent?: "violeta" | "rosa" | "neutro";
}

export interface InformeLayoutOptions {
  titulo: string;
  subtitulo?: string;
  filtrosTexto?: string;
  kpis?: KpiCard[];
  bodyHtml: string;
  orientacion?: "portrait" | "landscape";
}

/** Escapa texto libre proveniente de la base de datos antes de insertarlo en el HTML del informe. */
export const esc = (valor: unknown): string =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ACCENTS: Record<NonNullable<KpiCard["accent"]>, string> = {
  violeta: COLOR_PRIMARIO,
  rosa: COLOR_SECUNDARIO,
  neutro: COLOR_TEXTO_SUAVE,
};

export const renderKpiGrid = (kpis: KpiCard[]): string => {
  if (!kpis.length) return "";
  return `
    <div class="kpi-grid">
      ${kpis
        .map(
          (k) => `
        <div class="kpi-card" style="border-top-color:${ACCENTS[k.accent ?? "neutro"]}">
          <div class="kpi-value">${esc(k.value)}</div>
          <div class="kpi-label">${esc(k.label)}</div>
        </div>`
        )
        .join("")}
    </div>`;
};

export interface ColumnaTabla {
  label: string;
  align?: "left" | "right" | "center";
}

export const renderTabla = (columnas: ColumnaTabla[], filasHtml: string[], vacioTexto = "Sin registros."): string => {
  if (!filasHtml.length) {
    return `<p class="vacio">${esc(vacioTexto)}</p>`;
  }
  return `
    <table>
      <thead>
        <tr>
          ${columnas.map((c) => `<th style="text-align:${c.align ?? "left"}">${esc(c.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${filasHtml.join("")}
      </tbody>
    </table>`;
};

/** Barra de progreso simple vía CSS, sin dependencias de gráficos. */
export const renderBarraProgreso = (pct: number): string => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return `
    <div class="barra-progreso">
      <div class="barra-progreso-fill" style="width:${clamped}%"></div>
      <span>${clamped}%</span>
    </div>`;
};

export const renderInformeHTML = (opts: InformeLayoutOptions): string => {
  const generadoEl = new Date().toLocaleString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  ${FONT_IMPORT}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', Arial, sans-serif;
    color: ${COLOR_TEXTO};
    font-size: 13px;
    padding: 24px 32px;
  }
  header.informe-header {
    border-bottom: 3px solid ${COLOR_PRIMARIO};
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .header-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 10px;
  }
  .logo-img {
    width: 54px;
    height: 54px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .logo-line {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    color: ${COLOR_TEXTO_SUAVE};
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  h1.titulo {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: ${COLOR_PRIMARIO};
    margin-bottom: 4px;
  }
  .subtitulo { font-size: 14px; color: ${COLOR_TEXTO_SUAVE}; margin-bottom: 10px; }
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: ${COLOR_TEXTO_SUAVE};
  }
  .filtros { font-style: italic; }
  .kpi-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi-card {
    flex: 1 1 140px;
    background: #faf9fb;
    border: 1px solid ${COLOR_BORDE};
    border-top: 3px solid ${COLOR_TEXTO_SUAVE};
    border-radius: 8px;
    padding: 12px 14px;
  }
  .kpi-value { font-size: 20px; font-weight: 700; color: ${COLOR_TEXTO}; }
  .kpi-label { font-size: 10px; color: ${COLOR_TEXTO_SUAVE}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  section.seccion { margin-top: 22px; }
  h2.seccion-titulo {
    font-size: 15px;
    font-weight: 700;
    color: ${COLOR_TEXTO};
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid ${COLOR_BORDE};
  }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  thead { display: table-header-group; }
  th {
    background: #f3f4f6;
    color: ${COLOR_TEXTO};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 8px 10px;
    border-bottom: 2px solid ${COLOR_PRIMARIO};
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid ${COLOR_BORDE};
    font-size: 12px;
  }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tr.fila-total td { font-weight: 700; border-top: 2px solid ${COLOR_PRIMARIO}; background: #f3f4f6; }
  .vacio { color: ${COLOR_TEXTO_SUAVE}; font-style: italic; padding: 10px 0; }
  .barra-progreso {
    position: relative;
    width: 100%;
    min-width: 80px;
    height: 14px;
    background: #e5e7eb;
    border-radius: 7px;
    overflow: hidden;
  }
  .barra-progreso-fill { height: 100%; background: linear-gradient(90deg, ${COLOR_PRIMARIO}, ${COLOR_SECUNDARIO}); }
  .barra-progreso span {
    position: absolute; top: 0; right: 6px; font-size: 9px; line-height: 14px; color: ${COLOR_TEXTO};
  }
</style>
</head>
<body>
  <header class="informe-header">
    <div class="header-top">
      <img class="logo-img" src="${getLogoDataUri()}" alt="${esc(NOMBRE_INSTITUCION)}" />
      <div>
        <p class="logo-line">${esc(NOMBRE_INSTITUCION)}</p>
        <h1 class="titulo">${esc(opts.titulo)}</h1>
        ${opts.subtitulo ? `<p class="subtitulo">${esc(opts.subtitulo)}</p>` : ""}
      </div>
    </div>
    <div class="meta-row">
      <span>Generado: ${esc(generadoEl)}</span>
      ${opts.filtrosTexto ? `<span class="filtros">${opts.filtrosTexto}</span>` : ""}
    </div>
  </header>
  ${opts.kpis?.length ? renderKpiGrid(opts.kpis) : ""}
  ${opts.bodyHtml}
</body>
</html>`;
};
