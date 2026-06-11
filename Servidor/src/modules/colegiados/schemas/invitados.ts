import { z } from 'zod';

export const invitadoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  correo: z.string().email().optional(),
  telefono: z.string().optional()
});
