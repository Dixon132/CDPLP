import { z } from 'zod';

export const convenioSchema = z.object({
  nombre: z.string().min(1).max(150),
  descripcion: z.string().optional(),
  contacto: z.string().max(100).optional(),
  fecha_inicio: z.string().datetime().optional(),
  fecha_fin: z.string().datetime().optional()
});
