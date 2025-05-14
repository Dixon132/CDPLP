import { z } from "zod";

export const docsSchema = z.object({
    tipo_documento: z.string(),
    archivo: z.string()
})