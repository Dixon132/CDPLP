import { Response } from "express";
import { withPage } from "./browserPool";
import { NOMBRE_INSTITUCION } from "./theme";

export interface GenerarPdfOptions {
  landscape?: boolean;
}

export const generarInformePdf = async (html: string, opts: GenerarPdfOptions = {}): Promise<Buffer> =>
  withPage(async (page) => {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: opts.landscape ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%;font-size:8px;color:#9ca3af;text-align:center;font-family:Inter,Arial,sans-serif;">
          ${NOMBRE_INSTITUCION} &nbsp;•&nbsp; Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
      margin: { top: "10mm", bottom: "16mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  });

export const enviarInformePdf = (res: Response, buffer: Buffer, filename: string): Response => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(buffer);
};
