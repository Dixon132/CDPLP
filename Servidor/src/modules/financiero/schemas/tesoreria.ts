import { z } from 'zod';

export const presupuestoSchema = z.object({
  nombre_presupuesto: z.string().min(1).max(150),
  descripcion: z.string().optional(),
  monto_total: z.coerce.number().positive(),
  fecha_asignacion: z.string().datetime().optional()
});

export const movimientoSchema = z.object({
  id_presupuesto: z.coerce.number().int().positive(),
  tipo_movimiento: z.string().max(20),
  categoria: z.string().max(40).optional(),
  descripcion: z.string().optional(),
  monto: z.coerce.number().positive(),
  id_origen: z.coerce.number().int().positive().optional()
});
