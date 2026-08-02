import { z } from 'zod';

export const pagoSchema = z.object({
  id_colegiado: z.coerce.number().int().positive(),
  concepto: z.string().min(1).max(100),
  monto: z.coerce.number().positive(),
  estado_pago: z.string().max(50).optional()
});

/**
 * Cuerpo de `POST /pagos/:id` y `POST /pagos-invitados/:id`.
 * El id del colegiado/invitado viaja en la ruta, no en el cuerpo, y la petición
 * es multipart (todos los campos llegan como texto), de ahí los `coerce`.
 */
export const crearPagoSchema = z.object({
  concepto: z.string().trim().min(1, 'El concepto es obligatorio').max(100),
  fecha_pago: z.coerce.date({ invalid_type_error: 'Fecha de pago inválida' }),
  monto: z.coerce.number().positive('El monto debe ser mayor que 0'),
  metodo_pago: z.string().max(50).optional(),
  // Cantidad de gestiones (años) de colegiatura que cubre este pago. Se usa
  // para extender `colegiados.fecha_renovacion` automáticamente al registrar
  // el pago — antes este dato lo calculaba el frontend y se descartaba.
  gestiones: z.coerce.number().int().min(1, 'Mínimo 1 gestión').max(10, 'Máximo 10 gestiones').default(1),
});
