import { z } from 'zod';

export const presupuestoSchema = z.object({
  nombre_presupuesto: z.string().min(1).max(150),
  descripcion: z.string().optional(),
  monto_total: z.coerce.number().positive(),
  fecha_asignacion: z.string().datetime().optional()
});

export const movimientoSchema = z.object({
  id_presupuesto: z.coerce.number().int().positive(),
  tipo_movimiento: z.enum(['INGRESO', 'EGRESO']),
  categoria: z.string().max(40).optional(),
  descripcion: z.string().max(500).optional(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodo_pago: z.enum(['EFECTIVO', 'QR', 'TRANSFERENCIA']).optional(),
  fecha_movimiento: z.string().optional(),
});
