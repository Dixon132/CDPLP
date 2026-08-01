import fs from "fs";
import path from "path";

let logoDataUri: string | null = null;

/** Lee y cachea en memoria el logo institucional como data URI, para incrustarlo en los informes PDF. */
export const getLogoDataUri = (): string => {
  if (!logoDataUri) {
    const buffer = fs.readFileSync(path.join(__dirname, "assets", "logo.png"));
    logoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  }
  return logoDataUri;
};
