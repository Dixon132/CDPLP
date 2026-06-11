import { z } from 'zod';

export const pagoSchema = z.object({
  id_colegiado: z.coerce.number().int().positive(),
  concepto: z.string().min(1).max(100),
  monto: z.coerce.number().positive(),
  estado_pago: z.string().max(50).optional()
});
