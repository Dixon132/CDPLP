import { z } from 'zod';

export const correspondenciaSchema = z.object({
  asunto: z.string().min(1).max(200),
  contenido: z.string().optional(),
  remitente: z.string().max(100).optional(),
  id_destinatario: z.coerce.number().int().positive().optional()
});
