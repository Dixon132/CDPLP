import { z } from 'zod';

export const usuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  correo: z.string().email().max(150),
  contraseña: z.string().min(6).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().max(200).optional()
});

export const usuarioUpdateSchema = usuarioSchema.partial().extend({ estado: z.string().max(20).optional() });
