import { z } from 'zod';

export const pasanteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  carnet_identidad: z.string().min(5).max(20),
  correo: z.string().email().optional(),
  telefono: z.string().optional(),
  institucion: z.string().optional()
});
